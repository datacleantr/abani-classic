"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { useCart } from "@/components/cart/cart-store";
import { useFavorites } from "@/components/favorites/favorites-store";
import { cn, formatMoney } from "@/lib/format";
import {
  chooseColor,
  chooseSize,
  colorOptions,
  initialChoice,
  needsVariantChoice,
  packOptions,
  resolveVariant,
  sellableVariants,
  sizeOptions,
  variantLabel,
  type ProductCardData,
  type VariantChoice,
} from "@/lib/product-card-helpers";

/* -------------------------------------------------------------------------- */
/* Favori düğmesi                                                              */
/* -------------------------------------------------------------------------- */

export function FavoriteButton({
  productId,
  productName,
  className,
  onToggle,
}: {
  productId: string;
  productName: string;
  className?: string;
  /** Basıldıktan sonra çağrılır; argüman yeni durumdur (true = favoride). */
  onToggle?: (isFavorite: boolean) => void;
}) {
  const { isReady, has, toggle } = useFavorites();
  // localStorage okunana kadar nötr (basılı değil, devre dışı) — sunucu HTML'i ile uyumlu.
  const pressed = isReady && has(productId);

  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={`Favori: ${productName}`}
      title={pressed ? "Favorilerden çıkar" : "Favorilere ekle"}
      disabled={!isReady}
      onClick={() => {
        toggle(productId);
        onToggle?.(!pressed);
      }}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line/80 bg-white/90 text-charcoal backdrop-blur-[2px] transition hover:border-charcoal disabled:cursor-default",
        pressed && "border-brand-red text-brand-red",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-[18px] w-[18px]"
        fill={pressed ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
      >
        <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.6 7.6 3.9 4.5 7.2 4.5c2 0 3.6 1.1 4.8 2.8 1.2-1.7 2.8-2.8 4.8-2.8 3.3 0 5.6 3.1 4.4 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
      </svg>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Hızlı sepete ekleme                                                         */
/* -------------------------------------------------------------------------- */

export type QuickAddProduct = Pick<ProductCardData, "id" | "slug" | "name" | "brandName" | "image" | "variants">;

function OptionGroup<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: string;
  name: string;
  options: { value: T; label: string; available: boolean }[];
  value: T | null;
  onChange: (value: T) => void;
}) {
  if (options.length === 0) return null;
  return (
    <fieldset className="mt-2 first:mt-0">
      <legend className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{legend}</legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <label
            key={String(option.value) || "standart"}
            className={cn(
              "relative inline-flex min-h-8 min-w-9 cursor-pointer items-center justify-center rounded-sm border border-line bg-white px-2 text-[11px] text-charcoal transition",
              "hover:border-charcoal has-[:checked]:border-navy has-[:checked]:bg-navy has-[:checked]:text-white",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-red",
              !option.available && "cursor-not-allowed border-dashed text-muted/70 line-through hover:border-line",
            )}
          >
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={value === option.value}
              disabled={!option.available}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
            {!option.available ? <span className="sr-only"> (stokta yok)</span> : null}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/** Ekran okuyucu için düğme adına ürün adını ekler ("Sepete ekle: Ürün adı"). */
function ProductNameSuffix({ name }: { name: string }) {
  return <span className="sr-only">: {name}</span>;
}

export function QuickAddToCart({ product }: { product: QuickAddProduct }) {
  const { addLine, isReady } = useCart();
  const uid = useId();
  const panelId = `${uid}-secim`;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<VariantChoice>(() => initialChoice(product.variants));
  // Aynı mesaj tekrarlandığında da duyurulsun diye her duyuruda değişen görünmez ek kullanılır.
  const [status, setStatus] = useState({ text: "", seq: 0 });

  const sellable = sellableVariants(product.variants);
  const needsChoice = needsVariantChoice(product.variants);
  const colors = colorOptions(product.variants);
  const colorKey = colors.length > 0 ? choice.color : null;
  const sizes = sizeOptions(product.variants, colorKey);
  const packs = packOptions(product.variants, colorKey, sizes.length > 0 ? choice.size : null);
  const selected = resolveVariant(product.variants, choice);

  useEffect(() => {
    if (!open) return;
    const firstEnabled = panelRef.current?.querySelector<HTMLInputElement>(
      "input[type=radio]:checked:not(:disabled), input[type=radio]:not(:disabled)",
    );
    firstEnabled?.focus();
  }, [open]);

  function announce(text: string) {
    setStatus((current) => ({ text, seq: current.seq + 1 }));
  }

  function add(variant: QuickAddProduct["variants"][number], opener: HTMLElement | null) {
    const result = addLine(
      {
        variantId: variant.id,
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        brandName: product.brandName,
        variantLabel: variantLabel(variant),
        image: product.image,
        // Yalnızca gösterim içindir; ödeme adımında sunucu fiyatı veritabanından yeniden hesaplar.
        unitPrice: variant.price,
        quantity: 1,
        maxQuantity: variant.stock,
      },
      // Sepet çekmecesi kapanınca odak bu düğmeye döner.
      opener,
    );
    announce(
      result.limited
        ? `En fazla ${result.maxQuantity} adet eklenebilir. ${product.name} sepetinizde ${result.quantity} adet.`
        : `${product.name} sepete eklendi.`,
    );
  }

  function close() {
    setOpen(false);
    toggleRef.current?.focus();
  }

  function onPanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  }

  const statusRegion = (
    <span role="status" className="sr-only">
      {status.text}
      {status.seq % 2 === 1 ? "\u00a0" : ""}
    </span>
  );

  if (sellable.length === 0) {
    return (
      <button type="button" disabled className="btn-quiet w-full px-3 py-2.5 text-[11px]">
        Stokta yok
        <ProductNameSuffix name={product.name} />
      </button>
    );
  }

  if (!needsChoice) {
    return (
      <>
        <button
          type="button"
          disabled={!isReady}
          onClick={(event) => add(sellable[0], event.currentTarget)}
          className="btn-dark w-full rounded-sm bg-navy px-3 py-2.5 text-[11px] hover:bg-navy-soft"
        >
          Sepete ekle
          <ProductNameSuffix name={product.name} />
        </button>
        {statusRegion}
      </>
    );
  }

  return (
    <div>
      <button
        ref={toggleRef}
        type="button"
        disabled={!isReady}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close() : setOpen(true))}
        className={cn(
          "btn-dark w-full rounded-sm px-3 py-2.5 text-[11px]",
          open ? "bg-charcoal" : "bg-navy hover:bg-navy-soft",
        )}
      >
        {open ? "Seçimi kapat" : "Sepete ekle"}
        <ProductNameSuffix name={product.name} />
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="group"
          aria-label={`${product.name} için seçenek`}
          onKeyDown={onPanelKeyDown}
          className="mt-2 border border-line bg-white p-2.5"
        >
          <OptionGroup
            legend="Renk"
            name={`${uid}-renk`}
            options={colors}
            value={choice.color}
            onChange={(color) =>
              setChoice((current) => chooseColor(product.variants, color, current.size, current.pack))
            }
          />
          <OptionGroup
            legend="Beden"
            name={`${uid}-beden`}
            options={sizes}
            value={choice.size}
            onChange={(size) =>
              setChoice((current) => chooseSize(product.variants, current.color ?? "", size, current.pack))
            }
          />
          <OptionGroup
            legend="Paket"
            name={`${uid}-paket`}
            options={packs}
            value={choice.pack}
            onChange={(pack) => setChoice((current) => ({ ...current, pack }))}
          />
          <p className="mt-2 text-[11px] text-muted" aria-live="polite">
            {selected
              ? `${variantLabel(selected) || "Standart"} · ${formatMoney(selected.price)}`
              : "Bu seçim stokta yok."}
          </p>
          <button
            type="button"
            disabled={!selected}
            onClick={() => {
              if (!selected) return;
              setOpen(false);
              add(selected, toggleRef.current);
            }}
            className="btn-dark mt-2 w-full rounded-sm bg-navy px-3 py-2 text-[11px] hover:bg-navy-soft"
          >
            Seçimi sepete ekle
            <ProductNameSuffix name={product.name} />
          </button>
        </div>
      ) : null}
      {statusRegion}
    </div>
  );
}
