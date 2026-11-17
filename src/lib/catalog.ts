import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql, type SQL } from "drizzle-orm";
import { cache } from "react";

import { db } from "@/db";
import {
  brands,
  categories,
  inventory,
  orderItems,
  productImages,
  productVariants,
  products,
  reviews,
} from "@/db/schema";
import { sortSizes } from "./format";
import { DISPLAYABLE_IMAGE_RIGHTS } from "./image-rights";
import {
  diversifyByKey,
  interleaveGroups,
  maxActivePackQuantity,
  packLabel,
  PRODUCT_IMAGE_PLACEHOLDER,
} from "./product-card-helpers";
import { sanitizeProductIds } from "./product-ids";

const displayableImage = inArray(productImages.rightsStatus, [...DISPLAYABLE_IMAGE_RIGHTS]);

export type VariantView = {
  id: string;
  sku: string;
  size: string | null;
  color: string | null;
  packQuantity: number;
  price: number;
  stock: number;
  active: boolean;
};

export type ProductCardView = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  modelCode: string | null;
  brandName: string;
  brandSlug: string;
  categoryName: string;
  categorySlug: string;
  image: string;
  hoverImage: string | null;
  price: number;
  listPrice: number;
  discountPercent: number;
  packInfo: string | null;
  /** Etkin varyantlardaki en büyük paket adedi (1 = tekli ürün). */
  packQuantity: number;
  isNew: boolean;
  isFeatured: boolean;
  rating: number;
  reviewCount: number;
  soldCount: number;
  stockTotal: number;
  colors: string[];
  sizes: string[];
  variants: VariantView[];
};

export type ProductDetailView = ProductCardView & {
  description: string | null;
  fabric: string | null;
  care: string | null;
  attributes: Record<string, string>;
  images: { url: string; alt: string | null }[];
  reviews: {
    id: string;
    customerName: string;
    rating: number;
    title: string | null;
    body: string;
    createdAt: Date;
    isVerifiedPurchase: boolean;
  }[];
  relatedProducts: ProductCardView[];
};

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  shortName: string | null;
  description: string | null;
  seoText: string | null;
  imageUrl: string | null;
  productCount: number;
  /** Kapak: `imageUrl`, yoksa kategorideki yayında bir ürünün gösterilebilir ilk görseli. */
  coverImage: string | null;
};

export type StoreBrand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  origin: string | null;
  productCount: number;
};

export type ListOptions = {
  categorySlug?: string;
  brandSlug?: string;
  q?: string;
  featured?: boolean;
  isNew?: boolean;
  sort?: "recommended" | "best_sellers" | "price_asc" | "price_desc" | "newest";
  brandFilters?: string[];
  sizeFilters?: string[];
  colorFilters?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  page?: number;
  perPage?: number;
};

export type ListResult = {
  items: ProductCardView[];
  total: number;
  page: number;
  perPage: number;
  facets: {
    brands: { slug: string; name: string; count: number }[];
    sizes: string[];
    colors: string[];
    minPrice: number;
    maxPrice: number;
  };
};

const baseProductColumns = {
  id: products.id,
  name: products.name,
  slug: products.slug,
  shortDescription: products.shortDescription,
  modelCode: products.modelCode,
  salePrice: products.salePrice,
  listPrice: products.listPrice,
  packInfo: products.packInfo,
  isNew: products.isNew,
  isFeatured: products.isFeatured,
  brandName: brands.name,
  brandSlug: brands.slug,
  categoryName: categories.name,
  categorySlug: categories.slug,
};

async function decorate(
  rows: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    modelCode: string | null;
    salePrice: number;
    listPrice: number;
    packInfo: string | null;
    isNew: boolean;
    isFeatured: boolean;
    brandName: string | null;
    brandSlug: string | null;
    categoryName: string | null;
    categorySlug: string | null;
  }[],
): Promise<ProductCardView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const [imageRows, variantRows, reviewRows, soldRows] = await Promise.all([
    db
      .select({
        productId: productImages.productId,
        url: productImages.url,
        alt: productImages.alt,
        sortOrder: productImages.sortOrder,
      })
      .from(productImages)
      .where(and(inArray(productImages.productId, ids), displayableImage))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        size: productVariants.size,
        color: productVariants.color,
        packQuantity: productVariants.packQuantity,
        priceOverride: productVariants.priceOverride,
        isActive: productVariants.isActive,
        onHand: inventory.onHand,
        reserved: inventory.reserved,
      })
      .from(productVariants)
      .leftJoin(inventory, eq(inventory.variantId, productVariants.id))
      .where(inArray(productVariants.productId, ids))
      .orderBy(asc(productVariants.sku)),
    db
      .select({
        productId: reviews.productId,
        count: sql<number>`count(*)::int`,
        avg: sql<number>`coalesce(avg(${reviews.rating}), 0)::float`,
      })
      .from(reviews)
      .where(and(inArray(reviews.productId, ids), eq(reviews.isApproved, true)))
      .groupBy(reviews.productId),
    db
      .select({
        productId: orderItems.productId,
        count: sql<number>`sum(${orderItems.quantity})::int`,
      })
      .from(orderItems)
      .where(inArray(orderItems.productId, ids))
      .groupBy(orderItems.productId),
  ]);

  const imagesByProduct = new Map<string, { url: string; alt: string | null }[]>();
  for (const image of imageRows) {
    const list = imagesByProduct.get(image.productId) ?? [];
    list.push({ url: image.url, alt: image.alt });
    imagesByProduct.set(image.productId, list);
  }

  const variantsByProduct = new Map<string, VariantView[]>();
  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      packQuantity: variant.packQuantity,
      price: variant.priceOverride ?? 0,
      stock: Math.max(0, (variant.onHand ?? 0) - (variant.reserved ?? 0)),
      active: variant.isActive,
    });
    variantsByProduct.set(variant.productId, list);
  }

  const reviewMap = new Map(reviewRows.map((r) => [r.productId, r]));
  const soldMap = new Map(soldRows.map((r) => [r.productId ?? "", r.count]));

  return rows.map((row) => {
    const productVariantsList = variantsByProduct.get(row.id) ?? [];
    const imageList = imagesByProduct.get(row.id) ?? [];
    const price = row.salePrice;
    const variants = productVariantsList.map((variant) => ({
      ...variant,
      price: variant.price > 0 ? variant.price : price,
    }));
    const stats = reviewMap.get(row.id);
    const colors = [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))];
    const sizes = sortSizes(
      variants.map((v) => v.size).filter((size): size is string => Boolean(size)),
    );

    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      shortDescription: row.shortDescription,
      modelCode: row.modelCode,
      brandName: row.brandName ?? "Abani Classic",
      brandSlug: row.brandSlug ?? "abani-classic",
      categoryName: row.categoryName ?? "Koleksiyon",
      categorySlug: row.categorySlug ?? "erkek-boxer",
      image: imageList[0]?.url ?? PRODUCT_IMAGE_PLACEHOLDER,
      hoverImage: imageList[1]?.url ?? null,
      price,
      listPrice: row.listPrice,
      discountPercent:
        row.listPrice > price ? Math.round(((row.listPrice - price) / row.listPrice) * 100) : 0,
      packInfo: row.packInfo,
      packQuantity: maxActivePackQuantity(variants),
      isNew: row.isNew,
      isFeatured: row.isFeatured,
      rating: stats?.avg ? Math.round(stats.avg * 10) / 10 : 0,
      reviewCount: stats?.count ?? 0,
      soldCount: soldMap.get(row.id) ?? 0,
      stockTotal: variants.reduce((sum, v) => sum + v.stock, 0),
      colors,
      sizes,
      variants,
    };
  });
}

export async function listProducts(options: ListOptions = {}): Promise<ListResult> {
  const perPage = options.perPage ?? 12;
  const page = Math.max(1, options.page ?? 1);

  const conditions = [eq(products.status, "published")];
  if (options.categorySlug) conditions.push(eq(categories.slug, options.categorySlug));
  if (options.brandSlug) conditions.push(eq(brands.slug, options.brandSlug));
  if (options.featured) conditions.push(eq(products.isFeatured, true));
  if (options.isNew) conditions.push(eq(products.isNew, true));
  if (options.q && options.q.trim().length > 0) {
    const term = `%${options.q.trim()}%`;
    const search = or(
      ilike(products.name, term),
      ilike(products.modelCode, term),
      ilike(products.shortDescription, term),
      ilike(products.description, term),
      ilike(brands.name, term),
    );
    if (search) conditions.push(search);
  }
  if (options.minPrice !== undefined) conditions.push(gte(products.salePrice, options.minPrice));
  if (options.maxPrice !== undefined) conditions.push(lte(products.salePrice, options.maxPrice));

  const orderBy =
    options.sort === "price_asc"
      ? [asc(products.salePrice)]
      : options.sort === "price_desc"
        ? [desc(products.salePrice)]
        : options.sort === "newest"
          ? [desc(products.createdAt)]
          : [desc(products.isFeatured), desc(products.createdAt)];

  const rows = await db
    .select(baseProductColumns)
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(...conditions))
    .orderBy(...orderBy);

  let decorated = await decorate(rows);

  const facets = {
    brands: [...new Map(decorated.map((d) => [d.brandSlug, { slug: d.brandSlug, name: d.brandName, count: 0 }])).values()],
    sizes: sortSizes(decorated.flatMap((d) => d.sizes)),
    colors: [...new Set(decorated.flatMap((d) => d.colors))],
    minPrice: decorated.length ? Math.min(...decorated.map((d) => d.price)) : 0,
    maxPrice: decorated.length ? Math.max(...decorated.map((d) => d.price)) : 0,
  };
  for (const brandFacet of facets.brands) {
    brandFacet.count = decorated.filter((d) => d.brandSlug === brandFacet.slug).length;
  }

  if (options.brandFilters?.length) {
    decorated = decorated.filter((d) => options.brandFilters?.includes(d.brandSlug));
  }
  if (options.sizeFilters?.length) {
    decorated = decorated.filter((d) => d.sizes.some((size) => options.sizeFilters?.includes(size)));
  }
  if (options.colorFilters?.length) {
    decorated = decorated.filter((d) => d.colors.some((c) => options.colorFilters?.includes(c)));
  }
  if (options.inStockOnly) {
    decorated = decorated.filter((d) => d.stockTotal > 0);
  }

  if (options.sort === "best_sellers") {
    decorated.sort((a, b) => b.soldCount - a.soldCount);
  }

  const total = decorated.length;
  const start = (page - 1) * perPage;
  return {
    items: decorated.slice(start, start + perPage),
    total,
    page,
    perPage,
    facets,
  };
}

export async function getProductDetail(slug: string): Promise<ProductDetailView | null> {
  const rows = await db
    .select({
      ...baseProductColumns,
      description: products.description,
      fabric: products.fabric,
      care: products.care,
      attributes: products.attributes,
      categoryId: products.categoryId,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(eq(products.slug, slug), eq(products.status, "published")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const [decorated] = await decorate([row]);
  if (!decorated) return null;

  const [imageRows, reviewRows, related] = await Promise.all([
    db
      .select({ url: productImages.url, alt: productImages.alt })
      .from(productImages)
      .where(and(eq(productImages.productId, row.id), displayableImage))
      .orderBy(asc(productImages.sortOrder)),
    db
      .select({
        id: reviews.id,
        customerName: reviews.customerName,
        rating: reviews.rating,
        title: reviews.title,
        body: reviews.body,
        createdAt: reviews.createdAt,
        isVerifiedPurchase: reviews.isVerifiedPurchase,
      })
      .from(reviews)
      .where(and(eq(reviews.productId, row.id), eq(reviews.isApproved, true)))
      .orderBy(desc(reviews.createdAt))
      .limit(8),
    row.categoryId
      ? listProducts({ categorySlug: row.categorySlug ?? undefined, perPage: 8 })
      : Promise.resolve({ items: [], total: 0, page: 1, perPage: 8, facets: { brands: [], sizes: [], colors: [], minPrice: 0, maxPrice: 0 } }),
  ]);

  return {
    ...decorated,
    description: row.description,
    fabric: row.fabric,
    care: row.care,
    attributes: row.attributes ?? {},
    images: imageRows.length ? imageRows : [{ url: decorated.image, alt: decorated.name }],
    reviews: reviewRows,
    relatedProducts: related.items.filter((item) => item.id !== row.id).slice(0, 4),
  };
}

/** Vitrinde gösterilebilir görsel hakları, SQL IN listesi olarak. */
const displayableRightsSql = sql.join(
  DISPLAYABLE_IMAGE_RIGHTS.map((right) => sql`${right}`),
  sql`, `,
);

/**
 * Bir kategorinin yayındaki ürünlerinden gösterilebilir ilk görsel (ilişkili alt sorgu).
 * Öne çıkan ürünler önce, sonra en son yayınlanan; ürün içinde görsel sırası korunur.
 */
const categoryCoverSubquery = sql<string | null>`(
  select ci.url from product_images ci
  join products cp on cp.id = ci.product_id
  where cp.category_id = ${categories.id}
    and cp.status = 'published'
    and ci.rights_status in (${displayableRightsSql})
  order by cp.is_featured desc, cp.published_at desc nulls last, cp.created_at desc, ci.sort_order asc
  limit 1
)`;

/**
 * Etkin kategoriler. `cache`: aynı istekte layout (menü) ve sayfa aynı listeyi istediğinde
 * sorgu bir kez çalışır (React sunucu bileşenleri dışında önbellek yoktur).
 */
export const getStoreCategories = cache(async (): Promise<StoreCategory[]> => {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      shortName: categories.shortName,
      description: categories.description,
      seoText: categories.seoText,
      imageUrl: categories.imageUrl,
      productCount: sql<number>`count(${products.id})::int`,
      coverImage: sql<string | null>`coalesce(${categories.imageUrl}, ${categoryCoverSubquery})`,
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.status, "published")))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
  return rows;
});

export async function getCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  const all = await getStoreCategories();
  return all.find((category) => category.slug === slug) ?? null;
}

/** Etkin markalar ve yayındaki ürün sayıları; istek başına bir kez sorgulanır (`cache`). */
export const getStoreBrands = cache(async (): Promise<StoreBrand[]> => {
  return db
    .select({
      id: brands.id,
      name: brands.name,
      slug: brands.slug,
      description: brands.description,
      origin: brands.origin,
      productCount: sql<number>`count(${products.id})::int`,
    })
    .from(brands)
    .leftJoin(products, and(eq(products.brandId, brands.id), eq(products.status, "published")))
    .where(eq(brands.isActive, true))
    .groupBy(brands.id)
    .orderBy(asc(brands.name));
});

export async function getBrandBySlug(slug: string): Promise<StoreBrand | null> {
  const all = await getStoreBrands();
  return all.find((brand) => brand.slug === slug) ?? null;
}

/* -------------------------------------------------------------------------- */
/* Ana sayfa / favoriler / kampanyalar vitrinleri                              */
/* -------------------------------------------------------------------------- */
/*
 * Bu fonksiyonlar önce SQL ile yalnızca gereken ürün kimliklerini seçer, ardından sadece
 * o kimlikleri `decorate` eder (listProducts gibi tüm kataloğu belleğe çekmez).
 */

/** Yayındaki ürünleri verilen kimlik sırasıyla kart görünümüne çevirir; bulunmayanlar atlanır. */
async function decorateByIds(ids: readonly string[]): Promise<ProductCardView[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select(baseProductColumns)
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId))
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .where(and(inArray(products.id, [...ids]), eq(products.status, "published")));
  const decorated = await decorate(rows);
  const byId = new Map(decorated.map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item): item is ProductCardView => Boolean(item));
}

/**
 * Satılabilir varyantlar: yayındaki ürünün etkin ve en az 1 adet kullanılabilir stoğu olan
 * varyantı. Fiyat, sunucunun sepette uyguladığı birim fiyattır (`price_override ?? sale_price`).
 */
const sellableVariantsCte = sql`sellable_variants as (
  select v.id, v.product_id, v.pack_quantity, coalesce(v.price_override, p.sale_price) as price
  from product_variants v
  join products p on p.id = v.product_id
  join inventory i on i.variant_id = v.id
  where p.status = 'published' and v.is_active
  group by v.id, p.sale_price
  having sum(i.on_hand - i.reserved) > 0
)`;

/**
 * Pazarama değerlendirme sayısı (ürün başına). Bir ürünün her renk/beden ilanı ayrı kayıttır ama
 * Pazarama değerlendirmeleri ürün grubu düzeyinde paylaşılır (aynı ürünün ilanlarında 135–141 gibi
 * neredeyse aynı sayılar görülür); toplamak aynı yorumları defalarca sayar. Bu yüzden MAKSİMUM alınır.
 */
const reviewSignalCte = sql`review_signal as (
  select ml.product_id, max(floor((sp.payload->>'reviewCount')::numeric))::int as review_count
  from marketplace_listings ml
  join source_products sp
    on sp.source_key = ml.source_key and sp.source_listing_id = ml.source_listing_id
  where ml.product_id is not null and jsonb_typeof(sp.payload->'reviewCount') = 'number'
  group by ml.product_id
)`;

export type MostPreferredProduct = ProductCardView & {
  /** Pazarama ilanlarındaki değerlendirme sayısı (yalnızca sıralama içindir; kendi puanımız değildir). */
  sourceReviewCount: number;
};

/**
 * "Çok tercih edilenler": satış verisi olmadığından Pazarama değerlendirme sayısına göre sıralanır.
 * Yalnızca yayında, stokta ve en az 1 değerlendirmesi olan ürünler. Aynı markadan en fazla
 * `maxPerBrand` ürün gelir ve mümkünse aynı marka art arda gelmez.
 */
export async function getMostPreferredProducts(
  limit = 8,
  options: { maxPerBrand?: number; categorySlugs?: string[] } = {},
): Promise<MostPreferredProduct[]> {
  const take = Math.max(0, Math.min(Math.trunc(limit), 48));
  if (take === 0) return [];
  const maxPerBrand = Math.max(1, options.maxPerBrand ?? 3);
  const categoryFilter = options.categorySlugs?.length
    ? sql`and c.slug in (${sql.join(options.categorySlugs.map((slug) => sql`${slug}`), sql`, `)})`
    : sql``;

  const result = await db.execute<{ id: string; brand_id: string | null; review_count: number }>(sql`
    with ${reviewSignalCte}, ${sellableVariantsCte}
    select p.id, p.brand_id, rs.review_count
    from products p
    join review_signal rs on rs.product_id = p.id
    left join categories c on c.id = p.category_id
    where p.status = 'published'
      and rs.review_count > 0
      and exists (select 1 from sellable_variants sv where sv.product_id = p.id)
      ${categoryFilter}
    order by rs.review_count desc, p.published_at desc nulls last, p.id
    limit 500
  `);

  const picked = diversifyByKey(result.rows, (row) => row.brand_id ?? "", { limit: take, maxPerKey: maxPerBrand });
  const reviewById = new Map(picked.map((row) => [row.id, Number(row.review_count)]));
  const cards = await decorateByIds(picked.map((row) => row.id));
  return cards.map((card) => ({ ...card, sourceReviewCount: reviewById.get(card.id) ?? 0 }));
}

export const MULTI_PACK_MIN_QUANTITY = 3;

/** SQL `in (...)` listesi için kategori slug'ları. */
const slugList = (slugs: readonly string[]) => sql.join(slugs.map((slug) => sql`${slug}`), sql`, `);

/**
 * `categorySlugs` verilmişse ürün kimliği sütununu bu kategorilerdeki ürünlerle sınırlayan
 * `and …` koşulu; verilmemişse boş (tüm katalog).
 */
function inCategories(productIdColumn: "sv.product_id" | "p.id", categorySlugs?: readonly string[]): SQL {
  if (!categorySlugs?.length) return sql``;
  return sql`and ${sql.raw(productIdColumn)} in (
    select fp.id from products fp
    join categories fc on fc.id = fp.category_id
    where fc.slug in (${slugList(categorySlugs)})
  )`;
}

export type PackGroup = {
  packQuantity: number;
  /** "6'lı paket" */
  label: string;
  /** Bu paket adedinde satılabilir varyantı olan yayındaki ürün sayısı. */
  productCount: number;
  /** Bu gruptaki satılabilir varyantların en düşük gerçek birim fiyatı (kuruş). */
  minPrice: number;
  /** Grubun ürünlerini listeleyen gerçek sayfa (kampanyalar sayfası tüm kataloğu gösterir). */
  href: string;
};

/**
 * Paket adedi grupları (varsayılan: 3 ve üzeri), paket adedine göre artan sırada.
 * `categorySlugs` ile yalnızca bu kategorilerdeki ürünler sayılır (ör. ana sayfada erkek kategorileri).
 */
export async function getPackGroups(
  options: { minPackQuantity?: number; categorySlugs?: string[] } = {},
): Promise<PackGroup[]> {
  const min = Math.max(2, Math.trunc(options.minPackQuantity ?? MULTI_PACK_MIN_QUANTITY));
  const result = await db.execute<{ pack_quantity: number; product_count: number; min_price: number }>(sql`
    with ${sellableVariantsCte}
    select sv.pack_quantity, count(distinct sv.product_id)::int as product_count, min(sv.price)::int as min_price
    from sellable_variants sv
    where sv.pack_quantity >= ${min} ${inCategories("sv.product_id", options.categorySlugs)}
    group by sv.pack_quantity
    order by sv.pack_quantity asc
  `);

  return result.rows.map((row) => {
    const packQuantity = Number(row.pack_quantity);
    return {
      packQuantity,
      label: packLabel(packQuantity) ?? `${packQuantity} adet`,
      productCount: Number(row.product_count),
      minPrice: Number(row.min_price),
      href: `/kampanyalar?paket=${packQuantity}#coklu-paket`,
    };
  });
}

/** Paket ürünlerinin kimlikleri, paket adedine göre gruplanmış; grup içinde değerlendirme sayısına göre. */
async function multiPackIdsByQuantity(
  minPackQuantity: number,
  { packQuantity, categorySlugs }: { packQuantity?: number; categorySlugs?: string[] } = {},
) {
  const exact = packQuantity === undefined ? sql`` : sql`and sv.pack_quantity = ${packQuantity}`;
  const result = await db.execute<{ id: string; pack_quantity: number }>(sql`
    with ${sellableVariantsCte}, ${reviewSignalCte},
    packs as (
      select sv.product_id, max(sv.pack_quantity) as pack_quantity
      from sellable_variants sv
      where sv.pack_quantity >= ${minPackQuantity} ${exact} ${inCategories("sv.product_id", categorySlugs)}
      group by sv.product_id
    )
    select pk.product_id as id, pk.pack_quantity
    from packs pk
    join products p on p.id = pk.product_id
    left join review_signal rs on rs.product_id = pk.product_id
    order by pk.pack_quantity asc, coalesce(rs.review_count, 0) desc, p.is_featured desc,
      p.published_at desc nulls last, p.id
  `);
  return result.rows;
}

/**
 * Çoklu paket ürünleri (paket adedi ≥ 3), paket adedine göre çeşitlendirilmiş: en kalabalık
 * gruptan başlayarak her gruptan sırayla birer ürün (6'lı, 3'lü, 12'li, 4'lü…). Fiyatlar gerçektir.
 */
export async function getMultiPackProducts(
  limit = 8,
  options: { packQuantities?: number[]; categorySlugs?: string[] } = {},
): Promise<ProductCardView[]> {
  const take = Math.max(0, Math.min(Math.trunc(limit), 48));
  if (take === 0) return [];
  const rows = await multiPackIdsByQuantity(MULTI_PACK_MIN_QUANTITY, { categorySlugs: options.categorySlugs });
  const groups = new Map<number, string[]>();
  for (const row of rows) {
    const quantity = Number(row.pack_quantity);
    if (options.packQuantities?.length && !options.packQuantities.includes(quantity)) continue;
    const list = groups.get(quantity) ?? [];
    list.push(row.id);
    groups.set(quantity, list);
  }
  const ordered = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
    .map(([, ids]) => ids);
  return decorateByIds(interleaveGroups(ordered, take));
}

/** Belirli bir paket adedindeki tüm satılabilir ürünler (sayfalı) — /kampanyalar?paket=6. */
export async function getProductsByPackQuantity(
  packQuantity: number,
  { page = 1, perPage = 24 }: { page?: number; perPage?: number } = {},
): Promise<{ items: ProductCardView[]; total: number; page: number; perPage: number }> {
  const size = Math.max(1, Math.min(Math.trunc(perPage), 48));
  const current = Math.max(1, Math.trunc(page));
  if (!Number.isInteger(packQuantity) || packQuantity < 2) {
    return { items: [], total: 0, page: current, perPage: size };
  }
  const rows = await multiPackIdsByQuantity(2, { packQuantity });
  const start = (current - 1) * size;
  const items = await decorateByIds(rows.slice(start, start + size).map((row) => row.id));
  return { items, total: rows.length, page: current, perPage: size };
}

/**
 * Favoriler için: yalnızca yayındaki ürünler, verilen sıra korunur. UUID olmayanlar ve
 * tekrarlar atılır; en fazla 100 kimlik işlenir.
 */
export async function getProductCardsByIds(ids: readonly string[]): Promise<ProductCardView[]> {
  return decorateByIds(sanitizeProductIds(ids));
}

/**
 * Kampanyalar: yalnızca GERÇEKTEN indirimli (liste fiyatı > satış fiyatı), yayında ve stokta
 * olan ürünler; indirim oranına göre azalan. İndirim yoksa boş dizi döner (uydurma yok).
 */
export async function getDiscountedProducts(limit = 12): Promise<ProductCardView[]> {
  const take = Math.max(0, Math.min(Math.trunc(limit), 48));
  if (take === 0) return [];
  const result = await db.execute<{ id: string }>(sql`
    with ${sellableVariantsCte}
    select p.id
    from products p
    where p.status = 'published'
      and p.list_price > p.sale_price
      and p.sale_price > 0
      and exists (select 1 from sellable_variants sv where sv.product_id = p.id)
    order by (p.list_price - p.sale_price)::float / p.list_price desc, p.published_at desc nulls last, p.id
    limit ${take}
  `);
  return decorateByIds(result.rows.map((row) => row.id));
}

/** Kampanyalar sayfası açıklaması için: gerçekten indirimli, yayında ve stokta ürün var mı? */
export async function hasDiscountedProducts(): Promise<boolean> {
  const result = await db.execute<{ found: boolean }>(sql`
    with ${sellableVariantsCte}
    select exists (
      select 1 from products p
      where p.status = 'published' and p.list_price > p.sale_price and p.sale_price > 0
        and exists (select 1 from sellable_variants sv where sv.product_id = p.id)
    ) as found
  `);
  return Boolean(result.rows[0]?.found);
}

/**
 * Verilen kategorilerdeki yayında ürün ve bu ürünlerin marka sayısı (ör. ana sayfa hero'su yalnızca
 * erkek kategorilerini sayar; kadın ürünleri ve ürünü olmayan markalar dahil edilmez).
 */
export async function getCatalogSummary(categorySlugs: readonly string[]): Promise<{
  productCount: number;
  brandCount: number;
}> {
  if (categorySlugs.length === 0) return { productCount: 0, brandCount: 0 };
  const result = await db.execute<{ product_count: number; brand_count: number }>(sql`
    select count(*)::int as product_count, count(distinct p.brand_id)::int as brand_count
    from products p
    join categories c on c.id = p.category_id
    where p.status = 'published' and c.is_active and c.slug in (${slugList(categorySlugs)})
  `);
  const row = result.rows[0];
  return { productCount: Number(row?.product_count ?? 0), brandCount: Number(row?.brand_count ?? 0) };
}

export type CategoryCoverCandidate = { productId: string; image: string };

/**
 * Kategori kapağı adayları (hafif sorgu: kart verisi üretmez). Her kategoride yayında ve stokta,
 * gösterilebilir görseli olan ürünlerin ilk görseli; Pazarama değerlendirme sayısına göre azalan.
 */
export async function getCategoryCoverCandidates(
  categorySlugs: readonly string[],
  perCategory = 4,
): Promise<Map<string, CategoryCoverCandidate[]>> {
  const byCategory = new Map<string, CategoryCoverCandidate[]>();
  if (categorySlugs.length === 0) return byCategory;
  const take = Math.max(1, Math.min(Math.trunc(perCategory), 12));
  const result = await db.execute<{ slug: string; product_id: string; image: string }>(sql`
    with ${reviewSignalCte}, ${sellableVariantsCte},
    ranked as (
      select c.slug, p.id as product_id,
        (
          select pi.url from product_images pi
          where pi.product_id = p.id and pi.rights_status in (${displayableRightsSql})
          order by pi.sort_order asc
          limit 1
        ) as image,
        row_number() over (
          partition by c.slug
          order by coalesce(rs.review_count, 0) desc, p.is_featured desc, p.published_at desc nulls last, p.id
        ) as position
      from products p
      join categories c on c.id = p.category_id
      left join review_signal rs on rs.product_id = p.id
      where p.status = 'published'
        and c.slug in (${slugList(categorySlugs)})
        and exists (select 1 from sellable_variants sv where sv.product_id = p.id)
        and exists (
          select 1 from product_images xi
          where xi.product_id = p.id and xi.rights_status in (${displayableRightsSql})
        )
    )
    select slug, product_id, image from ranked where position <= ${take} order by slug, position
  `);
  for (const row of result.rows) {
    const list = byCategory.get(row.slug) ?? [];
    list.push({ productId: row.product_id, image: row.image });
    byCategory.set(row.slug, list);
  }
  return byCategory;
}
