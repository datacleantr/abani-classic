import { randomBytes, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  coupons,
  customers,
  inventory,
  orderItems,
  orderStatusHistory,
  orders,
  paymentEvents,
  payments,
  returnRequests,
  shipments,
  stockMovements,
} from "@/db/schema";
import { writeAudit } from "./audit";
import { ORDER_STATUS_LABELS } from "./format";
import { logger } from "./logger";
import type { PaymentMethod } from "./payments";
import { computeQuote, loadPricedRows } from "./pricing";
import { checkoutSchema, type CheckoutInput } from "./schemas";

class OrderError extends Error {}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type OrderItemRow = typeof orderItems.$inferSelect;

export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending_payment: ["paid", "payment_failed", "cancelled"],
  payment_failed: ["cancelled"],
  paid: ["processing", "cancelled", "refunded"],
  processing: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "return_requested"],
  delivered: ["return_requested", "refunded"],
  return_requested: ["returned", "delivered"],
  returned: ["refunded"],
  cancelled: [],
  refunded: [],
  partially_refunded: [],
};

export function allowedNextStatuses(status: string): string[] {
  return ORDER_TRANSITIONS[status] ?? [];
}

async function generateOrderNumber(tx: typeof db): Promise<string> {
  const now = new Date();
  const prefix = `AB-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await tx
      .select({ id: orders.id })
      .from(orders)
      .where(eq(orders.orderNumber, candidate))
      .limit(1);
    if (existing.length === 0) return candidate;
  }
  throw new OrderError("Sipariş numarası üretilemedi, lütfen tekrar deneyin.");
}

/** Rezervasyonu kesin satışa çevirir: fiziksel stok düşer, ayrılmış miktar çözülür. */
async function commitReservedStock(tx: Tx, orderNumber: string, items: OrderItemRow[], actor: string) {
  for (const item of items) {
    if (!item.variantId) continue;
    await tx
      .update(inventory)
      .set({
        onHand: sql`${inventory.onHand} - ${item.quantity}`,
        reserved: sql`${inventory.reserved} - ${item.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, item.variantId));
    await tx.insert(stockMovements).values({
      variantId: item.variantId,
      type: "sale",
      quantity: -item.quantity,
      reference: orderNumber,
      note: "Ödeme onaylandı, rezervasyon kesinleşti.",
      actor,
    });
  }
}

/** Ödenmemiş siparişin rezervasyonunu serbest bırakır. */
async function releaseReservedStock(
  tx: Tx,
  orderNumber: string,
  items: OrderItemRow[],
  actor: string,
  note: string,
) {
  for (const item of items) {
    if (!item.variantId) continue;
    await tx
      .update(inventory)
      .set({
        reserved: sql`greatest(${inventory.reserved} - ${item.quantity}, 0)`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.variantId, item.variantId));
    await tx.insert(stockMovements).values({
      variantId: item.variantId,
      type: "reservation_release",
      quantity: item.quantity,
      reference: orderNumber,
      note,
      actor,
    });
  }
}

export function tokensMatch(expected: string, provided: string | null | undefined): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; accessToken: string; grandTotal: number; customerId: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function placeOrder(
  input: CheckoutInput,
  payment: { method: PaymentMethod; reservationMinutes: number },
): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Lütfen form alanlarını kontrol edin.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }
  const data = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const variantIds = [...new Set(data.items.map((item) => item.variantId))];
      if (variantIds.length === 0) throw new OrderError("Sepetiniz boş.");

      const lockList = sql.join(
        variantIds.map((id) => sql`${id}::uuid`),
        sql`, `,
      );
      await tx.execute(
        sql`select id from inventory where variant_id in (${lockList}) for update`,
      );

      const rows = await loadPricedRows(
        variantIds,
        tx as unknown as Pick<typeof db, "select">,
      );

      const couponCode = data.couponCode ? data.couponCode.trim().toUpperCase() : "";
      let couponConfig = null;
      if (couponCode) {
        const couponRows = await tx
          .select()
          .from(coupons)
          .where(eq(coupons.code, couponCode))
          .limit(1);
        const found = couponRows[0];
        if (found) couponConfig = { ...found };
      }

      const quote = computeQuote(rows, data.items, couponConfig, couponCode || undefined);
      if (quote.issues.length > 0) throw new OrderError(quote.issues[0].message);
      if (quote.lines.length === 0) throw new OrderError("Sepetinizde satın alınabilir ürün yok.");

      const email = data.email.toLowerCase();
      const existingCustomer = await tx
        .select({ id: customers.id })
        .from(customers)
        .where(eq(customers.email, email))
        .limit(1);

      let customerId = existingCustomer[0]?.id;
      if (customerId) {
        await tx
          .update(customers)
          .set({
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            ...(data.marketingConsent ? { marketingConsent: true } : {}),
          })
          .where(eq(customers.id, customerId));
      } else {
        const [created] = await tx
          .insert(customers)
          .values({
            email,
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            defaultCity: data.city,
            marketingConsent: data.marketingConsent,
          })
          .returning();
        customerId = created.id;
      }

      const orderNumber = await generateOrderNumber(tx as unknown as typeof db);
      const accessToken = randomBytes(24).toString("hex");

      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber,
          status: "pending_payment",
          paymentStatus: "pending",
          customerId,
          email,
          phone: data.phone,
          firstName: data.firstName,
          lastName: data.lastName,
          addressLine: data.addressLine,
          district: data.district,
          city: data.city,
          postalCode: data.postalCode || null,
          note: data.note || null,
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          shippingTotal: quote.shippingTotal,
          grandTotal: quote.grandTotal,
          couponCode: quote.couponCode,
          marketingConsent: data.marketingConsent,
          accessToken,
          paymentMethod: payment.method,
          reservationExpiresAt: new Date(Date.now() + payment.reservationMinutes * 60 * 1000),
        })
        .returning();

      await tx.insert(orderItems).values(
        quote.lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          variantId: line.variantId,
          sku: line.sku,
          productName: line.productName,
          variantLabel: line.variantLabel,
          imageUrl: line.imageUrl,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
          discount: 0,
          taxRate: line.taxRate,
          taxAmount: Math.round((line.lineTotal * line.taxRate) / (100 + line.taxRate)),
          lineTotal: line.lineTotal,
          currency: "TRY",
        })),
      );

      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending_payment",
        note: "Sipariş oluşturuldu, stok rezerve edildi.",
        actor: "checkout",
      });

      for (const line of quote.lines) {
        // Satır yukarıda kilitlendi ve stok doğrulandı; koşul ikinci bir güvenlik katmanıdır.
        const reservedRows = await tx
          .update(inventory)
          .set({
            reserved: sql`${inventory.reserved} + ${line.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventory.variantId, line.variantId),
              sql`${inventory.onHand} - ${inventory.reserved} >= ${line.quantity}`,
            ),
          )
          .returning({ id: inventory.id });
        if (reservedRows.length === 0) {
          throw new OrderError(`${line.productName} için yeterli stok yok.`);
        }

        await tx.insert(stockMovements).values({
          variantId: line.variantId,
          type: "reservation",
          quantity: -line.quantity,
          reference: orderNumber,
          note: "Checkout stok rezervasyonu",
          actor: email,
        });
      }

      await tx.insert(payments).values({
        orderId: order.id,
        provider: payment.method,
        providerRef: null,
        status: "pending",
        amount: quote.grandTotal,
      });

      if (quote.couponCode) {
        await tx
          .update(coupons)
          .set({ usedCount: sql`${coupons.usedCount} + 1` })
          .where(eq(coupons.code, quote.couponCode));
      }

      return {
        orderNumber,
        accessToken,
        grandTotal: quote.grandTotal,
        customerId: customerId as string,
      };
    });

    await writeAudit({
      actorType: "customer",
      actorEmail: data.email,
      action: "order.created",
      entityType: "order",
      entityId: result.orderNumber,
      summary: `Yeni sipariş: ${result.orderNumber}`,
      metadata: { grandTotal: result.grandTotal },
    });

    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof OrderError) return { ok: false, message: error.message };
    logger.error("checkout.place_order_failed", { error });
    return { ok: false, message: "Sipariş oluşturulamadı. Lütfen tekrar deneyin." };
  }
}

export type PaymentEventInput = {
  providerEventId: string;
  orderNumber: string;
  type: "succeeded" | "failed";
  amount: number;
  signatureValid: boolean;
};

export async function applyPaymentEvent(input: PaymentEventInput) {
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(paymentEvents)
      .values({
        providerEventId: input.providerEventId,
        orderNumber: input.orderNumber,
        type: input.type,
        amount: input.amount,
        signatureValid: input.signatureValid,
        payload: { ...input },
      })
      .onConflictDoNothing()
      .returning();

    if (inserted.length === 0) {
      return { ok: true, duplicate: true, message: "Bu ödeme bildirimi daha önce işlendi." };
    }

    const orderRows = await tx
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, input.orderNumber))
      .for("update");
    const order = orderRows[0];

    if (!order) {
      return { ok: false, duplicate: false, message: "Sipariş bulunamadı." };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    if (!input.signatureValid) {
      await writeAudit({
        actorType: "webhook",
        action: "payment.signature_invalid",
        entityType: "order",
        entityId: order.orderNumber,
        summary: "Geçersiz imzalı ödeme bildirimi reddedildi.",
      });
      return { ok: false, duplicate: false, message: "İmza doğrulanamadı." };
    }

    if (input.amount !== order.grandTotal) {
      await writeAudit({
        actorType: "webhook",
        action: "payment.amount_mismatch",
        entityType: "order",
        entityId: order.orderNumber,
        summary: `Tutar uyuşmazlığı: beklenen ${order.grandTotal}, gelen ${input.amount}.`,
      });
      return { ok: false, duplicate: false, message: "Ödeme tutarı siparişle uyuşmuyor." };
    }

    if (input.type === "succeeded") {
      if (order.paymentStatus === "paid") {
        return { ok: true, duplicate: true, message: "Sipariş zaten ödenmiş." };
      }
      await tx
        .update(orders)
        .set({ status: "paid", paymentStatus: "paid", updatedAt: new Date() })
        .where(eq(orders.id, order.id));

      if (order.status !== "pending_payment") {
        // Rezervasyon süresi dolmuş/iptal edilmiş siparişe geç gelen ödeme: stok garanti
        // edilemez. Otomatik onaylanmaz; operasyon ekibi iade veya yeniden işleme karar verir.
        await writeAudit({
          actorType: "webhook",
          action: "payment.late_success",
          entityType: "order",
          entityId: order.orderNumber,
          summary: `"${order.status}" durumundaki siparişe ödeme bildirimi geldi; manuel inceleme gerekli.`,
        });
        return {
          ok: false,
          duplicate: false,
          message: "Sipariş ödeme beklemiyor; manuel inceleme gerekli.",
        };
      }

      await commitReservedStock(tx, order.orderNumber, items, "payment-webhook");

      await tx
        .update(payments)
        .set({ status: "succeeded", providerRef: input.providerEventId })
        .where(eq(payments.orderId, order.id));
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "paid",
        note: "Ödeme sağlayıcı bildirimi imza ile doğrulandı.",
        actor: "payment-webhook",
      });
      await writeAudit({
        actorType: "webhook",
        action: "payment.succeeded",
        entityType: "order",
        entityId: order.orderNumber,
        summary: `Ödeme başarılı: ${(order.grandTotal / 100).toFixed(2)} TL`,
      });
      return { ok: true, duplicate: false, message: "Ödeme onaylandı." };
    }

    if (order.status !== "pending_payment") {
      return { ok: true, duplicate: true, message: "Sipariş ödeme beklemiyor; bildirim yok sayıldı." };
    }
    await tx
      .update(orders)
      .set({ status: "payment_failed", paymentStatus: "failed", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await releaseReservedStock(
      tx,
      order.orderNumber,
      items,
      "payment-webhook",
      "Ödeme başarısız, rezervasyon serbest bırakıldı.",
    );
    await tx.update(payments).set({ status: "failed" }).where(eq(payments.orderId, order.id));
    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "payment_failed",
      note: "Ödeme sağlayıcısı işlemi reddetti.",
      actor: "payment-webhook",
    });
    await writeAudit({
      actorType: "webhook",
      action: "payment.failed",
      entityType: "order",
      entityId: order.orderNumber,
      summary: "Ödeme başarısız, stok rezervasyonu serbest bırakıldı.",
    });
    return { ok: true, duplicate: false, message: "Ödeme başarısız olarak işaretlendi." };
  });

  return result;
}

export async function transitionOrder(input: {
  orderId: string;
  toStatus: string;
  actorEmail: string;
  note?: string;
  trackingNumber?: string;
  carrier?: string;
}) {
  const result = await db.transaction(async (tx) => {
    const orderRows = await tx
      .select()
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .for("update");
    const order = orderRows[0];
    if (!order) return { ok: false, message: "Sipariş bulunamadı." };

    const allowed = allowedNextStatuses(order.status);
    if (!allowed.includes(input.toStatus)) {
      return {
        ok: false,
        message: `"${ORDER_STATUS_LABELS[order.status] ?? order.status}" durumundan "${
          ORDER_STATUS_LABELS[input.toStatus] ?? input.toStatus
        }" durumuna geçilemez.`,
      };
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    if (input.toStatus === "cancelled") {
      for (const item of items) {
        if (!item.variantId) continue;
        if (order.paymentStatus === "paid") {
          await tx
            .update(inventory)
            .set({ onHand: sql`${inventory.onHand} + ${item.quantity}`, updatedAt: new Date() })
            .where(eq(inventory.variantId, item.variantId));
          await tx.insert(stockMovements).values({
            variantId: item.variantId,
            type: "return",
            quantity: item.quantity,
            reference: order.orderNumber,
            note: "Sipariş iptali, stok geri alındı.",
            actor: input.actorEmail,
          });
        }
      }
      // Rezervasyon yalnızca hâlâ ödeme beklenen siparişte tutulur; başarısız ödemede zaten çözülmüştür.
      if (order.status === "pending_payment") {
        await releaseReservedStock(
          tx,
          order.orderNumber,
          items,
          input.actorEmail,
          "Sipariş iptali, rezervasyon serbest bırakıldı.",
        );
      }
    }

    if (input.toStatus === "paid") {
      // Elle tahsilat onayı (havale/EFT): webhook ile aynı stok kesinleştirme yolu kullanılır.
      await commitReservedStock(tx, order.orderNumber, items, input.actorEmail);
      await tx
        .update(payments)
        .set({ status: "succeeded", providerRef: `manual:${input.actorEmail}` })
        .where(eq(payments.orderId, order.id));
    }


    if (input.toStatus === "returned") {
      for (const item of items) {
        if (!item.variantId) continue;
        await tx
          .update(inventory)
          .set({ onHand: sql`${inventory.onHand} + ${item.quantity}`, updatedAt: new Date() })
          .where(eq(inventory.variantId, item.variantId));
        await tx.insert(stockMovements).values({
          variantId: item.variantId,
          type: "return",
          quantity: item.quantity,
          reference: order.orderNumber,
          note: "İade kabul edildi, stok geri alındı.",
          actor: input.actorEmail,
        });
      }
    }

    if (input.toStatus === "shipped") {
      const carrier = input.carrier?.trim();
      const trackingNumber = input.trackingNumber?.trim();
      if (!carrier || !trackingNumber) {
        return { ok: false, message: "Kargoya verildi olarak işaretlemek için kargo firması ve takip numarası girin." };
      }
      await tx.insert(shipments).values({
        orderId: order.id,
        carrier,
        trackingNumber,
        status: "in_transit",
        shippedAt: new Date(),
      });
      await tx
        .update(orders)
        .set({ shippingCarrier: carrier, trackingNumber })
        .where(eq(orders.id, order.id));
    }

    await tx
      .update(orders)
      .set({
        status: input.toStatus,
        updatedAt: new Date(),
        ...(input.toStatus === "paid" ? { paymentStatus: "paid" } : {}),
        ...(input.toStatus === "refunded" ? { paymentStatus: "refunded" } : {}),
      })
      .where(eq(orders.id, order.id));

    await tx.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: input.toStatus,
      note: input.note || "Operasyon güncellemesi",
      actor: input.actorEmail,
    });

    return {
      ok: true,
      message: `Sipariş durumu "${ORDER_STATUS_LABELS[input.toStatus] ?? input.toStatus}" olarak güncellendi.`,
      orderNumber: order.orderNumber,
    };
  });

  if (result.ok) {
    await writeAudit({
      actorType: "admin",
      actorEmail: input.actorEmail,
      action: "order.status_changed",
      entityType: "order",
      entityId: result.orderNumber ?? input.orderId,
      summary: result.message,
      metadata: { toStatus: input.toStatus },
    });
  }

  return result;
}

export async function getOrderByNumber(orderNumber: string) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, orderNumber))
    .limit(1);
  const order = orderRows[0];
  if (!order) return null;

  const [items, history, shipmentRows, returns] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, order.id))
      .orderBy(desc(orderStatusHistory.createdAt)),
    db.select().from(shipments).where(eq(shipments.orderId, order.id)),
    db.select().from(returnRequests).where(eq(returnRequests.orderId, order.id)),
  ]);

  return { ...order, items, history, shipments: shipmentRows, returns };
}

export async function listOrdersForCustomer(customerId: string, email: string) {
  return db
    .select()
    .from(orders)
    .where(sql`${orders.customerId} = ${customerId} or lower(${orders.email}) = ${email.toLowerCase()}`)
    .orderBy(desc(orders.createdAt))
    .limit(30);
}

export async function createReturnRequest(input: {
  orderNumber: string;
  orderItemId?: string;
  reason: string;
  /** Oturum açmış müşterinin e-postası (varsa). */
  customerEmail?: string;
  /** Misafir erişimi için sipariş erişim anahtarı. */
  accessToken?: string;
}) {
  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, input.orderNumber))
    .limit(1);
  const order = orderRows[0];
  const isOwner =
    Boolean(order) &&
    ((input.customerEmail !== undefined &&
      input.customerEmail.toLowerCase() === order.email.toLowerCase()) ||
      tokensMatch(order.accessToken, input.accessToken));
  // Yetkisiz istekte siparişin var olup olmadığı açıklanmaz.
  if (!order || !isOwner) return { ok: false, message: "Sipariş bulunamadı." };
  const actorEmail = input.customerEmail ?? order.email;

  if (input.orderItemId) {
    const owned = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.id, input.orderItemId), eq(orderItems.orderId, order.id)))
      .limit(1);
    if (owned.length === 0) return { ok: false, message: "Ürün bu siparişe ait değil." };
  }

  const eligible = ["delivered", "shipped", "return_requested"] as const;
  if (!eligible.includes(order.status as (typeof eligible)[number])) {
    return {
      ok: false,
      message: "Yalnızca teslim edilmiş veya kargodaki siparişler için iade talebi oluşturulabilir.",
    };
  }

  await db.insert(returnRequests).values({
    orderId: order.id,
    orderItemId: input.orderItemId || null,
    reason: input.reason,
    status: "requested",
  });

  if (order.status !== "return_requested") {
    await db
      .update(orders)
      .set({ status: "return_requested", updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      fromStatus: order.status,
      toStatus: "return_requested",
      note: "Müşteri iade talebi oluşturdu. Hijyen ürünü istisnası hukuk kontrolüne tabidir.",
      actor: actorEmail,
    });
  }

  await writeAudit({
    actorType: "customer",
    actorEmail,
    action: "return.requested",
    entityType: "order",
    entityId: order.orderNumber,
    summary: "İade talebi oluşturuldu.",
  });

  return { ok: true, message: "İade talebiniz alındı. Ekibimiz inceleyip size dönüş yapacak." };
}

export async function getOrdersByEmailForTracking(email: string) {
  return db
    .select({ orderNumber: orders.orderNumber, status: orders.status, createdAt: orders.createdAt })
    .from(orders)
    .where(eq(orders.email, email.toLowerCase()))
    .orderBy(desc(orders.createdAt))
    .limit(10);
}

export async function countOrdersToday() {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(orders)
    .where(sql`${orders.createdAt}::date = current_date`);
  return rows[0]?.count ?? 0;
}

export async function getOrdersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  return db.select().from(orders).where(inArray(orders.id, ids));
}

export async function getOrdersForAdmin(status?: string) {
  const conditions = status && status !== "all" ? [eq(orders.status, status)] : [];
  return db
    .select()
    .from(orders)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt))
    .limit(80);
}

/**
 * Rezervasyon süresi dolmuş, hâlâ ödeme bekleyen siparişleri iptal eder ve
 * stoklarını serbest bırakır. Zamanlanmış görev tarafından çağrılır; tekrar
 * çalıştırılması güvenlidir (her sipariş satır kilidi altında yeniden kontrol edilir).
 */
export async function expireStaleReservations(now = new Date()) {
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "pending_payment"), lt(orders.reservationExpiresAt, now)))
    .limit(200);

  const expired: string[] = [];
  for (const candidate of stale) {
    const orderNumber = await db.transaction(async (tx) => {
      const rows = await tx.select().from(orders).where(eq(orders.id, candidate.id)).for("update");
      const order = rows[0];
      if (
        !order ||
        order.status !== "pending_payment" ||
        !order.reservationExpiresAt ||
        order.reservationExpiresAt >= now
      ) {
        return null;
      }
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      await releaseReservedStock(
        tx,
        order.orderNumber,
        items,
        "reservation-expiry",
        "Ödeme süresi doldu, rezervasyon serbest bırakıldı.",
      );
      await tx
        .update(orders)
        .set({ status: "cancelled", paymentStatus: "expired", updatedAt: now })
        .where(eq(orders.id, order.id));
      await tx.update(payments).set({ status: "expired" }).where(eq(payments.orderId, order.id));
      await tx.insert(orderStatusHistory).values({
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "cancelled",
        note: "Ödeme süresi içinde tamamlanmadı.",
        actor: "reservation-expiry",
      });
      return order.orderNumber;
    });
    if (orderNumber) expired.push(orderNumber);
  }

  if (expired.length > 0) {
    await writeAudit({
      actorType: "system",
      action: "order.reservation_expired",
      entityType: "order",
      summary: `${expired.length} siparişin rezervasyon süresi doldu.`,
      metadata: { orderNumbers: expired },
    });
  }
  return expired;
}
