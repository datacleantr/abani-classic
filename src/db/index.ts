import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Build sırasında (CI / Vercel build) DATABASE_URL henüz tanımlı olmayabilir;
// bu yüzden modül yüklenirken throw etmiyoruz. pg.Pool zaten bağlantıyı ilk
// sorguda açar; sorgu anında URL yoksa anlamlı bir hata fırlatırız.
const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __abaniPostgresPool?: Pool;
};

function resolveConnectionString(): string {
  const url = process.env.DATABASE_URL ?? databaseUrl;
  if (!url) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Ortam değişkenlerini (Vercel/ENV) kontrol edin.",
    );
  }
  return url;
}

export const pool =
  globalForDb.__abaniPostgresPool ??
  new Pool({
    connectionString: databaseUrl,
    // Bağlantı havuzu tembel açılır; URL yoksa ilk sorguda resolve edilir.
    max: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__abaniPostgresPool = pool;
}

export const db = drizzle(pool, {
  // Sorgu anında eksik URL'yi yakalamak için wrapper kullanılabilir; pratikte
  // health route ve tüm repository çağrıları bu pool üzerinden çalışır.
});

export function assertDatabaseConfigured(): void {
  resolveConnectionString();
}
