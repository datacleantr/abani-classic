/**
 * Pazarama "Abani Classic" mağazasının herkese açık ilanlarını toplar.
 *
 * - Yalnızca robots.txt'in izin verdiği yollar (`?magaza`, `?sayfa`) okunur.
 * - Yalnızca düz veri ayrıştırılır (JSON-LD + HTML); sayfa betikleri çalıştırılmaz.
 * - Düşük eşzamanlılık + gecikme ile çalışır, kesilirse kaldığı yerden devam eder.
 * - Çıktı ham kaynak kaydıdır; kataloğa doğrudan yazmaz (bkz. scripts/sources/pazarama-import.ts).
 *
 * Kullanım: npx tsx scripts/sources/pazarama-fetch.ts [--limit=N]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const STORE_URL = "https://www.pazarama.com/magaza/abani-classic";
const ORIGIN = "https://www.pazarama.com";
const OUT_DIR = path.join(process.cwd(), "data", "sources", "pazarama");
const LISTINGS_FILE = path.join(OUT_DIR, "listings.jsonl");
const MANIFEST_FILE = path.join(OUT_DIR, "manifest.json");
const USER_AGENT = "Mozilla/5.0 (compatible; abani-catalog-sync/1.0)";
const CONCURRENCY = 2;
const DELAY_MS = 350;
export const PARSER_VERSION = "pazarama-html-1";

export type PazaramaListing = {
  sourceKey: "pazarama";
  sourceListingId: string;
  url: string;
  fetchedAt: string;
  parserVersion: string;
  title: string | null;
  brandName: string | null;
  sourceProductId: string | null;
  color: string | null;
  size: string | null;
  priceMinor: number | null;
  listPriceMinor: number | null;
  currency: string | null;
  inStock: boolean | null;
  ratingValue: number | null;
  reviewCount: number | null;
  categoryPath: string[];
  attributes: Record<string, string>;
  images: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHtml(url: string, attempt = 1): Promise<string> {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "tr-TR,tr;q=0.9" },
  });
  if (response.status === 429 || response.status >= 500) {
    if (attempt >= 4) throw new Error(`HTTP ${response.status} ${url}`);
    await sleep(2000 * attempt);
    return fetchHtml(url, attempt + 1);
  }
  // 403 / captcha: erişim koruması aşılmaz, iş durdurulur.
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function clean(value: string): string {
  return decodeEntities(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Sayfanın sunucu tarafında render edilmiş bölümü; gömülü uygulama durumu hariç. */
function staticPart(html: string): string {
  const index = html.indexOf("window.__NUXT__");
  return index === -1 ? html : html.slice(0, index);
}

export function parseListingUrls(html: string): string[] {
  const body = staticPart(html);
  const found = new Set<string>();
  for (const match of body.matchAll(/href="(\/[^"?]*-p-[^"?]+)\?magaza=abani-classic"/g)) {
    found.add(match[1]);
  }
  return [...found];
}

export function parseTotalCount(html: string): number | null {
  const match = clean(staticPart(html)).match(/Toplam\s+\d+\s*\/\s*(\d+)\s+ürün/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function parseTlToMinor(value: string): number | null {
  const match = value.match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?\s*TL/);
  if (!match) return null;
  const whole = Number.parseInt(match[1].replace(/\./g, ""), 10);
  const fraction = Number.parseInt((match[2] ?? "0").padEnd(2, "0"), 10);
  return whole * 100 + fraction;
}

function jsonLdBlocks(body: string): unknown[] {
  const blocks: unknown[] = [];
  for (const match of body.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch {
      // bozuk blok atlanır
    }
  }
  return blocks;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseListing(html: string, urlPath: string): PazaramaListing {
  const body = staticPart(html);
  const sourceListingId = urlPath.slice(urlPath.lastIndexOf("-p-") + 3);
  const blocks = jsonLdBlocks(body).map(asRecord);
  const product = blocks.find((block) => block?.["@type"] === "Product") ?? null;
  const breadcrumb = blocks.find((block) => block?.["@type"] === "BreadcrumbList") ?? null;

  const offers = asRecord(product?.offers);
  const rating = asRecord(product?.aggregateRating);
  const priceValue = typeof offers?.price === "number" ? offers.price : Number(offers?.price);

  const categoryPath: string[] = [];
  if (Array.isArray(breadcrumb?.itemListElement)) {
    for (const element of breadcrumb.itemListElement) {
      const name = asString(asRecord(element)?.name);
      if (name && name !== "Anasayfa") categoryPath.push(name);
    }
  }

  const attributes: Record<string, string> = {};
  for (const match of body.matchAll(
    /<div class="w-1\/2 feature"[^>]*>\s*<div[^>]*>\s*<span[^>]*>([\s\S]*?)<\/span>\s*<span[^>]*>([\s\S]*?)<\/span>/g,
  )) {
    const key = clean(match[1]);
    const value = clean(match[2]);
    if (key && value) attributes[key] = value;
  }

  const images: string[] = [];
  const marker = `/asset/${sourceListingId.toLowerCase()}/`;
  for (const match of body.matchAll(/https:\/\/img\.pzrmcdn\.com\/[^"' )]+/g)) {
    const normalized = decodeEntities(match[0]).replace(/\/mnresize\/\d+\/\d+\//, "/");
    if (!normalized.toLowerCase().includes(marker)) continue;
    if (!images.includes(normalized)) images.push(normalized);
  }
  const primary = asString(product?.image);
  if (primary && !images.includes(primary)) images.unshift(primary);

  // Liste fiyatı: ürün başlık bloğundaki üstü çizili/gri fiyat.
  const listMatch = body.match(/<p class="text-4xl font-bold[^"]*">\s*([\d.,]+\s*TL)\s*<\/p>/);

  return {
    sourceKey: "pazarama",
    sourceListingId,
    url: `${ORIGIN}${urlPath}`,
    fetchedAt: new Date().toISOString(),
    parserVersion: PARSER_VERSION,
    title: asString(product?.name),
    brandName: asString(asRecord(product?.brand)?.name),
    sourceProductId: asString(product?.sku),
    color: asString(product?.color) ?? attributes["Renk"] ?? null,
    size: attributes["Beden/Yaş"] ?? attributes["Beden"] ?? asString(product?.recommendedAge),
    priceMinor: Number.isFinite(priceValue) ? Math.round(priceValue * 100) : null,
    listPriceMinor: listMatch ? parseTlToMinor(listMatch[1]) : null,
    currency: asString(offers?.priceCurrency),
    inStock:
      typeof offers?.availability === "string" ? offers.availability.endsWith("InStock") : null,
    ratingValue: typeof rating?.ratingValue === "number" ? rating.ratingValue : null,
    reviewCount: typeof rating?.reviewCount === "number" ? rating.reviewCount : null,
    categoryPath,
    attributes,
    images,
  };
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (cursor < items.length) {
        const item = items[cursor];
        cursor += 1;
        await worker(item);
        await sleep(DELAY_MS);
      }
    }),
  );
}

async function main() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : Infinity;
  mkdirSync(OUT_DIR, { recursive: true });

  const done = new Set<string>();
  if (existsSync(LISTINGS_FILE)) {
    for (const line of readFileSync(LISTINGS_FILE, "utf8").split("\n")) {
      if (line.trim()) done.add((JSON.parse(line) as PazaramaListing).sourceListingId);
    }
  }

  const urls: string[] = [];
  let total: number | null = null;
  for (let page = 1; page <= 60 && urls.length < limit; page += 1) {
    const html = await fetchHtml(page === 1 ? STORE_URL : `${STORE_URL}?sayfa=${page}`);
    if (page === 1) total = parseTotalCount(html);
    const pageUrls = parseListingUrls(html).filter((url) => !urls.includes(url));
    if (pageUrls.length === 0) break;
    urls.push(...pageUrls);
    console.log(`liste sayfa ${page}: +${pageUrls.length} (toplam ${urls.length}/${total ?? "?"})`);
    await sleep(DELAY_MS);
  }

  const pending = urls
    .slice(0, limit)
    .filter((url) => !done.has(url.slice(url.lastIndexOf("-p-") + 3)));
  console.log(`${urls.length} ilan bulundu, ${pending.length} tanesi indirilecek.`);

  let ok = 0;
  const failures: { url: string; error: string }[] = [];
  await pool(pending, async (urlPath) => {
    try {
      const html = await fetchHtml(`${ORIGIN}${urlPath}?magaza=abani-classic`);
      const listing = parseListing(html, urlPath);
      appendFileSync(LISTINGS_FILE, `${JSON.stringify(listing)}\n`);
      ok += 1;
      if (ok % 25 === 0) console.log(`  ${ok}/${pending.length}`);
    } catch (error) {
      failures.push({ url: urlPath, error: error instanceof Error ? error.message : String(error) });
    }
  });

  writeFileSync(
    MANIFEST_FILE,
    JSON.stringify(
      {
        source: STORE_URL,
        parserVersion: PARSER_VERSION,
        finishedAt: new Date().toISOString(),
        storeReportedTotal: total,
        listingUrlsFound: urls.length,
        fetchedThisRun: ok,
        alreadyPresent: done.size,
        failures,
      },
      null,
      2,
    ),
  );
  console.log(`bitti: ${ok} yeni, ${done.size} önceden vardı, ${failures.length} hata.`);
}

if (process.argv[1]?.endsWith("pazarama-fetch.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
