import type { Metadata } from "next";

import { BrandWorld } from "@/components/home/brand-world";
import { CampaignBanner } from "@/components/home/campaign-banner";
import { CategoryShowcase, type CategoryTile } from "@/components/home/category-showcase";
import { HomeHero } from "@/components/home/home-hero";
import { InstagramFollow } from "@/components/home/instagram-follow";
import { MostPreferred } from "@/components/home/most-preferred";
import { PackOffers } from "@/components/home/pack-offers";
import { TrustHighlights } from "@/components/home/trust-highlights";
import { BRAND_LOGO_PATH } from "@/components/store/brand-logo";
import { categoryHref, INSTAGRAM_URL, isWomenCategory, MARKETPLACE_STORES } from "@/components/store/navigation";
import {
  getCatalogSummary,
  getCategoryCoverCandidates,
  getMostPreferredProducts,
  getMultiPackProducts,
  getPackGroups,
  getStoreBrands,
  getStoreCategories,
  type PackGroup,
  type StoreCategory,
} from "@/lib/catalog";
import { jsonLd } from "@/lib/format";

export const dynamic = "force-dynamic";

// Başlık kök layout'taki varsayılan başlıktır (şablon yalnızca alt sayfalara uygulanır).
export const metadata: Metadata = {
  description:
    "Abani Classic, erkek iç giyimde kaliteyi, konforu ve doğru alışveriş deneyimini bir araya getiriyor. Boxer, slip, atlet, fanila, termal iç giyim, çorap ve çoklu paketler.",
  alternates: { canonical: "/" },
};

/** Ana sayfadaki kategori keşfi: sıra ve kısa başlıklar brief'ten; varlık ve sayılar veritabanından. */
const HOME_CATEGORIES: { slug: string; label: string }[] = [
  { slug: "erkek-boxer", label: "Boxer" },
  { slug: "erkek-slip", label: "Slip" },
  { slug: "erkek-atlet", label: "Atlet" },
  { slug: "erkek-fanila", label: "Fanila" },
  { slug: "termal-iclik", label: "Termal İç Giyim" },
  { slug: "erkek-corap", label: "Çorap" },
];
/**
 * Ana sayfa "Erkek iç giyim" bağlamındadır: çok tercih edilenler, paketler ve hero istatistikleri
 * yalnızca bu kategorilerden hesaplanır (kadın ürünleri karışmaz). /kampanyalar tüm kataloğu gösterir.
 */
const MEN_CATEGORY_SLUGS = HOME_CATEGORIES.map((category) => category.slug);

const HOUSE_BRAND_SLUG = "abani-classic";
const FEATURED_BRAND_SLUGS = ["tutku", "jiber", "seher-yildizi", "cift-kaplan"];
/** Ayrı marka olarak listelenen aile üyeleri (ör. Tutku Elit), ana markanın kartında anılır. */
const RELATED_BRAND_SLUGS: Record<string, string> = { tutku: "tutku-elit" };

const HERO_IMAGE = "/images/hero.jpg";
const PRIMARY_PACK_COUNT = 3;
/** Bu sayının altında ürünü olan paket grupları ana sayfada gösterilmez (kampanyalar sayfasında var). */
const MIN_SECONDARY_PACK_PRODUCTS = 3;

/**
 * Kategori kapakları: aynı görsel sayfada iki kez görünmesin (hero ve başka kategori kapağı ile).
 * Tekrarlanan kapak yerine o kategorinin en çok değerlendirilen ve "Çok tercih edilenler"de zaten
 * gösterilmeyen ürününün görseli kullanılır (hafif görsel sorgusu); yoksa veritabanındaki kapak kalır.
 */
async function buildCategoryTiles(
  categories: StoreCategory[],
  shownProductIds: ReadonlySet<string>,
): Promise<CategoryTile[]> {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const present = HOME_CATEGORIES.flatMap((entry) => {
    const category = bySlug.get(entry.slug);
    return category && category.productCount > 0 ? [{ entry, category }] : [];
  });

  const seen = new Set<string>([HERO_IMAGE]);
  const needsAlternative = new Set<string>();
  for (const { category } of present) {
    const cover = category.coverImage;
    if (!cover || seen.has(cover)) needsAlternative.add(category.slug);
    else seen.add(cover);
  }

  const candidates = await getCategoryCoverCandidates([...needsAlternative], 4);
  const alternatives = new Map(
    [...needsAlternative].map((slug) => {
      const list = (candidates.get(slug) ?? []).filter((item) => !seen.has(item.image));
      const pick = list.find((item) => !shownProductIds.has(item.productId)) ?? list[0];
      if (pick) seen.add(pick.image);
      return [slug, pick?.image ?? null] as const;
    }),
  );

  return present.map(({ entry, category }) => ({
    slug: category.slug,
    label: entry.label,
    href: categoryHref(category.slug),
    productCount: category.productCount,
    image: alternatives.get(category.slug) ?? category.coverImage,
  }));
}

function splitPackGroups(groups: PackGroup[]) {
  const primaryQuantities = new Set(
    [...groups]
      .sort((a, b) => b.productCount - a.productCount || a.packQuantity - b.packQuantity)
      .slice(0, PRIMARY_PACK_COUNT)
      .map((group) => group.packQuantity),
  );
  return {
    primary: groups.filter((group) => primaryQuantities.has(group.packQuantity)),
    secondary: groups.filter(
      (group) => !primaryQuantities.has(group.packQuantity) && group.productCount >= MIN_SECONDARY_PACK_PRODUCTS,
    ),
  };
}

/** Hero'nun kadın slaytı: yayında ürünü olan kadın kategorileri (veritabanı sırası) ve marka sayısı. */
async function buildWomenHero(categoriesPromise: Promise<StoreCategory[]>) {
  const categories = (await categoriesPromise)
    .filter((category) => isWomenCategory(category.slug) && category.productCount > 0)
    .map(({ name, slug, productCount }) => ({ name, slug, productCount }));
  if (categories.length === 0) return { categories, brandCount: 0 };
  const summary = await getCatalogSummary(categories.map((category) => category.slug));
  return { categories, brandCount: summary.brandCount };
}

export default async function HomePage() {
  const categoriesPromise = getStoreCategories();
  const mostPreferredPromise = getMostPreferredProducts(8, { categorySlugs: MEN_CATEGORY_SLUGS, maxPerBrand: 2 });
  const [categoryTiles, brands, mostPreferred, packGroups, packProducts, summary, womenHero] = await Promise.all([
    Promise.all([categoriesPromise, mostPreferredPromise]).then(([list, preferred]) =>
      buildCategoryTiles(list, new Set(preferred.map((product) => product.id))),
    ),
    getStoreBrands(),
    mostPreferredPromise,
    getPackGroups({ categorySlugs: MEN_CATEGORY_SLUGS }),
    getMultiPackProducts(12, { categorySlugs: MEN_CATEGORY_SLUGS }),
    getCatalogSummary(MEN_CATEGORY_SLUGS),
    buildWomenHero(categoriesPromise),
  ]);

  // Hero "Erkek iç giyim" der: yalnızca erkek kategorilerindeki ürünler ve bu ürünlerin markaları.
  const activeBrands = brands.filter((brand) => brand.productCount > 0);
  const stats = [
    { value: summary.productCount, label: "ürün" },
    { value: summary.brandCount, label: "marka" },
  ].filter((stat) => stat.value > 0);

  const brandBySlug = new Map(activeBrands.map((brand) => [brand.slug, brand]));
  const house = brandBySlug.get(HOUSE_BRAND_SLUG) ?? null;
  const featuredBrands = FEATURED_BRAND_SLUGS.flatMap((slug) => {
    const brand = brandBySlug.get(slug);
    return brand ? [brand] : [];
  });
  const relatedBrands = Object.fromEntries(
    Object.entries(RELATED_BRAND_SLUGS).flatMap(([slug, relatedSlug]) => {
      const related = brandBySlug.get(relatedSlug);
      return related ? [[slug, related]] : [];
    }),
  );
  const trustBrandNames = [...featuredBrands, ...(house ? [house] : [])].map((brand) => brand.name);

  const { primary: primaryPacks, secondary: secondaryPacks } = splitPackGroups(packGroups);
  const shownIds = new Set(mostPreferred.map((product) => product.id));
  const packPicks = packProducts.filter((product) => !shownIds.has(product.id)).slice(0, 4);

  const appUrl = process.env.APP_URL ?? "https://abaniclassic.com";
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Abani Classic",
    url: appUrl,
    logo: new URL(BRAND_LOGO_PATH, appUrl).toString(),
    sameAs: [INSTAGRAM_URL, ...MARKETPLACE_STORES.map((store) => store.href)],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(organizationSchema) }} />

      <HomeHero stats={stats} women={womenHero} />
      <CategoryShowcase items={categoryTiles} />
      <MostPreferred products={mostPreferred} />
      <PackOffers primary={primaryPacks} secondary={secondaryPacks} products={packPicks} />
      <BrandWorld house={house} brands={featuredBrands} related={relatedBrands} />
      <TrustHighlights brandNames={trustBrandNames} />
      <CampaignBanner packQuantities={primaryPacks.map((group) => group.packQuantity)} />
      <InstagramFollow />
    </>
  );
}
