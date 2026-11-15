import Link from "next/link";

import type { ProductCardView } from "@/lib/catalog";
import { formatMoney } from "@/lib/format";

export function ProductCard({ product, priority = false }: { product: ProductCardView; priority?: boolean }) {
  const soldOut = product.stockTotal === 0;
  return (
    <article className="group flex h-full flex-col">
      <Link
        href={`/urun/${product.slug}`}
        className="relative block overflow-hidden rounded-2xl border border-line/70 bg-ivory-deep"
        aria-label={product.name}
      >
        <div className="aspect-[4/5] w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-0"
          />
          {product.hoverImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.hoverImage}
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.04] group-hover:opacity-100"
            />
          ) : null}
        </div>
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.discountPercent > 0 ? (
            <span className="badge border-charcoal bg-charcoal text-ivory">%{product.discountPercent}</span>
          ) : null}
          {product.isNew ? (
            <span className="badge border-sand/60 bg-ivory/90 text-charcoal">Yeni</span>
          ) : null}
          {product.packInfo ? (
            <span className="badge border-line bg-white/90 text-muted">{product.packInfo}</span>
          ) : null}
        </div>
        {soldOut ? (
          <span className="absolute bottom-3 left-3 badge border-line bg-white/95 text-muted">
            Stokta yok
          </span>
        ) : null}
      </Link>

      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {product.brandName}
        </p>
        <h3 className="mt-1 text-[15px] leading-snug">
          <Link href={`/urun/${product.slug}`} className="transition hover:text-sand">
            {product.name}
          </Link>
        </h3>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold">{formatMoney(product.price)}</span>
          {product.listPrice > product.price ? (
            <span className="text-xs text-muted line-through">{formatMoney(product.listPrice)}</span>
          ) : null}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
          {product.reviewCount > 0 ? (
            <span aria-label={`${product.rating} yıldız, ${product.reviewCount} yorum`}>
              ★ {product.rating.toFixed(1)} ({product.reviewCount})
            </span>
          ) : (
            <span>Yeni seçki</span>
          )}
          {product.sizes.length > 0 ? (
            <span className="truncate">· {product.sizes.slice(0, 5).join(" / ")}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
