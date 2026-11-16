"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useCart } from "@/components/cart/cart-store";
import { formatMoney } from "@/lib/format";
import type { Quote } from "@/lib/pricing";

type Prefill = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

const inputFields = [
  { name: "firstName", label: "Ad", autoComplete: "given-name", required: true },
  { name: "lastName", label: "Soyad", autoComplete: "family-name", required: true },
  { name: "email", label: "E-posta", type: "email", autoComplete: "email", required: true },
  { name: "phone", label: "Telefon", type: "tel", autoComplete: "tel", required: true },
] as const;

type PaymentInfo =
  | { available: true; method: "sandbox" | "bank_transfer" }
  | { available: false; message: string };

export function CheckoutForm({ prefill, payment }: { prefill: Prefill; payment: PaymentInfo }) {
  const { lines, couponCode, isReady, clear } = useCart();
  const router = useRouter();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!isReady || lines.length === 0) return;
    const controller = new AbortController();
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
      .then((data: { ok: boolean; quote?: Quote }) => {
        if (data.ok && data.quote) setQuote(data.quote);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [lines, couponCode, isReady]);

  if (!isReady) {
    return <p className="py-16 text-center text-sm text-muted">Ödeme adımı hazırlanıyor…</p>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-line bg-white p-10 text-center">
        <p className="font-display text-2xl">Sepetinizde ürün yok</p>
        <p className="mt-2 text-sm text-muted">Ödeme adımına geçmek için sepetinize ürün ekleyin.</p>
        <Link href="/arama" className="btn-dark mt-6">Koleksiyona git</Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? ""),
      lastName: String(formData.get("lastName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      addressLine: String(formData.get("addressLine") ?? ""),
      district: String(formData.get("district") ?? ""),
      city: String(formData.get("city") ?? ""),
      postalCode: String(formData.get("postalCode") ?? ""),
      note: String(formData.get("note") ?? ""),
      couponCode: couponCode || undefined,
      marketingConsent: formData.get("marketingConsent") === "on",
      items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        orderNumber?: string;
        next?: string;
        fieldErrors?: Record<string, string[]>;
      };
      if (!data.ok || !data.next) {
        setError(data.message ?? "Sipariş tamamlanamadı.");
        setFieldErrors(data.fieldErrors ?? {});
        setPending(false);
        return;
      }
      clear();
      router.push(data.next);
    } catch {
      setError("Bağlantı hatası. Lütfen tekrar deneyin.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]" noValidate>
      <div className="space-y-4">
        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">İletişim bilgileri</h2>
          <p className="mt-1 text-xs text-muted">Sipariş bildirimleri bu bilgilerle gönderilir.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {inputFields.map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="field-label">
                  {field.label} {field.required ? <span aria-hidden="true">*</span> : null}
                </label>
                <input
                  id={field.name}
                  name={field.name}
                  type={"type" in field ? field.type : "text"}
                  autoComplete={field.autoComplete}
                  required={field.required}
                  defaultValue={prefill[field.name as keyof Prefill]}
                  aria-invalid={Boolean(fieldErrors[field.name])}
                  className="input"
                />
                {fieldErrors[field.name] ? (
                  <p className="mt-1 text-[11px] text-red-700">{fieldErrors[field.name]?.[0]}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">Teslimat adresi</h2>
          <div className="mt-4 grid gap-3">
            <div>
              <label htmlFor="addressLine" className="field-label">Adres *</label>
              <textarea
                id="addressLine"
                name="addressLine"
                rows={3}
                required
                autoComplete="street-address"
                placeholder="Mahalle, sokak, bina ve daire bilgisi"
                aria-invalid={Boolean(fieldErrors.addressLine)}
                className="input"
              />
              {fieldErrors.addressLine ? (
                <p className="mt-1 text-[11px] text-red-700">{fieldErrors.addressLine[0]}</p>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className="field-label">İl *</label>
                <input id="city" name="city" required defaultValue="İstanbul" autoComplete="address-level1" className="input" />
                {fieldErrors.city ? <p className="mt-1 text-[11px] text-red-700">{fieldErrors.city[0]}</p> : null}
              </div>
              <div>
                <label htmlFor="district" className="field-label">İlçe *</label>
                <input id="district" name="district" required autoComplete="address-level2" className="input" />
                {fieldErrors.district ? <p className="mt-1 text-[11px] text-red-700">{fieldErrors.district[0]}</p> : null}
              </div>
              <div>
                <label htmlFor="postalCode" className="field-label">Posta kodu</label>
                <input id="postalCode" name="postalCode" inputMode="numeric" autoComplete="postal-code" className="input" />
              </div>
            </div>
            <div>
              <label htmlFor="note" className="field-label">Sipariş notu</label>
              <input id="note" name="note" placeholder="Kargo için not (opsiyonel)" className="input" />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">Ödeme</h2>
          {!payment.available ? (
            <p role="alert" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {payment.message}
            </p>
          ) : payment.method === "bank_transfer" ? (
            <div className="mt-4 rounded-xl border border-line bg-ivory p-4">
              <p className="text-sm font-medium">Havale / EFT</p>
              <p className="mt-1 text-xs text-muted">
                Siparişi tamamladığınızda hesap bilgileri gösterilir ve ürünleriniz 3 gün boyunca
                sizin için ayrılır. Ödemeniz hesabımıza ulaştığında siparişiniz onaylanır.
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-line bg-ivory p-4">
              <p className="text-sm font-medium">Test ödemesi · Sandbox</p>
              <p className="mt-1 text-xs text-muted">
                Bu ortam geliştirme modunda. Siparişten sonra ödeme sağlayıcı simülasyonu açılır;
                gerçek kart bilgisi istenmez ve hiçbir koşulda saklanmaz.
              </p>
            </div>
          )}

          <label className="mt-4 flex items-start gap-2 text-xs text-muted">
            <input type="checkbox" name="marketingConsent" className="mt-0.5 h-4 w-4 rounded border-line" />
            Kampanya ve yeni seçki bildirimleri almak istiyorum (opsiyonel).
          </label>

          <div className="mt-4 space-y-2 text-[11px] leading-relaxed text-muted">
            <label className="flex items-start gap-2">
              <input type="checkbox" required className="mt-0.5 h-4 w-4 rounded border-line" />
              <span>
                <Link href="/yasal/on-bilgilendirme" className="underline decoration-line underline-offset-2">
                  Ön bilgilendirme formunu
                </Link>{" "}
                ve{" "}
                <Link href="/yasal/mesafeli-satis" className="underline decoration-line underline-offset-2">
                  mesafeli satış sözleşmesini
                </Link>{" "}
                okudum, onaylıyorum.
              </span>
            </label>
          </div>
        </section>
      </div>

      <aside className="h-fit rounded-2xl border border-line bg-white p-5 lg:sticky lg:top-28">
        <h2 className="text-lg">Sipariş özeti</h2>
        <ul className="mt-3 divide-y divide-line/70">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-3 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={line.image} alt={line.productName} className="h-16 w-14 rounded-md border border-line object-cover" />
              <div className="flex-1 text-xs">
                <p className="line-clamp-2">{line.productName}</p>
                <p className="text-muted">{line.variantLabel} · {line.quantity} adet</p>
              </div>
              <span className="text-xs">{formatMoney(line.unitPrice * line.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Ara toplam</dt>
            <dd>{formatMoney(quote?.subtotal ?? 0)}</dd>
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
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Genel toplam</dt>
            <dd>{quote ? formatMoney(quote.grandTotal) : "—"}</dd>
          </div>
        </dl>

        {quote && quote.issues.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            {quote.issues.map((issue) => (
              <li key={`${issue.code}-${issue.message}`}>• {issue.message}</li>
            ))}
          </ul>
        ) : null}

        {error ? (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={pending || !payment.available} className="btn-dark mt-4 w-full">
          {pending ? "Sipariş oluşturuluyor…" : "Siparişi tamamla"}
        </button>
        <Link href="/sepet" className="mt-2 block text-center text-[11px] text-muted underline underline-offset-4">
          Sepeti düzenle
        </Link>
      </aside>
    </form>
  );
}
