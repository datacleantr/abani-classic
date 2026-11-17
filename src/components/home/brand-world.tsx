import Link from "next/link";

import { ChevronRightIcon } from "@/components/store/icons";
import { brandHref } from "@/components/store/navigation";
import type { StoreBrand } from "@/lib/catalog";

import { SectionHeading, SectionLink } from "./section-heading";

type BrandLink = Pick<StoreBrand, "name" | "slug" | "productCount">;

/**
 * Marka dünyası. Logo dosyası olmadığından marka adları tipografik olarak yazılır (sahte logo yok).
 * Kapak görseli kullanılmaz: markanın "kapak" ürünü kadın ürünü olabiliyor ve logo gibi algılanabilir.
 */
export function BrandWorld({
  house,
  brands,
  related,
}: {
  /** Abani Classic (öne çıkan geniş kart). */
  house: BrandLink | null;
  /** Tutku, Jiber, Seher Yıldızı, Çift Kaplan — veritabanında bulunan ve ürünü olanlar. */
  brands: BrandLink[];
  /** Marka slug'ı → aynı ailedeki ayrı listelenen marka (ör. tutku → Tutku Elit). */
  related: Record<string, BrandLink>;
}) {
  if (!house && brands.length === 0) return null;

  return (
    <section aria-labelledby="markalar-baslik" className="bg-paper py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          id="markalar-baslik"
          eyebrow="Markalar"
          title="Marka dünyası"
          lead="Bilinen iç giyim markaları ve Abani Classic, tek mağazada."
          action={<SectionLink href="/markalar">Tüm markalar</SectionLink>}
        />

        <ul className="mt-8 grid grid-cols-2 gap-3 sm:mt-10 sm:gap-4 lg:grid-cols-4 lg:grid-rows-2">
          {house ? (
            <li className="col-span-2 lg:row-span-2">
              <Link
                href={brandHref(house.slug)}
                className="surface-dark group relative flex h-full min-h-64 flex-col overflow-hidden bg-navy p-6 sm:p-8 lg:p-10"
              >
                <span aria-hidden="true" className="pointer-events-none absolute inset-3 border border-brand-red-light/25" />
                <p className="eyebrow-light">Mağazamızın markası</p>
                <h3 className="mt-6 flex flex-col leading-none">
                  <span className="font-display text-[38px] font-medium tracking-[0.2em] sm:text-[48px]">ABANI</span>{" "}
                  <span className="mt-2 font-sans text-[11px] font-medium uppercase tracking-[0.46em] text-brand-red-light">
                    Classic
                  </span>
                </h3>
                <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ivory/75">
                  Mağazamızın adını taşıyan Abani Classic ürünlerinin tamamı tek sayfada.
                </p>
                <p className="mt-auto flex items-center justify-between gap-3 pt-10 text-sm">
                  <span className="text-ivory/75">{house.productCount} ürün</span>
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold uppercase tracking-[0.14em] text-brand-red-light">
                    Ürünleri gör
                    <ChevronRightIcon size={16} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </p>
              </Link>
            </li>
          ) : null}

          {brands.map((brand) => {
            const sibling = related[brand.slug];
            return (
              <li
                key={brand.slug}
                className="relative flex min-h-44 flex-col border border-line bg-white p-5 transition-colors hover:border-navy/40 sm:p-6"
              >
                <h3 className="text-[22px] leading-tight text-navy sm:text-[26px]">
                  <Link
                    href={brandHref(brand.slug)}
                    className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-[3px] focus-visible:after:outline-brand-red"
                  >
                    {brand.name}
                  </Link>
                </h3>
                <p className="mt-1.5 text-sm text-muted">{brand.productCount} ürün</p>
                {sibling ? (
                  <Link
                    href={brandHref(sibling.slug)}
                    className="relative z-10 mt-2 inline-flex min-h-11 items-center self-start text-sm text-navy underline decoration-brand-red/50 underline-offset-4 hover:decoration-brand-red"
                  >
                    {sibling.name} · {sibling.productCount} ürün
                  </Link>
                ) : null}
                <span
                  aria-hidden="true"
                  className="mt-auto inline-flex items-center gap-1 pt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy"
                >
                  Ürünleri gör
                  <ChevronRightIcon size={16} className="text-brand-red" />
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
