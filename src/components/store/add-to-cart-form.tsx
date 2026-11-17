"use client";

import { useMemo, useState } from "react";

import { useCart } from "@/components/cart/cart-store";
import type { ProductCardView } from "@/lib/catalog";
import { cn, formatMoney } from "@/lib/format";

export function AddToCartForm({ product }: { product: ProductCardView }) {
  const { addLine } = useCart();
  const availableColors = product.colors.length > 0 ? product.colors : ["Standart"];
  const [color, setColor] = useState(
    availableColors.find((candidate) =>
      product.variants.some((variant) => variant.color === candidate && variant.stock > 0),
    ) ?? availableColors[0],
  );
  const sizesForColor = useMemo(() => {
    return product.variants
      .filter((variant) => (product.colors.length > 0 ? variant.color === color : true))
      .filter((variant) => variant.size);
  }, [product.variants, product.colors.length, color]);

  const initialSize =
    sizesForColor.find((variant) => variant.stock > 0)?.size ?? sizesForColor[0]?.size ?? null;
  const [size, setSize] = useState<string | null>(initialSize);
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState<string | null>(null);

  const variantsForSize = product.variants.filter(
    (variant) => (product.colors.length > 0 ? variant.color === color : true) && variant.size === size,
  );
  const selectedVariant = variantsForSize[0] ?? product.variants[0] ?? null;
  const price = selectedVariant?.price ?? product.price;
  const stock = selectedVariant?.stock ?? 0;

  function handleSubmit() {
    if (!selectedVariant) {
      setMessage("Lütfen bir beden seçin.");
      return;
    }
    if (stock <= 0) {
      setMessage("Seçtiğiniz varyant stokta yok.");
      return;
    }
    const result = addLine({
      variantId: selectedVariant.id,
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      brandName: product.brandName,
      variantLabel: [selectedVariant.color, selectedVariant.size]
        .filter(Boolean)
        .join(" / "),
      image: product.image,
      unitPrice: price,
      quantity: Math.min(quantity, stock),
      maxQuantity: stock,
    });
    setMessage(result.limited ? `En fazla ${result.maxQuantity} adet eklenebilir.` : null);
  }

  return (
    <div className="mt-6">
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-semibold tracking-tight">{formatMoney(price)}</span>
        {product.listPrice > price ? (
          <>
            <span className="text-sm text-muted line-through">{formatMoney(product.listPrice)}</span>
            <span className="badge border-navy/20 bg-navy-tint text-navy">
              %{Math.round(((product.listPrice - price) / product.listPrice) * 100)} avantaj
            </span>
          </>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted">KDV dahil. Kargo ödeme adımında hesaplanır.</p>

      {product.colors.length > 0 ? (
        <div className="mt-5">
          <p className="field-label">Renk: <span className="text-charcoal">{color}</span></p>
          <div className="flex flex-wrap gap-2">
            {availableColors.map((candidate) => {
              const variantForColor = product.variants.find((variant) => variant.color === candidate);
              const soldOut = variantForColor ? variantForColor.stock === 0 : false;
              return (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={candidate === color}
                  onClick={() => {
                    setColor(candidate);
                    const nextSizes = product.variants.filter((variant) => variant.color === candidate);
                    const nextSize = nextSizes.find((variant) => variant.stock > 0) ?? nextSizes[0];
                    setSize(nextSize?.size ?? null);
                    setQuantity(1);
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs transition",
                    candidate === color
                      ? "border-charcoal bg-charcoal text-ivory"
                      : "border-line bg-white text-charcoal hover:border-charcoal",
                    soldOut && "opacity-50",
                  )}
                >
                  {candidate}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {sizesForColor.length > 0 ? (
        <div className="mt-4">
          {/* Beden tablosu: ölçüler marka bazında doğrulanınca eklenecek (docs/OPEN_DECISIONS.md). */}
          <p className="field-label">Beden</p>
          <div className="flex flex-wrap gap-2">
            {sizesForColor.map((variant) => (
              <button
                key={variant.id}
                type="button"
                aria-pressed={variant.size === size}
                onClick={() => {
                  setSize(variant.size);
                  setQuantity(1);
                }}
                className={cn(
                  "min-w-12 rounded-lg border px-3 py-2 text-xs transition",
                  variant.size === size
                    ? "border-charcoal bg-charcoal text-ivory"
                    : "border-line bg-white text-charcoal hover:border-charcoal",
                  variant.stock === 0 && "border-dashed text-muted/60 line-through",
                )}
              >
                {variant.size}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center gap-4">
        <div className="flex items-center rounded-full border border-line bg-white">
          <button
            type="button"
            aria-label="Adet azalt"
            className="px-3 py-2 text-sm text-muted hover:text-charcoal"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span aria-live="polite" className="min-w-6 text-center text-sm">
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Adet artır"
            className="px-3 py-2 text-sm text-muted hover:text-charcoal"
            onClick={() => setQuantity((q) => Math.min(Math.max(1, stock), q + 1))}
          >
            +
          </button>
        </div>
        <p className="text-xs text-muted">
          {stock > 0 ? (
            <>
              <span className="text-success">●</span> Stokta {stock} adet
            </>
          ) : (
            <span className="text-red-700">Seçilen varyant tükenmiş</span>
          )}
        </p>
      </div>

      <button type="button" onClick={handleSubmit} disabled={stock === 0} className="btn-dark mt-5 w-full">
        Sepete ekle
      </button>
      {message ? (
        <p role="status" className="mt-3 rounded-lg border border-line bg-white px-3 py-2 text-xs text-muted">
          {message}
        </p>
      ) : null}

      <ul className="mt-5 grid gap-2 text-xs text-muted">
        <li>· Fiyatlara KDV dahildir; kargo ücreti ödeme adımında gösterilir.</li>
        <li>· Ödeme yöntemleri ve tutar ödeme adımında açıkça gösterilir; kart bilgisi sitemizde saklanmaz.</li>
      </ul>
    </div>
  );
}
