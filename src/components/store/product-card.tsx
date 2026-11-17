import Link from "next/link";

import { formatMoney } from "@/lib/format";
import {
  cardPricing,
  packLabel,
  sellableVariants,
  summarizeSizes,
  type ProductCardData,
} from "@/lib/product-card-helpers";

import { FavoriteButton, QuickAddToCart } from "./product-card-actions";

/**
 * Ürün kartı. Sunucu bileşeni olarak da istemci ağacında da (favoriler) kullanılabilir;
 * etkileşimli parçalar (favori, sepete ekle) `product-card-actions.tsx` içindedir.
 */
export function ProductCard({
  product,
  priority = false,
  onFavoriteToggle,
}: {
  product: ProductCardData;
  /** İlk ekrandaki kartlar için görseli hemen yükler. */
  priority?: boolean;
  /** Yalnızca istemci ağacında (favoriler): favori düğmesine basıldıktan sonra yeni durum. */
  onFavoriteToggle?: (isFavorite: boolean) => void;
}) {
  const soldOut = sellableVariants(product.variants).length === 0;
  // Gösterilen fiyat, üstü çizili fiyat ve indirim oranı aynı tabandan (cardPricing).
  const { price: minPrice, priceVaries, compareAtPrice, discountPercent } = cardPricing(product);
  const hasRealDiscount = compareAtPrice !== null;
  const sizes = summarizeSizes(product.variants.filter((v) => v.active).map((v) => v.size));
  const pack = packLabel(product.packQuantity) ?? product.packInfo;
  const href = `/urun/${product.slug}`;

  return (
    <article className="group flex h-full flex-col">
      <div className="relative">
        <Link
          href={href}
          className="relative block overflow-hidden border border-line/70 bg-ivory-deep"
          aria-hidden="true"
          tabIndex={-1}
        >
          <div className="aspect-[4/5] w-full overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              loading={priority ? "eager" : "lazy"}
              decoding="async"
              className={
                product.hoverImage
                  ? "h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-0"
                  : "h-full w-full object-cover transition duration-700 ease-out group-hover:scale-[1.03]"
              }
            />
            {product.hoverImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={product.hoverImage}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-700 ease-out group-hover:scale-[1.03] group-hover:opacity-100"
              />
            ) : null}
          </div>
        </Link>

        <div className="pointer-events-none absolute left-2 top-2 flex flex-col items-start gap-1">
          {hasRealDiscount ? (
            <span className="bg-navy px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
              %{discountPercent} indirim
            </span>
          ) : null}
          {pack ? (
            <span className="border border-line bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-charcoal">
              {pack}
            </span>
          ) : null}
          {product.isNew ? (
            <span className="border border-navy/30 bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-navy">
              Yeni
            </span>
          ) : null}
        </div>

        <FavoriteButton
          productId={product.id}
          productName={product.name}
          onToggle={onFavoriteToggle}
          className="absolute right-2 top-2"
        />

        {soldOut ? (
          <span className="pointer-events-none absolute bottom-2 left-2 border border-line bg-white/95 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Stokta yok
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-1 flex-col">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          <Link href={`/markalar/${product.brandSlug}`} className="hover:text-charcoal">
            {product.brandName}
          </Link>
        </p>
        <h3 className="mt-1 line-clamp-2 font-sans text-[14px] leading-snug tracking-normal sm:text-[15px]">
          <Link href={href} className="transition hover:text-brand-red">
            {product.name}
          </Link>
        </h3>

        <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-semibold text-charcoal">
            {formatMoney(minPrice)}
            {priceVaries ? <span className="ml-0.5 text-[11px] font-normal text-muted">{"'den başlayan"}</span> : null}
          </span>
          {hasRealDiscount ? (
            <span className="text-xs text-muted line-through">
              <span className="sr-only">Önceki fiyat: </span>
              {formatMoney(compareAtPrice)}
            </span>
          ) : null}
        </p>

        {sizes ? (
          <p className="mt-1 truncate text-[11px] text-muted" title={sizes.full}>
            <span className="sr-only">Bedenler: {sizes.full}</span>
            <span aria-hidden="true">Beden {sizes.short}</span>
          </p>
        ) : null}

        {product.reviewCount > 0 ? (
          <p className="mt-1 text-[11px] text-muted">
            <span aria-hidden="true">★ {product.rating.toFixed(1)} ({product.reviewCount})</span>
            <span className="sr-only">
              {product.rating.toFixed(1)} yıldız, {product.reviewCount} müşteri yorumu
            </span>
          </p>
        ) : null}

        <div className="mt-auto pt-3">
          <QuickAddToCart
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              brandName: product.brandName,
              image: product.image,
              variants: product.variants,
            }}
          />
        </div>
      </div>
    </article>
  );
}
