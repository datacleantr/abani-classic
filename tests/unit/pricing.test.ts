import { describe, expect, it } from "vitest";

import {
  computeQuote,
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT,
  type CouponConfig,
  type PricedRow,
} from "@/lib/pricing";

function row(overrides: Partial<PricedRow> = {}): PricedRow {
  return {
    variantId: "v1",
    productId: "p1",
    sku: "SKU-1",
    size: "M",
    color: "Siyah",
    packQuantity: 1,
    priceOverride: null,
    variantActive: true,
    productName: "Test Boxer",
    slug: "test-boxer",
    salePrice: 30000,
    taxRate: 10,
    productStatus: "published",
    onHand: 10,
    reserved: 0,
    imageUrl: null,
    ...overrides,
  };
}

function coupon(overrides: Partial<CouponConfig> = {}): CouponConfig {
  return {
    code: "ABANI10",
    type: "percent",
    value: 10,
    minSubtotal: 0,
    isActive: true,
    usageLimit: null,
    usedCount: 0,
    ...overrides,
  };
}

describe("computeQuote", () => {
  it("ara toplamı, kargoyu ve KDV payını hesaplar", () => {
    const quote = computeQuote([row()], [{ variantId: "v1", quantity: 2 }], null);
    expect(quote.subtotal).toBe(60000);
    expect(quote.shippingTotal).toBe(SHIPPING_FLAT);
    expect(quote.grandTotal).toBe(60000 + SHIPPING_FLAT);
    expect(quote.taxTotal).toBe(Math.round((60000 * 10) / 110));
    expect(quote.issues).toEqual([]);
  });

  it("eşik aşıldığında kargo ücretsizdir", () => {
    const quote = computeQuote(
      [row({ salePrice: FREE_SHIPPING_THRESHOLD })],
      [{ variantId: "v1", quantity: 1 }],
      null,
    );
    expect(quote.shippingTotal).toBe(0);
  });

  it("varyant fiyatı ürün fiyatının önüne geçer", () => {
    const quote = computeQuote([row({ priceOverride: 45000 })], [{ variantId: "v1", quantity: 1 }], null);
    expect(quote.lines[0].unitPrice).toBe(45000);
  });

  it("yayında olmayan, pasif veya stoğu yetmeyen ürünü reddeder", () => {
    const items = [{ variantId: "v1", quantity: 3 }];
    expect(computeQuote([row({ productStatus: "review" })], items, null).issues[0].code).toBe("unavailable");
    expect(computeQuote([row({ variantActive: false })], items, null).issues[0].code).toBe("unavailable");
    expect(computeQuote([row({ onHand: 5, reserved: 3 })], items, null).issues[0].code).toBe("stock");
    expect(computeQuote([], items, null).issues[0].code).toBe("variant_missing");
  });

  it("rezerve edilmiş stoğu satılabilir saymaz", () => {
    const quote = computeQuote([row({ onHand: 5, reserved: 3 })], [{ variantId: "v1", quantity: 2 }], null);
    expect(quote.issues).toEqual([]);
    expect(quote.lines[0].available).toBe(2);
  });

  it("yüzde, sabit ve kargo kuponlarını uygular", () => {
    const items = [{ variantId: "v1", quantity: 2 }];
    expect(computeQuote([row()], items, coupon(), "ABANI10").discountTotal).toBe(6000);
    expect(
      computeQuote([row()], items, coupon({ type: "fixed", value: 999999 }), "X").discountTotal,
    ).toBe(60000);
    expect(computeQuote([row()], items, coupon({ type: "shipping" }), "X").shippingTotal).toBe(0);
  });

  it("geçersiz kuponu uygulamaz ve nedenini bildirir", () => {
    const items = [{ variantId: "v1", quantity: 1 }];
    const cases: (CouponConfig | null)[] = [
      coupon({ isActive: false }),
      coupon({ usageLimit: 5, usedCount: 5 }),
      coupon({ minSubtotal: 100000 }),
      null,
    ];
    for (const config of cases) {
      const quote = computeQuote([row()], items, config, "ABANI10");
      expect(quote.discountTotal).toBe(0);
      expect(quote.couponCode).toBeNull();
      expect(quote.issues[0].code).toBe("coupon");
    }
  });

  it("miktarı satır başına üst sınıra indirir", () => {
    const quote = computeQuote([row({ onHand: 500 })], [{ variantId: "v1", quantity: 999 }], null);
    expect(quote.lines[0].quantity).toBe(10);
  });
});
