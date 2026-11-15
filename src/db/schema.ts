import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/* Catalog                                                                     */
/* -------------------------------------------------------------------------- */

export const brands = pgTable(
  "brands",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    description: text("description"),
    origin: varchar("origin", { length: 120 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("brands_slug_uq").on(t.slug)],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    slug: varchar("slug", { length: 180 }).notNull(),
    shortName: varchar("short_name", { length: 80 }),
    description: text("description"),
    seoText: text("seo_text"),
    imageUrl: text("image_url"),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("categories_slug_uq").on(t.slug)],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brandId: uuid("brand_id").references(() => brands.id),
    categoryId: uuid("category_id").references(() => categories.id),
    name: varchar("name", { length: 240 }).notNull(),
    slug: varchar("slug", { length: 260 }).notNull(),
    modelCode: varchar("model_code", { length: 80 }),
    shortDescription: text("short_description"),
    description: text("description"),
    fabric: varchar("fabric", { length: 160 }),
    care: text("care"),
    packInfo: varchar("pack_info", { length: 160 }),
    listPrice: integer("list_price").notNull().default(0),
    salePrice: integer("sale_price").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("TRY"),
    taxRate: integer("tax_rate").notNull().default(10),
    status: varchar("status", { length: 24 }).notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    sourceKey: varchar("source_key", { length: 40 }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("products_slug_uq").on(t.slug),
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_brand_idx").on(t.brandId),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: varchar("alt", { length: 240 }),
    sortOrder: integer("sort_order").notNull().default(0),
    rightsStatus: varchar("rights_status", { length: 24 }).notNull().default("authorized"),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }).notNull(),
    barcode: varchar("barcode", { length: 80 }),
    size: varchar("size", { length: 40 }),
    color: varchar("color", { length: 60 }),
    packQuantity: integer("pack_quantity").notNull().default(1),
    priceOverride: integer("price_override"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("product_variants_sku_uq").on(t.sku),
    index("product_variants_product_idx").on(t.productId),
  ],
);

export const inventory = pgTable(
  "inventory",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    warehouseCode: varchar("warehouse_code", { length: 40 }).notNull().default("MAIN"),
    onHand: integer("on_hand").notNull().default(0),
    reserved: integer("reserved").notNull().default(0),
    reorderLevel: integer("reorder_level").notNull().default(5),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("inventory_variant_warehouse_uq").on(t.variantId, t.warehouseCode)],
);

export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    warehouseCode: varchar("warehouse_code", { length: 40 }).notNull().default("MAIN"),
    type: varchar("type", { length: 32 }).notNull(),
    quantity: integer("quantity").notNull(),
    reference: varchar("reference", { length: 120 }),
    note: text("note"),
    actor: varchar("actor", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("stock_movements_variant_idx").on(t.variantId)],
);

export const marketplaceListings = pgTable(
  "marketplace_listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceKey: varchar("source_key", { length: 40 }).notNull(),
    sourceListingId: varchar("source_listing_id", { length: 120 }).notNull(),
    sourceSku: varchar("source_sku", { length: 100 }),
    productId: uuid("product_id").references(() => products.id),
    variantId: uuid("variant_id").references(() => productVariants.id),
    sourcePriceMinor: integer("source_price_minor"),
    sourceStock: integer("source_stock"),
    matchScore: integer("match_score"),
    matchedBy: varchar("matched_by", { length: 40 }),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("marketplace_listings_uq").on(t.sourceKey, t.sourceListingId)],
);

/* -------------------------------------------------------------------------- */
/* Customers, staff & sessions                                                 */
/* -------------------------------------------------------------------------- */

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 200 }).notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    phone: varchar("phone", { length: 40 }),
    passwordHash: text("password_hash"),
    defaultCity: varchar("default_city", { length: 80 }),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("customers_email_uq").on(t.email)],
);

export const adminUsers = pgTable(
  "admin_users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 200 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 40 }).notNull().default("catalog_manager"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("admin_users_email_uq").on(t.email)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    token: varchar("token", { length: 128 }).notNull(),
    subjectType: varchar("subject_type", { length: 24 }).notNull(),
    subjectId: uuid("subject_id").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_uq").on(t.token)],
);

/* -------------------------------------------------------------------------- */
/* Promotions                                                                  */
/* -------------------------------------------------------------------------- */

export const coupons = pgTable(
  "coupons",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 40 }).notNull(),
    description: varchar("description", { length: 200 }),
    type: varchar("type", { length: 16 }).notNull(),
    value: integer("value").notNull(),
    minSubtotal: integer("min_subtotal").notNull().default(0),
    usageLimit: integer("usage_limit"),
    usedCount: integer("used_count").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_uq").on(t.code)],
);

/* -------------------------------------------------------------------------- */
/* Orders, payments, shipping, returns                                         */
/* -------------------------------------------------------------------------- */

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 32 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("pending_payment"),
    paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending"),
    customerId: uuid("customer_id").references(() => customers.id),
    email: varchar("email", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 40 }).notNull(),
    firstName: varchar("first_name", { length: 120 }).notNull(),
    lastName: varchar("last_name", { length: 120 }).notNull(),
    addressLine: text("address_line").notNull(),
    district: varchar("district", { length: 80 }).notNull(),
    city: varchar("city", { length: 80 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    note: text("note"),
    subtotal: integer("subtotal").notNull(),
    discountTotal: integer("discount_total").notNull().default(0),
    shippingTotal: integer("shipping_total").notNull().default(0),
    grandTotal: integer("grand_total").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("TRY"),
    couponCode: varchar("coupon_code", { length: 40 }),
    shippingCarrier: varchar("shipping_carrier", { length: 80 }),
    trackingNumber: varchar("tracking_number", { length: 80 }),
    marketingConsent: boolean("marketing_consent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("orders_number_uq").on(t.orderNumber),
    index("orders_status_idx").on(t.status),
    index("orders_email_idx").on(t.email),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: uuid("product_id"),
    variantId: uuid("variant_id"),
    sku: varchar("sku", { length: 100 }).notNull(),
    productName: varchar("product_name", { length: 240 }).notNull(),
    variantLabel: varchar("variant_label", { length: 160 }),
    imageUrl: text("image_url"),
    unitPrice: integer("unit_price").notNull(),
    quantity: integer("quantity").notNull(),
    discount: integer("discount").notNull().default(0),
    taxRate: integer("tax_rate").notNull().default(10),
    taxAmount: integer("tax_amount").notNull().default(0),
    lineTotal: integer("line_total").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("TRY"),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: varchar("from_status", { length: 32 }),
    toStatus: varchar("to_status", { length: 32 }).notNull(),
    note: text("note"),
    actor: varchar("actor", { length: 160 }).notNull().default("system"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId)],
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 40 }).notNull().default("mockpay"),
    providerRef: varchar("provider_ref", { length: 120 }),
    status: varchar("status", { length: 24 }).notNull().default("pending"),
    amount: integer("amount").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("TRY"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("payments_order_idx").on(t.orderId)],
);

export const paymentEvents = pgTable(
  "payment_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerEventId: varchar("provider_event_id", { length: 120 }).notNull(),
    orderNumber: varchar("order_number", { length: 32 }),
    type: varchar("type", { length: 40 }).notNull(),
    amount: integer("amount"),
    signatureValid: boolean("signature_valid").notNull().default(false),
    payload: jsonb("payload"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_events_provider_event_uq").on(t.providerEventId)],
);

export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    key: varchar("key", { length: 120 }).notNull(),
    scope: varchar("scope", { length: 60 }).notNull(),
    orderNumber: varchar("order_number", { length: 32 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idempotency_keys_key_uq").on(t.key)],
);

export const shipments = pgTable(
  "shipments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: varchar("carrier", { length: 80 }).notNull(),
    trackingNumber: varchar("tracking_number", { length: 80 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("created"),
    shippedAt: timestamp("shipped_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("shipments_order_idx").on(t.orderId)],
);

export const returnRequests = pgTable(
  "return_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id),
    reason: text("reason").notNull(),
    status: varchar("status", { length: 32 }).notNull().default("requested"),
    resolutionNote: text("resolution_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("return_requests_order_idx").on(t.orderId)],
);

/* -------------------------------------------------------------------------- */
/* Reviews                                                                     */
/* -------------------------------------------------------------------------- */

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    customerName: varchar("customer_name", { length: 160 }).notNull(),
    rating: integer("rating").notNull(),
    title: varchar("title", { length: 200 }),
    body: text("body").notNull(),
    isApproved: boolean("is_approved").notNull().default(false),
    isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reviews_product_idx").on(t.productId)],
);

/* -------------------------------------------------------------------------- */
/* Import engine                                                               */
/* -------------------------------------------------------------------------- */

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  sourceKey: varchar("source_key", { length: 40 }).notNull(),
  fileName: varchar("file_name", { length: 240 }).notNull(),
  fileHash: varchar("file_hash", { length: 64 }).notNull(),
  mode: varchar("mode", { length: 16 }).notNull().default("dry_run"),
  status: varchar("status", { length: 24 }).notNull().default("parsed"),
  totalRows: integer("total_rows").notNull().default(0),
  validRows: integer("valid_rows").notNull().default(0),
  errorRows: integer("error_rows").notNull().default(0),
  matchRows: integer("match_rows").notNull().default(0),
  newRows: integer("new_rows").notNull().default(0),
  publishedRows: integer("published_rows").notNull().default(0),
  createdBy: varchar("created_by", { length: 160 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const importItems = pgTable(
  "import_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => importBatches.id, { onDelete: "cascade" }),
    rowNumber: integer("row_number").notNull(),
    title: varchar("title", { length: 240 }),
    brandName: varchar("brand_name", { length: 160 }),
    categoryPath: varchar("category_path", { length: 200 }),
    barcode: varchar("barcode", { length: 80 }),
    sourceSku: varchar("source_sku", { length: 120 }),
    sourcePriceMinor: integer("source_price_minor"),
    sourceStock: integer("source_stock"),
    status: varchar("status", { length: 24 }).notNull(),
    matchScore: integer("match_score"),
    matchedProductId: uuid("matched_product_id").references(() => products.id),
    message: text("message"),
    rawPayload: jsonb("raw_payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("import_items_batch_idx").on(t.batchId)],
);

/* -------------------------------------------------------------------------- */
/* Audit & marketing                                                           */
/* -------------------------------------------------------------------------- */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorType: varchar("actor_type", { length: 24 }).notNull().default("system"),
    actorEmail: varchar("actor_email", { length: 200 }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }),
    summary: text("summary"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_created_idx").on(t.createdAt)],
);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 200 }).notNull(),
    consentSource: varchar("consent_source", { length: 80 }).notNull().default("footer"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("newsletter_email_uq").on(t.email)],
);
