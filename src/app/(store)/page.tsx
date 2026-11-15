import Link from "next/link";

import { ProductCard } from "@/components/store/product-card";
import { getHomeData } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

const services = [
  { title: "Ücretsiz kargo", text: "1.000 TL üzeri siparişlerde" },
  { title: "Kolay iade", text: "14 gün içinde iade hakkı" },
  { title: "Güvenli ödeme", text: "Kart bilgisi saklanmaz" },
  { title: "Türkiye üretimi", text: "Denizli ve İstanbul atölyeleri" },
];

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Abani Classic",
  url: process.env.APP_URL ?? "https://abaniclassic.com",
  logo: `${process.env.APP_URL ?? "https://abaniclassic.com"}/images/hero.jpg`,
  sameAs: [],
  contactPoint: [
    { "@type": "ContactPoint", contactType: "customer support", email: "destek@abaniclassic.com", availableLanguage: "Turkish" },
  ],
};

export default async function HomePage() {
  const { categories, brands, featured, newest, bestSellers, reviews } = await getHomeData();
  const heroProducts = featured.length > 0 ? featured : newest;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />

      <section className="border-b border-line/70 bg-ivory">
        <div className="container-page grid items-center gap-10 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-16">
          <div>
            <p className="eyebrow">İlkbahar seçkisi · 2026</p>
            <h1 className="mt-4 max-w-xl text-[38px] leading-[1.05] sm:text-[52px] lg:text-[60px]">
              Günün temeli,
              <br />
              <span className="text-sand">ölçülü</span> kalıp.
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-charcoal/70">
              Uzun elyaf pamuk, nefes alan dokular ve gömlek altında iz bırakmayan dikişler. Abani
              Classic, her gün giyilen temel parçaları sade bir dille yeniden kurar.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/kategoriler/erkek-boxer" className="btn-dark">
                Koleksiyonu keşfet
              </Link>
              <Link href="/arama?sort=best_sellers" className="btn-outline">
                Çok satanlar
              </Link>
            </div>
            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4 border-t border-line pt-6 text-xs">
              <div>
                <dt className="text-muted">Kumaş</dt>
                <dd className="mt-1 text-sm font-medium">%100 pamuk / modal</dd>
              </div>
              <div>
                <dt className="text-muted">Kargo</dt>
                <dd className="mt-1 text-sm font-medium">1-2 iş günü</dd>
              </div>
              <div>
                <dt className="text-muted">İade</dt>
                <dd className="mt-1 text-sm font-medium">14 gün</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[28px] border border-line/70 bg-ivory-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/hero.jpg"
                alt="Abani Classic modal boxer ve atlet koleksiyonu, keten zemin üzerinde katlanmış"
                className="h-[340px] w-full object-cover sm:h-[440px]"
              />
            </div>
            {heroProducts[0] ? (
              <Link
                href={`/urun/${heroProducts[0].slug}`}
                className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-line/70 bg-ivory/95 p-4 sm:left-auto sm:right-5 sm:w-72"
              >
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Öne çıkan</p>
                  <p className="mt-1 text-sm leading-snug">{heroProducts[0].name}</p>
                  <p className="mt-1 text-sm font-semibold">{formatMoney(heroProducts[0].price)}</p>
                </div>
                <span aria-hidden="true" className="text-lg">→</span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section aria-label="Mağaza avantajları" className="border-b border-line/70 bg-white">
        <div className="container-page grid grid-cols-2 divide-line/70 py-2 sm:grid-cols-4 sm:divide-x">
          {services.map((service) => (
            <div key={service.title} className="px-2 py-4 text-center sm:px-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em]">{service.title}</p>
              <p className="mt-1 text-[11px] text-muted">{service.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Kategori</p>
            <h2 className="mt-2 text-3xl">Nereden başlamalı?</h2>
          </div>
          <Link href="/markalar" className="link-quiet">
            Tüm markaları gör →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.slice(0, 6).map((category, index) => (
            <Link
              key={category.id}
              href={`/kategoriler/${category.slug}`}
              className={`group relative overflow-hidden rounded-2xl border border-line/70 bg-ivory-deep ${
                index === 0 ? "sm:col-span-2" : ""
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={category.imageUrl ?? "/images/hero.jpg"}
                alt={`${category.name} kategorisi`}
                loading="lazy"
                className={`w-full object-cover transition duration-700 group-hover:scale-[1.03] ${
                  index === 0 ? "h-56 sm:h-64" : "h-48"
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal/65 via-charcoal/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-ivory">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-ivory/70">
                    {category.productCount} ürün
                  </p>
                  <p className="mt-1 font-display text-xl">{category.name}</p>
                </div>
                <span aria-hidden="true">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Öne çıkanlar</p>
            <h2 className="mt-2 text-3xl">Editörün seçtiği temeller</h2>
          </div>
          <Link href="/arama" className="link-quiet">
            Tüm ürünler →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {(featured.length ? featured : newest).slice(0, 4).map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} />
          ))}
        </div>
      </section>

      <section id="hikaye" className="border-y border-line/70 bg-charcoal text-ivory">
        <div className="container-page grid gap-8 py-14 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-sand">Abani notları</p>
            <h2 className="mt-3 text-3xl leading-tight sm:text-4xl">
              Doğru kumaş, doğru kalıp, doğru fiyat.
            </h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-ivory/70">
              Her sezon yalnızca birkaç parça ekliyoruz. Kullandığımız pamuk uzun elyaflı; kalıplar
              gerçek beden ölçüleriyle test ediliyor. Pazaryeri fiyatlarını satış fiyatımız olarak
              kullanmıyor, her ürünü kendi maliyet ve marj hesabımızla fiyatlıyoruz.
            </p>
            <ul className="mt-6 grid gap-3 text-sm text-ivory/80 sm:grid-cols-2">
              <li>— Uzun elyaf pamuk ve modal karışım</li>
              <li>— Dikişsiz bel, iz bırakmayan lastik</li>
              <li>— Gerçek müşteri yorumları</li>
              <li>— Şeffaf iade ve değişim süreci</li>
            </ul>
            <Link href="/yasal/iade" className="btn-sand mt-7">
              İade politikasını oku
            </Link>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/atlet.jpg"
              alt="Abani Classic fitilli pamuk atlet detayı"
              loading="lazy"
              className="h-72 w-full object-cover sm:h-96"
            />
          </div>
        </div>
      </section>

      <section className="container-page py-14">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow">Çoklu paketler</p>
            <h2 className="mt-2 text-3xl">Bir seferde, daha avantajlı</h2>
          </div>
          <Link href="/arama?sort=price_desc" className="link-quiet">
            Paketleri keşfet →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="font-display text-2xl">3&apos;lü boxer seti</p>
            <p className="mt-2 text-sm text-muted">
              Fiziksel paket olarak depolanır, tek SKU ile satılır. Tekli alıma göre %14 avantaj.
            </p>
            <Link href="/urun/abani-3lu-essential-boxer-paketi" className="btn-outline mt-5">
              Seti incele
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <p className="font-display text-2xl">3&apos;lü çorap</p>
            <p className="mt-2 text-sm text-muted">
              Mercerize pamuk, el bağlama burun. İnce yapısı klasik ayakkabılarla uyumlu.
            </p>
            <Link href="/urun/abani-mercerize-corap-3lu" className="btn-outline mt-5">
              Seti incele
            </Link>
          </div>
          <div className="rounded-2xl border border-line bg-charcoal p-6 text-ivory">
            <p className="eyebrow text-sand">Marka vitrini</p>
            <ul className="mt-3 space-y-2 text-sm">
              {brands.slice(0, 5).map((brand) => (
                <li key={brand.id} className="flex items-center justify-between gap-2">
                  <Link href={`/markalar/${brand.slug}`} className="hover:text-sand">
                    {brand.name}
                  </Link>
                  <span className="text-[11px] text-ivory/50">{brand.productCount} ürün</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {bestSellers.length > 0 ? (
        <section className="container-page pb-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow">Çok satanlar</p>
              <h2 className="mt-2 text-3xl">Topluluğun tercihi</h2>
            </div>
            <Link href="/arama?sort=best_sellers" className="link-quiet">
              Sıralamayı gör →
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {bestSellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="border-y border-line/70 bg-white py-14">
          <div className="container-page">
            <p className="eyebrow">Doğrulanmış yorumlar</p>
            <h2 className="mt-2 text-3xl">Müşteriler ne diyor?</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {reviews.map((review) => (
                <figure key={review.id} className="rounded-2xl border border-line/80 bg-ivory p-5">
                  <div className="flex items-center gap-1 text-sand" aria-label={`${review.rating} yıldız`}>
                    {"★★★★★".slice(0, review.rating)}
                    <span className="text-line">{"★★★★★".slice(review.rating)}</span>
                  </div>
                  <blockquote className="mt-3 text-sm leading-relaxed text-charcoal/80">
                    {review.body}
                  </blockquote>
                  <figcaption className="mt-4 text-xs text-muted">
                    {review.customerName} ·{" "}
                    <Link href={`/urun/${review.productSlug}`} className="underline decoration-line underline-offset-2">
                      {review.productName}
                    </Link>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="container-page py-14">
        <div className="grid gap-6 rounded-[24px] border border-line bg-ivory-deep/70 p-7 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <p className="eyebrow">Yeni gelenler</p>
            <h2 className="mt-2 text-3xl">Bu hafta kataloğa eklenenler</h2>
            <p className="mt-3 max-w-lg text-sm text-muted">
              Her ürün yayına alınmadan önce kumaş, kalıp ve görsel hakkı kontrolünden geçer. Kaynak
              pazaryeri ilanları yalnızca insan onayı ile kataloğa bağlanır.
            </p>
            <Link href="/arama?sort=newest" className="btn-dark mt-5">
              Yeni seçkiyi gör
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {newest.slice(0, 3).map((product) => (
              <Link key={product.id} href={`/urun/${product.slug}`} className="group">
                <div className="overflow-hidden rounded-xl border border-line/70 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition group-hover:scale-105"
                  />
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-snug">{product.name}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
