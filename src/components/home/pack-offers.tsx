import Link from "next/link";

import { ChevronRightIcon } from "@/components/store/icons";
import { ProductCard } from "@/components/store/product-card";
import type { PackGroup, ProductCardView } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

import { SectionHeading, SectionLink } from "./section-heading";

/** Adet başı tutar: paketin gerçek en düşük fiyatı / paket adedi, tam TL'ye yuvarlanır. */
function perUnitLira(group: PackGroup): number {
  return Math.round(group.minPrice / group.packQuantity / 100);
}

/**
 * Çoklu paket grupları. Tekli fiyat referansı olmadığından "tasarruf" / "%" kıyası yapılmaz;
 * yalnızca gerçek paket fiyatı ve ondan türetilen adet başı tutar gösterilir.
 */
export function PackOffers({
  primary,
  secondary,
  products,
}: {
  primary: PackGroup[];
  secondary: PackGroup[];
  products: ProductCardView[];
}) {
  if (primary.length === 0) return null;

  return (
    <section aria-labelledby="paketler-baslik" className="bg-navy-tint py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          id="paketler-baslik"
          eyebrow="Çoklu paketler"
          title="Daha fazla konfor, daha avantajlı alışveriş"
          lead="Günlük ihtiyacınızı tek seferde karşılayan paketler. Adet başı tutar, paket fiyatının paketteki adede bölünmesiyle hesaplanır."
          action={<SectionLink href="/kampanyalar#coklu-paket">Tüm paketler</SectionLink>}
        />

        <ul className="mt-8 grid gap-5 sm:mt-10 md:grid-cols-3 md:gap-6">
          {primary.map((group) => (
            <li key={group.packQuantity}>
              <Link
                href={group.href}
                className="group flex h-full flex-col border border-navy/10 bg-white p-6 transition-colors hover:border-navy/40 sm:p-7"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-[22px] leading-tight text-navy">{group.label}</h3>
                  <span className="shrink-0 text-xs text-muted">{group.productCount} ürün</span>
                </div>
                <p aria-hidden="true" className="mt-3 flex items-start gap-2 font-display leading-[0.9] text-navy">
                  <span className="text-[88px] sm:text-[104px]">{group.packQuantity}</span>
                  <span className="mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-red">
                    adet
                  </span>
                </p>
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-sm text-charcoal">
                    <span className="text-xl font-semibold text-navy">{formatMoney(group.minPrice)}</span>
                    {"'den başlayan"}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    adet başı ~{perUnitLira(group).toLocaleString("tr-TR")} TL&apos;den
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 pt-6 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy">
                  Paketleri incele
                  <ChevronRightIcon size={16} className="text-brand-red transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {secondary.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="mr-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted">Diğer paketler</p>
            <ul className="flex flex-wrap gap-2">
              {secondary.map((group) => (
                <li key={group.packQuantity}>
                  <Link
                    href={group.href}
                    className="inline-flex min-h-11 items-center gap-2 border border-navy/15 bg-white px-4 text-sm text-navy transition-colors hover:border-navy"
                  >
                    {group.label}
                    <span className="text-xs text-muted">
                      {group.productCount} ürün · {formatMoney(group.minPrice)}&apos;den
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {products.length > 0 ? (
          <div className="mt-12 border-t border-navy/10 pt-10">
            <p className="eyebrow">Paketlerden seçmeler</p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
