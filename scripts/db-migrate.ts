/**
 * Sürüm kontrollü migration çalıştırıcı.
 *
 * Proje başlangıçta `drizzle-kit push` ile kurulduğu için bazı veritabanlarında
 * tablolar var ama migration geçmişi yok. Bu durumda 0000_baseline "uygulanmış"
 * olarak işaretlenir, ardından kalan migration'lar sırayla çalışır.
 *
 * Kullanım: npm run db:migrate
 */
import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";

import { db, pool } from "../src/db";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

type Journal = { entries: { idx: number; when: number; tag: string }[] };

async function markBaselineIfNeeded() {
  const existing = await db.execute(
    sql`select to_regclass('public.orders') as orders, to_regclass('drizzle.__drizzle_migrations') as history`,
  );
  const row = existing.rows[0] as { orders: string | null; history: string | null };
  if (!row.orders) return; // boş veritabanı: her şey sıfırdan uygulanır

  if (row.history) {
    const applied = await db.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`);
    if ((applied.rows[0] as { n: number }).n > 0) return;
  }

  const journal = JSON.parse(
    readFileSync(path.join(MIGRATIONS_FOLDER, "meta", "_journal.json"), "utf8"),
  ) as Journal;
  const baseline = journal.entries.find((entry) => entry.idx === 0);
  if (!baseline) throw new Error("Baseline migration bulunamadı.");

  const hash = createHash("sha256")
    .update(readFileSync(path.join(MIGRATIONS_FOLDER, `${baseline.tag}.sql`), "utf8"))
    .digest("hex");

  await db.execute(sql`create schema if not exists drizzle`);
  await db.execute(sql`
    create table if not exists drizzle.__drizzle_migrations (
      id serial primary key,
      hash text not null,
      created_at bigint
    )
  `);
  await db.execute(
    sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${baseline.when})`,
  );
  console.log(`Mevcut şema bulundu; ${baseline.tag} uygulanmış olarak işaretlendi.`);
}

async function main() {
  await markBaselineIfNeeded();
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Migration'lar güncel.");
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
