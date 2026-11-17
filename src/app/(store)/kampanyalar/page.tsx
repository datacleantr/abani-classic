import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ProductCard } from "@/components/store/product-card";
import {
  getDiscountedProducts,
  getMultiPackProducts,
  getPackGroups,
  getProductsByPackQuantity,
  getStoreCategories,
  hasDiscountedProducts,
} from "@/lib/catalog";
import { cn, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Açıklama gerçek duruma göre: indirimli ürün yoksa indirim vaat edilmez. */
export async function generateMetadata(): Promise<Metadata> {
  const discounted = await hasDiscountedProducts().catch(() => false);
  return {
    title: "Kampanyalar ve Çoklu Paketler",
    description: discounted
      ? "Abani Classic'te liste fiyatının altında satılan ürünler ve çoklu paket seçenekleri. Fiyatlar güncel satış fiyatıdır."
      : "Abani Classic'te birden fazla adedi tek pakette sunan çoklu paket seçenekleri. Fiyatlar güncel satış fiyatıdır.",
    alternates: { canonical: "/kampanyalar" },
  };
}

const PER_PAGE = 24;

const searchSchema = z.object({
  paket: z.coerce.number().int().min(2).max(100).optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(100).optional().catch(undefined),
});

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function CampaignsPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const { paket, sayfa } = searchSchema.parse({ paket: first(raw.paket), sayfa: first(raw.sayfa) });

  const [discounted, groups, categoryList] = await Promise.all([
    getDiscountedProducts(12),
    getPackGroups(),
    getStoreCategories(),
  ]);
  const activeGroup = paket ? groups.find((group) => group.packQuantity === paket) : undefined;
  const [mixedPacks, packPage] = await Promise.all([
    activeGroup ? Promise.resolve([]) : getMultiPackProducts(8),
    activeGroup ? getProductsByPackQuantity(activeGroup.packQuantity, { page: sayfa ?? 1, perPage: PER_PAGE }) : null,
  ]);
  const totalPages = packPage ? Math.max(1, Math.ceil(packPage.total / PER_PAGE)) : 1;
  // Var olmayan sayfa (ör. ?sayfa=99) boş liste göstermesin: son sayfaya yönlendir.
  if (activeGroup && packPage && packPage.page > totalPages) {
    redirect(
      `/kampanyalar?paket=${activeGroup.packQuantity}${totalPages > 1 ? `&sayfa=${totalPages}` : ""}#coklu-paket`,
    );
  }
  const visibleCategories = categoryList.filter((category) => category.productCount > 0);

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/" className="hover:text-charcoal">
          Ana sayfa
        </Link>
        <span className="mx-2 text-line" aria-hidden="true">
          /
        </span>
        <span className="text-charcoal" aria-current="page">
          Kampanyalar
        </span>
      </nav>
      <h1 className="mt-4 text-[32px] sm:text-[40px]">Kampanyalar</h1>

      <section aria-labelledby="indirimler" className="mt-6">
        <h2 id="indirimler" className="sr-only">
          İndirimdeki ürünler
        </h2>
        {discounted.length > 0 ? (
          <>
            <p className="max-w-2xl text-sm leading-relaxed text-charcoal/75">
              Liste fiyatının altında satılan ürünler. Gösterilen indirim, ürünün kayıtlı liste fiyatı ile
              güncel satış fiyatı arasındaki farktır.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {discounted.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 4} />
              ))}
            </div>
          </>
        ) : (
          <p className="max-w-2xl border-l-2 border-navy/30 pl-4 text-sm leading-relaxed text-charcoal/75">
            Şu anda indirimli ürünümüz bulunmuyor; tüm ürünler güncel satış fiyatıyla listeleniyor. Aynı
            üründen birden fazla adedi tek pakette sunan çoklu paket seçeneklerini aşağıda bulabilirsiniz.
          </p>
        )}
      </section>

      {groups.length > 0 ? (
        <section id="coklu-paket" aria-labelledby="coklu-paket-baslik" className="mt-14 scroll-mt-28">
          <p className="eyebrow">Paketler</p>
          <h2 id="coklu-paket-baslik" className="mt-2 text-2xl sm:text-3xl">
            Çoklu paket seçenekleri
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Aynı üründen birden fazla adedi tek pakette sunan seçenekler. Fiyatlar paketin toplam satış fiyatıdır.
          </p>

          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Paket adedine göre">
            <li>
              <Link
                href="/kampanyalar#coklu-paket"
                aria-current={!activeGroup ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 border px-3.5 py-2 text-xs transition",
                  !activeGroup
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-white text-charcoal hover:border-charcoal",
                )}
              >
                Tümü
              </Link>
            </li>
            {groups.map((group) => {
              const active = activeGroup?.packQuantity === group.packQuantity;
              return (
                <li key={group.packQuantity}>
                  <Link
                    href={group.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex items-center gap-2 border px-3.5 py-2 text-xs transition",
                      active
                        ? "border-navy bg-navy text-white"
                        : "border-line bg-white text-charcoal hover:border-charcoal",
                    )}
                  >
                    <span className="font-semibold">{group.label}</span>
                    <span className={active ? "text-white/75" : "text-muted"}>
                      {group.productCount} ürün · {formatMoney(group.minPrice)}
                      {"'den başlayan"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {packPage && activeGroup ? (
            <>
              <p className="mt-6 text-xs text-muted">
                {activeGroup.label}: {packPage.total} ürün
              </p>
              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
                {packPage.items.map((product, index) => (
                  <ProductCard key={product.id} product={product} priority={index < 4} />
                ))}
              </div>
              {totalPages > 1 ? (
                <nav aria-label="Sayfalama" className="mt-10 flex flex-wrap items-center justify-center gap-1.5">
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const page = index + 1;
                    const current = page === packPage.page;
                    return (
                      <Link
                        key={page}
                        href={`/kampanyalar?paket=${activeGroup.packQuantity}${page > 1 ? `&sayfa=${page}` : ""}#coklu-paket`}
                        aria-current={current ? "page" : undefined}
                        aria-label={`Sayfa ${page}`}
                        className={cn(
                          "min-w-10 border px-3.5 py-2 text-center text-xs",
                          current
                            ? "border-navy bg-navy text-white"
                            : "border-line bg-white text-muted hover:border-charcoal hover:text-charcoal",
                        )}
                      >
                        {page}
                      </Link>
                    );
                  })}
                </nav>
              ) : null}
            </>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
              {mixedPacks.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={discounted.length === 0 && index < 4} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {visibleCategories.length > 0 ? (
        <section aria-labelledby="kategoriler-baslik" className="mt-14 border-t border-line pt-10">
          <h2 id="kategoriler-baslik" className="text-2xl">
            Kategorilere göz atın
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {visibleCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/kategoriler/${category.slug}`}
                  className="flex h-full items-center justify-between gap-2 border border-line bg-white px-4 py-3 text-sm transition hover:border-charcoal"
                >
                  <span>{category.name}</span>
                  <span className="text-xs text-muted">
                    {category.productCount}
                    <span className="sr-only"> ürün</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
