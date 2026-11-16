import { normalizeTr, slugifyTr } from "../format";

/**
 * Pazarama ilanlarını katalog adaylarına dönüştüren saf (yan etkisiz) mantık.
 *
 * Pazarama'da her ilan tek bir renk/beden kombinasyonudur. Aynı ürünün
 * varyantları; marka, paket adedi ve (beden/renk çıkarılmış) başlık aynıysa
 * tek ürün adayı altında toplanır. Bu, blueprint §7.4'teki 4. sinyal seviyesidir
 * (marka + normalize başlık + varyant özellikleri): sonuç her zaman `review`
 * durumunda oluşturulur, yayın insan onayı ister.
 */
export type SourceListing = {
  sourceKey: string;
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

export type CandidateVariant = {
  sku: string;
  barcode: string | null;
  size: string | null;
  color: string | null;
  priceMinor: number;
  inStock: boolean;
  listing: SourceListing;
  /** Aynı renk/beden için birden fazla ilan varsa burada tutulur (aynı varyanta bağlanır). */
  duplicateListings: SourceListing[];
};

export type CandidateProduct = {
  groupKey: string;
  brandName: string;
  name: string;
  slugBase: string;
  categorySlug: string | null;
  packQuantity: number | null;
  packInfo: string | null;
  fabric: string | null;
  attributes: Record<string, string>;
  basePriceMinor: number;
  images: string[];
  variants: CandidateVariant[];
  warnings: string[];
};

export function isValidEan13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const sum = code
    .slice(0, 12)
    .split("")
    .reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);
  return (10 - (sum % 10)) % 10 === Number(code[12]);
}

export function parsePackQuantity(listing: Pick<SourceListing, "title" | "attributes">): number | null {
  const fromAttribute = listing.attributes["Parça Sayısı"] ?? listing.attributes["Adet"];
  if (fromAttribute) {
    if (/tekli/i.test(fromAttribute)) return 1;
    const match = fromAttribute.match(/\d+/);
    if (match) return Number.parseInt(match[0], 10);
  }
  const title = normalizeTr(listing.title ?? "");
  const match =
    title.match(/(\d+)\s*'?\s*(?:li|lu)\b/) ?? title.match(/(\d+)\s*(?:adet|cift|paket)\b/);
  if (match) {
    const value = Number.parseInt(match[1], 10);
    if (value >= 1 && value <= 48) return value;
  }
  return null;
}

/** Kaynak kategori yolunu mağaza kategorisine eşler; emin değilse null döner. */
export function mapCategory(listing: Pick<SourceListing, "title" | "categoryPath" | "attributes">): string | null {
  const path = normalizeTr(listing.categoryPath.join(" > "));
  const title = normalizeTr(listing.title ?? "");
  const isWomen = path.includes("kadin");

  if (path.includes("termal") || /\btermal\b/.test(title)) return isWomen ? null : "termal-iclik";

  if (isWomen) {
    if (path.includes("kadin corap")) return "kadin-corap";
    if (path.includes("kadin tayt")) return "kadin-tayt";
    if (path.includes("kadin kulot")) return "kadin-kulot";
    if (path.includes("kadin atlet")) return "kadin-atlet";
    return null;
  }

  if (path.includes("erkek corap")) return "erkek-corap";
  if (path.includes("erkek boxer, slip")) {
    return /\b(slip|kulot|don)\b/.test(title) && !/\bboxer\b/.test(title) ? "erkek-slip" : "erkek-boxer";
  }
  if (path.includes("erkek atlet")) {
    const sleeve = normalizeTr(listing.attributes["Kol Tipi"] ?? "");
    const isFanila = /\bfanila\b/.test(title) || /kisa kol|yarim kol|uzun kol/.test(`${sleeve} ${title}`);
    return isFanila ? "erkek-fanila" : "erkek-atlet";
  }
  return null;
}

export const EXTRA_CATEGORIES: { slug: string; name: string; shortName: string }[] = [
  { slug: "kadin-atlet", name: "Kadın Atlet & Body", shortName: "Kadın Atlet" },
  { slug: "kadin-kulot", name: "Kadın Külot", shortName: "Kadın Külot" },
  { slug: "kadin-tayt", name: "Kadın Tayt", shortName: "Kadın Tayt" },
  { slug: "kadin-corap", name: "Kadın Çorap", shortName: "Kadın Çorap" },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Başlıktan bağımsız bir sözcük olarak geçen belirteci çıkarır (Türkçe harf duyarlı). */
function stripToken(title: string, token: string | null): string {
  if (!token) return title;
  const variants = new Set([token, token.replace(/\s*-\s*/g, "-"), token.replace(/\s*-\s*/g, " - ")]);
  let result = title;
  for (const variant of variants) {
    const pattern = new RegExp(
      `(^|[\\s,/()\\-])${escapeRegex(variant)}(?=$|[\\s,/()\\-])`,
      "giu",
    );
    result = result.replace(pattern, "$1");
  }
  return result.replace(/\s{2,}/g, " ").replace(/\s+([,/)])/g, "$1").trim();
}

export function baseTitle(listing: Pick<SourceListing, "title" | "size" | "color">): string {
  return stripToken(stripToken(listing.title ?? "", listing.size), listing.color);
}

export function provisionalSku(listing: Pick<SourceListing, "sourceListingId">): string {
  const cleaned = listing.sourceListingId.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `PZ-${cleaned}`.slice(0, 100);
}

function listingPrice(listing: SourceListing): number {
  // Pazarama'nın vitrin fiyatı; "sepette" indirimli fiyat kampanyaya özgü olduğu için kullanılmaz.
  return listing.listPriceMinor ?? listing.priceMinor ?? 0;
}

function mostCommon(values: number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0]?.[0] ?? 0;
}

const VARIANT_ATTRIBUTE_KEYS = new Set(["Renk", "Beden/Yaş", "Beden"]);

export function groupListings(listings: SourceListing[]): CandidateProduct[] {
  const groups = new Map<string, SourceListing[]>();
  for (const listing of listings) {
    if (!listing.title || !listing.brandName) continue;
    const pack = parsePackQuantity(listing);
    const key = [
      normalizeTr(listing.brandName),
      pack ?? "?",
      mapCategory(listing) ?? "?",
      slugifyTr(baseTitle(listing)),
    ].join("|");
    const list = groups.get(key) ?? [];
    list.push(listing);
    groups.set(key, list);
  }

  const candidates: CandidateProduct[] = [];
  for (const [groupKey, members] of groups) {
    const first = members[0];
    const warnings: string[] = [];
    const packQuantity = parsePackQuantity(first);
    const categorySlug = mapCategory(first);
    if (packQuantity === null) warnings.push("Paket adedi kaynaktan çıkarılamadı.");
    if (!categorySlug) warnings.push("Kategori eşlenemedi.");

    const variants: CandidateVariant[] = [];
    for (const listing of members) {
      const existing = variants.find(
        (variant) =>
          normalizeTr(variant.size ?? "") === normalizeTr(listing.size ?? "") &&
          normalizeTr(variant.color ?? "") === normalizeTr(listing.color ?? ""),
      );
      if (existing) {
        existing.duplicateListings.push(listing);
        continue;
      }
      variants.push({
        sku: provisionalSku(listing),
        barcode: isValidEan13(listing.sourceListingId) ? listing.sourceListingId : null,
        size: listing.size?.trim() || null,
        color: listing.color?.trim() || null,
        priceMinor: listingPrice(listing),
        inStock: listing.inStock === true,
        listing,
        duplicateListings: [],
      });
    }

    const colors = new Set(variants.map((variant) => normalizeTr(variant.color ?? "")));
    // Tek renkli üründe renk adı başlıkta kalır; çok renklide çıkarılır.
    const name = (colors.size > 1 ? baseTitle(first) : stripToken(first.title ?? "", first.size)) || first.title!;

    const attributes: Record<string, string> = {};
    for (const [key, value] of Object.entries(first.attributes)) {
      if (VARIANT_ATTRIBUTE_KEYS.has(key)) continue;
      if (members.every((member) => member.attributes[key] === value)) attributes[key] = value;
    }

    const images: string[] = [];
    for (const member of members) {
      for (const image of member.images) {
        if (!images.includes(image)) images.push(image);
      }
    }

    candidates.push({
      groupKey,
      brandName: first.brandName!.trim(),
      name: name.slice(0, 240),
      slugBase: slugifyTr(name).slice(0, 200),
      categorySlug,
      packQuantity,
      packInfo: packQuantity && packQuantity > 1 ? `${packQuantity} adet` : null,
      fabric: attributes["Kumaş Tipi"] ?? attributes["Materyal"] ?? null,
      attributes,
      basePriceMinor: mostCommon(variants.map((variant) => variant.priceMinor)),
      images: images.slice(0, 6),
      variants,
      warnings,
    });
  }
  return candidates;
}
