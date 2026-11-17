"use client";

import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { useCart } from "@/components/cart/cart-store";
import { formatMoney } from "@/lib/format";

import { CloseIcon } from "./icons";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Sepet önizleme çekmecesi (modal diyalog). Mobil menüdeki desen: açılınca odak kapat düğmesine,
 * Tab ile odak çekmece içinde döner, Escape kapatır, arka plan kaydırması kilitlenir; kapanınca
 * odak çekmeceyi açan öğeye (yoksa header'daki sepet düğmesine) döner — bkz. cart-store `closeDrawer`.
 */
export function CartDrawer() {
  const { lines, drawerOpen, notice, closeDrawer, itemCount, subtotal, updateQuantity, removeLine } = useCart();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const noticeId = useId();

  useEffect(() => {
    if (!drawerOpen) return;

    closeRef.current?.focus();

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
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

    document.addEventListener("keydown", onKeyDown);
    return () => {
      body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  // Satır kaldırılınca odak kaybolmasın: çekmece içinde kalan ilk uygun öğeye (kapat düğmesi) dön.
  const removeAndKeepFocus = (variantId: string) => {
    removeLine(variantId);
    window.requestAnimationFrame(() => {
      if (!panelRef.current?.contains(document.activeElement)) closeRef.current?.focus();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        aria-hidden="true"
        onClick={() => closeDrawer()}
        className="absolute inset-0 animate-fade-in bg-charcoal/40 backdrop-blur-[2px]"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={notice ? noticeId : undefined}
        className="relative flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow" aria-hidden="true">
              Sepet
            </p>
            <h2 id={titleId} className="text-lg">
              <span className="sr-only">Sepet: </span>
              {itemCount} parça
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => closeDrawer()}
            aria-label="Sepeti kapat"
            className="icon-btn -mr-2"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {notice ? (
            <p id={noticeId} className="mb-2 border-l-2 border-brand-red bg-white px-3 py-2 text-xs text-charcoal">{notice}</p>
          ) : null}
          {lines.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Sepetiniz henüz boş. Koleksiyonu keşfedin.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={line.image}
                    alt=""
                    className="h-20 w-16 rounded-lg border border-line object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{line.brandName}</p>
                    <p className="text-sm leading-snug">{line.productName}</p>
                    <p className="text-xs text-muted">{line.variantLabel}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-line bg-white text-xs">
                        <button
                          type="button"
                          aria-label={`Azalt: ${line.productName}`}
                          className="px-2.5 py-1 text-muted"
                          onClick={() =>
                            line.quantity <= 1
                              ? removeAndKeepFocus(line.variantId)
                              : updateQuantity(line.variantId, line.quantity - 1)
                          }
                        >
                          −
                        </button>
                        <span className="min-w-5 text-center">
                          <span className="sr-only">Adet: </span>
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label={`Artır: ${line.productName}`}
                          className="px-2.5 py-1 text-muted"
                          onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="text-sm">{formatMoney(line.unitPrice * line.quantity)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAndKeepFocus(line.variantId)}
                      className="mt-1 text-[11px] text-muted underline decoration-line underline-offset-2"
                    >
                      Kaldır<span className="sr-only">: {line.productName}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="border-t border-line bg-white px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">Ara toplam</span>
            <span className="font-semibold">{formatMoney(subtotal)}</span>
          </div>
          <p className="mt-1 text-[11px] text-muted">Kargo ve indirimler ödeme adımında doğrulanır.</p>
          <div className="mt-4 grid gap-2">
            <Link href="/odeme" onClick={() => closeDrawer({ restoreFocus: false })} className="btn-dark w-full">
              Ödemeye geç
            </Link>
            <Link href="/sepet" onClick={() => closeDrawer({ restoreFocus: false })} className="btn-quiet w-full">
              Sepeti görüntüle
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  );
}
