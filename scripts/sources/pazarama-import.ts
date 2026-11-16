/**
 * Toplanan Pazarama ilanlarını (data/sources/pazarama/listings.jsonl) kataloğa
 * ONAY BEKLEYEN aday olarak aktarır.
 *
 * Garantiler:
 *  - Ham ilan `source_products` tablosunda değiştirilmeden saklanır.
 *  - Ürünler `review` durumunda oluşturulur; bu betik hiçbir şeyi yayınlamaz.
 *  - Kaynak fiyatı `marketplace_listings.source_price_minor` alanında ayrıca tutulur;
 *    ürün fiyatı yalnızca bir ÖNERİDİR ve yayından önce onaylanmalıdır.
 *  - Gerçek stok bilinmediği için stok 0 açılır.
 *  - Tekrar çalıştırmak güvenlidir: mevcut ürün alanlarının üzerine yazmaz, yalnızca
 *    eksik varyant/ilan bağlantılarını ekler ve kaynak fiyatını günceller.
 *
 * Kullanım:
 *   npx tsx scripts/sources/pazarama-import.ts --dry-run
 *   npx tsx scripts/sources/pazarama-import.ts [--skip-images] [--dev-stock=N]
 *
 * --dev-stock yalnızca geliştirme veritabanında vitrin denemesi içindir; üretimde reddedilir.
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { and, eq, inArray } from "drizzle-orm";

import { db, pool } from "../../src/db";
import {
  auditLogs,
  brands,
  categories,
  importBatches,
  inventory,
  marketplaceListings,
  productImages,
  productVariants,
  products,
  sourceProducts,
  stockMovements,
} from "../../src/db/schema";
import { normalizeTr, slugifyTr } from "../../src/lib/format";
import {
  EXTRA_CATEGORIES,
  groupListings,
  type CandidateProduct,
  type SourceListing,
} from "../../src/lib/sources/pazarama";

const SOURCE_KEY = "pazarama";
const LISTINGS_FILE = path.join(process.cwd(), "data", "sources", SOURCE_KEY, "listings.jsonl");
const IMAGE_SIZE = 900;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const skipImages = args.includes("--skip-images");
const devStockArg = args.find((arg) => arg.startsWith("--dev-stock="));
const devStock = devStockArg ? Number.parseInt(devStockArg.split("=")[1], 10) : 0;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Pazarama görsel CDN'i otomatik indirmeyi engeller (erişim koruması aşılmaz).
 * Bu yüzden görsel dosyası kopyalanmaz; ilanın görsel adresi referans olarak saklanır
 * ve ziyaretçinin tarayıcısı tarafından yüklenir. Canlı ortamda bu adresler işletmenin
 * kendi görsel dosyalarıyla değiştirilmelidir (docs/OPEN_DECISIONS.md #11).
 */
function displayUrl(sourceUrl: string): string {
  return sourceUrl.replace(
    "https://img.pzrmcdn.com/",
    `https://img.pzrmcdn.com/mnresize/${IMAGE_SIZE}/${IMAGE_SIZE}/`,
  );
}

async function ensureTaxonomy(candidates: CandidateProduct[]) {
  const brandRows = await db.select().from(brands);
  const brandBySlug = new Map(brandRows.map((brand) => [brand.slug, brand.id]));
  for (const name of new Set(candidates.map((candidate) => candidate.brandName))) {
    const slug = slugifyTr(name);
    if (brandBySlug.has(slug)) continue;
    const [created] = await db.insert(brands).values({ name, slug }).returning();
    brandBySlug.set(slug, created.id);
    console.log(`  + marka: ${name}`);
  }

  const categoryRows = await db.select().from(categories);
  const categoryBySlug = new Map(categoryRows.map((category) => [category.slug, category.id]));
  const needed = new Set(candidates.map((candidate) => candidate.categorySlug).filter(Boolean));
  let sortOrder = Math.max(0, ...categoryRows.map((category) => category.sortOrder));
  for (const extra of EXTRA_CATEGORIES) {
    if (!needed.has(extra.slug) || categoryBySlug.has(extra.slug)) continue;
    sortOrder += 1;
    const [created] = await db
      .insert(categories)
      .values({ name: extra.name, slug: extra.slug, shortName: extra.shortName, sortOrder })
      .returning();
    categoryBySlug.set(extra.slug, created.id);
    console.log(`  + kategori: ${extra.name}`);
  }
  return { brandBySlug, categoryBySlug };
}

async function uniqueSlug(base: string, fallbackSuffix: string): Promise<string> {
  const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, base)).limit(1);
  if (existing.length === 0) return base;
  return `${base.slice(0, 200)}-${slugifyTr(fallbackSuffix).slice(0, 24)}`;
}

async function main() {
  if (devStock > 0 && process.env.NODE_ENV === "production") {
    throw new Error("--dev-stock üretim ortamında kullanılamaz.");
  }
  const raw = readFileSync(LISTINGS_FILE, "utf8");
  const listings = raw
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as SourceListing);
  const candidates = groupListings(listings);
  const variantCount = candidates.reduce((sum, candidate) => sum + candidate.variants.length, 0);

  console.log(`${listings.length} ilan → ${candidates.length} ürün adayı, ${variantCount} varyant.`);
  console.log(
    `Uyarılı aday: ${candidates.filter((candidate) => candidate.warnings.length > 0).length}`,
  );
  if (dryRun) {
    console.log("Dry-run: veritabanı değiştirilmedi.");
    await pool.end();
    return;
  }

  // 1) Ham kayıtlar — değiştirilmeden saklanır.
  for (const listing of listings) {
    const payload = JSON.stringify(listing);
    await db
      .insert(sourceProducts)
      .values({
        sourceKey: SOURCE_KEY,
        sourceListingId: listing.sourceListingId,
        sourceUrl: listing.url,
        title: listing.title?.slice(0, 300) ?? null,
        brandName: listing.brandName,
        parserVersion: listing.parserVersion,
        contentHash: sha256(payload),
        payload: listing,
        fetchedAt: new Date(listing.fetchedAt),
      })
      .onConflictDoUpdate({
        target: [sourceProducts.sourceKey, sourceProducts.sourceListingId],
        set: {
          payload: listing,
          contentHash: sha256(payload),
          parserVersion: listing.parserVersion,
          fetchedAt: new Date(listing.fetchedAt),
          updatedAt: new Date(),
        },
      });
  }

  const { brandBySlug, categoryBySlug } = await ensureTaxonomy(candidates);

  const stats = { created: 0, existing: 0, variantsAdded: 0, listingsLinked: 0, images: 0 };

  for (const candidate of candidates) {
    const memberIds = candidate.variants.flatMap((variant) => [
      variant.listing.sourceListingId,
      ...variant.duplicateListings.map((listing) => listing.sourceListingId),
    ]);
    const linked = await db
      .select({ productId: marketplaceListings.productId })
      .from(marketplaceListings)
      .where(
        and(
          eq(marketplaceListings.sourceKey, SOURCE_KEY),
          inArray(marketplaceListings.sourceListingId, memberIds),
        ),
      );
    let productId = linked.find((row) => row.productId)?.productId ?? null;

    await db.transaction(async (tx) => {
      if (!productId) {
        const slug = await uniqueSlug(candidate.slugBase, candidate.variants[0].listing.sourceListingId);
        const [created] = await tx
          .insert(products)
          .values({
            brandId: brandBySlug.get(slugifyTr(candidate.brandName)) ?? null,
            categoryId: candidate.categorySlug ? (categoryBySlug.get(candidate.categorySlug) ?? null) : null,
            name: candidate.name,
            slug,
            fabric: candidate.fabric,
            packInfo: candidate.packInfo,
            attributes: candidate.attributes,
            listPrice: candidate.basePriceMinor,
            salePrice: candidate.basePriceMinor,
            status: "review",
            sourceKey: SOURCE_KEY,
          })
          .returning();
        productId = created.id;
        stats.created += 1;
      } else {
        stats.existing += 1;
      }

      // Görsel yalnızca ürünün hiç görseli yoksa eklenir; yöneticinin düzenlemesi ezilmez.
      if (!skipImages && candidate.images.length > 0) {
        const existingImages = await tx
          .select({ id: productImages.id })
          .from(productImages)
          .where(eq(productImages.productId, productId))
          .limit(1);
        if (existingImages.length === 0) {
          await tx.insert(productImages).values(
            candidate.images.map((sourceUrl, index) => ({
              productId: productId!,
              url: displayUrl(sourceUrl),
              sourceUrl,
              alt: candidate.name,
              sortOrder: index,
              rightsStatus: "seller_listing",
            })),
          );
          stats.images += candidate.images.length;
        }
      }

      for (const variant of candidate.variants) {
        const existingVariant = await tx
          .select({ id: productVariants.id })
          .from(productVariants)
          .where(eq(productVariants.sku, variant.sku))
          .limit(1);
        let variantId = existingVariant[0]?.id;

        if (!variantId) {
          const [createdVariant] = await tx
            .insert(productVariants)
            .values({
              productId: productId!,
              sku: variant.sku,
              barcode: variant.barcode,
              size: variant.size,
              color: variant.color,
              packQuantity: candidate.packQuantity ?? 1,
              priceOverride: variant.priceMinor !== candidate.basePriceMinor ? variant.priceMinor : null,
            })
            .returning();
          variantId = createdVariant.id;
          stats.variantsAdded += 1;

          const onHand = devStock > 0 && variant.inStock ? devStock : 0;
          await tx.insert(inventory).values({ variantId, onHand, reserved: 0 });
          if (onHand > 0) {
            await tx.insert(stockMovements).values({
              variantId,
              type: "dev_seed",
              quantity: onHand,
              reference: "pazarama-import",
              note: "Geliştirme ortamı deneme stoğu — gerçek stok değildir.",
              actor: "script",
            });
          }
        }

        for (const listing of [variant.listing, ...variant.duplicateListings]) {
          await tx
            .insert(marketplaceListings)
            .values({
              sourceKey: SOURCE_KEY,
              sourceListingId: listing.sourceListingId,
              sourceSku: listing.sourceListingId,
              sourceUrl: listing.url,
              productId: productId!,
              variantId,
              sourcePriceMinor: listing.priceMinor,
              sourceStock: null,
              matchScore: null,
              matchedBy: "title_group",
            })
            .onConflictDoUpdate({
              target: [marketplaceListings.sourceKey, marketplaceListings.sourceListingId],
              set: { sourcePriceMinor: listing.priceMinor, sourceUrl: listing.url, lastSyncedAt: new Date() },
            });
          stats.listingsLinked += 1;
        }
      }
    });
  }

  await db.insert(importBatches).values({
    sourceKey: SOURCE_KEY,
    fileName: "listings.jsonl",
    fileHash: sha256(raw),
    mode: "applied",
    status: "needs_review",
    totalRows: listings.length,
    validRows: listings.length,
    errorRows: 0,
    matchRows: stats.existing,
    newRows: stats.created,
    publishedRows: 0,
    createdBy: "script:pazarama-import",
  });
  await db.insert(auditLogs).values({
    actorType: "system",
    actorEmail: "script:pazarama-import",
    action: "import.source_sync",
    entityType: "import_batch",
    summary: `Pazarama: ${stats.created} yeni ürün adayı, ${stats.variantsAdded} varyant, ${stats.listingsLinked} ilan bağlantısı.`,
    metadata: { ...stats, devStock },
  });

  console.log(JSON.stringify(stats, null, 2));
  console.log("Ürünler 'review' durumunda. Yayın için: npm run catalog:publish -- --source=pazarama --confirm");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
