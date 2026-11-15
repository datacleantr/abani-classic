import "dotenv/config";

import { db, pool } from "../src/db";
import { importItems } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { analyzeImport, applyImportBatch } from "../src/lib/imports";

const csv = `Ürün Adı;Marka;Barkod;SKU;Fiyat;Stok;Kategori
Abani Essential Modal Boxer;Abani Classic;868001000001;AC-BOX-01-ANT-S-01;389,90;12;Boxer
Verify Test Boxer;Abani Classic;;VRF-BOX-01;249,90;8;Boxer
=HYPERLINK("http://x");Tutku;;VRF-BOX-02;199,90;3;Boxer
Eksik Fiyat Ürün;Jiber;;VRF-BOX-03;;2;Boxer`;

async function main() {
  const first = await analyzeImport({
    sourceKey: "trendyol",
    fileName: "verify-import.csv",
    content: csv,
    createdBy: "verify@abaniclassic.com",
  });

  if (!first.ok) {
    console.error("Dry-run failed:", first.message);
    process.exit(1);
  }

  console.log("dry-run:", {
    total: first.analysis.totalRows,
    valid: first.analysis.validRows,
    errors: first.analysis.errorRows,
    matches: first.analysis.matchRows,
    newRows: first.analysis.newRows,
    duplicateFile: first.analysis.duplicateFile,
    statuses: first.analysis.items.map((item) => `${item.rowNumber}:${item.status}:${item.message}`),
  });

  const applied = await applyImportBatch(first.analysis.batchId, "verify@abaniclassic.com");
  console.log("apply:", applied);

  const again = await applyImportBatch(first.analysis.batchId, "verify@abaniclassic.com");
  console.log("apply again (idempotent):", again);

  const duplicate = await analyzeImport({
    sourceKey: "trendyol",
    fileName: "verify-import.csv",
    content: csv,
    createdBy: "verify@abaniclassic.com",
  });
  console.log("duplicate file warning:", duplicate.ok && duplicate.analysis.duplicateFile);

  const items = await db
    .select({ rowNumber: importItems.rowNumber, status: importItems.status, message: importItems.message })
    .from(importItems)
    .where(eq(importItems.batchId, first.analysis.batchId));
  console.log("items:", items);

  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
