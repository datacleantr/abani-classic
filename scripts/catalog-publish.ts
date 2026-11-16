/**
 * Onay bekleyen (`review`) ürünleri toplu yayınlar. Bu, işletme adına verilen
 * bilinçli bir onaydır: önerilen fiyatların ve görsellerin vitrinde kullanılmasını
 * kabul etmek anlamına gelir. Bu yüzden --confirm olmadan çalışmaz.
 *
 * Yalnızca yayına hazır ürünler yayınlanır: kategori + marka + fiyat > 0 +
 * en az bir gösterilebilir görsel + en az bir aktif varyant.
 *
 * Kullanım:
 *   npx tsx scripts/catalog-publish.ts --source=pazarama            (ön izleme)
 *   npx tsx scripts/catalog-publish.ts --source=pazarama --confirm
 *   ... --archive-others   kaynak dışındaki yayınlanmış ürünleri (ör. demo katalog) arşivler
 */
import "dotenv/config";
import { and, eq, inArray, sql } from "drizzle-orm";

import { db, pool } from "../src/db";
import { auditLogs, productImages, productVariants, products } from "../src/db/schema";
import { DISPLAYABLE_IMAGE_RIGHTS } from "../src/lib/image-rights";

const args = process.argv.slice(2);
const source = args.find((arg) => arg.startsWith("--source="))?.split("=")[1];
const confirm = args.includes("--confirm");
const archiveOthers = args.includes("--archive-others");

async function main() {
  if (!source) throw new Error("--source=<kaynak> zorunludur (ör. --source=pazarama).");

  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      brandId: products.brandId,
      categoryId: products.categoryId,
      salePrice: products.salePrice,
    })
    .from(products)
    .where(and(eq(products.sourceKey, source), eq(products.status, "review")));

  const [imageCounts, variantCounts] = await Promise.all([
    db
      .select({ productId: productImages.productId, count: sql<number>`count(*)::int` })
      .from(productImages)
      .where(inArray(productImages.rightsStatus, [...DISPLAYABLE_IMAGE_RIGHTS]))
      .groupBy(productImages.productId),
    db
      .select({ productId: productVariants.productId, count: sql<number>`count(*)::int` })
      .from(productVariants)
      .where(eq(productVariants.isActive, true))
      .groupBy(productVariants.productId),
  ]);
  const imageCountByProduct = new Map(imageCounts.map((row) => [row.productId, row.count]));
  const variantCountByProduct = new Map(variantCounts.map((row) => [row.productId, row.count]));
  const candidates = rows.map((row) => ({
    ...row,
    imageCount: imageCountByProduct.get(row.id) ?? 0,
    variantCount: variantCountByProduct.get(row.id) ?? 0,
  }));

  const blocked: { name: string; reason: string }[] = [];
  const ready: string[] = [];
  for (const row of candidates) {
    const reasons = [
      !row.categoryId && "kategori yok",
      !row.brandId && "marka yok",
      row.salePrice <= 0 && "fiyat yok",
      row.imageCount === 0 && "gösterilebilir görsel yok",
      row.variantCount === 0 && "aktif varyant yok",
    ].filter(Boolean);
    if (reasons.length > 0) blocked.push({ name: row.name, reason: reasons.join(", ") });
    else ready.push(row.id);
  }

  console.log(`Kaynak: ${source} — onay bekleyen ${candidates.length}, yayına hazır ${ready.length}, engelli ${blocked.length}`);
  for (const item of blocked) console.log(`  ✗ ${item.name} — ${item.reason}`);

  if (!confirm) {
    console.log("Ön izleme. Yayınlamak için --confirm ekleyin.");
    await pool.end();
    return;
  }

  let archived = 0;
  await db.transaction(async (tx) => {
    if (ready.length > 0) {
      await tx
        .update(products)
        .set({ status: "published", publishedAt: new Date(), updatedAt: new Date() })
        .where(inArray(products.id, ready));
    }
    if (archiveOthers) {
      const rows = await tx
        .update(products)
        .set({ status: "archived", updatedAt: new Date() })
        .where(and(eq(products.status, "published"), sql`${products.sourceKey} is distinct from ${source}`))
        .returning({ id: products.id });
      archived = rows.length;
    }
    await tx.insert(auditLogs).values({
      actorType: "system",
      actorEmail: "script:catalog-publish",
      action: "catalog.bulk_publish",
      entityType: "product",
      summary: `${source}: ${ready.length} ürün yayınlandı${archiveOthers ? `, ${archived} diğer ürün arşivlendi` : ""}.`,
      metadata: { source, published: ready.length, blocked: blocked.length, archived },
    });
  });

  console.log(`${ready.length} ürün yayınlandı${archiveOthers ? `, ${archived} ürün arşivlendi` : ""}.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
