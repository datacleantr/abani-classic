import "dotenv/config";
import type { Config } from "drizzle-kit";

// Üretimde DATABASE_URL ortam değişkeninden okunur; lokal .env üzerinden de çalışır.
// Hiçbir gizli değer bu dosyaya yazılmaz.
const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL ortam değişkeni tanımlı değil. .env dosyasını kontrol edin.");
}

export default {
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url },
} satisfies Config;
