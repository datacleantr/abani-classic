import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { coupons, inventory, productImages, productVariants, products } from "@/db/schema";

export const SHIPPING_FLAT = 4990;
export const FREE_SHIPPING_THRESHOLD = 100000;
export const MAX_QTY_PER_LINE = 10;

export type CartInputItem = { variantId: string; quantity: number };

export type QuoteLine = {
  variantId: string;
  productId: string;
  sku: string;
  productName: string;
  variantLabel: string;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  taxRate: number;
  available: number;
  slug: string;
};

export type Quote = {
  lines: QuoteLine[];
  itemCount: number;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  couponCode: string | null;
  couponDescription: string | null;
  freeShippingThreshold: number;
  issues: { code: string; message: string }[];
};

export type PricedRow = {
  variantId: string;
  productId: string;
  sku: string;
  size: string | null;
  color: string | null;
  packQuantity: number;
  priceOverride: number | null;
  variantActive: boolean;
  productName: string;
  slug: string;
  salePrice: number;
  taxRate: number;
  productStatus: string;
  onHand: number | null;
  reserved: number | null;
  imageUrl: string | null;
};

export type CouponConfig = {
  code: string;
  type: string;
  value: number;
  minSubtotal: number;
  isActive: boolean;
  usageLimit: number | null;
  usedCount: number;
};

/**
 * Pure quote calculation. All prices come from the database rows, never from
 * the browser. Prices are VAT-inclusive in Turkey, tax is reported as a portion.
 */
export function computeQuote(
  rows: PricedRow[],
  items: CartInputItem[],
  coupon: CouponConfig | null,
  requestedCouponCode?: string,
): Quote {
  const issues: Quote["issues"] = [];
  const lines: QuoteLine[] = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(item.quantity)));
    const row = rows.find((candidate) => candidate.variantId === item.variantId);
    if (!row) {
      issues.push({ code: "variant_missing", message: "Sepetinizde artık bulunmayan bir ürün var." });
      continue;
    }
    if (row.productStatus !== "published" || !row.variantActive) {
      issues.push({ code: "unavailable", message: `${row.productName} şu anda satışta değil.` });
      continue;
    }
    const available = Math.max(0, (row.onHand ?? 0) - (row.reserved ?? 0));
    if (available < quantity) {
      issues.push({
        code: "stock",
        message: `${row.productName} için yeterli stok yok (kalan: ${available}).`,
      });
      continue;
    }
    const unitPrice = row.priceOverride ?? row.salePrice;
    lines.push({
      variantId: row.variantId,
      productId: row.productId,
      sku: row.sku,
      productName: row.productName,
      variantLabel: [row.color, row.size, row.packQuantity > 1 ? `${row.packQuantity} adet` : null]
        .filter(Boolean)
        .join(" / "),
      imageUrl: row.imageUrl,
      unitPrice,
      quantity,
      lineTotal: unitPrice * quantity,
      taxRate: row.taxRate,
      available,
      slug: row.slug,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  let discountTotal = 0;
  let shippingTotal = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT;
  let couponCode: string | null = null;
  let couponDescription: string | null = null;

  if (requestedCouponCode && coupon) {
    if (!coupon.isActive) {
      issues.push({ code: "coupon", message: "Bu indirim kodu artık geçerli değil." });
    } else if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      issues.push({ code: "coupon", message: "Bu indirim kodunun kullanım limiti doldu." });
    } else if (subtotal < coupon.minSubtotal) {
      issues.push({
        code: "coupon",
        message: `Bu kod için sepet tutarı en az ${(coupon.minSubtotal / 100).toFixed(2)} TL olmalı.`,
      });
    } else {
      couponCode = coupon.code;
      couponDescription = coupon.type;
      if (coupon.type === "percent") {
        discountTotal = Math.round((subtotal * coupon.value) / 100);
      } else if (coupon.type === "fixed") {
        discountTotal = Math.min(coupon.value, subtotal);
      } else if (coupon.type === "shipping") {
        shippingTotal = 0;
      }
    }
  } else if (requestedCouponCode && !coupon) {
    issues.push({ code: "coupon", message: "İndirim kodu bulunamadı." });
  }

  const taxTotal = lines.reduce(
    (sum, line) => sum + Math.round((line.lineTotal * line.taxRate) / (100 + line.taxRate)),
    0,
  );
  const grandTotal = Math.max(0, subtotal - discountTotal + shippingTotal);

  return {
    lines,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal,
    discountTotal,
    shippingTotal,
    taxTotal,
    grandTotal,
    couponCode,
    couponDescription,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    issues,
  };
}

export async function loadPricedRows(
  variantIds: string[],
  client: Pick<typeof db, "select"> = db,
): Promise<PricedRow[]> {
  if (variantIds.length === 0) return [];
  const rows = await client
    .select({
      variantId: productVariants.id,
      productId: products.id,
      sku: productVariants.sku,
      size: productVariants.size,
      color: productVariants.color,
      packQuantity: productVariants.packQuantity,
      priceOverride: productVariants.priceOverride,
      variantActive: productVariants.isActive,
      productName: products.name,
      slug: products.slug,
      salePrice: products.salePrice,
      taxRate: products.taxRate,
      productStatus: products.status,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      imageUrl: productImages.url,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .leftJoin(productImages, eq(productImages.productId, products.id))
    .where(inArray(productVariants.id, variantIds))
    .orderBy(productImages.sortOrder);

  const seen = new Map<string, PricedRow>();
  for (const row of rows) {
    if (!seen.has(row.variantId)) seen.set(row.variantId, row);
  }
  return [...seen.values()];
}

export async function quoteCart(
  items: CartInputItem[],
  requestedCouponCode?: string,
): Promise<Quote> {
  const cleanItems = items
    .filter((item) => typeof item.variantId === "string" && Number.isFinite(item.quantity))
    .slice(0, 40);
  const variantIds = [...new Set(cleanItems.map((item) => item.variantId))];
  const rows = await loadPricedRows(variantIds);

  let coupon: CouponConfig | null = null;
  if (requestedCouponCode) {
    const couponRows = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, requestedCouponCode.trim().toUpperCase()))
      .limit(1);
    const found = couponRows[0];
    if (found) {
      coupon = {
        code: found.code,
        type: found.type,
        value: found.value,
        minSubtotal: found.minSubtotal,
        isActive: found.isActive,
        usageLimit: found.usageLimit,
        usedCount: found.usedCount,
      };
    }
  }

  return computeQuote(rows, cleanItems, coupon, requestedCouponCode);
}
