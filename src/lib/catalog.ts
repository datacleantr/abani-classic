import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";

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
      .where(inArray(productImages.productId, ids))
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
      image: imageList[0]?.url ?? "/images/hero.jpg",
      hoverImage: imageList[1]?.url ?? null,
      price,
      listPrice: row.listPrice,
      discountPercent:
        row.listPrice > price ? Math.round(((row.listPrice - price) / row.listPrice) * 100) : 0,
      packInfo: row.packInfo,
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
      .where(eq(productImages.productId, row.id))
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
    images: imageRows.length ? imageRows : [{ url: decorated.image, alt: decorated.name }],
    reviews: reviewRows,
    relatedProducts: related.items.filter((item) => item.id !== row.id).slice(0, 4),
  };
}

export async function getStoreCategories(): Promise<StoreCategory[]> {
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
    })
    .from(categories)
    .leftJoin(products, and(eq(products.categoryId, categories.id), eq(products.status, "published")))
    .where(eq(categories.isActive, true))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortOrder));
  return rows;
}

export async function getCategoryBySlug(slug: string): Promise<StoreCategory | null> {
  const all = await getStoreCategories();
  return all.find((category) => category.slug === slug) ?? null;
}

export async function getStoreBrands(): Promise<StoreBrand[]> {
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
}

export async function getBrandBySlug(slug: string): Promise<StoreBrand | null> {
  const all = await getStoreBrands();
  return all.find((brand) => brand.slug === slug) ?? null;
}

export async function getHomeData() {
  const [categoryList, brandList, featured, newest, bestSellers, reviewHighlights] =
    await Promise.all([
      getStoreCategories(),
      getStoreBrands(),
      listProducts({ featured: true, perPage: 4 }),
      listProducts({ sort: "newest", perPage: 4 }),
      listProducts({ sort: "best_sellers", perPage: 4 }),
      db
        .select({
          id: reviews.id,
          customerName: reviews.customerName,
          rating: reviews.rating,
          title: reviews.title,
          body: reviews.body,
          productName: products.name,
          productSlug: products.slug,
        })
        .from(reviews)
        .innerJoin(products, eq(products.id, reviews.productId))
        .where(and(eq(reviews.isApproved, true), eq(products.status, "published")))
        .orderBy(desc(reviews.rating), desc(reviews.createdAt))
        .limit(3),
    ]);

  return {
    categories: categoryList,
    brands: brandList,
    featured: featured.items,
    newest: newest.items,
    bestSellers: bestSellers.items,
    reviews: reviewHighlights,
  };
}
