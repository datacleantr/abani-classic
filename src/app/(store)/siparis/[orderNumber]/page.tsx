import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReturnRequestForm } from "@/components/store/return-request-form";
import { getSessionIdentity } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";
import { getOrderByNumber, tokensMatch } from "@/lib/orders";
import { getBankTransferDetails } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sipariş detayı",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ yeni?: string; t?: string }>;
};

const statusSteps = ["pending_payment", "paid", "processing", "packed", "shipped", "delivered"];


export default async function OrderDetailPage({ params, searchParams }: PageProps) {
  const { orderNumber } = await params;
  const { yeni, t } = await searchParams;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  // Sipariş numarası tahmin edilebilir; sayfa yalnızca sipariş sahibine (oturum),
  // yöneticiye veya tahmin edilemez erişim anahtarını taşıyan bağlantıya açılır.
  const identity = await getSessionIdentity();
  const hasToken = tokensMatch(order.accessToken, t);
  const isOwner =
    (identity?.type === "customer" && identity.customer.email.toLowerCase() === order.email.toLowerCase()) ||
    identity?.type === "admin";
  if (!isOwner && !hasToken) notFound();

  const bank =
    order.paymentMethod === "bank_transfer" && order.status === "pending_payment"
      ? getBankTransferDetails()
      : null;

  const isFailure = order.paymentStatus === "failed";
  const currentIndex = statusSteps.indexOf(order.status);
  const eligibleForReturn = ["delivered", "shipped"].includes(order.status);

  return (
    <div className="container-page py-10">
      {yeni === "1" && order.paymentStatus === "paid" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="eyebrow text-emerald-700">Sipariş alındı</p>
          <h1 className="mt-1 text-2xl text-emerald-900">Teşekkürler, siparişiniz onaylandı.</h1>
          <p className="mt-1 text-sm text-emerald-800">
            Ödeme sağlayıcı bildirimi doğrulandı ve stok kesinleşti. Sipariş numaranız:{" "}
            <strong>{order.orderNumber}</strong>
          </p>
        </div>
      ) : null}

      {bank ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="eyebrow text-amber-800">Ödeme bekleniyor · Havale / EFT</p>
          <p className="mt-1 text-sm text-amber-900">
            Siparişiniz alındı ve ürünleriniz sizin için ayrıldı. Aşağıdaki hesaba{" "}
            <strong>{formatMoney(order.grandTotal)}</strong> gönderin ve açıklamaya sipariş numaranızı
            yazın: <strong>{order.orderNumber}</strong>
          </p>
          <dl className="mt-3 space-y-1 text-sm text-amber-900">
            <div className="flex gap-2"><dt className="w-28 shrink-0">Alıcı</dt><dd>{bank.accountName}</dd></div>
            {bank.bankName ? (
              <div className="flex gap-2"><dt className="w-28 shrink-0">Banka</dt><dd>{bank.bankName}</dd></div>
            ) : null}
            <div className="flex gap-2"><dt className="w-28 shrink-0">IBAN</dt><dd className="break-all font-mono">{bank.iban}</dd></div>
          </dl>
          {order.reservationExpiresAt ? (
            <p className="mt-3 text-xs text-amber-800">
              Ödeme {formatDate(order.reservationExpiresAt, true)} tarihine kadar ulaşmazsa sipariş
              otomatik iptal edilir.
            </p>
          ) : null}
        </div>
      ) : null}

      {isFailure ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="eyebrow text-red-700">Ödeme başarısız</p>
          <p className="mt-1 text-sm text-red-800">
            Ödeme sağlayıcısı işlemi reddetti. Stok rezervasyonu serbest bırakıldı; yeni bir sipariş
            oluşturabilirsiniz.
          </p>
          <Link href="/odeme" className="btn-outline mt-3">Yeniden dene</Link>
        </div>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Sipariş</p>
          <h2 className="mt-2 text-[30px]">{order.orderNumber}</h2>
          <p className="mt-1 text-xs text-muted">{formatDate(order.createdAt, true)}</p>
        </div>
        <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line bg-white text-muted"}`}>
          {ORDER_STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {!isFailure ? (
        <ol className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {statusSteps.map((step, index) => {
            const done = currentIndex >= index && currentIndex !== -1;
            return (
              <li key={step} className="text-center">
                <div className={`mx-auto h-1.5 rounded-full ${done ? "bg-charcoal" : "bg-line"}`} />
                <p className={`mt-2 text-[10px] uppercase tracking-[0.08em] ${done ? "text-charcoal" : "text-muted"}`}>
                  {ORDER_STATUS_LABELS[step] ?? step}
                </p>
              </li>
            );
          })}
        </ol>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-line bg-white">
            <div className="border-b border-line px-5 py-3">
              <h3 className="text-lg">Ürünler</h3>
            </div>
            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 p-4">
                  {item.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="h-20 w-16 rounded-lg border border-line object-cover"
                    />
                  ) : null}
                  <div className="flex-1 text-sm">
                    <p>{item.productName}</p>
                    <p className="text-xs text-muted">
                      {item.variantLabel} · SKU: {item.sku}
                    </p>
                    <p className="mt-1 text-xs text-muted">{item.quantity} adet × {formatMoney(item.unitPrice)}</p>
                  </div>
                  <p className="text-sm font-medium">{formatMoney(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-2 border-t border-line px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Ara toplam</dt>
                <dd>{formatMoney(order.subtotal)}</dd>
              </div>
              {order.discountTotal > 0 ? (
                <div className="flex justify-between text-success">
                  <dt>İndirim {order.couponCode ? `(${order.couponCode})` : ""}</dt>
                  <dd>−{formatMoney(order.discountTotal)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-muted">Kargo</dt>
                <dd>{order.shippingTotal === 0 ? "Ücretsiz" : formatMoney(order.shippingTotal)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 font-semibold">
                <dt>Toplam</dt>
                <dd>{formatMoney(order.grandTotal)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h3 className="text-lg">Sipariş hareketleri</h3>
            <ol className="mt-3 space-y-3">
              {order.history.map((entry) => (
                <li key={entry.id} className="border-l-2 border-line pl-3">
                  <p className="text-sm">{ORDER_STATUS_LABELS[entry.toStatus] ?? entry.toStatus}</p>
                  <p className="text-[11px] text-muted">
                    {formatDate(entry.createdAt, true)} · {entry.actor}
                  </p>
                  {entry.note ? <p className="text-xs text-charcoal/70">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>

          {eligibleForReturn ? (
            <section className="rounded-2xl border border-line bg-white p-5">
              <h3 className="text-lg">İade talebi</h3>
              <p className="mt-1 text-xs text-muted">
                İade koşulları{" "}
                <Link href="/yasal/iade" className="underline decoration-line underline-offset-2">
                  İade ve Değişim
                </Link>{" "}
                sayfasındadır. Talebiniz operasyon ekibi tarafından incelenir.
              </p>
              <ReturnRequestForm
                orderNumber={order.orderNumber}
                accessToken={hasToken ? t : undefined}
                items={order.items.map((item) => ({
                  id: item.id,
                  productName: item.productName,
                  variantLabel: item.variantLabel,
                }))}
              />
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h3 className="text-lg">Teslimat</h3>
            <p className="mt-2 text-charcoal">{order.firstName} {order.lastName}</p>
            <p className="text-xs leading-relaxed text-muted">
              {order.addressLine}
              <br />
              {order.district} / {order.city} {order.postalCode ?? ""}
            </p>
            <p className="mt-2 text-xs text-muted">
              {order.email} · {order.phone}
            </p>
            {order.note ? <p className="mt-2 text-xs text-muted">Not: {order.note}</p> : null}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h3 className="text-lg">Kargo ve ödeme</h3>
            <dl className="mt-2 space-y-1.5 text-xs text-muted">
              <div className="flex justify-between">
                <dt>Ödeme</dt>
                <dd>
                  {{ paid: "Ödendi", pending: "Bekliyor", failed: "Başarısız", expired: "Süresi doldu", refunded: "İade edildi" }[
                    order.paymentStatus
                  ] ?? order.paymentStatus}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Taşıyıcı</dt>
                <dd>{order.shippingCarrier ?? "Hazırlanıyor"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Takip no</dt>
                <dd>{order.trackingNumber ?? "—"}</dd>
              </div>
            </dl>
            {order.shipments.length > 0 ? (
              <ul className="mt-3 space-y-2 border-t border-line pt-3 text-xs">
                {order.shipments.map((shipment) => (
                  <li key={shipment.id}>
                    <p>{shipment.carrier} · {shipment.trackingNumber}</p>
                    <p className="text-muted">{shipment.status} · {formatDate(shipment.shippedAt, true)}</p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <section className="rounded-2xl border border-line bg-ivory p-5 text-xs leading-relaxed text-muted">
            <p className="font-medium text-charcoal">Yardım</p>
            <p className="mt-1">
              Sipariş numaranızla{" "}
              <Link href="/siparis-takip" className="underline decoration-line underline-offset-2">sipariş takip</Link>{" "}
              ekranından siparişinizin güncel durumunu her zaman sorgulayabilirsiniz.
            </p>
            <Link href="/hesabim" className="btn-quiet mt-3 w-full">Hesabıma git</Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
