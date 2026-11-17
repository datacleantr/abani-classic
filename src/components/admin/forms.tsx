"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  addVariantAction,
  adjustStockAction,
  applyImportAction,
  resolveImportItemAction,
  saveProductAction,
  toggleReviewAction,
  transitionOrderAction,
  uploadImportAction,
  type AdminActionResult,
} from "@/app/actions/admin";
import { adminLoginAction } from "@/app/actions/auth";
import type { ActionResult } from "@/lib/auth";

function Message({ state }: { state: AdminActionResult | ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={`mt-3 rounded-lg border px-3 py-2 text-xs ${
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {state.message}
    </p>
  );
}

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    adminLoginAction,
    null,
  );

  return (
    <form action={formAction} className="mt-6 space-y-3 rounded-2xl border border-line bg-white p-6">
      <div>
        <label htmlFor="admin-email" className="field-label">Kurumsal e-posta</label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="input"
        />
      </div>
      <div>
        <label htmlFor="admin-password" className="field-label">Parola</label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <button type="submit" disabled={pending} className="btn-dark w-full">
        {pending ? "Doğrulanıyor…" : "Panele gir"}
      </button>
      {state && !state.ok ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {state.message}
        </p>
      ) : null}
      {/* Seed'deki demo hesaplar yalnızca yerel geliştirmede hatırlatılır; üretim derlemesinde görünmez. */}
      {process.env.NODE_ENV === "development" ? (
        <div className="rounded-lg border border-line bg-ivory px-3 py-2 text-[11px] leading-relaxed text-muted">
          <p className="font-medium text-charcoal">Yerel geliştirme — seed demo hesapları</p>
          <p>Giriş bilgileri seed betiğinde: src/db/seed.ts</p>
        </div>
      ) : null}
    </form>
  );
}

type ProductFormProps = {
  options: { brands: { id: string; name: string }[]; categories: { id: string; name: string }[] };
  product?: {
    id: string;
    name: string;
    slug: string;
    brandId: string | null;
    categoryId: string | null;
    modelCode: string | null;
    shortDescription: string | null;
    description: string | null;
    fabric: string | null;
    care: string | null;
    listPrice: number;
    salePrice: number;
    status: string;
  };
};

export function ProductForm({ options, product }: ProductFormProps) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    saveProductAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok && state.productId && !product) {
      router.push(`/admin/urunler/${state.productId}`);
    }
  }, [state, product, router]);

  return (
    <form action={formAction} className="space-y-4">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      <div className="grid gap-4 rounded-2xl border border-line bg-white p-5 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <label htmlFor="p-name" className="field-label">Ürün adı *</label>
          <input id="p-name" name="name" required defaultValue={product?.name} className="input" />
        </div>
        <div>
          <label htmlFor="p-slug" className="field-label">Slug (URL)</label>
          <input id="p-slug" name="slug" defaultValue={product?.slug} placeholder="abani-essential-boxer" className="input" />
        </div>
        <div>
          <label htmlFor="p-model" className="field-label">Model kodu</label>
          <input id="p-model" name="modelCode" defaultValue={product?.modelCode ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="p-brand" className="field-label">Marka *</label>
          <select id="p-brand" name="brandId" required defaultValue={product?.brandId ?? ""} className="input">
            <option value="">Seçin</option>
            {options.brands.map((brand) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-category" className="field-label">Kategori *</label>
          <select id="p-category" name="categoryId" required defaultValue={product?.categoryId ?? ""} className="input">
            <option value="">Seçin</option>
            {options.categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="p-list" className="field-label">Liste fiyatı (TL) *</label>
          <input
            id="p-list"
            name="listPrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? (product.listPrice / 100).toFixed(2) : ""}
            className="input"
          />
        </div>
        <div>
          <label htmlFor="p-sale" className="field-label">Satış fiyatı (TL) *</label>
          <input
            id="p-sale"
            name="salePrice"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={product ? (product.salePrice / 100).toFixed(2) : ""}
            className="input"
          />
          <p className="mt-1 text-[11px] text-muted">
            Pazaryeri fiyatı satış fiyatı olarak kullanılmaz; maliyet ve marj politikasıyla belirlenir.
          </p>
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="p-short" className="field-label">Kısa açıklama</label>
          <input id="p-short" name="shortDescription" defaultValue={product?.shortDescription ?? ""} className="input" />
        </div>
        <div className="lg:col-span-2">
          <label htmlFor="p-desc" className="field-label">Açıklama</label>
          <textarea id="p-desc" name="description" rows={5} defaultValue={product?.description ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="p-fabric" className="field-label">Kumaş</label>
          <input id="p-fabric" name="fabric" defaultValue={product?.fabric ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="p-care" className="field-label">Bakım</label>
          <input id="p-care" name="care" defaultValue={product?.care ?? ""} className="input" />
        </div>
        {!product ? (
          <>
            <div>
              <label htmlFor="p-sizes" className="field-label">Bedenler (virgülle)</label>
              <input id="p-sizes" name="sizes" defaultValue="S,M,L,XL" className="input" />
            </div>
            <div>
              <label htmlFor="p-colors" className="field-label">Renkler (virgülle)</label>
              <input id="p-colors" name="colors" defaultValue="Antrasit,Ekru" className="input" />
            </div>
          </>
        ) : null}
        <div>
          <label htmlFor="p-status" className="field-label">Durum</label>
          <select id="p-status" name="status" defaultValue={product?.status ?? "draft"} className="input">
            <option value="draft">Taslak</option>
            <option value="review">Onay bekliyor</option>
            <option value="published">Yayında</option>
            <option value="archived">Arşiv</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="btn-dark">
          {pending ? "Kaydediliyor…" : product ? "Değişiklikleri kaydet" : "Ürün oluştur"}
        </button>
        <Link href="/admin/urunler" className="link-quiet">Listeye dön</Link>
      </div>
      <Message state={state} />
    </form>
  );
}

export function StockAdjustForm({ variantId, compact = true }: { variantId: string; compact?: boolean }) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    adjustStockAction,
    null,
  );

  return (
    <form action={formAction} className={compact ? "flex flex-wrap items-center gap-1.5" : "space-y-2"}>
      <input type="hidden" name="variantId" value={variantId} />
      <label className="sr-only" htmlFor={`qty-${variantId}`}>Stok miktarı</label>
      <input
        id={`qty-${variantId}`}
        name="quantity"
        type="number"
        defaultValue={1}
        className="w-16 rounded-md border border-line px-2 py-1 text-xs"
      />
      <label className="sr-only" htmlFor={`note-${variantId}`}>Not</label>
      <input
        id={`note-${variantId}`}
        name="note"
        placeholder="Not"
        className="w-24 rounded-md border border-line px-2 py-1 text-xs"
      />
      <button type="submit" disabled={pending} className="rounded-md border border-charcoal bg-charcoal px-2.5 py-1 text-[11px] text-ivory">
        {pending ? "…" : "Uygula"}
      </button>
      {state ? (
        <span className={`text-[10px] ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</span>
      ) : null}
    </form>
  );
}

export function AddVariantForm({ productId }: { productId: string }) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    addVariantAction,
    null,
  );

  return (
    <form action={formAction} className="mt-4 grid gap-2 rounded-xl border border-line bg-ivory p-4 sm:grid-cols-5">
      <input type="hidden" name="productId" value={productId} />
      <input name="color" placeholder="Renk" required className="input py-1.5 text-xs" aria-label="Renk" />
      <input name="size" placeholder="Beden" required className="input py-1.5 text-xs" aria-label="Beden" />
      <input name="barcode" placeholder="Barkod" className="input py-1.5 text-xs" aria-label="Barkod" />
      <input name="initialStock" type="number" placeholder="Stok" defaultValue={0} className="input py-1.5 text-xs" aria-label="Açılış stoğu" />
      <button type="submit" disabled={pending} className="btn-dark py-1.5 text-[11px]">
        {pending ? "Ekleniyor…" : "Varyant ekle"}
      </button>
      {state ? (
        <p className={`sm:col-span-5 text-[11px] ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

export function OrderStatusForm({ orderId, statuses }: { orderId: string; statuses: { value: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    transitionOrderAction,
    null,
  );

  if (statuses.length === 0) {
    return <p className="text-xs text-muted">Bu sipariş için tanımlı bir sonraki durum yok.</p>;
  }

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <div>
        <label htmlFor="toStatus" className="field-label">Sonraki durum</label>
        <select id="toStatus" name="toStatus" className="input" required>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>{status.label}</option>
          ))}
        </select>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label htmlFor="carrier" className="field-label">Taşıyıcı</label>
          <input id="carrier" name="carrier" placeholder="Aras Kargo" className="input" />
        </div>
        <div>
          <label htmlFor="tracking" className="field-label">Takip no</label>
          <input id="tracking" name="trackingNumber" placeholder="TRK..." className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="note" className="field-label">Operasyon notu</label>
        <input id="note" name="note" className="input" placeholder="Audit log'a yazılır" />
      </div>
      <button type="submit" disabled={pending} className="btn-dark w-full">
        {pending ? "Güncelleniyor…" : "Durumu güncelle"}
      </button>
      <Message state={state} />
    </form>
  );
}

export function ImportUploadForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    uploadImportAction,
    null,
  );

  return (
    <form action={formAction} className="rounded-2xl border border-line bg-white p-5">
      <h2 className="text-lg">Yeni içe aktarım (dry-run)</h2>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        Pazaryeri panelinden aldığınız CSV dışa aktarımını yükleyin. Dosya değiştirilmez, ham veri
        saklanır. Önce yalnızca analiz yapılır; katalog değişikliği için ayrıca onay gerekir.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <div>
          <label htmlFor="sourceKey" className="field-label">Kaynak</label>
          <select id="sourceKey" name="sourceKey" className="input">
            <option value="trendyol">Trendyol</option>
            <option value="hepsiburada">Hepsiburada</option>
            <option value="pazarama">Pazarama</option>
            <option value="n11">n11</option>
            <option value="amazon">Amazon</option>
            <option value="own">Kendi dosyamız</option>
          </select>
        </div>
        <div>
          <label htmlFor="file" className="field-label">CSV dosyası (maks. 2 MB)</label>
          <input id="file" name="file" type="file" accept=".csv,text/csv,text/plain" className="input py-1.5" required />
        </div>
        <button type="submit" disabled={pending} className="btn-dark">
          {pending ? "Analiz ediliyor…" : "Dry-run başlat"}
        </button>
      </div>
      <Message state={state} />
      {state?.ok && state.batchId ? (
        <Link href={`/admin/ice-aktarim/${state.batchId}`} className="mt-2 inline-block text-[11px] underline underline-offset-2">
          Analiz sonucunu görüntüle →
        </Link>
      ) : null}
      <details className="mt-3 text-[11px] text-muted">
        <summary className="cursor-pointer">Beklenen sütunlar</summary>
        <p className="mt-1 leading-relaxed">
          Ürün Adı (zorunlu), Marka (zorunlu), Fiyat (zorunlu), Barkod, SKU, Stok, Kategori, Renk,
          Beden. Virgül veya noktalı virgül ayırıcı desteklenir; formül enjeksiyonu temizlenir.
        </p>
      </details>
    </form>
  );
}

export function ResolveImportItemForm({
  itemId,
  batchId,
  products,
}: {
  itemId: string;
  batchId: string;
  products: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    resolveImportItemAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <input type="hidden" name="itemId" value={itemId} />
      <input type="hidden" name="batchId" value={batchId} />
      <select name="productId" className="w-40 rounded-md border border-line px-2 py-1 text-[11px]" aria-label="Eşleştirilecek ürün">
        <option value="">Ürün seç…</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>{product.name}</option>
        ))}
      </select>
      <div className="flex gap-1">
        <button
          type="submit"
          name="decision"
          value="link"
          disabled={pending}
          className="rounded-md border border-charcoal bg-charcoal px-2 py-1 text-[10px] text-ivory"
        >
          Eşleştir
        </button>
        <button
          type="submit"
          name="decision"
          value="new"
          disabled={pending}
          className="rounded-md border border-line px-2 py-1 text-[10px]"
        >
          Yeni ürün
        </button>
      </div>
      {state ? (
        <p className={`text-[10px] ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
      ) : null}
    </form>
  );
}

export function ApplyImportForm({ batchId, disabled }: { batchId: string; disabled: boolean }) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    applyImportAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="batchId" value={batchId} />
      <button type="submit" disabled={pending || disabled} className="btn-dark">
        {pending ? "Uygulanıyor…" : "Onayla ve kataloğa al"}
      </button>
      <p className="mt-2 text-[11px] text-muted">
        Yeni ürünler taslak/onay bekliyor durumunda oluşturulur; yayına almak için ürün onayı ayrıca
        yapılır. Eşleşen ilanlar ana ürüne bağlanır, kaynak kayıt silinmez.
      </p>
      <Message state={state} />
    </form>
  );
}

export function ReviewToggleForm({ reviewId, approved }: { reviewId: string; approved: boolean }) {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    toggleReviewAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="nextState" value={approved ? "0" : "1"} />
      <button type="submit" disabled={pending} className="rounded-md border border-line px-3 py-1 text-[11px] hover:border-charcoal">
        {pending ? "…" : approved ? "Yayından kaldır" : "Yayınla"}
      </button>
      {state && !state.ok ? <span className="ml-2 text-[10px] text-red-700">{state.message}</span> : null}
    </form>
  );
}
