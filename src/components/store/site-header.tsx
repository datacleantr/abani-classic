"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { CART_TRIGGER_ATTRIBUTE, useCart } from "@/components/cart/cart-store";
import { useFavorites } from "@/components/favorites/favorites-store";
import { cn } from "@/lib/format";

import { BrandLogo } from "./brand-logo";
import { BagIcon, CloseIcon, HeartIcon, SearchIcon, UserIcon } from "./icons";
import { MobileMenu } from "./mobile-menu";
import {
  buildPrimaryNav,
  isActivePath,
  womenMenuCategories,
  type NavBrand,
  type NavCategory,
} from "./navigation";
import { WomenMenu } from "./women-menu";

const formatBadge = (count: number) => (count > 99 ? "99+" : String(count));

/** Ana menü öğesi: 44px yükseklik, aktifte/üzerinde kırmızı alt çizgi. Bağlantı ve "Kadın" düğmesi ortak. */
const navLinkClass = (active: boolean) =>
  cn(
    "relative inline-flex h-11 items-center whitespace-nowrap text-[13px] font-medium transition-colors xl:text-[14px]",
    "after:absolute after:inset-x-0 after:bottom-1.5 after:h-0.5 after:origin-left after:rounded-full after:bg-brand-red after:transition-transform",
    active
      ? "text-navy after:scale-x-100"
      : "text-charcoal/80 after:scale-x-0 hover:text-navy hover:after:scale-x-100",
  );

export function SiteHeader({
  categories,
  brands,
  customerName,
}: {
  categories: NavCategory[];
  brands: NavBrand[];
  customerName: string | null;
}) {
  const cart = useCart();
  const favorites = useFavorites();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  const searchToggleRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelId = useId();

  // Sayfa değişince arama panelini kapat (render sırasında türetilmiş durum güncellemesi).
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSearchOpen(false);
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const closeSearch = () => {
    setSearchOpen(false);
    searchToggleRef.current?.focus();
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeSearch();
    }
  };

  const navItems = buildPrimaryNav(categories);
  const womenCategories = womenMenuCategories(categories);
  const cartCount = cart.isReady ? cart.itemCount : 0;
  const favoriteCount = favorites.isReady ? favorites.count : 0;
  const firstName = customerName?.split(" ")[0] ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper">
      <div className="container-page flex h-16 items-center gap-2 lg:h-[72px] lg:gap-4">
        <MobileMenu categories={categories} brands={brands} customerName={customerName} />

        <Link href="/" className="shrink-0 rounded-sm">
          <BrandLogo preload className="h-[52px] lg:h-[60px]" />
        </Link>

        {/* lg–xl arası kısa etiketler + dar aralık; xl'de tam etiketler. Satır kırılmaz, taşma olmaz. */}
        <nav aria-label="Ana menü" className="hidden min-w-0 flex-1 justify-center lg:flex">
          <ul className="flex items-center gap-3.5 xl:gap-6">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href, item.exact);
              return (
                <Fragment key={item.href}>
                  {/* "Kadın" açılır menüsü kategorilerden sonra, "Markalar"dan önce. */}
                  {item.href === "/markalar" ? (
                    <WomenMenu categories={womenCategories} triggerClassName={navLinkClass} />
                  ) : null}
                  <li>
                    <Link
                      href={item.href}
                      aria-current={active && pathname === item.href ? "page" : undefined}
                      className={navLinkClass(active)}
                    >
                      {item.shortLabel === item.label ? (
                        item.label
                      ) : (
                        <>
                          <span className="xl:hidden">{item.shortLabel}</span>
                          <span className="hidden xl:inline">{item.label}</span>
                        </>
                      )}
                    </Link>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </nav>

        <div className="ml-auto flex shrink-0 items-center lg:ml-0">
          <button
            ref={searchToggleRef}
            type="button"
            onClick={() => setSearchOpen((value) => !value)}
            aria-expanded={searchOpen}
            aria-controls={searchOpen ? searchPanelId : undefined}
            aria-label={searchOpen ? "Aramayı kapat" : "Ürün ara"}
            className="icon-btn"
          >
            {searchOpen ? <CloseIcon /> : <SearchIcon />}
          </button>

          <Link
            href={customerName ? "/hesabim" : "/giris"}
            aria-label={firstName ? `Hesabım (${firstName})` : "Giriş yap"}
            aria-current={pathname === "/hesabim" || pathname === "/giris" ? "page" : undefined}
            className="icon-btn hidden sm:inline-flex"
          >
            <UserIcon />
            {firstName ? (
              <span aria-hidden="true" className="absolute bottom-1.5 right-1.5 h-2 w-2 rounded-full bg-success ring-2 ring-paper" />
            ) : null}
          </Link>

          <Link
            href="/favoriler"
            aria-label={favoriteCount > 0 ? `Favoriler, ${favoriteCount} ürün` : "Favoriler"}
            aria-current={pathname === "/favoriler" ? "page" : undefined}
            className="icon-btn hidden min-[380px]:inline-flex"
          >
            <HeartIcon />
            {favoriteCount > 0 ? (
              <span aria-hidden="true" className="count-badge">
                {formatBadge(favoriteCount)}
              </span>
            ) : null}
          </Link>

          <button
            type="button"
            {...{ [CART_TRIGGER_ATTRIBUTE]: "" }}
            onClick={(event) => cart.openDrawer(event.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={cart.drawerOpen}
            aria-label={cartCount > 0 ? `Sepet, ${cartCount} ürün` : "Sepet, boş"}
            className="icon-btn -mr-2 lg:mr-0"
          >
            <BagIcon />
            {cartCount > 0 ? (
              <span aria-hidden="true" className="count-badge">
                {formatBadge(cartCount)}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {searchOpen ? (
        <div
          id={searchPanelId}
          onKeyDown={onSearchKeyDown}
          className="animate-slide-down border-t border-line bg-white"
        >
          <form action="/arama" role="search" className="container-page flex items-center gap-2 py-3">
            <label htmlFor="header-search" className="sr-only">
              Ürün ara
            </label>
            <input
              ref={searchInputRef}
              id="header-search"
              name="q"
              type="search"
              enterKeyHint="search"
              autoComplete="off"
              placeholder="Boxer, atlet, marka veya model kodu ara…"
              className="input min-w-0 border-line text-base sm:text-sm"
            />
            <button type="submit" className="btn-navy shrink-0 px-5">
              Ara
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
