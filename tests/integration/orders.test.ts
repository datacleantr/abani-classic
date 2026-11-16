import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "@/db";
import {
  brands,
  categories,
  inventory,
  orders,
  productVariants,
  products,
  stockMovements,
} from "@/db/schema";
import {
  applyPaymentEvent,
  createReturnRequest,
  expireStaleReservations,
  placeOrder,
  transitionOrder,
} from "@/lib/orders";
import type { CheckoutInput } from "@/lib/schemas";

const PAYMENT = { method: "sandbox", reservationMinutes: 30 } as const;
const PRICE = 50000;

let variantSeq = 0;

async function createVariant(onHand: number): Promise<string> {
  variantSeq += 1;
  const [brand] = await db
    .insert(brands)
    .values({ name: `Marka ${variantSeq}`, slug: `marka-${variantSeq}` })
    .returning();
  const [category] = await db
    .insert(categories)
    .values({ name: `Kategori ${variantSeq}`, slug: `kategori-${variantSeq}` })
    .returning();
  const [product] = await db
    .insert(products)
    .values({
      brandId: brand.id,
      categoryId: category.id,
      name: `Test Ürün ${variantSeq}`,
      slug: `test-urun-${variantSeq}`,
      listPrice: PRICE,
      salePrice: PRICE,
      status: "published",
    })
    .returning();
  const [variant] = await db
    .insert(productVariants)
    .values({ productId: product.id, sku: `TEST-${variantSeq}`, size: "M", color: "Siyah" })
    .returning();
  await db.insert(inventory).values({ variantId: variant.id, onHand, reserved: 0 });
  return variant.id;
}

function checkout(variantId: string, quantity: number, email: string): CheckoutInput {
  return {
    firstName: "Test",
    lastName: "Müşteri",
    email,
    phone: "05550000000",
    addressLine: "Deneme Mahallesi Test Sokak No 1",
    district: "Kadıköy",
    city: "İstanbul",
    postalCode: "",
    note: "",
    couponCode: "",
    marketingConsent: false,
    items: [{ variantId, quantity }],
  };
}

async function stock(variantId: string) {
  const [row] = await db.select().from(inventory).where(eq(inventory.variantId, variantId));
  return { onHand: row.onHand, reserved: row.reserved };
}

async function orderRow(orderNumber: string) {
  const [row] = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber));
  return row;
}

beforeAll(() => {
  if (!process.env.DATABASE_URL?.includes("_test")) {
    throw new Error("Entegrasyon testleri yalnızca *_test veritabanında çalışır.");
  }
});

afterAll(async () => {
  await pool.end();
});

describe("stok rezervasyonu", () => {
  it("aynı anda gelen siparişlerde stok asla eksiye düşmez", async () => {
    const variantId = await createVariant(3);
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, index) =>
        placeOrder(checkout(variantId, 1, `yaris${index}@example.com`), PAYMENT),
      ),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(3);
    expect(await stock(variantId)).toEqual({ onHand: 3, reserved: 3 });
  });

  it("sipariş oluşturmak ödemeyi onaylamaz", async () => {
    const variantId = await createVariant(5);
    const result = await placeOrder(checkout(variantId, 2, "bekleyen@example.com"), PAYMENT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const order = await orderRow(result.orderNumber);
    expect(order.status).toBe("pending_payment");
    expect(order.paymentStatus).toBe("pending");
    expect(order.accessToken).toHaveLength(48);
    expect(await stock(variantId)).toEqual({ onHand: 5, reserved: 2 });
  });

  it("fiyat istemciden değil veritabanından hesaplanır", async () => {
    const variantId = await createVariant(5);
    const tampered = { ...checkout(variantId, 2, "fiyat@example.com"), unitPrice: 1, grandTotal: 1 };
    const result = await placeOrder(tampered as CheckoutInput, PAYMENT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.grandTotal).toBe(PRICE * 2); // 1.000 TL eşiği: kargo ücretsiz
  });
});

describe("ödeme bildirimi", () => {
  it("yinelenen bildirim stoğu ikinci kez düşürmez", async () => {
    const variantId = await createVariant(5);
    const placed = await placeOrder(checkout(variantId, 2, "cift@example.com"), PAYMENT);
    if (!placed.ok) throw new Error(placed.message);
    const event = {
      providerEventId: `evt_${placed.orderNumber}`,
      orderNumber: placed.orderNumber,
      type: "succeeded" as const,
      amount: placed.grandTotal,
      signatureValid: true,
    };
    const first = await applyPaymentEvent(event);
    const second = await applyPaymentEvent(event);
    const third = await applyPaymentEvent({ ...event, providerEventId: `${event.providerEventId}_retry` });

    expect(first).toMatchObject({ ok: true, duplicate: false });
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(third).toMatchObject({ ok: true, duplicate: true });
    expect(await stock(variantId)).toEqual({ onHand: 3, reserved: 0 });
    expect((await orderRow(placed.orderNumber)).status).toBe("paid");

    const sales = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.reference, placed.orderNumber));
    expect(sales.filter((movement) => movement.type === "sale")).toHaveLength(1);
  });

  it("tutarı uyuşmayan bildirim siparişi ödenmiş yapmaz", async () => {
    const variantId = await createVariant(5);
    const placed = await placeOrder(checkout(variantId, 1, "tutar@example.com"), PAYMENT);
    if (!placed.ok) throw new Error(placed.message);
    const result = await applyPaymentEvent({
      providerEventId: `evt_mismatch_${placed.orderNumber}`,
      orderNumber: placed.orderNumber,
      type: "succeeded",
      amount: placed.grandTotal - 1,
      signatureValid: true,
    });
    expect(result.ok).toBe(false);
    expect((await orderRow(placed.orderNumber)).status).toBe("pending_payment");
    expect(await stock(variantId)).toEqual({ onHand: 5, reserved: 1 });
  });

  it("başarısız ödeme rezervasyonu serbest bırakır; sonraki iptal tekrar çözmez", async () => {
    const variantId = await createVariant(5);
    const other = await placeOrder(checkout(variantId, 1, "diger@example.com"), PAYMENT);
    const placed = await placeOrder(checkout(variantId, 2, "red@example.com"), PAYMENT);
    if (!placed.ok || !other.ok) throw new Error("sipariş oluşturulamadı");

    await applyPaymentEvent({
      providerEventId: `evt_fail_${placed.orderNumber}`,
      orderNumber: placed.orderNumber,
      type: "failed",
      amount: placed.grandTotal,
      signatureValid: true,
    });
    expect(await stock(variantId)).toEqual({ onHand: 5, reserved: 1 });

    const order = await orderRow(placed.orderNumber);
    const cancelled = await transitionOrder({
      orderId: order.id,
      toStatus: "cancelled",
      actorEmail: "admin@example.com",
    });
    expect(cancelled.ok).toBe(true);
    // Diğer siparişin rezervasyonu yerinde kalmalı.
    expect(await stock(variantId)).toEqual({ onHand: 5, reserved: 1 });
  });
});

describe("yönetici işlemleri", () => {
  it("elle tahsilat onayı stoğu webhook ile aynı şekilde kesinleştirir", async () => {
    const variantId = await createVariant(4);
    const placed = await placeOrder(checkout(variantId, 3, "havale@example.com"), {
      method: "bank_transfer",
      reservationMinutes: 60,
    });
    if (!placed.ok) throw new Error(placed.message);
    const order = await orderRow(placed.orderNumber);
    const result = await transitionOrder({
      orderId: order.id,
      toStatus: "paid",
      actorEmail: "admin@example.com",
    });
    expect(result.ok).toBe(true);
    expect(await stock(variantId)).toEqual({ onHand: 1, reserved: 0 });
    expect((await orderRow(placed.orderNumber)).paymentStatus).toBe("paid");
  });

  it("izin verilmeyen durum geçişini ve takip numarasız kargoyu reddeder", async () => {
    const variantId = await createVariant(2);
    const placed = await placeOrder(checkout(variantId, 1, "gecis@example.com"), PAYMENT);
    if (!placed.ok) throw new Error(placed.message);
    const order = await orderRow(placed.orderNumber);

    const jump = await transitionOrder({ orderId: order.id, toStatus: "delivered", actorEmail: "a@example.com" });
    expect(jump.ok).toBe(false);

    for (const toStatus of ["paid", "processing", "packed"]) {
      const step = await transitionOrder({ orderId: order.id, toStatus, actorEmail: "a@example.com" });
      expect(step.ok).toBe(true);
    }
    const noTracking = await transitionOrder({ orderId: order.id, toStatus: "shipped", actorEmail: "a@example.com" });
    expect(noTracking.ok).toBe(false);
    const shipped = await transitionOrder({
      orderId: order.id,
      toStatus: "shipped",
      actorEmail: "a@example.com",
      carrier: "Test Kargo",
      trackingNumber: "TK123456",
    });
    expect(shipped.ok).toBe(true);
  });
});

describe("rezervasyon süresi", () => {
  it("süresi dolan siparişi iptal eder, stoğu serbest bırakır ve tekrar çalıştırılabilir", async () => {
    const variantId = await createVariant(2);
    const placed = await placeOrder(checkout(variantId, 2, "sure@example.com"), PAYMENT);
    if (!placed.ok) throw new Error(placed.message);

    expect(await expireStaleReservations(new Date())).not.toContain(placed.orderNumber);

    const later = new Date(Date.now() + 31 * 60 * 1000);
    expect(await expireStaleReservations(later)).toContain(placed.orderNumber);
    expect(await expireStaleReservations(later)).not.toContain(placed.orderNumber);
    expect(await stock(variantId)).toEqual({ onHand: 2, reserved: 0 });
    expect((await orderRow(placed.orderNumber)).status).toBe("cancelled");

    // Süresi dolmuş siparişe geç gelen ödeme otomatik onaylanmaz.
    const late = await applyPaymentEvent({
      providerEventId: `evt_late_${placed.orderNumber}`,
      orderNumber: placed.orderNumber,
      type: "succeeded",
      amount: placed.grandTotal,
      signatureValid: true,
    });
    expect(late.ok).toBe(false);
    expect(await stock(variantId)).toEqual({ onHand: 2, reserved: 0 });
  });
});

describe("iade talebi yetkisi", () => {
  it("yalnızca sipariş sahibi veya erişim anahtarı ile açılabilir", async () => {
    const variantId = await createVariant(2);
    const placed = await placeOrder(checkout(variantId, 1, "iade@example.com"), PAYMENT);
    if (!placed.ok) throw new Error(placed.message);
    const order = await orderRow(placed.orderNumber);
    await applyPaymentEvent({
      providerEventId: `evt_ret_${placed.orderNumber}`,
      orderNumber: placed.orderNumber,
      type: "succeeded",
      amount: placed.grandTotal,
      signatureValid: true,
    });
    for (const toStatus of ["processing", "packed"]) {
      await transitionOrder({ orderId: order.id, toStatus, actorEmail: "a@example.com" });
    }
    await transitionOrder({
      orderId: order.id,
      toStatus: "shipped",
      actorEmail: "a@example.com",
      carrier: "Test Kargo",
      trackingNumber: "TK1",
    });

    const reason = "Beden uymadı, değişim istiyorum.";
    const anonymous = await createReturnRequest({ orderNumber: placed.orderNumber, reason });
    const stranger = await createReturnRequest({
      orderNumber: placed.orderNumber,
      reason,
      customerEmail: "baskasi@example.com",
    });
    const wrongToken = await createReturnRequest({
      orderNumber: placed.orderNumber,
      reason,
      accessToken: "0".repeat(48),
    });
    expect([anonymous.ok, stranger.ok, wrongToken.ok]).toEqual([false, false, false]);

    const owner = await createReturnRequest({
      orderNumber: placed.orderNumber,
      reason,
      accessToken: placed.accessToken,
    });
    expect(owner.ok).toBe(true);
  });
});
