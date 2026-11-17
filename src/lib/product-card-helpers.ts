/**
 * Ürün kartı ve katalog vitrini için saf (DB'siz, React'sız) yardımcılar.
 * Hem sunucu (catalog.ts, route handler) hem istemci (kart düğmeleri) tarafından kullanılır;
 * bu yüzden burada veritabanı veya tarayıcı API'si kullanılmaz.
 */
/* -------------------------------------------------------------------------- */
/* Bedenler                                                                    */
/* -------------------------------------------------------------------------- */

/** Harf bedenleri; aynı sıradaki eş anlamlılar (XXL = 2XL) aynı rütbeyi paylaşır. */
const LETTER_SIZE_RANKS: Record<string, number> = {
  XXS: 0,
  XS: 1,
  S: 2,
  M: 3,
  L: 4,
  XL: 5,
  XXL: 6,
  "2XL": 6,
  XXXL: 7,
  "3XL": 7,
  "4XL": 8,
  "5XL": 9,
  "6XL": 10,
  "7XL": 11,
};

function letterRank(size: string): number | null {
  const rank = LETTER_SIZE_RANKS[size.trim().toUpperCase()];
  return rank === undefined ? null : rank;
}

function leadingNumber(size: string): number | null {
  const match = /^\s*(\d+(?:[.,]\d+)?)/.exec(size);
  return match ? Number(match[1].replace(",", ".")) : null;
}

/** Harf bedenleri (XS→7XL), ardından sayısal bedenler ("40 - 44"), en sonda diğerleri. */
export function compareSizes(a: string, b: string): number {
  const ra = letterRank(a);
  const rb = letterRank(b);
  if (ra !== null && rb !== null) return ra - rb;
  if (ra !== null) return -1;
  if (rb !== null) return 1;
  const na = leadingNumber(a);
  const nb = leadingNumber(b);
  if (na !== null && nb !== null && na !== nb) return na - nb;
  if (na !== null && nb === null) return -1;
  if (na === null && nb !== null) return 1;
  return a.localeCompare(b, "tr");
}

export function orderSizes(sizes: (string | null | undefined)[]): string[] {
  const unique = [...new Set(sizes.map((s) => s?.trim()).filter((s): s is string => Boolean(s)))];
  return unique.sort(compareSizes);
}

/** Görüntüleme için "40 - 44" → "40-44". Filtre/sepet değerleri değiştirilmez. */
export function displaySize(size: string): string {
  return size.trim().replace(/\s*-\s*/g, "-");
}

export type SizeSummary = {
  /** Kartta gösterilen kısa metin: "S–2XL", "S / M / L" veya "S / M / L / XL +2". */
  short: string;
  /** Ekran okuyucu ve title için tam liste: "S, M, L, XL, 2XL". */
  full: string;
  count: number;
};

/**
 * Beden listesini kart için kısaltır. Ardışık harf bedenleri (en az 3) aralık olarak
 * ("S–2XL"), diğerleri ilk `maxVisible` beden + kalan sayısı olarak gösterilir.
 */
export function summarizeSizes(
  sizes: (string | null | undefined)[],
  maxVisible = 4,
): SizeSummary | null {
  const ordered = orderSizes(sizes);
  if (ordered.length === 0) return null;
  const full = ordered.map(displaySize).join(", ");
  if (ordered.length === 1) return { short: displaySize(ordered[0]), full, count: 1 };

  const ranks = ordered.map(letterRank);
  const allLetters = ranks.every((rank) => rank !== null);
  if (allLetters && ordered.length >= 3) {
    const uniqueRanks = [...new Set(ranks as number[])];
    const contiguous = uniqueRanks.every((rank, index) => index === 0 || rank === uniqueRanks[index - 1] + 1);
    if (contiguous) {
      return {
        short: `${displaySize(ordered[0])}–${displaySize(ordered[ordered.length - 1])}`,
        full,
        count: ordered.length,
      };
    }
  }

  const visible = ordered.slice(0, maxVisible).map(displaySize).join(" / ");
  const rest = ordered.length - maxVisible;
  return { short: rest > 0 ? `${visible} +${rest}` : visible, full, count: ordered.length };
}

/* -------------------------------------------------------------------------- */
/* Paket adedi                                                                 */
/* -------------------------------------------------------------------------- */

/** Sayının okunuşundaki son ünlüye göre -li/-lı/-lu/-lü eki (3'lü, 6'lı, 10'lu, 12'li). */
export function turkishCountSuffix(n: number): string {
  const units = ["", "i", "i", "ü", "ö", "e", "ı", "i", "i", "u"]; // bir iki üç dört beş altı yedi sekiz dokuz
  const tens = ["", "o", "i", "u", "ı", "i", "ı", "i", "e", "a"]; // on yirmi otuz kırk elli altmış yetmiş seksen doksan
  const value = Math.abs(Math.trunc(n));
  let vowel: string;
  if (value === 0) vowel = "ı"; // sıfır
  else if (value % 10 !== 0) vowel = units[value % 10];
  else if (value % 100 !== 0) vowel = tens[(value % 100) / 10];
  else if (value % 1000 !== 0) vowel = "ü"; // yüz
  else vowel = "i"; // bin
  const harmony: Record<string, string> = { a: "lı", ı: "lı", e: "li", i: "li", o: "lu", u: "lu", ö: "lü", ü: "lü" };
  return harmony[vowel] ?? "li";
}

/** 6 → "6'lı paket"; 1 veya geçersiz değer → null. */
export function packLabel(packQuantity: number | null | undefined): string | null {
  if (!packQuantity || !Number.isInteger(packQuantity) || packQuantity < 2) return null;
  return `${packQuantity}'${turkishCountSuffix(packQuantity)} paket`;
}

/* -------------------------------------------------------------------------- */
/* Varyant seçimi (kart içi hızlı sepete ekleme)                               */
/* -------------------------------------------------------------------------- */

export type PickableVariant = {
  id: string;
  size: string | null;
  color: string | null;
  /** Paket adedi; verilmezse 1 (tekli) kabul edilir. */
  packQuantity?: number;
  stock: number;
  active: boolean;
};

export type VariantOption = { value: string; label: string; available: boolean };
export type PackOption = { value: number; label: string; available: boolean };

/** Boş renk/beden "" anahtarıyla temsil edilir; böylece her varyant seçilebilir kalır. */
const keyOf = (value: string | null) => value?.trim() ?? "";
const packOf = (variant: Pick<PickableVariant, "packQuantity">) =>
  variant.packQuantity && variant.packQuantity > 0 ? variant.packQuantity : 1;

export function isSellable(variant: PickableVariant): boolean {
  return variant.active && variant.stock > 0;
}

export function sellableVariants<T extends PickableVariant>(variants: T[]): T[] {
  return variants.filter(isSellable);
}

/**
 * Etkin varyantlar arasında birden fazla renk/beden/paket bileşimi varsa kullanıcı seçim yapmalı
 * (aynı renk ve bedenin hem tekli hem 3'lü paketi varsa paket de sorulur).
 */
export function needsVariantChoice(variants: PickableVariant[]): boolean {
  const combos = new Set(
    variants.filter((v) => v.active).map((v) => `${keyOf(v.color)}|${keyOf(v.size)}|${packOf(v)}`),
  );
  return combos.size > 1;
}

export function colorOptions(variants: PickableVariant[]): VariantOption[] {
  const active = variants.filter((v) => v.active);
  const keys = [...new Set(active.map((v) => keyOf(v.color)))];
  if (keys.length === 1 && keys[0] === "") return [];
  return keys.map((key) => ({
    value: key,
    label: key || "Standart",
    available: active.some((v) => keyOf(v.color) === key && v.stock > 0),
  }));
}

export function sizeOptions(variants: PickableVariant[], color: string | null): VariantOption[] {
  const active = variants.filter((v) => v.active && (color === null || keyOf(v.color) === color));
  const keys = [...new Set(active.map((v) => keyOf(v.size)))];
  if (keys.length === 1 && keys[0] === "") return [];
  const named = orderSizes(keys);
  const ordered = keys.includes("") ? [...named, ""] : named;
  return ordered.map((key) => ({
    value: key,
    label: key ? displaySize(key) : "Standart",
    available: active.some((v) => keyOf(v.size) === key && v.stock > 0),
  }));
}

/**
 * Seçili renk ve bedendeki paket adetleri (artan). Yalnızca tek paket adedi varsa boş dizi
 * döner: soru sorulmaz, paket otomatik belirlenir.
 */
export function packOptions(
  variants: PickableVariant[],
  color: string | null,
  size: string | null,
): PackOption[] {
  const active = variants.filter(
    (v) =>
      v.active &&
      (color === null || keyOf(v.color) === color) &&
      (size === null || keyOf(v.size) === size),
  );
  const packs = [...new Set(active.map(packOf))].sort((a, b) => a - b);
  if (packs.length <= 1) return [];
  return packs.map((pack) => ({
    value: pack,
    label: packLabel(pack) ?? "Tekli",
    available: active.some((v) => packOf(v) === pack && v.stock > 0),
  }));
}

export type VariantChoice = { color: string | null; size: string | null; pack: number | null };

/** İlk satılabilir varyantın renk/beden/paketi; hiç yoksa boş seçim. */
export function initialChoice(variants: PickableVariant[]): VariantChoice {
  const first = sellableVariants(variants)[0];
  if (!first) return { color: null, size: null, pack: null };
  return { color: keyOf(first.color), size: keyOf(first.size), pack: packOf(first) };
}

/** Renk + beden belliyken paket: mevcut paket satılabiliyorsa korunur, yoksa ilk satılabilir paket. */
function pickPack(
  variants: PickableVariant[],
  color: string,
  size: string | null,
  currentPack: number | null,
): number | null {
  if (size === null) return null;
  const sellablePacks = [
    ...new Set(
      variants
        .filter((v) => isSellable(v) && keyOf(v.color) === color && keyOf(v.size) === size)
        .map(packOf),
    ),
  ].sort((a, b) => a - b);
  if (currentPack !== null && sellablePacks.includes(currentPack)) return currentPack;
  return sellablePacks[0] ?? null;
}

/** Renk değişince mevcut beden o renkte satılabiliyorsa korunur, yoksa ilk satılabilir beden seçilir. */
export function chooseColor(
  variants: PickableVariant[],
  color: string,
  currentSize: string | null,
  currentPack: number | null = null,
): VariantChoice {
  const sizes = sizeOptions(variants, color).filter((option) => option.available);
  const keep = currentSize !== null && sizes.some((option) => option.value === currentSize);
  const size = keep ? currentSize : (sizes[0]?.value ?? (sizeOptions(variants, color).length ? null : ""));
  return { color, size, pack: pickPack(variants, color, size, currentPack) };
}

/** Beden değişince mevcut paket o bedende satılabiliyorsa korunur, yoksa ilk satılabilir paket seçilir. */
export function chooseSize(
  variants: PickableVariant[],
  color: string,
  size: string,
  currentPack: number | null,
): VariantChoice {
  return { color, size, pack: pickPack(variants, color, size, currentPack) };
}

/** Seçime uyan satılabilir varyant; stokta olmayan varyant asla döndürülmez. */
export function resolveVariant<T extends PickableVariant>(variants: T[], choice: VariantChoice): T | null {
  if (choice.color === null || choice.size === null || choice.pack === null) return null;
  return (
    variants.find(
      (v) =>
        isSellable(v) &&
        keyOf(v.color) === choice.color &&
        keyOf(v.size) === choice.size &&
        packOf(v) === choice.pack,
    ) ?? null
  );
}

/** "Siyah / M" veya paketliyse "Siyah / M / 3'lü paket". */
export function variantLabel(variant: {
  color: string | null;
  size: string | null;
  packQuantity?: number;
}): string {
  return [variant.color, variant.size, packLabel(variant.packQuantity)].filter(Boolean).join(" / ");
}

/* -------------------------------------------------------------------------- */
/* Vitrin çeşitlendirme                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Sıralı listeden en fazla `limit` öğe seçer: aynı anahtardan (marka) en fazla `maxPerKey`
 * öğe alınır ve mümkünse aynı anahtar art arda gelmez. Sıralama sinyali korunur; boşluk
 * doldurmak için sınır gevşetilmez.
 */
export function diversifyByKey<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  { limit, maxPerKey }: { limit: number; maxPerKey: number },
): T[] {
  const remaining = [...items];
  const counts = new Map<string, number>();
  const result: T[] = [];
  let lastKey: string | null = null;
  while (result.length < limit && remaining.length > 0) {
    const underCap = (item: T) => (counts.get(keyOf(item)) ?? 0) < maxPerKey;
    let index = remaining.findIndex((item) => underCap(item) && keyOf(item) !== lastKey);
    if (index === -1) index = remaining.findIndex(underCap);
    if (index === -1) break;
    const [picked] = remaining.splice(index, 1);
    const key = keyOf(picked);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    result.push(picked);
    lastKey = key;
  }
  return result;
}

/** Gruplardan sırayla birer öğe alarak (round-robin) en fazla `limit` öğe döndürür. */
export function interleaveGroups<T>(groups: readonly (readonly T[])[], limit: number): T[] {
  const result: T[] = [];
  const cursors = groups.map(() => 0);
  let progressed = true;
  while (result.length < limit && progressed) {
    progressed = false;
    for (let g = 0; g < groups.length && result.length < limit; g += 1) {
      const item = groups[g][cursors[g]];
      if (item !== undefined) {
        result.push(item);
        cursors[g] += 1;
        progressed = true;
      }
    }
  }
  return result;
}

/* -------------------------------------------------------------------------- */
/* Kart verisi ve fiyat gösterimi                                              */
/* -------------------------------------------------------------------------- */

/** Gösterilebilir görseli olmayan ürünlerin kart görseli (marka/logo içermeyen nötr yer tutucu). */
export const PRODUCT_IMAGE_PLACEHOLDER = "/images/urun-gorseli-yok.svg";

export type CardVariant = {
  id: string;
  size: string | null;
  color: string | null;
  packQuantity: number;
  /** Sepette gösterilecek birim fiyat (kuruş); ödeme adımında sunucu yeniden hesaplar. */
  price: number;
  stock: number;
  active: boolean;
};

/**
 * Ürün kartının ihtiyaç duyduğu alanlar. `/api/products` yalnızca bunları döndürür
 * (SKU, satış adedi, model kodu gibi kart dışı alanlar dışarı verilmez).
 */
export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  brandName: string;
  brandSlug: string;
  image: string;
  hoverImage: string | null;
  price: number;
  listPrice: number;
  packInfo: string | null;
  packQuantity: number;
  isNew: boolean;
  rating: number;
  reviewCount: number;
  variants: CardVariant[];
};

/** Tam katalog görünümünden kart alanlarını seçer (fazla alanları bilinçli olarak atar). */
export function toProductCardData(product: ProductCardData): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brandName: product.brandName,
    brandSlug: product.brandSlug,
    image: product.image,
    hoverImage: product.hoverImage,
    price: product.price,
    listPrice: product.listPrice,
    packInfo: product.packInfo,
    packQuantity: product.packQuantity,
    isNew: product.isNew,
    rating: product.rating,
    reviewCount: product.reviewCount,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      size: variant.size,
      color: variant.color,
      packQuantity: variant.packQuantity,
      price: variant.price,
      stock: variant.stock,
      active: variant.active,
    })),
  };
}

/** Etkin varyantlardaki en büyük paket adedi (etkin varyant yoksa 1). */
export function maxActivePackQuantity(variants: { packQuantity: number; active: boolean }[]): number {
  return variants.filter((v) => v.active).reduce((max, v) => Math.max(max, v.packQuantity), 1);
}

export type CardPricing = {
  /** Kartta gösterilen fiyat: satılabilir varyantların (yoksa tüm varyantların) en düşüğü. */
  price: number;
  /** Varyant fiyatları farklıysa "…'den başlayan". */
  priceVaries: boolean;
  /** Üstü çizili fiyat; yalnızca gösterilen fiyatla aynı tabandan gerçek indirim varsa. */
  compareAtPrice: number | null;
  discountPercent: number;
};

/**
 * Kart fiyatı. Liste fiyatı ürün düzeyindedir ve ürünün satış fiyatına göre tanımlanır; bu yüzden
 * indirim yalnızca gösterilen fiyat ürünün satış fiyatıyla aynıysa gösterilir. Varyanta özel fiyat
 * (ör. paket) gösteriliyorsa liste fiyatıyla kıyaslanmaz — aksi hâlde indirim olduğundan büyük görünür.
 */
export function cardPricing(product: {
  price: number;
  listPrice: number;
  variants: { price: number; stock: number; active: boolean }[];
}): CardPricing {
  const sellable = product.variants.filter((v) => v.active && v.stock > 0);
  const prices = (sellable.length ? sellable : product.variants).map((v) => v.price);
  const price = prices.length ? Math.min(...prices) : product.price;
  const priceVaries = new Set(prices).size > 1;
  const comparable = price === product.price && product.listPrice > price && price > 0;
  const discountPercent = comparable ? Math.round(((product.listPrice - price) / product.listPrice) * 100) : 0;
  return {
    price,
    priceVaries,
    compareAtPrice: comparable && discountPercent > 0 ? product.listPrice : null,
    discountPercent: comparable ? discountPercent : 0,
  };
}
