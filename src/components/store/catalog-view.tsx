import Link from "next/link";

import type { ListResult } from "@/lib/catalog";
import { ProductCard } from "./product-card";

type Params = Record<string, string | string[] | undefined>;

export function buildQuery(params: Params, overrides: Record<string, string | string[] | undefined>) {
  const search = new URLSearchParams();
  const merged = { ...params, ...overrides };
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((entry) => search.append(key, entry));
    } else {
      search.append(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function CatalogView({
  title,
  intro,
  seoText,
  basePath,
  params,
  result,
  activeSort,
}: {
  title: string;
  intro?: string | null;
  seoText?: string | null;
  basePath: string;
  params: Params;
  result: ListResult;
  activeSort: string;
}) {
  const brandFilters = ([] as string[]).concat(params.marka ?? []);
  const sizeFilters = ([] as string[]).concat(params.beden ?? []);
  const colorFilters = ([] as string[]).concat(params.renk ?? []);
  const inStock = params.stok === "1";
  const minPrice = typeof params.min === "string" ? params.min : "";
  const maxPrice = typeof params.max === "string" ? params.max : "";
  const totalPages = Math.max(1, Math.ceil(result.total / result.perPage));

  const sortOptions = [
    { key: "recommended", label: "Önerilen" },
    { key: "best_sellers", label: "Çok satan" },
    { key: "price_asc", label: "Fiyat artan" },
    { key: "price_desc", label: "Fiyat azalan" },
    { key: "newest", label: "En yeni" },
  ];

  return (
    <div className="container-page py-8">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/" className="hover:text-charcoal">Ana sayfa</Link>
        <span className="mx-2 text-line">/</span>
        <span className="text-charcoal">{title}</span>
      </nav>

      <header className="mt-4 max-w-2xl">
        <h1 className="text-[32px] leading-tight sm:text-[40px]">{title}</h1>
        {intro ? <p className="mt-3 text-sm leading-relaxed text-charcoal/70">{intro}</p> : null}
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[248px_1fr]">
        <form method="get" action={basePath} className="order-2 lg:order-1">
          <div className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Filtreler</p>
            </div>

            <fieldset className="border-b border-line px-4 py-4">
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Marka
              </legend>
              <div className="space-y-1.5">
                {result.facets.brands.map((brand) => (
                  <label key={brand.slug} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="marka"
                        value={brand.slug}
                        defaultChecked={brandFilters.includes(brand.slug)}
                        className="h-4 w-4 rounded border-line text-charcoal"
                      />
                      {brand.name}
                    </span>
                    <span className="text-[11px] text-muted">{brand.count}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {result.facets.sizes.length > 0 ? (
              <fieldset className="border-b border-line px-4 py-4">
                <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Beden
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {result.facets.sizes.map((size) => (
                    <label
                      key={size}
                      className="cursor-pointer rounded-md border border-line px-2.5 py-1 text-xs has-[:checked]:border-charcoal has-[:checked]:bg-charcoal has-[:checked]:text-ivory"
                    >
                      <input
                        type="checkbox"
                        name="beden"
                        value={size}
                        defaultChecked={sizeFilters.includes(size)}
                        className="sr-only"
                      />
                      {size}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {result.facets.colors.length > 0 ? (
              <fieldset className="border-b border-line px-4 py-4">
                <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  Renk
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {result.facets.colors.map((color) => (
                    <label
                      key={color}
                      className="cursor-pointer rounded-full border border-line px-3 py-1 text-xs has-[:checked]:border-charcoal has-[:checked]:bg-charcoal has-[:checked]:text-ivory"
                    >
                      <input
                        type="checkbox"
                        name="renk"
                        value={color}
                        defaultChecked={colorFilters.includes(color)}
                        className="sr-only"
                      />
                      {color}
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            <fieldset className="border-b border-line px-4 py-4">
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                Fiyat (TL)
              </legend>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  name="min"
                  min={0}
                  defaultValue={minPrice}
                  placeholder="En az"
                  aria-label="En düşük fiyat"
                  className="input px-2 py-1.5 text-xs"
                />
                <span className="text-muted">—</span>
                <input
                  type="number"
                  name="max"
                  min={0}
                  defaultValue={maxPrice}
                  placeholder="En çok"
                  aria-label="En yüksek fiyat"
                  className="input px-2 py-1.5 text-xs"
                />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="stok"
                  value="1"
                  defaultChecked={inStock}
                  className="h-4 w-4 rounded border-line"
                />
                Sadece stokta olanlar
              </label>
            </fieldset>

            <div className="px-4 py-4">
              <input type="hidden" name="sort" value={activeSort} />
              <button type="submit" className="btn-dark w-full">
                Filtrele
              </button>
              <Link href={basePath} className="mt-2 block text-center text-[11px] text-muted underline underline-offset-4">
                Filtreleri temizle
              </Link>
            </div>
          </div>
        </form>

        <div className="order-1 lg:order-2">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <p className="text-xs text-muted">{result.total} ürün listeleniyor</p>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {sortOptions.map((option) => (
                <Link
                  key={option.key}
                  href={`${basePath}${buildQuery(params, { sort: option.key, page: undefined })}`}
                  className={
                    option.key === activeSort
                      ? "rounded-full bg-charcoal px-3 py-1.5 text-ivory"
                      : "rounded-full border border-line bg-white px-3 py-1.5 text-muted hover:border-charcoal hover:text-charcoal"
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>

          {result.items.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
              <p className="font-display text-xl">Bu filtreyle ürün bulunamadı.</p>
              <p className="mt-2 text-sm text-muted">Filtreleri temizleyip yeniden deneyin.</p>
              <Link href={basePath} className="btn-outline mt-5">
                Tüm ürünler
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-3">
              {result.items.map((product, index) => (
                <ProductCard key={product.id} product={product} priority={index < 3} />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <nav aria-label="Sayfalama" className="mt-10 flex items-center justify-center gap-1.5">
              {Array.from({ length: totalPages }).map((_, index) => {
                const page = index + 1;
                return (
                  <Link
                    key={page}
                    href={`${basePath}${buildQuery(params, { page: String(page) })}`}
                    aria-current={page === result.page ? "page" : undefined}
                    className={
                      page === result.page
                        ? "rounded-full bg-charcoal px-3.5 py-2 text-xs text-ivory"
                        : "rounded-full border border-line bg-white px-3.5 py-2 text-xs text-muted hover:border-charcoal hover:text-charcoal"
                    }
                  >
                    {page}
                  </Link>
                );
              })}
            </nav>
          ) : null}

          {seoText ? (
            <section className="mt-12 rounded-2xl border border-line/70 bg-white/60 p-6">
              <h2 className="text-lg">Kategori notları</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{seoText}</p>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}


