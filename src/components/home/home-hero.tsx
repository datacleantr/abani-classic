import Image from "next/image";
import Link from "next/link";

import { HeroCarousel, type HeroSlide } from "./hero-carousel";
import { WomenHeroSlide, type WomenHeroCategory } from "./women-hero-slide";

/**
 * Ana sayfa hero'su: iki slaytlı slider. Slayt 1 erkek iç giyim (sayfadaki tek h1, LCP görseli),
 * slayt 2 kadın kategorileri (yalnızca yayında kadın ürünü varsa). Kadın slaytı yoksa slider
 * kontrolleri de çıkmaz, slayt 1 tek başına bölüm olarak render edilir.
 */
export function HomeHero({
  stats,
  women,
}: {
  stats: { value: number; label: string }[];
  women: { categories: WomenHeroCategory[]; brandCount: number };
}) {
  const slides: HeroSlide[] = [{ name: "Erkek iç giyim", content: <MenHeroSlide stats={stats} /> }];
  if (women.categories.length > 0) {
    slides.push({
      name: "Kadın",
      content: <WomenHeroSlide categories={women.categories} brandCount={women.brandCount} />,
    });
  }
  return <HeroCarousel label="Öne çıkan koleksiyonlar" slides={slides} />;
}

/**
 * Erkek slaytı: lacivert zeminli bölünmüş kompozisyon. Metin her zaman düz navy-deep zemin üzerindedir
 * (görsel üstünde metin yok → kontrast görselden bağımsız). Mobilde metin + CTA'lar önce, görsel sonra;
 * lg ve üzerinde görsel sağ yarıyı ekran kenarına kadar doldurur ve soldan lacivert geçişle birleşir.
 */
function MenHeroSlide({ stats }: { stats: { value: number; label: string }[] }) {
  return (
    <div className="surface-dark relative isolate flex h-full flex-col overflow-hidden bg-navy-deep">
      <div className="container-page relative grid flex-1 lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[640px]">
        <div className="flex flex-col justify-center py-12 sm:py-16 lg:py-20 lg:pr-12">
          <p className="eyebrow-light text-bronze">Erkek iç giyim</p>
          <h1
            id="hero-baslik"
            className="mt-4 text-[36px] font-medium uppercase min-[380px]:text-[42px] leading-[1.02] tracking-[0.01em] text-ivory sm:text-[58px] xl:text-[68px]"
          >
            <span className="block">Her günün</span>{" "}
            <span className="block text-bronze">konforu.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-ivory/90 sm:text-lg">
            Kaliteli erkek iç giyim. Gün boyu konfor, her detayda kalite.
          </p>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ivory/75">
            Abani Classic, erkek iç giyimde kaliteyi, konforu ve doğru alışveriş deneyimini bir araya getiriyor.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/arama" className="btn-bronze min-h-12 w-full sm:w-auto">
              Koleksiyonu Keşfet
            </Link>
            <Link href="/kampanyalar#coklu-paket" className="btn-outline-light min-h-12 w-full sm:w-auto">
              Çoklu Paketleri İncele
            </Link>
          </div>

          {stats.length > 0 ? (
            <dl className="mt-10 flex max-w-md divide-x divide-white/15 border-t border-white/15 pt-6">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col-reverse px-5 first:pl-0">
                  <dt className="mt-1 text-[11px] uppercase tracking-[0.18em] text-ivory/70">{stat.label}</dt>
                  <dd className="font-display text-2xl text-ivory">{stat.value.toLocaleString("tr-TR")}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      <div className="relative aspect-[4/3] w-full sm:aspect-[16/9] lg:absolute lg:inset-y-0 lg:right-0 lg:aspect-auto lg:w-1/2">
        <Image
          src="/images/hero.jpg"
          alt="Açık renk keten zemin üzerinde üst üste katlanmış antrasit, krem ve bej erkek iç giyim ürünleri"
          fill
          preload
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-[78%_62%] lg:object-[70%_60%]"
        />
        {/* Lacivert ton katmanı ve metin sütunuyla birleşen geçiş (dekoratif). */}
        <div aria-hidden="true" className="absolute inset-0 bg-navy/10 mix-blend-multiply" />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-16 bg-linear-to-b from-navy-deep to-transparent lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-2/5 lg:bg-linear-to-r"
        />
      </div>
    </div>
  );
}
