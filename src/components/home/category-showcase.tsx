import Link from "next/link";

import { ChevronRightIcon } from "@/components/store/icons";

import { CoverImage } from "./cover-image";
import { SectionHeading } from "./section-heading";

export type CategoryTile = {
  slug: string;
  label: string;
  href: string;
  productCount: number;
  image: string | null;
};

/** Kategori keşfi: yalnızca veritabanında olan ve yayında ürünü bulunan erkek kategorileri. */
export function CategoryShowcase({ items }: { items: CategoryTile[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="kategoriler-baslik" className="bg-paper py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading id="kategoriler-baslik" eyebrow="Kategoriler" title="Aradığınız parçaya hızla ulaşın" />

        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-6 sm:mt-10 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-6 lg:gap-x-4">
          {items.map((item) => (
            <li key={item.slug}>
              <Link href={item.href} className="group block">
                <div className="relative aspect-square overflow-hidden border border-line/70 bg-ivory-deep">
                  {item.image ? (
                    <CoverImage
                      src={item.image}
                      alt=""
                      sizes="(min-width: 1240px) 196px, (min-width: 1024px) 16vw, (min-width: 768px) 31vw, 46vw"
                      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <div className="mt-3 border-b border-line pb-3">
                  <h3 className="text-lg leading-tight text-navy sm:text-xl">{item.label}</h3>
                  <p className="mt-1.5 flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted">{item.productCount} ürün</span>
                    <span className="inline-flex items-center gap-0.5 font-semibold uppercase tracking-[0.14em] text-navy">
                      Keşfet
                      <ChevronRightIcon size={14} className="text-brand-red transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
