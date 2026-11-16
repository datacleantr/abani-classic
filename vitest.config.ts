import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    // Birim testleri veritabanına bağlanmaz; modül yüklenebilsin diye sahte adres verilir.
    env: { DATABASE_URL: "postgresql://unit:unit@127.0.0.1:1/unit" },
  },
});
