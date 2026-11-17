import Image from "next/image";
import Link from "next/link";

import { ChevronRightIcon } from "@/components/store/icons";
import { categoryHref, womenShortLabel } from "@/components/store/navigation";

export type WomenHeroCategory = {
  name: string;
  slug: string;
  productCount: number;
};

const listFormat = new Intl.ListFormat("tr-TR", { style: "long", type: "conjunction" });

/** "Atlet & Body, Külot, Tayt, Çorap" → "Atlet & body, külot, tayt ve çorap" (veritabanındaki kategorilerden). */
export function womenCategorySentence(names: string[]): string {
  const sentence = listFormat.format(names.map((name) => womenShortLabel(name).toLocaleLowerCase("tr-TR")));
  return sentence.charAt(0).toLocaleUpperCase("tr-TR") + sentence.slice(1);
}

/**
 * Kadın slaytı: erkek slaytıyla aynı bölünmüş kompozisyon. Metin düz navy-deep zemin üzerinde,
 * proje sahibinin verdiği tek görsel (`/images/hero_women.png`) sağ yarıda, soldan lacivert geçişle.
 * Kategoriler ve sayılar veritabanından; ana CTA en çok ürünü olan kadın kategorisine gider.
 */
export function WomenHeroSlide({ categories, brandCount }: { categories: WomenHeroCategory[]; brandCount: number }) {
  const [primary, ...others] = [...categories].sort((a, b) => b.productCount - a.productCount);
  if (!primary) return null;
  const secondary = categories.filter((category) => others.includes(category));

  return (
    <div className="surface-dark relative isolate flex h-full flex-col overflow-hidden bg-navy-deep">
      <div className="container-page relative grid flex-1 lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[640px]">
        <div className="flex flex-col justify-center py-12 sm:py-16 lg:py-20 lg:pr-12">
          <p className="eyebrow-light">Kadın</p>
          <h2 className="mt-4 text-[30px] font-medium uppercase leading-[1.05] tracking-[0.01em] text-ivory min-[380px]:text-[36px] sm:text-[50px] lg:text-[44px] xl:text-[54px]">
            <span className="block">Kadınlar için</span>{" "}
            <span className="block text-brand-red-bright">günlük temeller.</span>
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ivory/90 sm:text-lg">
            {womenCategorySentence(categories.map((category) => category.name))}
            {brandCount > 1 ? " — farklı markalardan, tek mağazada." : "."}
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={categoryHref(primary.slug)} className="btn-accent min-h-12 w-full sm:w-auto">
              <span>
                <span className="sr-only">Kadın </span>
                {womenShortLabel(primary.name)}
              </span>
              <span className="font-normal normal-case tracking-normal text-white/85">{primary.productCount} ürün</span>
              <ChevronRightIcon size={16} />
            </Link>
          </div>

          {secondary.length > 0 ? (
            <ul aria-label="Diğer kadın kategorileri" className="mt-4 flex flex-wrap gap-2">
              {secondary.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={categoryHref(category.slug)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/35 px-4 text-[14px] text-ivory transition-colors hover:border-white hover:bg-white hover:text-navy"
                  >
                    <span>
                      <span className="sr-only">Kadın </span>
                      {womenShortLabel(category.name)}
                    </span>
                    <span className="text-[12px] tabular-nums opacity-75">{category.productCount} ürün</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full grow sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-1/2">
        <Image
          src="/images/hero_women.png"
          alt="Krem keten zemin üzerinde üst üste katlanmış pudra ve krem tonlarında kadın iç giyim ürünleri"
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[72%_62%] lg:object-[68%_60%]"
        />
        {/* Erkek slaytıyla aynı lacivert ton katmanı ve metin sütunuyla birleşen geçiş (dekoratif). */}
        <div aria-hidden="true" className="absolute inset-0 bg-navy/10 mix-blend-multiply" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-navy-deep to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-2/5 lg:bg-linear-to-r"
        />
      </div>
    </div>
  );
}
