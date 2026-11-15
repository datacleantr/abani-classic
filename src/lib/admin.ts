import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLogs,
  brands,
  categories,
  importBatches,
  inventory,
  orderItems,
  orders,
  productImages,
  productVariants,
  products,
  returnRequests,
  reviews,
} from "@/db/schema";

export async function getDashboardMetrics() {
  const [totalsRows, pendingRows, lowStockRows, topProductRows, recentOrders, salesByDay, importRows, reviewRows, returnRows] =
    await Promise.all([
      db
        .select({
          paidOrders: sql<number>`count(*)::int`,
          grossSales: sql<number>`coalesce(sum(${orders.grandTotal}), 0)::int`,
          avgBasket: sql<number>`coalesce(avg(${orders.grandTotal}), 0)::int`,
        })
        .from(orders)
        .where(eq(orders.paymentStatus, "paid")),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(orders)
        .where(sql`${orders.status} in ('pending_payment', 'paid', 'processing', 'packed')`),
      db
        .select({
          variantId: productVariants.id,
          sku: productVariants.sku,
          productName: products.name,
          size: productVariants.size,
          color: productVariants.color,
          available: sql<number>`(${inventory.onHand} - ${inventory.reserved})::int`,
          reorderLevel: inventory.reorderLevel,
        })
        .from(inventory)
        .innerJoin(productVariants, eq(productVariants.id, inventory.variantId))
        .innerJoin(products, eq(products.id, productVariants.productId))
        .where(sql`(${inventory.onHand} - ${inventory.reserved}) <= ${inventory.reorderLevel}`)
        .orderBy(asc(sql`(${inventory.onHand} - ${inventory.reserved})`))
        .limit(8),
      db
        .select({
          productName: orderItems.productName,
          units: sql<number>`sum(${orderItems.quantity})::int`,
          revenue: sql<number>`sum(${orderItems.lineTotal})::int`,
        })
        .from(orderItems)
        .groupBy(orderItems.productName)
        .orderBy(desc(sql`sum(${orderItems.quantity})`))
        .limit(5),
      db.select().from(orders).orderBy(desc(orders.createdAt)).limit(6),
      db
        .select({
          day: sql<string>`to_char(date_trunc('day', ${orders.createdAt}), 'DD.MM')`,
          total: sql<number>`coalesce(sum(${orders.grandTotal}), 0)::int`,
        })
        .from(orders)
        .where(sql`${orders.paymentStatus} = 'paid' and ${orders.createdAt} > now() - interval '13 days'`)
        .groupBy(sql`date_trunc('day', ${orders.createdAt})`)
        .orderBy(sql`date_trunc('day', ${orders.createdAt})`),
      db
        .select()
        .from(importBatches)
        .orderBy(desc(importBatches.createdAt))
        .limit(3),
      db.select({ count: sql<number>`count(*)::int` }).from(reviews).where(eq(reviews.isApproved, false)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(returnRequests)
        .where(eq(returnRequests.status, "requested")),
    ]);

  const publishedRows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.status, "published"));

  return {
    paidOrders: totalsRows[0]?.paidOrders ?? 0,
    grossSales: totalsRows[0]?.grossSales ?? 0,
    avgBasket: totalsRows[0]?.avgBasket ?? 0,
    pendingOrders: pendingRows[0]?.count ?? 0,
    publishedProducts: publishedRows[0]?.count ?? 0,
    lowStock: lowStockRows,
    topProducts: topProductRows,
    recentOrders,
    salesByDay,
    imports: importRows,
    pendingReviews: reviewRows[0]?.count ?? 0,
    openReturns: returnRows[0]?.count ?? 0,
  };
}

export async function listAdminProducts(filters: { status?: string; q?: string } = {}) {
  const conditions = [];
  if (filters.status && filters.status !== "all") conditions.push(eq(products.status, filters.status));
  if (filters.q) {
    const term = `%${filters.q}%`;
    const search = or(ilike(products.name, term), ilike(products.slug, term), ilike(products.modelCode, term));
    if (search) conditions.push(search);
  }

  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      status: products.status,
      salePrice: products.salePrice,
      listPrice: products.listPrice,
      brandName: brands.name,
      categoryName: categories.name,
      updatedAt: products.updatedAt,
      variantCount: sql<number>`count(distinct ${productVariants.id})::int`,
      stock: sql<number>`coalesce(sum(${inventory.onHand} - ${inventory.reserved}), 0)::int`,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .leftJoin(productVariants, eq(productVariants.productId, products.id))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(products.id, brands.name, categories.name)
    .orderBy(desc(products.updatedAt))
    .limit(100);
}

export async function getAdminProduct(id: string) {
  const rows = await db
    .select({
      product: products,
      brandName: brands.name,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(eq(products.id, id))
    .limit(1);
  if (!rows[0]) return null;

  const [variants, images] = await Promise.all([
    db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        size: productVariants.size,
        color: productVariants.color,
        isActive: productVariants.isActive,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
        reorderLevel: inventory.reorderLevel,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(eq(productVariants.productId, id))
      .orderBy(asc(productVariants.sku)),
    db
      .select()
      .from(productImages)
      .where(eq(productImages.productId, id))
      .orderBy(asc(productImages.sortOrder)),
  ]);

  return { ...rows[0].product, brandName: rows[0].brandName, categoryName: rows[0].categoryName, variants, images };
}

export async function getAdminFormOptions() {
  const [brandRows, categoryRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.sortOrder)),
  ]);
  return { brands: brandRows, categories: categoryRows };
}

export async function listInventoryRows() {
  return db
    .select({
      variantId: productVariants.id,
      sku: productVariants.sku,
      color: productVariants.color,
      size: productVariants.size,
      productName: products.name,
      productSlug: products.slug,
      status: products.status,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      available: sql<number>`(${inventory.onHand} - ${inventory.reserved})::int`,
      reorderLevel: inventory.reorderLevel,
      updatedAt: inventory.updatedAt,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.productId))
    .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
    .orderBy(asc(sql`(${inventory.onHand} - ${inventory.reserved})`))
    .limit(200);
}

export async function listAuditLogs(limit = 60) {
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

export async function listReviewsForAdmin() {
  return db
    .select({
      id: reviews.id,
      customerName: reviews.customerName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      isApproved: reviews.isApproved,
      createdAt: reviews.createdAt,
      productName: products.name,
    })
    .from(reviews)
    .innerJoin(products, eq(products.id, reviews.productId))
    .orderBy(desc(reviews.createdAt))
    .limit(40);
}
