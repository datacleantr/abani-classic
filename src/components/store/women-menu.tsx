"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { cn } from "@/lib/format";

import { ChevronDownIcon } from "./icons";
import { categoryHref, isActivePath, womenShortLabel, type NavCategory } from "./navigation";

const HOVER_OPEN_DELAY = 120;
const HOVER_CLOSE_DELAY = 220;

/** Kim açtı: fareyle üzerine gelme açılışı fare ayrılınca kapanır; tıklama/klavye açılışı kalır. */
type OpenSource = "hover" | "pinned";

/**
 * Masaüstü ana menüdeki "Kadın" açılır menüsü (WAI-ARIA disclosure deseni).
 * Enter/Space aç-kapa, ↓ açıp ilk bağlantıya odaklanır, Escape kapatıp odağı düğmeye döndürür;
 * dışarı tıklama, sayfa değişimi ve odağın menüden çıkması kapatır. Panel içinde Tab doğal sıradadır.
 */
export function WomenMenu({ categories, triggerClassName }: { categories: NavCategory[]; triggerClassName: (active: boolean) => string }) {
  const pathname = usePathname();
  const [openSource, setOpenSource] = useState<OpenSource | null>(null);
  const [lastPathname, setLastPathname] = useState(pathname);
  const rootRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<number | null>(null);
  const panelId = useId();
  const open = openSource !== null;

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpenSource(null);
  }

  const clearHoverTimer = () => {
    if (hoverTimer.current !== null) {
      window.clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  };

  const close = useCallback((restoreFocus: boolean) => {
    setOpenSource(null);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Dışarı tıklama kapatır (odak taşımadan).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: globalThis.PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpenSource(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => () => clearHoverTimer(), []);

  if (categories.length === 0) return null;

  const active = categories.some((category) => isActivePath(pathname, categoryHref(category.slug)));

  const links = () => Array.from(panelRef.current?.querySelectorAll<HTMLAnchorElement>("a[href]") ?? []);

  const focusLink = (index: number) => {
    const list = links();
    if (list.length === 0) return;
    list[(index + list.length) % list.length]?.focus();
  };

  const onButtonClick = () => {
    clearHoverTimer();
    // Fareyle açılmış menüye tıklamak menüyü sabitler (kapatmaz); aksi hâlde aç/kapa.
    setOpenSource((current) => (current === "pinned" ? null : "pinned"));
  };

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      clearHoverTimer();
      setOpenSource("pinned");
      // Panel bir sonraki çizimde görünür olur.
      window.requestAnimationFrame(() => focusLink(0));
    }
  };

  const onRootKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
      return;
    }
    if (!open || !panelRef.current?.contains(event.target as Node)) return;
    const list = links();
    const index = list.indexOf(event.target as HTMLAnchorElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusLink(index + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusLink(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusLink(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusLink(list.length - 1);
    }
  };

  // Odak menü dışına çıkınca kapat. relatedTarget yoksa (pencere değişimi, Safari tıklaması) dokunma;
  // fareyle dışarı tıklama ayrıca `pointerdown` ile ele alınır.
  const onRootBlur = (event: FocusEvent<HTMLLIElement>) => {
    const next = event.relatedTarget as Node | null;
    if (open && next && !event.currentTarget.contains(next)) setOpenSource(null);
  };

  const onPointerEnter = (event: PointerEvent<HTMLLIElement>) => {
    if (event.pointerType !== "mouse") return;
    clearHoverTimer();
    if (open) return;
    hoverTimer.current = window.setTimeout(() => setOpenSource((current) => current ?? "hover"), HOVER_OPEN_DELAY);
  };

  const onPointerLeave = (event: PointerEvent<HTMLLIElement>) => {
    if (event.pointerType !== "mouse") return;
    clearHoverTimer();
    if (openSource !== "hover") return;
    hoverTimer.current = window.setTimeout(
      () => setOpenSource((current) => (current === "hover" ? null : current)),
      HOVER_CLOSE_DELAY,
    );
  };

  return (
    <li
      ref={rootRef}
      className="relative"
      onKeyDown={onRootKeyDown}
      onBlur={onRootBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onButtonClick}
        onKeyDown={onButtonKeyDown}
        className={cn(triggerClassName(active || open), "gap-1")}
      >
        Kadın
        <ChevronDownIcon size={14} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {/* Fareyle düğmeden panele geçerken boşlukta kapanmasın diye panel üst dolgusu köprü görevi görür. */}
      <div ref={panelRef} id={panelId} hidden={!open} className="absolute left-1/2 top-full z-50 -translate-x-1/2 pt-2">
        <div className="w-64 animate-slide-down rounded-xl border border-line bg-paper p-2 shadow-lg shadow-navy-deep/5">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-red" aria-hidden="true">
            Kadın
          </p>
          <ul>
            {categories.map((category) => {
              const href = categoryHref(category.slug);
              const current = isActivePath(pathname, href);
              return (
                <li key={category.slug}>
                  <Link
                    href={href}
                    aria-current={current ? "page" : undefined}
                    onClick={() => setOpenSource(null)}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 rounded-lg px-3 text-[14px] transition-colors hover:bg-navy-tint focus-visible:bg-navy-tint",
                      current ? "font-semibold text-navy" : "text-charcoal",
                    )}
                  >
                    <span>
                      <span className="sr-only">Kadın </span>
                      {womenShortLabel(category.name)}
                    </span>
                    {category.productCount !== undefined ? (
                      <span className="text-xs tabular-nums text-muted">{category.productCount} ürün</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </li>
  );
}
