/**
 * Entegrasyon testleri için ayrı, tek kullanımlık bir veritabanı hazırlar:
 * DATABASE_URL'deki veritabanı adının sonuna `_test` eklenir, veritabanı sıfırdan
 * oluşturulur ve migration'lar uygulanır. Geliştirme verisine dokunulmaz.
 */
import "dotenv/config";
import path from "node:path";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

export default async function setup() {
  const baseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("Entegrasyon testleri için DATABASE_URL gerekli.");

  const url = new URL(baseUrl);
  const baseName = url.pathname.replace(/^\//, "");
  const testName = baseName.endsWith("_test") ? baseName : `${baseName}_test`;
  if (!/^[a-zA-Z0-9_]+$/.test(testName)) throw new Error("Geçersiz veritabanı adı.");

  const adminUrl = new URL(baseUrl);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  await admin.query(`drop database if exists "${testName}" with (force)`);
  await admin.query(`create database "${testName}"`);
  await admin.end();

  url.pathname = `/${testName}`;
  process.env.DATABASE_URL = url.toString();

  const pool = new Pool({ connectionString: url.toString() });
  await migrate(drizzle(pool), { migrationsFolder: path.join(process.cwd(), "drizzle") });
  await pool.end();
}
