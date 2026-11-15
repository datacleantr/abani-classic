"use client";

import Link from "next/link";

import { useCart } from "@/components/cart/cart-store";
import { formatMoney } from "@/lib/format";

export function CartDrawer() {
  const { lines, drawerOpen, closeDrawer, itemCount, subtotal, updateQuantity, removeLine } = useCart();

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Sepeti kapat"
        onClick={closeDrawer}
        className="absolute inset-0 bg-charcoal/40 backdrop-blur-[2px]"
      />
      <aside
        aria-label="Sepet önizlemesi"
        className="relative flex h-full w-full max-w-md flex-col bg-ivory shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <p className="eyebrow">Sepet</p>
            <h2 className="text-lg">{itemCount} parça</h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs uppercase tracking-[0.12em] text-muted hover:text-charcoal"
          >
            Kapat
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lines.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Sepetiniz henüz boş. Koleksiyonu keşfedin.</p>
          ) : (
            <ul className="divide-y divide-line/70">
              {lines.map((line) => (
                <li key={line.variantId} className="flex gap-3 py-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={line.image}
                    alt={line.productName}
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
                          aria-label="Azalt"
                          className="px-2.5 py-1 text-muted"
                          onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                        >
                          −
                        </button>
                        <span className="min-w-5 text-center">{line.quantity}</span>
                        <button
                          type="button"
                          aria-label="Artır"
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
                      onClick={() => removeLine(line.variantId)}
                      className="mt-1 text-[11px] text-muted underline decoration-line underline-offset-2"
                    >
                      Kaldır
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
            <Link href="/odeme" onClick={closeDrawer} className="btn-dark w-full">
              Ödemeye geç
            </Link>
            <Link href="/sepet" onClick={closeDrawer} className="btn-quiet w-full">
              Sepeti görüntüle
            </Link>
          </div>
        </footer>
      </aside>
    </div>
  );
}
