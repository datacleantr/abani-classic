import { getProductCardsByIds } from "@/lib/catalog";
import { createMemoryRateLimiter, requestIp } from "@/lib/memory-rate-limit";
import { toProductCardData } from "@/lib/product-card-helpers";
import { parseProductIdsParam } from "@/lib/product-ids";

export const dynamic = "force-dynamic";

/** IP başına dakikada 60 istek (favoriler sayfası normalde birkaç istek yapar). */
const limiter = createMemoryRateLimiter({ limit: 60, windowMs: 60_000 });

/**
 * GET /api/products?ids=<uuid>,<uuid>,…  (en fazla 100)
 * Favoriler sayfası için yayındaki ürünlerin kart verisi. Yalnızca kartın gösterdiği alanlar döner
 * (SKU, satış adedi vb. yok); kişisel veri yoktur. Yayından kalkmış/bilinmeyen kimlikler sessizce atlanır.
 */
export async function GET(request: Request) {
  const rate = limiter.check(requestIp(request));
  if (!rate.allowed) {
    return Response.json(
      { ok: false, message: "Çok fazla istek yapıldı. Lütfen biraz sonra yeniden deneyin." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds), "Cache-Control": "no-store" } },
    );
  }

  const parsed = parseProductIdsParam(new URL(request.url).searchParams.get("ids"));
  if (!parsed.ok) {
    return Response.json({ ok: false, message: parsed.message }, { status: 400 });
  }

  try {
    const products = (await getProductCardsByIds(parsed.ids)).map(toProductCardData);
    return Response.json({ ok: true, products }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false, message: "Ürünler yüklenemedi." }, { status: 500 });
  }
}
