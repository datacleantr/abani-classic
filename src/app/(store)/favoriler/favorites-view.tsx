"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useFavorites } from "@/components/favorites/favorites-store";
import { ProductCard } from "@/components/store/product-card";
import type { ProductCardData } from "@/lib/product-card-helpers";

type ApiResponse = { ok: true; products: ProductCardData[] } | { ok: false; message: string };

/** Kimlik → kart; `null` = yayında değil / bulunamadı (favorilerden budanır). */
type Loaded = Record<string, ProductCardData | null>;

export function FavoritesView() {
  const { ids, isReady, remove } = useFavorites();
  const [loaded, setLoaded] = useState<Loaded>({});
  const [failed, setFailed] = useState(false);
  const [announcement, setAnnouncement] = useState({ text: "", seq: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const emptyHeadingRef = useRef<HTMLParagraphElement>(null);

  // Yalnızca henüz yüklenmemiş kimlikler istenir; favoriden çıkarılan ürün listeden anında düşer.
  const pending = useMemo(() => ids.filter((id) => !(id in loaded)), [ids, loaded]);
  const pendingKey = pending.join(",");

  useEffect(() => {
    if (!isReady || pendingKey === "" || failed) return;
    const controller = new AbortController();
    const requested = pendingKey.split(",");
    fetch(`/api/products?ids=${encodeURIComponent(pendingKey)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        const body = (await response.json()) as ApiResponse;
        if (!response.ok || !body.ok) throw new Error("load_failed");
        const byId = new Map(body.products.map((product) => [product.id, product]));
        setLoaded((current) => {
          const next = { ...current };
          for (const id of requested) next[id] = byId.get(id) ?? null;
          return next;
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [isReady, pendingKey, failed]);

  // Yayından kalkmış / bulunamayan ürünleri favorilerden buda: header sayacı listeyle tutarlı kalsın.
  const unavailable = useMemo(() => ids.filter((id) => loaded[id] === null), [ids, loaded]);
  useEffect(() => {
    for (const id of unavailable) remove(id);
  }, [unavailable, remove]);

  const products = ids
    .map((id) => loaded[id])
    .filter((product): product is ProductCardData => Boolean(product));
  const loading = !isReady || (pending.length > 0 && !failed);

  /**
   * Kart favoriden çıkarılınca kart DOM'dan kalkar; odak kaybolmasın diye aynı sıradaki (yoksa bir
   * önceki) kartın favori düğmesine, liste boşaldıysa başlığa taşınır ve çıkarma duyurulur.
   */
  function onFavoriteToggle(product: ProductCardData, index: number, isFavorite: boolean) {
    if (isFavorite) return;
    setAnnouncement((current) => ({
      text: `${product.name} favorilerden çıkarıldı.`,
      seq: current.seq + 1,
    }));
    window.requestAnimationFrame(() => {
      const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
        "[data-favorite-card] button[aria-pressed]",
      );
      const target = buttons?.[index] ?? buttons?.[index - 1];
      (target ?? headingRef.current ?? emptyHeadingRef.current)?.focus();
    });
  }

  const liveRegion = (
    <p role="status" aria-live="polite" className="sr-only">
      {announcement.text}
      {announcement.seq % 2 === 1 ? " " : ""}
    </p>
  );

  let content: ReactNode;
  if (failed && products.length === 0) {
    content = (
      <div role="alert" className="mt-10 border border-line bg-white p-8 text-center">
        <p className="font-display text-xl">Favorileriniz şu anda yüklenemedi.</p>
        <p className="mt-2 text-sm text-muted">Bağlantınızı kontrol edip yeniden deneyin.</p>
        <button type="button" onClick={() => setFailed(false)} className="btn-outline mt-5 rounded-sm">
          Yeniden dene
        </button>
      </div>
    );
  } else if (loading && products.length === 0) {
    content = (
      <div aria-busy="true" className="mt-8">
        <p role="status" className="sr-only">
          Favorileriniz yükleniyor…
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: Math.min(Math.max(ids.length, 4), 8) }).map((_, index) => (
            <div key={index} aria-hidden="true">
              <div className="aspect-[4/5] w-full animate-pulse bg-ivory-deep" />
              <div className="mt-3 h-3 w-1/3 animate-pulse bg-ivory-deep" />
              <div className="mt-2 h-4 w-4/5 animate-pulse bg-ivory-deep" />
              <div className="mt-2 h-4 w-1/4 animate-pulse bg-ivory-deep" />
            </div>
          ))}
        </div>
      </div>
    );
  } else if (products.length === 0) {
    content = (
      <div className="mt-10 border border-dashed border-line bg-white p-8 text-center sm:p-12">
        <p ref={emptyHeadingRef} tabIndex={-1} className="font-display text-2xl focus:outline-none">
          Favori listeniz boş
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          Beğendiğiniz ürünlerdeki kalp simgesine dokunarak onları burada toplayabilirsiniz. Favorileriniz bu
          tarayıcıda saklanır.
        </p>
        <Link href="/arama" className="btn-dark mt-6 rounded-sm bg-navy hover:bg-navy-soft">
          Koleksiyonu keşfet
        </Link>
      </div>
    );
  } else {
    content = (
      <section aria-labelledby="favori-urunler" className="mt-8">
        <h2 id="favori-urunler" ref={headingRef} tabIndex={-1} className="sr-only">
          Favori ürünler
        </h2>
        <p className="text-xs text-muted">{products.length} ürün</p>
        <div ref={listRef} className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <div key={product.id} data-favorite-card>
              <ProductCard
                product={product}
                priority={index < 4}
                onFavoriteToggle={(isFavorite) => onFavoriteToggle(product, index, isFavorite)}
              />
            </div>
          ))}
        </div>
        {failed ? (
          <p role="alert" className="mt-6 text-sm text-muted">
            Bazı favoriler yüklenemedi.{" "}
            <button type="button" onClick={() => setFailed(false)} className="link-quiet">
              Yeniden dene
            </button>
          </p>
        ) : null}
      </section>
    );
  }

  // Duyuru bölgesi tüm durumlarda aynı yerde kalır (liste boşalınca da son duyuru okunur).
  return (
    <>
      {liveRegion}
      {content}
    </>
  );
}
