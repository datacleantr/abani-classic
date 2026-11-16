"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCart } from "@/components/cart/cart-store";
import { cn } from "@/lib/format";

type NavItem = { name: string; slug: string };

export function SiteHeader({
  categories,
  brands,
  customerName,
}: {
  categories: NavItem[];
  brands: NavItem[];
  customerName: string | null;
}) {
  const { itemCount, openDrawer } = useCart();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-ivory/95 backdrop-blur">
      <div className="bg-charcoal text-ivory">
        <div className="container-page flex h-9 items-center justify-between gap-4 text-[10px] uppercase tracking-[0.18em]">
          <p className="truncate">1.000 TL üzeri kargo ücretsiz · 14 gün içinde iade</p>
          <p className="hidden shrink-0 text-sand sm:block">Türkiye geneli hızlı teslimat</p>
        </div>
      </div>

      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label="Menüyü aç"
            className="rounded-md border border-line bg-white p-2 lg:hidden"
          >
            <span className="block h-0.5 w-4 bg-charcoal" />
            <span className="mt-1 block h-0.5 w-4 bg-charcoal" />
            <span className="mt-1 block h-0.5 w-4 bg-charcoal" />
          </button>
          <Link href="/" className="flex flex-col leading-none">
            <span className="font-display text-[22px] tracking-[0.24em]">ABANI</span>
            <span className="mt-0.5 text-[9px] uppercase tracking-[0.42em] text-muted">Classic</span>
          </Link>
        </div>

        <nav aria-label="Ana menü" className="hidden items-center gap-6 text-[11px] font-medium uppercase tracking-[0.14em] lg:flex">
          {categories.slice(0, 6).map((category) => (
            <Link
              key={category.slug}
              href={`/kategoriler/${category.slug}`}
              className={cn(
                "transition hover:text-sand",
                pathname === `/kategoriler/${category.slug}` && "text-sand",
              )}
            >
              {category.name.replace("Erkek ", "")}
            </Link>
          ))}
          {categories.length > 6 ? (
            <details className="group relative">
              <summary className="cursor-pointer list-none transition hover:text-sand [&::-webkit-details-marker]:hidden">
                Kadın &amp; diğer
              </summary>
              <div className="absolute left-0 top-full z-50 mt-3 min-w-52 rounded-xl border border-line bg-white p-2 shadow-lg">
                {categories.slice(6).map((category) => (
                  <Link
                    key={category.slug}
                    href={`/kategoriler/${category.slug}`}
                    className="block rounded-lg px-3 py-2 normal-case tracking-normal text-[13px] hover:bg-ivory"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </details>
          ) : null}
          <Link href="/arama?sort=newest" className="text-sand transition hover:text-charcoal">
            Yeni seçki
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen((open) => !open)}
            aria-expanded={searchOpen}
            aria-label="Arama yap"
            className="rounded-full border border-line bg-white p-2 text-charcoal hover:border-sand"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </button>
          <Link
            href={customerName ? "/hesabim" : "/giris"}
            className="hidden rounded-full border border-line bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-charcoal hover:border-sand sm:block"
          >
            {customerName ? customerName.split(" ")[0] : "Giriş"}
          </Link>
          <button
            type="button"
            onClick={openDrawer}
            className="relative rounded-full border border-charcoal bg-charcoal px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-ivory hover:bg-charcoal-soft"
          >
            Sepet
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-sand px-1.5 py-0.5 text-[10px] font-semibold text-charcoal">
              {itemCount}
            </span>
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div className="border-t border-line bg-white/90">
          <form action="/arama" className="container-page flex items-center gap-2 py-3">
            <label htmlFor="header-search" className="sr-only">
              Ürün ara
            </label>
            <input
              id="header-search"
              name="q"
              placeholder="Boxer, atlet, marka veya model kodu ara…"
              className="input"
              autoFocus
            />
            <button type="submit" className="btn-dark shrink-0">
              Ara
            </button>
          </form>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="border-t border-line bg-white lg:hidden">
          <div className="container-page grid gap-4 py-4">
            <div>
              <p className="eyebrow mb-2">Kategoriler</p>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                {categories.map((category) => (
                  <li key={category.slug}>
                    <Link
                      href={`/kategoriler/${category.slug}`}
                      onClick={() => setMenuOpen(false)}
                      className="block rounded-lg border border-line px-3 py-2"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-2">Markalar</p>
              <div className="flex flex-wrap gap-2 text-xs">
                {brands.map((brand) => (
                  <Link
                    key={brand.slug}
                    href={`/markalar/${brand.slug}`}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-full border border-line px-3 py-1.5"
                  >
                    {brand.name}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/hesabim" onClick={() => setMenuOpen(false)} className="btn-quiet flex-1">
                Hesabım
              </Link>
              <Link href="/admin" onClick={() => setMenuOpen(false)} className="btn-outline flex-1">
                Yönetim
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
