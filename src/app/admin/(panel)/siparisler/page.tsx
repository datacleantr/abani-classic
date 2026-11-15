import Link from "next/link";

import { requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";
import { getOrdersForAdmin } from "@/lib/orders";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ durum?: string }> };

export default async function AdminOrdersPage({ searchParams }: PageProps) {
  await requireAdmin();
  const { durum } = await searchParams;
  const status = durum ?? "all";
  const orders = await getOrdersForAdmin(status);

  const tabs = [
    { key: "all", label: "Tümü" },
    { key: "pending_payment", label: "Ödeme bekleyen" },
    { key: "paid", label: "Ödendi" },
    { key: "processing", label: "Hazırlanıyor" },
    { key: "shipped", label: "Kargoda" },
    { key: "delivered", label: "Teslim" },
    { key: "return_requested", label: "İade" },
    { key: "cancelled", label: "İptal" },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Operasyon</p>
        <h1 className="mt-1 text-2xl">Siparişler</h1>
        <p className="mt-1 text-xs text-muted">
          Durum geçişleri servis katmanında doğrulanır. Rastgele durum yazımı engellenir.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5 text-[11px]">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/admin/siparisler?durum=${tab.key}`}
            className={
              tab.key === status
                ? "rounded-full bg-charcoal px-3 py-1.5 text-ivory"
                : "rounded-full border border-line bg-white px-3 py-1.5 text-muted hover:border-charcoal"
            }
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[820px]">
          <thead>
            <tr>
              <th>Sipariş</th>
              <th>Müşteri</th>
              <th>Şehir</th>
              <th>Kupon</th>
              <th>Tutar</th>
              <th>Ödeme</th>
              <th>Durum</th>
              <th>Kargo</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="text-xs">
                  <Link href={`/admin/siparisler/${order.orderNumber}`} className="underline underline-offset-2">
                    {order.orderNumber}
                  </Link>
                  <p className="text-[10px] text-muted">{formatDate(order.createdAt, true)}</p>
                </td>
                <td className="text-xs">
                  {order.firstName} {order.lastName}
                  <p className="text-[10px] text-muted">{order.email}</p>
                </td>
                <td className="text-xs">{order.city}</td>
                <td className="text-xs">{order.couponCode ?? "—"}</td>
                <td className="text-xs">{formatMoney(order.grandTotal)}</td>
                <td className="text-xs">{order.paymentStatus}</td>
                <td>
                  <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line"}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="text-[11px] text-muted">
                  {order.trackingNumber ?? "—"}
                  {order.shippingCarrier ? <p>{order.shippingCarrier}</p> : null}
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-6 text-center text-xs text-muted">Bu filtrede sipariş yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
