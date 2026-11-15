import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderStatusForm } from "@/components/admin/forms";
import { canIssueRefund, canManageOrders, requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";
import { allowedNextStatuses, getOrderByNumber } from "@/lib/orders";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ orderNumber: string }> };

export default async function AdminOrderDetailPage({ params }: PageProps) {
  const admin = await requireAdmin();
  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const nextStatuses = allowedNextStatuses(order.status).filter((status) =>
    ["refunded", "partially_refunded"].includes(status) ? canIssueRefund(admin.role) : true,
  );

  return (
    <div className="max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Sipariş</p>
          <h1 className="mt-1 text-2xl">{order.orderNumber}</h1>
          <p className="mt-1 text-xs text-muted">
            {formatDate(order.createdAt, true)} · {order.email} · {order.city} / {order.district}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line"}`}>
            {ORDER_STATUS_LABELS[order.status] ?? order.status}
          </span>
          <Link href="/admin/siparisler" className="btn-quiet">Listeye dön</Link>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-2xl border border-line bg-white">
            <h2 className="border-b border-line px-5 py-3 text-lg">Kalemler (snapshot)</h2>
            <ul className="divide-y divide-line/70">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3 text-xs">
                  <div>
                    <p className="text-sm">{item.productName}</p>
                    <p className="text-[11px] text-muted">
                      {item.variantLabel} · SKU {item.sku}
                    </p>
                    <p className="text-[11px] text-muted">
                      {item.quantity} × {formatMoney(item.unitPrice)} · KDV %{item.taxRate} ({formatMoney(item.taxAmount)})
                    </p>
                  </div>
                  <p className="shrink-0 text-sm">{formatMoney(item.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-line px-5 py-4 text-xs">
              <div className="flex justify-between"><dt className="text-muted">Ara toplam</dt><dd>{formatMoney(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">İndirim</dt><dd>{formatMoney(order.discountTotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Kargo</dt><dd>{formatMoney(order.shippingTotal)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-sm font-semibold"><dt>Toplam</dt><dd>{formatMoney(order.grandTotal)}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-lg">Durum geçmişi</h2>
            <ol className="mt-3 space-y-2">
              {order.history.map((entry) => (
                <li key={entry.id} className="border-l-2 border-line pl-3 text-xs">
                  <p>{ORDER_STATUS_LABELS[entry.toStatus] ?? entry.toStatus}</p>
                  <p className="text-[10px] text-muted">{formatDate(entry.createdAt, true)} · {entry.actor}</p>
                  {entry.note ? <p className="text-charcoal/70">{entry.note}</p> : null}
                </li>
              ))}
            </ol>
          </section>

          {order.returns.length > 0 ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs text-amber-900">
              <h2 className="text-lg text-amber-900">İade talepleri</h2>
              <ul className="mt-2 space-y-2">
                {order.returns.map((request) => (
                  <li key={request.id}>
                    <p>{request.status} · {formatDate(request.createdAt)}</p>
                    <p className="text-amber-800">{request.reason}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="space-y-4">
          {canManageOrders(admin.role) ? (
            <section className="rounded-2xl border border-line bg-white p-5">
              <h2 className="text-lg">Durum güncelle</h2>
              <div className="mt-3">
                <OrderStatusForm
                  orderId={order.id}
                  statuses={nextStatuses.map((status) => ({
                    value: status,
                    label: ORDER_STATUS_LABELS[status] ?? status,
                  }))}
                />
              </div>
            </section>
          ) : (
            <p className="rounded-xl border border-line bg-white p-4 text-xs text-muted">
              Bu hesap sipariş durumu değiştiremez (salt okunur erişim).
            </p>
          )}

          <section className="rounded-2xl border border-line bg-white p-5 text-xs">
            <h2 className="text-lg">Müşteri ve teslimat</h2>
            <p className="mt-2 text-sm">{order.firstName} {order.lastName}</p>
            <p className="mt-1 leading-relaxed text-muted">
              {order.addressLine}
              <br />
              {order.district} / {order.city} {order.postalCode ?? ""}
            </p>
            <p className="mt-2 text-muted">{order.email} · {order.phone}</p>
            {order.note ? <p className="mt-2 text-muted">Not: {order.note}</p> : null}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 text-xs">
            <h2 className="text-lg">Ödeme ve kargo</h2>
            <dl className="mt-2 space-y-1.5">
              <div className="flex justify-between"><dt className="text-muted">Ödeme durumu</dt><dd>{order.paymentStatus}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Kupon</dt><dd>{order.couponCode ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Taşıyıcı</dt><dd>{order.shippingCarrier ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Takip</dt><dd>{order.trackingNumber ?? "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Pazarlama izni</dt><dd>{order.marketingConsent ? "Var" : "Yok"}</dd></div>
            </dl>
            {order.shipments.map((shipment) => (
              <p key={shipment.id} className="mt-2 border-t border-line pt-2 text-[11px] text-muted">
                {shipment.carrier} · {shipment.trackingNumber} · {formatDate(shipment.shippedAt, true)}
              </p>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
