import "dotenv/config";
import { sql } from "drizzle-orm";

import { db, pool } from "../src/db";

/**
 * Canlıya geçmeden önce demo hesapları, demo siparişleri ve demo import kayıtlarını siler.
 * Katalog (marka/kategori/ürün) korunur; isterseniz admin panelinden düzenlersiniz.
 * Kullanım: npx tsx scripts/remove-demo-data.ts --confirm
 */
async function main() {
  if (!process.argv.includes("--confirm")) {
    console.error("Bu işlem geri alınamaz. Onaylamak için --confirm ekleyin.");
    process.exit(1);
  }

  await db.execute(sql`
    truncate table
      payment_events, payments, order_status_history, return_requests, shipments,
      order_items, orders, import_items, import_batches, idempotency_keys,
      newsletter_subscribers, sessions, customers, audit_logs, marketplace_listings
    restart identity cascade
  `);

  await db.execute(sql`delete from admin_users where email like '%@abaniclassic.com'`);
  await db.execute(sql`delete from reviews`);
  await db.execute(sql`update coupons set used_count = 0`);

  console.log("Demo veriler temizlendi. Şimdi scripts/create-admin.ts ile gerçek yöneticiyi oluşturun.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
