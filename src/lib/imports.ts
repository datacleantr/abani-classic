import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  brands,
  categories,
  importBatches,
  importItems,
  inventory,
  marketplaceListings,
  productImages,
  productVariants,
  products,
} from "@/db/schema";
import { writeAudit } from "./audit";
import { normalizeTr, slugifyTr } from "./format";

export const MAX_IMPORT_ROWS = 500;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export type CanonicalField =
  | "title"
  | "brand"
  | "category"
  | "barcode"
  | "sku"
  | "price"
  | "stock"
  | "color"
  | "size";

const HEADER_MAP: Record<string, CanonicalField> = {
  urunadi: "title",
  urun: "title",
  title: "title",
  productname: "title",
  marka: "brand",
  brand: "brand",
  kategori: "category",
  category: "category",
  categorypath: "category",
  barkod: "barcode",
  barcode: "barcode",
  gtin: "barcode",
  ean: "barcode",
  sku: "sku",
  stokkodu: "sku",
  saticikodu: "sku",
  merchantSku: "sku",
  fiyat: "price",
  price: "price",
  satisfiyati: "price",
  stok: "stock",
  stock: "stock",
  quantity: "stock",
  renk: "color",
  color: "color",
  beden: "size",
  size: "size",
};

function canonicalHeader(header: string): CanonicalField | null {
  const key = normalizeTr(header).replace(/[^a-z0-9]/g, "");
  return HEADER_MAP[key] ?? null;
}

/** Neutralizes CSV formula injection when values are re-exported. */
export function sanitizeCell(value: string): string {
  const trimmed = value.replace(/\r/g, "").trim();
  return /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
}

export function parseDelimited(text: string): { headers: string[]; rows: string[][] } {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const delimiter = semicolonCount > commaCount ? ";" : ",";

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"' && clean[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim().length > 0)) rows.push(row);
  }

  const [headerRow, ...dataRows] = rows;
  return { headers: (headerRow ?? []).map((h) => h.trim()), rows: dataRows };
}

export function parsePriceToMinor(value: string): number | null {
  const cleaned = value.replace(/[^\d.,]/g, "").trim();
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    normalized = cleaned.replaceAll(".", "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".");
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed * 100);
}

type MatchCandidate = {
  productId: string;
  productName: string;
  brandName: string;
  modelCode: string | null;
  barcodes: string[];
  skus: string[];
};

function titleSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeTr(a).split(/[^a-z0-9]+/).filter(Boolean));
  const tokensB = new Set(normalizeTr(b).split(/[^a-z0-9]+/).filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let shared = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) shared += 1;
  }
  return Math.round((shared / Math.max(tokensA.size, tokensB.size)) * 40);
}

async function loadCandidates(): Promise<MatchCandidate[]> {
  const productRows = await db
    .select({
      productId: products.id,
      productName: products.name,
      modelCode: products.modelCode,
      brandName: brands.name,
    })
    .from(products)
    .leftJoin(brands, eq(brands.id, products.brandId));

  const variantRows = await db
    .select({
      productId: productVariants.productId,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
    })
    .from(productVariants);

  return productRows.map((row) => ({
    productId: row.productId,
    productName: row.productName,
    brandName: row.brandName ?? "",
    modelCode: row.modelCode,
    barcodes: variantRows
      .filter((v) => v.productId === row.productId && v.barcode)
      .map((v) => v.barcode as string),
    skus: variantRows.filter((v) => v.productId === row.productId).map((v) => v.sku),
  }));
}

export type ImportAnalysis = {
  batchId: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
  matchRows: number;
  newRows: number;
  duplicateFile: boolean;
  fileHash: string;
  items: {
    rowNumber: number;
    title: string | null;
    status: string;
    matchScore: number | null;
    message: string | null;
  }[];
};

export async function analyzeImport(input: {
  sourceKey: string;
  fileName: string;
  content: string;
  createdBy: string;
}): Promise<{ ok: true; analysis: ImportAnalysis } | { ok: false; message: string }> {
  if (Buffer.byteLength(input.content, "utf8") > MAX_FILE_BYTES) {
    return { ok: false, message: "Dosya 2 MB sınırını aşıyor." };
  }

  const { headers, rows } = parseDelimited(input.content);
  if (headers.length === 0) return { ok: false, message: "Dosya başlık satırı içermiyor." };
  if (rows.length === 0) return { ok: false, message: "Dosyada veri satırı bulunamadı." };
  if (rows.length > MAX_IMPORT_ROWS) {
    return { ok: false, message: `Tek seferde en fazla ${MAX_IMPORT_ROWS} satır işlenebilir.` };
  }

  const mapping = headers.map((header) => canonicalHeader(header));
  if (!mapping.includes("title")) {
    return { ok: false, message: "Başlık sütunu bulunamadı (beklenen: 'Ürün Adı' veya 'title')." };
  }

  const fileHash = createHash("sha256").update(input.content).digest("hex");
  const duplicate = await db
    .select({ id: importBatches.id })
    .from(importBatches)
    .where(eq(importBatches.fileHash, fileHash))
    .limit(1);

  const candidates = await loadCandidates();
  const knownBrands = new Set(
    (await db.select({ name: brands.name }).from(brands)).map((b) => normalizeTr(b.name)),
  );

  const analyzed = rows.map((cells, index) => {
    const record: Partial<Record<CanonicalField, string>> = {};
    mapping.forEach((field, cellIndex) => {
      if (field) record[field] = sanitizeCell(cells[cellIndex] ?? "");
    });

    const title = record.title || null;
    const brandName = record.brand || null;
    const barcode = record.barcode || null;
    const sku = record.sku || null;
    const priceMinor = record.price ? parsePriceToMinor(record.price) : null;
    const stock = record.stock ? Number.parseInt(record.stock.replace(/[^\d-]/g, ""), 10) : null;

    const errors: string[] = [];
    if (!title || title.length < 3) errors.push("Ürün adı eksik");
    if (!brandName) errors.push("Marka eksik");
    if (priceMinor === null || priceMinor <= 0) errors.push("Fiyat geçersiz");

    let score = 0;
    let matchedProductId: string | null = null;
    let message: string | null = null;

    if (barcode) {
      const byBarcode = candidates.find((candidate) => candidate.barcodes.includes(barcode));
      if (byBarcode) {
        matchedProductId = byBarcode.productId;
        score = 100;
        message = "Barkod tam eşleşmesi";
        if (brandName && normalizeTr(byBarcode.brandName) !== normalizeTr(brandName)) {
          errors.push("Marka çelişkisi: barkod başka bir markaya ait");
          score = 0;
        }
      }
    }

    if (!matchedProductId && sku) {
      const bySku = candidates.find((candidate) =>
        candidate.skus.some((candidateSku) => normalizeTr(candidateSku) === normalizeTr(sku)),
      );
      if (bySku) {
        matchedProductId = bySku.productId;
        score = 85;
        message = "Satıcı SKU eşleşmesi";
      }
    }

    if (!matchedProductId && title && brandName) {
      let best = { score: 0, productId: null as string | null, productName: "" };
      for (const candidate of candidates) {
        if (normalizeTr(candidate.brandName) !== normalizeTr(brandName)) continue;
        const titleScore = titleSimilarity(title, candidate.productName);
        const modelBoost = candidate.modelCode && normalizeTr(title).includes(normalizeTr(candidate.modelCode)) ? 20 : 0;
        const total = Math.min(95, 45 + titleScore + modelBoost);
        if (total > best.score) best = { score: total, productId: candidate.productId, productName: candidate.productName };
      }
      if (best.productId && best.score >= 55) {
        matchedProductId = best.productId;
        score = best.score;
        message = `Başlık benzerliği: ${best.productName}`;
      }
    }

    if (!matchedProductId && brandName && !knownBrands.has(normalizeTr(brandName))) {
      message = "Marka katalogda yok; onaydan önce marka oluşturulmalı";
    }

    let status: string;
    if (errors.length > 0) status = "error";
    else if (matchedProductId) status = score >= 95 ? "match" : "review";
    else status = "new";

    return {
      rowNumber: index + 2,
      title,
      brandName,
      categoryPath: record.category ?? null,
      barcode,
      sourceSku: sku,
      sourcePriceMinor: priceMinor,
      sourceStock: Number.isFinite(stock) ? stock : null,
      status,
      matchScore: score || null,
      matchedProductId,
      message: errors.length ? errors.join(", ") : message,
      rawPayload: { ...record },
    };
  });

  const [batch] = await db
    .insert(importBatches)
    .values({
      sourceKey: input.sourceKey,
      fileName: input.fileName,
      fileHash,
      mode: "dry_run",
      status: "needs_review",
      totalRows: analyzed.length,
      validRows: analyzed.filter((row) => row.status !== "error").length,
      errorRows: analyzed.filter((row) => row.status === "error").length,
      matchRows: analyzed.filter((row) => row.status === "match").length,
      newRows: analyzed.filter((row) => row.status === "new").length,
      createdBy: input.createdBy,
    })
    .returning();

  await db.insert(importItems).values(
    analyzed.map((row) => ({
      batchId: batch.id,
      ...row,
    })),
  );

  await writeAudit({
    actorType: "admin",
    actorEmail: input.createdBy,
    action: "import.dry_run",
    entityType: "import_batch",
    entityId: batch.id,
    summary: `${input.sourceKey} dışa aktarımı dry-run olarak ayrıştırıldı.`,
    metadata: { rows: analyzed.length, duplicateFile: duplicate.length > 0 },
  });

  return {
    ok: true,
    analysis: {
      batchId: batch.id,
      totalRows: analyzed.length,
      validRows: analyzed.filter((row) => row.status !== "error").length,
      errorRows: analyzed.filter((row) => row.status === "error").length,
      matchRows: analyzed.filter((row) => row.status === "match").length,
      newRows: analyzed.filter((row) => row.status === "new").length,
      duplicateFile: duplicate.length > 0,
      fileHash,
      items: analyzed.map((row) => ({
        rowNumber: row.rowNumber,
        title: row.title,
        status: row.status,
        matchScore: row.matchScore,
        message: row.message,
      })),
    },
  };
}

export async function applyImportBatch(batchId: string, actorEmail: string) {
  const batchRows = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  const batch = batchRows[0];
  if (!batch) return { ok: false, message: "İçe aktarım bulunamadı." };
  if (batch.mode === "applied") return { ok: true, message: "Bu paket daha önce uygulandı (idempotent)." };

  const items = await db.select().from(importItems).where(eq(importItems.batchId, batchId));
  const brandRows = await db.select().from(brands);
  const categoryRows = await db.select().from(categories);
  const brandMap = new Map(brandRows.map((brand) => [normalizeTr(brand.name), brand]));

  let created = 0;
  let linked = 0;
  let pendingReview = 0;

  for (const item of items) {
    if (item.status === "error" || item.status === "applied") continue;

    // Ambiguous rows (75–94) must be resolved by a human before any link is written.
    if (item.status === "review") {
      pendingReview += 1;
      continue;
    }

    if (item.status === "match") {
      if (!item.matchedProductId) continue;
      await db
        .insert(marketplaceListings)
        .values({
          sourceKey: batch.sourceKey,
          sourceListingId: `${batch.sourceKey}-${batch.id.slice(0, 8)}-${item.rowNumber}`,
          sourceSku: item.sourceSku,
          productId: item.matchedProductId,
          sourcePriceMinor: item.sourcePriceMinor,
          sourceStock: item.sourceStock,
          matchScore: item.matchScore,
          matchedBy: item.matchScore === 100 ? "barcode" : "review",
        })
        .onConflictDoNothing();
      await db
        .update(importItems)
        .set({ status: "applied", matchedProductId: item.matchedProductId })
        .where(eq(importItems.id, item.id));
      linked += 1;
      continue;
    }

    if (item.status === "new" && item.title) {
      const brand = item.brandName ? brandMap.get(normalizeTr(item.brandName)) : undefined;
      if (!brand) {
        await db
          .update(importItems)
          .set({ status: "error", message: "Marka katalogda bulunamadı; önce marka oluşturun." })
          .where(eq(importItems.id, item.id));
        continue;
      }
      const guessCategory =
        categoryRows.find((category) =>
          normalizeTr(item.title ?? "").includes(normalizeTr(category.shortName ?? category.name)),
        ) ?? categoryRows[0];

      const baseSlug = slugifyTr(item.title);
      const slug = `${baseSlug}-${batch.id.slice(0, 6)}`;
      const price = item.sourcePriceMinor ?? 0;

      const [product] = await db
        .insert(products)
        .values({
          brandId: brand.id,
          categoryId: guessCategory?.id,
          name: item.title,
          slug,
          modelCode: item.sourceSku ?? null,
          shortDescription: "Pazaryeri aktarımından gelen aday ürün. Yayın öncesi içerik ve görsel hakkı doğrulanmalı.",
          description: "Bu ürün bir pazaryeri dışa aktarımından alınmıştır. Kaynak fiyatı satış fiyatı olarak kullanılmaz.",
          listPrice: price,
          salePrice: price,
          status: "review",
          sourceKey: batch.sourceKey,
        })
        .returning();

      await db.insert(productImages).values({
        productId: product.id,
        url: "/images/hero.jpg",
        alt: "Hakları doğrulanmamış yer tutucu görsel",
        rightsStatus: "unknown",
      });

      const [variant] = await db
        .insert(productVariants)
        .values({
          productId: product.id,
          sku: `IMP-${batch.id.slice(0, 6)}-${item.rowNumber}`,
          barcode: item.barcode,
          size: "M",
          color: "Belirtilmedi",
        })
        .returning();
      await db.insert(inventory).values({ variantId: variant.id, onHand: 0, reserved: 0 });

      await db
        .update(importItems)
        .set({ status: "applied", matchedProductId: product.id })
        .where(eq(importItems.id, item.id));
      created += 1;
    }
  }

  await db
    .update(importBatches)
    .set({
      mode: "applied",
      status: pendingReview > 0 ? "needs_review" : "applied",
      publishedRows: created,
    })
    .where(eq(importBatches.id, batchId));

  await writeAudit({
    actorType: "admin",
    actorEmail,
    action: "import.apply",
    entityType: "import_batch",
    entityId: batchId,
    summary: `İçe aktarım uygulandı: ${created} yeni aday ürün, ${linked} ilan eşleştirildi, ${pendingReview} satır insan onayında bekliyor.`,
    metadata: { created, linked, pendingReview },
  });

  return {
    ok: true,
    message: `${created} yeni aday ürün onay kuyruğuna alındı, ${linked} ilan eşleştirildi. ${
      pendingReview > 0 ? `${pendingReview} belirsiz satır insan onayı bekliyor.` : "Yayın için ayrıca onay gerekir."
    }`,
  };
}

export async function linkImportItemToProduct(input: {
  itemId: string;
  productId: string;
  actorEmail: string;
}) {
  const rows = await db
    .select({ item: importItems, batch: importBatches })
    .from(importItems)
    .innerJoin(importBatches, eq(importBatches.id, importItems.batchId))
    .where(eq(importItems.id, input.itemId))
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, message: "Satır bulunamadı." };
  if (row.item.status === "applied") return { ok: false, message: "Bu satır zaten uygulandı." };

  await db
    .insert(marketplaceListings)
    .values({
      sourceKey: row.batch.sourceKey,
      sourceListingId: `${row.batch.sourceKey}-manual-${row.item.id.slice(0, 8)}`,
      sourceSku: row.item.sourceSku,
      productId: input.productId,
      sourcePriceMinor: row.item.sourcePriceMinor,
      sourceStock: row.item.sourceStock,
      matchScore: row.item.matchScore,
      matchedBy: "manual",
    })
    .onConflictDoNothing();

  await db
    .update(importItems)
    .set({
      status: "applied",
      matchedProductId: input.productId,
      message: "Manuel onay: ana ürünle ilişkilendirildi",
    })
    .where(eq(importItems.id, input.itemId));

  await writeAudit({
    actorType: "admin",
    actorEmail: input.actorEmail,
    action: "import.manual_link",
    entityType: "import_item",
    entityId: input.itemId,
    summary: "Belirsiz satır manuel olarak bir ürüne bağlandı.",
  });
  return { ok: true, message: "Satır ana ürüne bağlandı." };
}

export async function markImportItemAsNew(input: { itemId: string; actorEmail: string }) {
  const updated = await db
    .update(importItems)
    .set({ status: "new", message: "Manuel karar: ayrı yeni ürün adayı" })
    .where(eq(importItems.id, input.itemId))
    .returning({ id: importItems.id });
  if (updated.length === 0) return { ok: false, message: "Satır bulunamadı." };

  await writeAudit({
    actorType: "admin",
    actorEmail: input.actorEmail,
    action: "import.mark_new",
    entityType: "import_item",
    entityId: input.itemId,
    summary: "Belirsiz satır yeni ürün adayı olarak işaretlendi.",
  });
  return { ok: true, message: "Satır yeni ürün adayı olarak işaretlendi. Uygulama adımını tekrar çalıştırın." };
}

export async function listImportBatches(limit = 25) {
  return db.select().from(importBatches).orderBy(desc(importBatches.createdAt)).limit(limit);
}

export async function getImportBatch(batchId: string) {
  const batchRows = await db.select().from(importBatches).where(eq(importBatches.id, batchId)).limit(1);
  const batch = batchRows[0];
  if (!batch) return null;
  const items = await db
    .select()
    .from(importItems)
    .where(eq(importItems.batchId, batchId))
    .orderBy(importItems.rowNumber);
  return { ...batch, items };
}
