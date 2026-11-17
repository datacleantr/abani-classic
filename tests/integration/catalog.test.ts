import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db, pool } from "@/db";
import {
  brands,
  categories,
  inventory,
  marketplaceListings,
  productImages,
  productVariants,
  products,
  sourceProducts,
} from "@/db/schema";
import { GET as productsRoute } from "@/app/api/products/route";
import {
  getCatalogSummary,
  getCategoryCoverCandidates,
  getDiscountedProducts,
  getMostPreferredProducts,
  getMultiPackProducts,
  getPackGroups,
  getProductCardsByIds,
  getProductsByPackQuantity,
  getStoreBrands,
  getStoreCategories,
  hasDiscountedProducts,
} from "@/lib/catalog";
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/product-card-helpers";

/*
 * Vitrin sorguları (çok tercih edilenler, paketler, favoriler, kampanyalar) gerçek
 * PostgreSQL'e karşı. Diğer entegrasyon dosyaları aynı _test veritabanına yazabildiği için
 * sonuçlar bu dosyanın oluşturduğu kimliklere göre süzülür.
 */

let seq = 0;
const ids: Record<string, string> = {};
let brandT = "";
let brandS = "";
let categoryWithoutImage = "";
let categoryWithImage = "";

const COVER_URL = "https://img.example.test/p1-ana.jpg";
const RESTRICTED_URL = "https://img.example.test/p1-kisitli.jpg";

type Fixture = {
  key: string;
  brandId: string;
  categoryId: string;
  status?: string;
  salePrice?: number;
  listPrice?: number;
  isFeatured?: boolean;
  packQuantity?: number;
  stock?: number;
  /** Her ilan için Pazarama değerlendirme sayısı (null = kaynakta yok). */
  reviewCounts?: (number | null)[];
  priceOverride?: number;
};

async function createProduct(fixture: Fixture): Promise<string> {
  seq += 1;
  const salePrice = fixture.salePrice ?? 50000;
  const [product] = await db
    .insert(products)
    .values({
      brandId: fixture.brandId,
      categoryId: fixture.categoryId,
      name: `Vitrin Ürün ${fixture.key}`,
      slug: `vitrin-urun-${fixture.key.toLowerCase()}-${seq}`,
      salePrice,
      listPrice: fixture.listPrice ?? salePrice,
      status: fixture.status ?? "published",
      isFeatured: fixture.isFeatured ?? false,
      publishedAt: new Date(Date.now() - seq * 60_000),
    })
    .returning();
  const [variant] = await db
    .insert(productVariants)
    .values({
      productId: product.id,
      sku: `VITRIN-${fixture.key}-${seq}`,
      size: "M",
      color: "Siyah",
      packQuantity: fixture.packQuantity ?? 1,
      priceOverride: fixture.priceOverride ?? null,
    })
    .returning();
  await db.insert(inventory).values({ variantId: variant.id, onHand: fixture.stock ?? 5, reserved: 0 });

  for (const [index, reviewCount] of (fixture.reviewCounts ?? []).entries()) {
    const listingId = `vitrin-${fixture.key}-${index}-${seq}`;
    await db.insert(sourceProducts).values({
      sourceKey: "pazarama",
      sourceListingId: listingId,
      parserVersion: "test",
      contentHash: listingId,
      payload: { reviewCount, title: product.name },
      fetchedAt: new Date(),
    });
    await db.insert(marketplaceListings).values({
      sourceKey: "pazarama",
      sourceListingId: listingId,
      productId: product.id,
      variantId: variant.id,
    });
  }
  ids[fixture.key] = product.id;
  return product.id;
}

const mine = <T extends { id: string }>(items: T[]) =>
  items.filter((item) => Object.values(ids).includes(item.id));
const keysOf = (items: { id: string }[]) =>
  items.map((item) => Object.entries(ids).find(([, id]) => id === item.id)?.[0]);

beforeAll(async () => {
  const [t] = await db.insert(brands).values({ name: "Vitrin T", slug: "vitrin-t" }).returning();
  const [s] = await db.insert(brands).values({ name: "Vitrin S", slug: "vitrin-s" }).returning();
  brandT = t.id;
  brandS = s.id;
  const [k1] = await db.insert(categories).values({ name: "Vitrin K1", slug: "vitrin-k1" }).returning();
  const [k2] = await db
    .insert(categories)
    .values({ name: "Vitrin K2", slug: "vitrin-k2", imageUrl: "/images/boxer.jpg" })
    .returning();
  categoryWithoutImage = k1.id;
  categoryWithImage = k2.id;

  // Aynı ürünün iki ilanı: 100 ve 120 → toplam değil maksimum (120) kullanılmalı.
  await createProduct({ key: "P1", brandId: brandT, categoryId: k1.id, packQuantity: 6, reviewCounts: [100, 120, null], isFeatured: true, salePrice: 60000 });
  await createProduct({ key: "P2", brandId: brandT, categoryId: k2.id, packQuantity: 3, reviewCounts: [90] });
  await createProduct({ key: "P3", brandId: brandT, categoryId: k2.id, packQuantity: 12, reviewCounts: [80] });
  // Varyant fiyatı ürün fiyatından düşük: paket grubunun en düşük fiyatı bunu yansıtmalı.
  await createProduct({ key: "P4", brandId: brandT, categoryId: k2.id, packQuantity: 6, reviewCounts: [70], salePrice: 70000, priceOverride: 45000 });
  await createProduct({ key: "P5", brandId: brandS, categoryId: k2.id, reviewCounts: [60] });
  await createProduct({ key: "P6_STOKSUZ", brandId: brandS, categoryId: k2.id, packQuantity: 6, reviewCounts: [500], stock: 0 });
  await createProduct({ key: "P7_YAYINDA_DEGIL", brandId: brandS, categoryId: k1.id, status: "review", packQuantity: 6, reviewCounts: [1000] });
  await createProduct({ key: "P8_INDIRIMLI", brandId: brandS, categoryId: k2.id, salePrice: 80000, listPrice: 100000 });

  await db.insert(productImages).values([
    { productId: ids.P1, url: RESTRICTED_URL, sortOrder: -1, rightsStatus: "restricted" },
    { productId: ids.P1, url: COVER_URL, sortOrder: 0, rightsStatus: "seller_listing" },
    { productId: ids.P7_YAYINDA_DEGIL, url: "https://img.example.test/p7.jpg", sortOrder: -5, rightsStatus: "authorized" },
  ]);
});

afterAll(async () => {
  await pool.end();
});

describe("çok tercih edilenler", () => {
  it("değerlendirme sayısına göre sıralar; yayında olmayan ve stoksuz ürünleri dışlar; marka sınırı uygular", async () => {
    const result = mine(await getMostPreferredProducts(10, { maxPerBrand: 3 }));
    // T markası en fazla 3 kez; mümkünse art arda gelmez (P5 araya girer). P4 sınır nedeniyle düşer.
    expect(keysOf(result)).toEqual(["P1", "P5", "P2", "P3"]);
    expect(result[0].sourceReviewCount).toBe(120);
    expect(result[0].packQuantity).toBe(6);
    expect(result[0].image).toBe(COVER_URL);
  });

  it("kategori filtresi uygular", async () => {
    const result = mine(await getMostPreferredProducts(10, { categorySlugs: ["vitrin-k1"] }));
    expect(keysOf(result)).toEqual(["P1"]);
  });
});

describe("çoklu paketler", () => {
  it("paket gruplarını gerçek en düşük fiyat ve ürün sayısıyla döndürür", async () => {
    const groups = await getPackGroups();
    const byQuantity = new Map(groups.map((group) => [group.packQuantity, group]));
    expect(byQuantity.get(6)).toMatchObject({ label: "6'lı paket", productCount: 2, minPrice: 45000 });
    expect(byQuantity.get(3)).toMatchObject({ label: "3'lü paket", productCount: 1, minPrice: 50000 });
    expect(byQuantity.get(12)).toMatchObject({ label: "12'li paket", productCount: 1 });
    expect(byQuantity.has(1)).toBe(false);
    expect(groups.map((group) => group.packQuantity)).toEqual([...groups.map((g) => g.packQuantity)].sort((a, b) => a - b));
  });

  it("paket ürünlerini paket adedine göre karıştırır", async () => {
    const result = mine(await getMultiPackProducts(8));
    expect(keysOf(result)).toEqual(["P1", "P2", "P3", "P4"]);
  });

  it("kategori filtresiyle yalnızca o kategorilerdeki paketleri sayar ve listeler", async () => {
    const groups = await getPackGroups({ categorySlugs: ["vitrin-k1"] });
    expect(groups.map((group) => [group.packQuantity, group.productCount])).toEqual([[6, 1]]);
    expect(groups[0].minPrice).toBe(60000);
    const products = mine(await getMultiPackProducts(8, { categorySlugs: ["vitrin-k2"] }));
    expect(keysOf(products).sort()).toEqual(["P2", "P3", "P4"]);
  });

  it("belirli paket adedini sayfalar", async () => {
    const page = await getProductsByPackQuantity(6, { page: 1, perPage: 1 });
    expect(page.total).toBe(2);
    expect(keysOf(page.items)).toEqual(["P1"]);
  });
});

describe("favoriler (kimlikle kart)", () => {
  it("sırayı korur, yayında olmayanı ve geçersiz kimliği sessizce atar", async () => {
    const result = await getProductCardsByIds([ids.P5, ids.P7_YAYINDA_DEGIL, "gecersiz", ids.P1, ids.P5]);
    expect(keysOf(result)).toEqual(["P5", "P1"]);
  });

  it("/api/products uç noktası doğrular ve kart verisi döndürür", async () => {
    const ok = await productsRoute(new Request(`http://test/api/products?ids=${ids.P1},${ids.P7_YAYINDA_DEGIL}`));
    expect(ok.status).toBe(200);
    const body = (await ok.json()) as {
      ok: boolean;
      products: ({ id: string; variants: Record<string, unknown>[] } & Record<string, unknown>)[];
    };
    expect(body.ok).toBe(true);
    expect(keysOf(body.products)).toEqual(["P1"]);
    // Yalnızca kart alanları: SKU ve satış adedi dışarı verilmez.
    expect(body.products[0]).not.toHaveProperty("soldCount");
    expect(body.products[0].variants[0]).not.toHaveProperty("sku");
    expect(body.products[0].variants[0]).toHaveProperty("stock");

    const bad = await productsRoute(new Request("http://test/api/products?ids=1;drop"));
    expect(bad.status).toBe(400);

    const empty = await productsRoute(new Request("http://test/api/products"));
    expect(((await empty.json()) as { products: unknown[] }).products).toEqual([]);
  });
});

describe("kampanyalar", () => {
  it("yalnızca liste fiyatı satış fiyatından yüksek olan ürünleri döndürür", async () => {
    const result = await getDiscountedProducts(12);
    expect(keysOf(result)).toEqual(["P8_INDIRIMLI"]);
    expect(result[0].discountPercent).toBe(20);
    expect(await hasDiscountedProducts()).toBe(true);
  });
});

describe("ana sayfa özetleri", () => {
  it("kategoriyle sınırlı ürün ve marka sayısı (yayında olmayan sayılmaz)", async () => {
    // K1: P1 (T, yayında) + P7 (S, review) → 1 ürün, 1 marka.
    expect(await getCatalogSummary(["vitrin-k1"])).toEqual({ productCount: 1, brandCount: 1 });
    expect(await getCatalogSummary(["vitrin-k2"])).toEqual({ productCount: 6, brandCount: 2 });
    expect(await getCatalogSummary([])).toEqual({ productCount: 0, brandCount: 0 });
  });

  it("kategori kapağı adayları yalnızca gösterilebilir görseli olan stoktaki ürünlerdir", async () => {
    const candidates = await getCategoryCoverCandidates(["vitrin-k1", "vitrin-k2"]);
    expect(candidates.get("vitrin-k1")).toEqual([{ productId: ids.P1, image: COVER_URL }]);
    expect(candidates.has("vitrin-k2")).toBe(false);
  });

  it("görseli olmayan ürünün kart görseli nötr yer tutucudur", async () => {
    const [card] = await getProductCardsByIds([ids.P5]);
    expect(card.image).toBe(PRODUCT_IMAGE_PLACEHOLDER);
  });
});

describe("kategori ve marka kapakları", () => {
  it("kategori görseli yoksa yayındaki ürünün gösterilebilir görselini kullanır", async () => {
    const list = await getStoreCategories();
    expect(list.find((c) => c.id === categoryWithoutImage)?.coverImage).toBe(COVER_URL);
    expect(list.find((c) => c.id === categoryWithImage)?.coverImage).toBe("/images/boxer.jpg");
    expect(list.find((c) => c.id === categoryWithImage)?.imageUrl).toBe("/images/boxer.jpg");
  });

  it("marka listesi yayındaki ürün sayısını verir", async () => {
    const list = await getStoreBrands();
    // T: P1–P4; S: P5, P6 (stoksuz ama yayında), P8 — P7 yayında değil.
    expect(list.find((b) => b.id === brandT)?.productCount).toBe(4);
    expect(list.find((b) => b.id === brandS)?.productCount).toBe(3);
  });
});
