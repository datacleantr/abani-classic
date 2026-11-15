import Link from "next/link";

import { StockAdjustForm } from "@/components/admin/forms";
import { getDashboardMetrics } from "@/lib/admin";
import { canManageCatalog, canManageInventory, requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  super_admin: "süper yönetici",
  catalog_manager: "katalog yöneticisi",
  inventory_manager: "stok yöneticisi",
  order_manager: "sipariş yöneticisi",
  content_editor: "içerik editörü",
  customer_support: "müşteri destek",
  analyst: "analist",
};

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const metrics = await getDashboardMetrics();
  const maxSale = Math.max(1, ...metrics.salesByDay.map((day) => day.total));

  const cards = [
    { label: "Brüt satış", value: formatMoney(metrics.grossSales), note: `${metrics.paidOrders} ödenmiş sipariş` },
    { label: "Ortalama sepet", value: formatMoney(metrics.avgBasket), note: "Ödenmiş siparişler" },
    { label: "Bekleyen operasyon", value: String(metrics.pendingOrders), note: "Ödeme/hazırlık/paketleme" },
    { label: "Yayında ürün", value: String(metrics.publishedProducts), note: "Onaylı katalog" },
    { label: "Düşük stok", value: String(metrics.lowStock.length), note: "Yeniden sipariş seviyesinde" },
    { label: "Açık iade", value: String(metrics.openReturns), note: `${metrics.pendingReviews} yorum onay bekliyor` },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Operasyon özeti</p>
          <h1 className="mt-1 text-2xl">Merhaba, {admin.name.split(" ")[0]}</h1>
          <p className="mt-1 text-xs text-muted">
            {roleLabels[admin.role] ?? admin.role} yetkisiyle görüntülüyorsunuz. Kâr raporu, maliyet ve
            komisyon verileri tamamlanmadan gösterilmez.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCatalog(admin.role) ? (
            <Link href="/admin/urunler/yeni" className="btn-dark">Ürün ekle</Link>
          ) : null}
          <Link href="/admin/siparisler" className="btn-quiet">Siparişler</Link>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className="mt-2 font-display text-xl">{card.value}</p>
            <p className="mt-1 text-[10px] text-muted">{card.note}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg">Son 14 gün satış</h2>
              <p className="text-[11px] text-muted">Yalnızca ödemesi doğrulanmış siparişler</p>
            </div>
            <p className="text-[11px] text-muted">{formatMoney(metrics.grossSales)} toplam</p>
          </div>
          {metrics.salesByDay.length === 0 ? (
            <p className="mt-8 text-sm text-muted">Bu aralıkta ödenmiş sipariş yok.</p>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-2">
              {metrics.salesByDay.map((day) => (
                <div key={day.day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] text-muted">{Math.round(day.total / 100)}</span>
                  <div
                    className="w-full rounded-t bg-charcoal/85"
                    style={{ height: `${Math.max(6, Math.round((day.total / maxSale) * 120))}px` }}
                    title={`${day.day}: ${formatMoney(day.total)}`}
                  />
                  <span className="text-[9px] text-muted">{day.day}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">En çok satan SKU grupları</h2>
          <ul className="mt-3 divide-y divide-line/70">
            {metrics.topProducts.map((product) => (
              <li key={product.productName} className="flex items-center justify-between gap-3 py-2 text-xs">
                <span className="line-clamp-1">{product.productName}</span>
                <span className="shrink-0 text-muted">{product.units} adet · {formatMoney(product.revenue)}</span>
              </li>
            ))}
            {metrics.topProducts.length === 0 ? <li className="py-2 text-xs text-muted">Veri yok.</li> : null}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Düşük stok uyarıları</h2>
            <Link href="/admin/stok" className="link-quiet">Tüm stok →</Link>
          </div>
          <ul className="mt-3 divide-y divide-line/70">
            {metrics.lowStock.map((row) => (
              <li key={row.variantId} className="py-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p>{row.productName}</p>
                    <p className="text-[10px] text-muted">{row.color} / {row.size} · {row.sku}</p>
                  </div>
                  <span className={`badge ${row.available <= 0 ? "border-red-200 bg-red-50 text-red-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {row.available} adet
                  </span>
                </div>
                {canManageInventory(admin.role) ? <StockAdjustForm variantId={row.variantId} /> : null}
              </li>
            ))}
            {metrics.lowStock.length === 0 ? <li className="py-2 text-xs text-muted">Kritik stok yok.</li> : null}
          </ul>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Son siparişler</h2>
            <Link href="/admin/siparisler" className="link-quiet">Tümü →</Link>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base min-w-[420px]">
              <thead>
                <tr>
                  <th>Sipariş</th>
                  <th>Müşteri</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {metrics.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="text-xs">
                      <Link href={`/admin/siparisler/${order.orderNumber}`} className="underline underline-offset-2">
                        {order.orderNumber}
                      </Link>
                      <p className="text-[10px] text-muted">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="text-xs">{order.firstName} {order.lastName}</td>
                    <td className="text-xs">{formatMoney(order.grandTotal)}</td>
                    <td>
                      <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line"}`}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">İçe aktarım kuyruğu</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {metrics.imports.map((batch) => (
              <li key={batch.id}>
                <Link href={`/admin/ice-aktarim/${batch.id}`} className="flex items-center justify-between gap-2">
                  <span className="line-clamp-1">{batch.sourceKey} · {batch.fileName}</span>
                  <span className="badge border-line bg-ivory text-muted">{batch.status}</span>
                </Link>
                <p className="text-[10px] text-muted">
                  {batch.validRows} geçerli · {batch.errorRows} hatalı · {batch.matchRows} eşleşme
                </p>
              </li>
            ))}
            {metrics.imports.length === 0 ? <li className="text-muted">Kayıt yok.</li> : null}
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">Hızlı işlemler</h2>
          <div className="mt-3 grid gap-2">
            <Link href="/admin/ice-aktarim" className="btn-quiet">CSV dry-run başlat</Link>
            <Link href="/admin/yorumlar" className="btn-quiet">Yorum moderasyonu</Link>
            <Link href="/admin/denetim" className="btn-quiet">Denetim kayıtları</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-charcoal p-5 text-ivory">
          <h2 className="text-lg">Veri kalitesi notu</h2>
          <p className="mt-2 text-xs leading-relaxed text-ivory/70">
            Kaynak ilanlar ana ürünlere yalnızca insan onayıyla bağlanır. Barkod veya marka çelişkisi
            olduğunda skor yüksek olsa bile otomatik birleştirme engellenir ve satır inceleme
            kuyruğuna düşer.
          </p>
          <p className="mt-3 text-[11px] text-sand">
            Eşikler: ≥95 güçlü aday · 75–94 insan incelemesi · &lt;75 yeni kayıt
          </p>
        </div>
      </section>
    </div>
  );
}
