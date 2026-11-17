"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/cart-store";
import { formatMoney } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

export function CartPageView() {
  const {
    lines,
    couponCode,
    setCouponCode,
    updateQuantity,
    removeLine,
    isReady,
    subtotal,
  } = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [couponInput, setCouponInput] = useState(couponCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || lines.length === 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => setLoading(true), 0);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
        couponCode: couponCode || undefined,
      }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((data: { ok: boolean; quote?: Quote; message?: string }) => {
        if (data.ok && data.quote) {
          setQuote(data.quote);
          setError(null);
        } else {
          setError(data.message ?? "Sepet hesaplanamadı.");
        }
      })
      .catch(() => {
        /* aborted */
      })
      .finally(() => setLoading(false));
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lines, couponCode, isReady]);

  if (!isReady) {
    return <p className="py-16 text-center text-sm text-muted">Sepet yükleniyor…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-display text-2xl">Sepetiniz boş</p>
        <p className="mt-2 text-sm text-muted">
          Koleksiyondan birkaç temel parça ekleyerek başlayın.
        </p>
        <Link href="/arama" className="btn-dark mt-6">
          Koleksiyona git
        </Link>
      </div>
    );
  }

  const issues = quote?.issues ?? [];

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 p-4">
              <Link href={`/urun/${line.productSlug}`} className="shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={line.image}
                  alt={line.productName}
                  className="h-24 w-20 rounded-lg border border-line object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{line.brandName}</p>
                <Link href={`/urun/${line.productSlug}`} className="text-sm hover:text-brand-red">
                  {line.productName}
                </Link>
                <p className="text-xs text-muted">{line.variantLabel}</p>
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                  <div className="flex items-center rounded-full border border-line bg-white text-xs">
                    <button
                      type="button"
                      aria-label="Adet azalt"
                      className="px-3 py-1.5 text-muted"
                      onClick={() => updateQuantity(line.variantId, line.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label="Adet artır"
                      className="px-3 py-1.5 text-muted"
                      onClick={() => updateQuantity(line.variantId, line.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatMoney(line.unitPrice * line.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => removeLine(line.variantId)}
                      className="text-[11px] uppercase tracking-[0.1em] text-muted underline decoration-line underline-offset-2 hover:text-charcoal"
                    >
                      Kaldır
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-4 rounded-2xl border border-line bg-white p-4">
          <label htmlFor="coupon" className="field-label">İndirim kodu</label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={couponInput}
              onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
              placeholder="İndirim kodu"
              autoComplete="off"
              className="input"
            />
            <button
              type="button"
              className="btn-outline shrink-0"
              onClick={() => {
                setCouponCode(couponInput.trim());
                setQuote(null);
              }}
            >
              Uygula
            </button>
          </div>
          {couponCode ? (
            <p className="mt-2 text-xs text-muted">
              <button
                type="button"
                className="underline decoration-line underline-offset-2"
                onClick={() => {
                  setCouponCode("");
                  setCouponInput("");
                }}
              >
                {couponCode} kodunu kaldır
              </button>
            </p>
          ) : null}
        </div>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-xl">Sipariş özeti</h2>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Ara toplam</dt>
            <dd>{formatMoney(quote?.subtotal ?? subtotal)}</dd>
          </div>
          {quote && quote.discountTotal > 0 ? (
            <div className="flex justify-between text-success">
              <dt>İndirim {quote.couponCode ? `(${quote.couponCode})` : ""}</dt>
              <dd>−{formatMoney(quote.discountTotal)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-muted">Kargo</dt>
            <dd>{quote ? (quote.shippingTotal === 0 ? "Ücretsiz" : formatMoney(quote.shippingTotal)) : "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Genel toplam</dt>
            <dd>{quote ? formatMoney(quote.grandTotal) : formatMoney(subtotal)}</dd>
          </div>
          <p className="text-[11px] text-muted">
            {quote ? `KDV dahil (${formatMoney(quote.taxTotal)} vergi)` : "Vergi hesaplanıyor…"}
          </p>
        </dl>

        {issues.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>• {issue.message}</li>
            ))}
          </ul>
        ) : null}

        {error ? <p className="mt-3 text-xs text-red-700">{error}</p> : null}

        <Link
          href="/odeme"
          aria-disabled={loading || issues.some((issue) => issue.code !== "coupon")}
          className={`btn-dark mt-5 w-full ${issues.some((issue) => issue.code !== "coupon") ? "pointer-events-none opacity-50" : ""}`}
        >
          Ödemeye geç
        </Link>
        <Link href="/arama" className="mt-2 block text-center text-[11px] text-muted underline underline-offset-4">
          Alışverişe devam et
        </Link>
        <p className="mt-4 text-[11px] leading-relaxed text-muted">
          Fiyatlar sipariş anında sunucuda yeniden hesaplanır. Ödeme yöntemleri ve tutar ödeme adımında açıkça gösterilir; kart bilgisi sitemizde saklanmaz.
        </p>
      </aside>
    </div>
  );
}
