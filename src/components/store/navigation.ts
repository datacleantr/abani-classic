/**
 * Vitrin çerçevesinin (header, mobil menü, footer) ortak gezinme tanımları.
 * Kategori bağlantıları her zaman veritabanından gelen `categories` listesine göre süzülür;
 * listede olmayan slug gösterilmez (kırık bağlantı olmasın).
 */

/** `productCount` verilirse (layout verir) ürünü olmayan kategori menülerde gizlenebilir. */
export type NavCategory = { name: string; slug: string; productCount?: number };
export type NavBrand = { name: string; slug: string };

export type PrimaryNavItem = {
  href: string;
  /** xl ve üzeri */
  label: string;
  /** lg–xl arası dar masaüstü */
  shortLabel: string;
  exact?: boolean;
};

/** Masaüstü ana menüdeki kategori sırası (brief). Kadın kategorileri burada yer almaz. */
const PRIMARY_CATEGORIES: { slug: string; label: string; shortLabel: string }[] = [
  { slug: "erkek-boxer", label: "Erkek Boxer", shortLabel: "Boxer" },
  { slug: "erkek-slip", label: "Slip", shortLabel: "Slip" },
  { slug: "erkek-atlet", label: "Atlet", shortLabel: "Atlet" },
  { slug: "erkek-fanila", label: "Fanila", shortLabel: "Fanila" },
  { slug: "termal-iclik", label: "Termal İç Giyim", shortLabel: "Termal" },
  { slug: "erkek-corap", label: "Çorap", shortLabel: "Çorap" },
];

export const categoryHref = (slug: string) => `/kategoriler/${slug}`;
export const brandHref = (slug: string) => `/markalar/${slug}`;

export function isWomenCategory(slug: string): boolean {
  return slug.startsWith("kadin-");
}

/** Kadın bağlamında ("Kadın" başlığı altında) gösterilecek kısa ad: "Kadın Külot" → "Külot". */
export function womenShortLabel(name: string): string {
  const short = name.replace(/^kad[ıi]n\s+/iu, "").trim();
  return short.length > 0 ? short : name;
}

/** Erkek/genel kategoriler önce, kadın kategorileri sonra; veritabanı sırası korunur. */
export function splitCategories(categories: NavCategory[]) {
  return {
    men: categories.filter((category) => !isWomenCategory(category.slug)),
    women: categories.filter((category) => isWomenCategory(category.slug)),
  };
}

/** Masaüstü "Kadın" açılır menüsü: yayında ürünü olan kadın kategorileri (sayı bilinmiyorsa gösterilir). */
export function womenMenuCategories(categories: NavCategory[]): NavCategory[] {
  return categories.filter(
    (category) => isWomenCategory(category.slug) && (category.productCount === undefined || category.productCount > 0),
  );
}

export function buildPrimaryNav(categories: NavCategory[]): PrimaryNavItem[] {
  const available = new Set(categories.map((category) => category.slug));
  return [
    { href: "/", label: "Ana Sayfa", shortLabel: "Ana Sayfa", exact: true },
    ...PRIMARY_CATEGORIES.filter((item) => available.has(item.slug)).map((item) => ({
      href: categoryHref(item.slug),
      label: item.label,
      shortLabel: item.shortLabel,
    })),
    { href: "/markalar", label: "Markalar", shortLabel: "Markalar" },
    { href: "/kampanyalar", label: "Kampanyalar", shortLabel: "Kampanyalar" },
  ];
}

export function isActivePath(pathname: string | null, href: string, exact = false): boolean {
  if (!pathname) return false;
  if (exact || href === "/") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const INSTAGRAM_URL = "https://www.instagram.com/abaniclassic/";

/** Kurumsal ve yardım sayfaları: footer "Yardım" sütunu ve kurumsal sayfaların yan menüsü. */
export const SUPPORT_LINKS: { href: string; label: string }[] = [
  { href: "/sss", label: "Sıkça sorulan sorular" },
  { href: "/kargo-ve-teslimat", label: "Kargo ve teslimat" },
  { href: "/yasal/iade", label: "İade ve değişim" },
  { href: "/siparis-takip", label: "Sipariş takibi" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/hakkimizda", label: "Hakkımızda" },
];

/** Proje sahibinin verdiği resmi mağaza adresleri (brief, 17 Kasım 2026). Logo kullanılmaz. */
export const MARKETPLACE_STORES: { name: string; href: string }[] = [
  { name: "Trendyol", href: "https://www.trendyol.com/magaza/abani-classic-m-215999" },
  { name: "Hepsiburada", href: "https://www.hepsiburada.com/magaza/abani-classic" },
  { name: "Pazarama", href: "https://www.pazarama.com/magaza/abani-classic" },
  { name: "n11", href: "https://www.n11.com/magaza/abaniclassic" },
  { name: "Amazon", href: "https://www.amazon.com.tr/s?me=A63X21D2O07DB&marketplaceID=A33AVAJ2PDY3EV" },
];
