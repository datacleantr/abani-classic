import type { Metadata } from "next";
import Link from "next/link";

import { ArrowUpRightIcon } from "@/components/store/icons";
import { InfoPage, InfoSection } from "@/components/store/info-page";
import {
  brandHref,
  categoryHref,
  INSTAGRAM_URL,
  MARKETPLACE_STORES,
  splitCategories,
} from "@/components/store/navigation";
import { getPackGroups, getStoreBrands, getStoreCategories } from "@/lib/catalog";
import { missingStoreInfo, STORE_INFO } from "@/lib/store-info";

export const metadata: Metadata = {
  title: "Hakkımızda",
  description:
    "Abani Classic, erkek iç giyimde kaliteyi, konforu ve doğru alışveriş deneyimini bir araya getiriyor. Markalarımız, kategorilerimiz ve mağazalarımız.",
  alternates: { canonical: "/hakkimizda" },
};

export const dynamic = "force-dynamic";

const linkClass = "text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy";

const chipClass =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-navy/20 px-4 text-[14px] text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white";

/**
 * Tanıtım cümlesi proje sahibinin brief'indeki hero metnidir. Marka hikâyesi (kuruluş yılı, üretim,
 * kumaş vb.) işletmeden gelmeden yazılmaz: `STORE_INFO.about.story` doluysa gösterilir.
 * Rakamlar, kategoriler ve markalar veritabanındaki yayında ürünlerden hesaplanır.
 */
export default async function AboutPage() {
  const [categories, brands, packGroups] = await Promise.all([
    getStoreCategories(),
    getStoreBrands(),
    getPackGroups(),
  ]);
  const liveCategories = categories.filter((category) => category.productCount > 0);
  const liveBrands = brands.filter((brand) => brand.productCount > 0);
  const productCount = liveCategories.reduce((sum, category) => sum + category.productCount, 0);
  const { men, women } = splitCategories(liveCategories);
  const story = STORE_INFO.about.story.map((paragraph) => paragraph.trim()).filter(Boolean);

  const stats = [
    { value: productCount, label: "Yayında ürün" },
    { value: liveBrands.length, label: "Marka" },
    { value: liveCategories.length, label: "Kategori" },
  ].filter((stat) => stat.value > 0);

  return (
    <InfoPage
      path="/hakkimizda"
      eyebrow="Kurumsal"
      title="Hakkımızda"
      lead={
        <p>
          Abani Classic, erkek iç giyimde kaliteyi, konforu ve doğru alışveriş deneyimini bir araya getiriyor.
        </p>
      }
      missing={missingStoreInfo(STORE_INFO, ["story"])}
    >
      {story.length > 0 ? (
        <InfoSection id="hikayemiz" title="Hikâyemiz">
          {story.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </InfoSection>
      ) : null}

      {stats.length > 0 ? (
        <section aria-label="Mağaza özeti" className="surface-dark rounded-2xl bg-navy-deep px-6 py-7 sm:px-8">
          <dl className="grid grid-cols-3 divide-x divide-white/15">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse px-3 first:pl-0 sm:px-6">
                <dt className="mt-1 text-[11px] uppercase tracking-[0.16em] text-ivory/70">{stat.label}</dt>
                <dd className="font-display text-[28px] leading-none text-ivory sm:text-[36px]">
                  {stat.value.toLocaleString("tr-TR")}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {liveCategories.length > 0 ? (
        <InfoSection id="neler-var" title="Mağazada neler var?">
          <p>
            Mağazamızda erkek iç giyim{women.length > 0 ? " ile kadınlar için günlük temel parçalar" : ""} bulunuyor.
            {packGroups.length > 0 ? (
              <>
                {" "}
                Bazı ürünleri birden fazla adedin tek pakette sunulduğu{" "}
                <Link href="/kampanyalar#coklu-paket" className={linkClass}>
                  çoklu paket
                </Link>{" "}
                seçenekleriyle de bulabilirsiniz.
              </>
            ) : null}
          </p>
          {men.length > 0 ? <CategoryChips label="Erkek ve genel kategoriler" items={men} /> : null}
          {women.length > 0 ? <CategoryChips label="Kadın kategorileri" items={women} /> : null}
        </InfoSection>
      ) : null}

      {liveBrands.length > 0 ? (
        <InfoSection id="markalar" title="Markalar">
          {liveBrands.length > 1 ? <p>Farklı markaların ürünlerini tek mağazada bulabilirsiniz.</p> : null}
          <ul aria-label="Markalar" className="flex flex-wrap gap-2">
            {liveBrands.map((brand) => (
              <li key={brand.slug}>
                <Link href={brandHref(brand.slug)} className={chipClass}>
                  {brand.name}
                  <span className="text-[12px] tabular-nums opacity-70">{brand.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      <InfoSection id="nerede" title="Bizi nerede bulabilirsiniz?">
        <p>
          Ürünlerimizi bu sitenin yanı sıra pazaryeri mağazalarımızda da bulabilir, yeniliklerimizi
          Instagram&apos;da takip edebilirsiniz.
        </p>
        {STORE_INFO.address ? (
          <p>
            Adresimiz: {STORE_INFO.address}.{" "}
            <Link href="/iletisim#adres" className={linkClass}>
              Haritada gör
            </Link>
          </p>
        ) : null}
        <ul className="flex flex-wrap gap-2">
          {[{ name: "Instagram", href: INSTAGRAM_URL }, ...MARKETPLACE_STORES].map((store) => (
            <li key={store.name}>
              <a href={store.href} target="_blank" rel="noopener noreferrer" className={chipClass}>
                {store.name}
                <ArrowUpRightIcon size={13} />
                <span className="sr-only"> (yeni sekmede açılır)</span>
              </a>
            </li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection id="alisveris" title="Bu sitede alışveriş">
        <ul className="grid gap-3">
          {[
            "Ürün fiyatlarına KDV dahildir; kargo ücreti ve toplam tutar siparişi onaylamadan önce ödeme adımında gösterilir.",
            "Üye olmadan, misafir olarak sipariş verebilirsiniz.",
            "Siparişinizi sipariş numaranız ve e-posta adresinizle takip edebilirsiniz.",
            "Kart bilgileriniz sitemizde saklanmaz.",
          ].map((item) => (
            <li key={item} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-red" />
              {item}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-3 pt-2 sm:flex-row">
          <Link href="/arama" className="btn-navy min-h-12 w-full sm:w-auto">
            Koleksiyonu Keşfet
          </Link>
          <Link href="/iletisim" className="btn-outline-navy min-h-12 w-full sm:w-auto">
            İletişim
          </Link>
        </div>
      </InfoSection>
    </InfoPage>
  );
}

function CategoryChips({ label, items }: { label: string; items: { name: string; slug: string; productCount?: number }[] }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted font-sans">{label}</h3>
      <ul aria-label={label} className="mt-3 flex flex-wrap gap-2">
        {items.map((category) => (
          <li key={category.slug}>
            <Link href={categoryHref(category.slug)} className={chipClass}>
              {category.name}
              {category.productCount ? (
                <span className="text-[12px] tabular-nums opacity-70">{category.productCount}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
