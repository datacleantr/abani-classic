import type { Metadata } from "next";
import Link from "next/link";

import { formatDate, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";
import { getOrderByNumber } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sipariş takibi",
  description: "Sipariş numaranız ve e-posta adresinizle sipariş durumunuzu sorgulayın.",
};

type PageProps = { searchParams: Promise<{ no?: string; eposta?: string }> };

export default async function OrderTrackingPage({ searchParams }: PageProps) {
  const { no, eposta } = await searchParams;
  const order = no ? await getOrderByNumber(no.trim().toUpperCase()) : null;
  const verified = Boolean(
    order && eposta && order.email.toLowerCase() === eposta.trim().toLowerCase(),
  );

  return (
    <div className="container-page max-w-2xl py-12">
      <p className="eyebrow">Sipariş takibi</p>
      <h1 className="mt-2 text-[32px]">Siparişiniz nerede?</h1>
      <p className="mt-2 text-sm text-muted">
        Sipariş numaranızı ve siparişte kullandığınız e-posta adresini girin. Güvenlik için her iki
        bilgi birlikte doğrulanır.
      </p>

      <form method="get" className="mt-6 grid gap-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="no" className="field-label">Sipariş numarası</label>
          <input id="no" name="no" defaultValue={no ?? ""} placeholder="AB-2602-1041" required className="input" />
        </div>
        <div>
          <label htmlFor="eposta" className="field-label">E-posta</label>
          <input id="eposta" name="eposta" type="email" defaultValue={eposta ?? ""} required className="input" />
        </div>
        <button type="submit" className="btn-dark self-end">Sorgula</button>
      </form>

      {no && !verified ? (
        <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bu bilgilerle eşleşen bir sipariş bulunamadı. Lütfen sipariş numarasını ve e-posta adresini
          kontrol edin.
        </p>
      ) : null}

      {order && verified ? (
        <div className="mt-6 rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{order.orderNumber}</p>
              <p className="mt-1 font-display text-xl">{ORDER_STATUS_LABELS[order.status] ?? order.status}</p>
            </div>
            <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line"}`}>
              {order.items.length} parça
            </span>
          </div>
          <p className="mt-2 text-xs text-muted">Sipariş tarihi: {formatDate(order.createdAt, true)}</p>
          {order.trackingNumber ? (
            <p className="mt-2 text-xs text-muted">
              {order.shippingCarrier} · Takip no: {order.trackingNumber}
            </p>
          ) : null}
          <Link href={`/siparis/${order.orderNumber}`} className="btn-outline mt-4">
            Sipariş detayı
          </Link>
        </div>
      ) : null}
    </div>
  );
}
