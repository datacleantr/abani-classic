import { compareSizes } from "./product-card-helpers";

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

/** Money is always stored as integer kuruş. */
export function formatMoney(minor: number, currency = "TRY"): string {
  const value = (minor / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency === "TRY" ? `${value} TL` : `${value} ${currency}`;
}

export function formatDate(value: Date | string | null | undefined, withTime = false): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("tr-TR", {
    timeZone: "Europe/Istanbul",
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

export function normalizeTr(input: string): string {
  return input
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ş", "s")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c")
    .replaceAll("â", "a")
    .replaceAll("î", "i");
}

export function slugifyTr(input: string): string {
  return normalizeTr(input)
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: "Ödeme bekleniyor",
  payment_failed: "Ödeme başarısız",
  paid: "Ödendi",
  processing: "Hazırlanıyor",
  packed: "Paketlendi",
  shipped: "Kargoda",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
  return_requested: "İade talebi",
  returned: "İade edildi",
  refunded: "İade ödendi",
  partially_refunded: "Kısmi iade",
};

export const ORDER_STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-800 border-amber-200",
  payment_failed: "bg-red-50 text-red-700 border-red-200",
  paid: "bg-emerald-50 text-emerald-800 border-emerald-200",
  processing: "bg-sky-50 text-sky-800 border-sky-200",
  packed: "bg-indigo-50 text-indigo-800 border-indigo-200",
  shipped: "bg-blue-50 text-blue-800 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-neutral-100 text-neutral-700 border-neutral-300",
  return_requested: "bg-amber-50 text-amber-800 border-amber-200",
  returned: "bg-neutral-100 text-neutral-700 border-neutral-300",
  refunded: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  review: "Onay bekliyor",
  published: "Yayında",
  archived: "Arşiv",
};

/** Harf bedenleri (XS…5XL, XXL=2XL), ardından sayısal/aralık bedenler ("40 - 44"). */
export function sortSizes(sizes: string[]): string[] {
  return [...new Set(sizes)].sort(compareSizes);
}

export function pluralize(count: number, word: string): string {
  return `${count} ${word}`;
}

/**
 * JSON-LD'yi <script> içine güvenle gömmek için serileştirir. Ürün adı gibi dış
 * kaynaklı metinlerdeki "</script>" dizisi betiği kapatamasın diye "<" kaçışlanır.
 */
export function jsonLd(value: unknown): string {
  const lineSeparators = new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, "g");
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(lineSeparators, (char) => `\\u${char.charCodeAt(0).toString(16)}`);
}
