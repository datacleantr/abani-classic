/**
 * Ürün kimliği listesi doğrulama (favoriler → /api/products?ids=). Zod içerdiği için
 * istemci paketine girmesin diye kart yardımcılarından ayrı tutulur.
 */
import { z } from "zod";

export const MAX_PRODUCT_IDS = 100;

const productIdsSchema = z.array(z.uuid()).max(MAX_PRODUCT_IDS);

export type ParsedProductIds = { ok: true; ids: string[] } | { ok: false; message: string };

/**
 * "a,b,c" biçimindeki sorgu parametresini doğrular: yalnızca UUID, en fazla 100,
 * tekrarlar atılır, sıra korunur. Boş/eksik parametre boş liste demektir.
 */
export function parseProductIdsParam(value: string | null | undefined): ParsedProductIds {
  if (!value || value.trim() === "") return { ok: true, ids: [] };
  if (value.length > MAX_PRODUCT_IDS * 40) return { ok: false, message: "Çok fazla ürün kimliği." };
  const parts = [...new Set(value.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean))];
  const parsed = productIdsSchema.safeParse(parts);
  if (!parsed.success) return { ok: false, message: "Ürün kimlikleri geçersiz." };
  return { ok: true, ids: parsed.data };
}

/** UUID olmayanları ve tekrarları atar, ilk `max` kimliği sırayla döndürür (sunucu tarafı savunma). */
export function sanitizeProductIds(ids: readonly string[], max = MAX_PRODUCT_IDS): string[] {
  const valid = ids
    .map((id) => (typeof id === "string" ? id.trim().toLowerCase() : ""))
    .filter((id) => z.uuid().safeParse(id).success);
  return [...new Set(valid)].slice(0, max);
}
