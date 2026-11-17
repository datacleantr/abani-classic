"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { useFavorites } from "@/components/favorites/favorites-store";
import { cn } from "@/lib/format";

import { BrandLogo } from "./brand-logo";
import { ChevronRightIcon, CloseIcon, HeartIcon, MenuIcon, TruckIcon, UserIcon } from "./icons";
import {
  brandHref,
  categoryHref,
  isActivePath,
  splitCategories,
  type NavBrand,
  type NavCategory,
} from "./navigation";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobil/tablet gezinme çekmecesi (lg altı). Odak tuzağı, Escape ile kapanma, kapanınca
 * tetikleyiciye odak dönüşü, arka plan kaydırma kilidi. Header `backdrop-filter` kullandığı
 * için çekmece `document.body`'ye portal ile basılır (aksi hâlde `fixed` header'a göre konumlanır).
 */
export function MobileMenu({
  categories,
  brands,
  customerName,
}: {
  categories: NavCategory[];
  brands: NavBrand[];
  customerName: string | null;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const favorites = useFavorites();

  // Sayfa değişince (geri/ileri dahil) menüyü kapat: render sırasında türetilmiş durum güncellemesi.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(true);
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    // Masaüstü genişliğine geçilirse (tetikleyici gizlenir) çekmeceyi kapat.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onDesktop = (event: MediaQueryListEvent) => {
      if (event.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onDesktop);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onDesktop);
    };
  }, [open, close]);

  const { men, women } = splitCategories(categories);
  const onNavigate = () => setOpen(false);
  const favoriteCount = favorites.isReady ? favorites.count : 0;

  const rowClass = (href: string, exact = false) =>
    cn(
      "flex min-h-12 items-center justify-between gap-3 border-b border-line/70 py-3 text-[15px] transition-colors hover:text-brand-red",
      isActivePath(pathname, href, exact) ? "font-semibold text-navy" : "text-charcoal",
    );

  const drawer = open
    ? createPortal(
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            onClick={() => close(true)}
            className="absolute inset-0 animate-fade-in bg-navy-deep/50"
          />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute inset-y-0 left-0 flex w-[min(88vw,380px)] animate-drawer-in-left flex-col bg-paper shadow-2xl"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
              <h2 id={titleId} className="sr-only">
                Menü
              </h2>
              <Link href="/" onClick={onNavigate} className="-ml-1 rounded-sm">
                <BrandLogo className="h-11" />
              </Link>
              <button
                ref={closeRef}
                type="button"
                onClick={() => close(true)}
                aria-label="Menüyü kapat"
                className="icon-btn -mr-2"
              >
                <CloseIcon />
              </button>
            </div>

            <nav aria-label="Mobil menü" className="flex-1 overflow-y-auto overscroll-contain px-5 pb-8">
              <Link
                href="/"
                onClick={onNavigate}
                aria-current={isActivePath(pathname, "/", true) ? "page" : undefined}
                className={rowClass("/", true)}
              >
                Ana Sayfa
              </Link>

              {men.length > 0 ? (
                <section aria-labelledby={`${titleId}-men`} className="mt-6">
                  <h3 id={`${titleId}-men`} className="eyebrow font-sans">
                    Erkek iç giyim
                  </h3>
                  <ul className="mt-1">
                    {men.map((category) => {
                      const href = categoryHref(category.slug);
                      return (
                        <li key={category.slug}>
                          <Link
                            href={href}
                            onClick={onNavigate}
                            aria-current={isActivePath(pathname, href) ? "page" : undefined}
                            className={rowClass(href)}
                          >
                            {category.name}
                            <ChevronRightIcon size={16} className="text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              {women.length > 0 ? (
                <section aria-labelledby={`${titleId}-women`} className="mt-6">
                  <h3 id={`${titleId}-women`} className="eyebrow font-sans">
                    Kadın
                  </h3>
                  <ul className="mt-1">
                    {women.map((category) => {
                      const href = categoryHref(category.slug);
                      return (
                        <li key={category.slug}>
                          <Link
                            href={href}
                            onClick={onNavigate}
                            aria-current={isActivePath(pathname, href) ? "page" : undefined}
                            className={rowClass(href)}
                          >
                            {category.name}
                            <ChevronRightIcon size={16} className="text-muted" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}

              <ul className="mt-6">
                <li>
                  <Link
                    href="/markalar"
                    onClick={onNavigate}
                    aria-current={pathname === "/markalar" ? "page" : undefined}
                    className={rowClass("/markalar")}
                  >
                    Markalar
                    <ChevronRightIcon size={16} className="text-muted" />
                  </Link>
                </li>
                <li>
                  <Link
                    href="/kampanyalar"
                    onClick={onNavigate}
                    aria-current={isActivePath(pathname, "/kampanyalar") ? "page" : undefined}
                    className={rowClass("/kampanyalar")}
                  >
                    Kampanyalar
                    <ChevronRightIcon size={16} className="text-muted" />
                  </Link>
                </li>
              </ul>

              {brands.length > 0 ? (
                <ul aria-label="Markalar" className="mt-4 flex flex-wrap gap-2">
                  {brands.map((brand) => {
                    const href = brandHref(brand.slug);
                    const active = isActivePath(pathname, href);
                    return (
                      <li key={brand.slug}>
                        <Link
                          href={href}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "inline-flex min-h-11 items-center rounded-full border px-4 text-[13px] transition-colors",
                            active
                              ? "border-navy bg-navy text-white"
                              : "border-line bg-white text-charcoal hover:border-navy",
                          )}
                        >
                          {brand.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <ul className="mt-8 grid gap-2">
                <li>
                  <Link
                    href={customerName ? "/hesabim" : "/giris"}
                    onClick={onNavigate}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 text-[15px] text-navy hover:border-navy"
                  >
                    <UserIcon size={20} />
                    {customerName ? `Hesabım · ${customerName.split(" ")[0]}` : "Giriş yap / Üye ol"}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/favoriler"
                    onClick={onNavigate}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 text-[15px] text-navy hover:border-navy"
                  >
                    <HeartIcon size={20} />
                    Favoriler
                    {favoriteCount > 0 ? (
                      <span className="ml-auto rounded-full bg-brand-red px-2 py-0.5 text-[11px] font-semibold text-white">
                        <span className="sr-only">, </span>
                        {favoriteCount}
                        <span className="sr-only"> ürün</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
                <li>
                  <Link
                    href="/siparis-takip"
                    onClick={onNavigate}
                    className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-white px-4 text-[15px] text-navy hover:border-navy"
                  >
                    <TruckIcon size={20} />
                    Sipariş takibi
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-haspopup="dialog"
        aria-label="Menüyü aç"
        className="icon-btn -ml-2 lg:hidden"
      >
        <MenuIcon />
      </button>
      {drawer}
    </>
  );
}
