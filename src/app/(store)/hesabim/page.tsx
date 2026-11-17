import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { customerLogoutAction } from "@/app/actions/auth";
import { getSessionIdentity } from "@/lib/auth";
import { formatDate, formatMoney, ORDER_STATUS_LABELS, ORDER_STATUS_TONE } from "@/lib/format";
import { listOrdersForCustomer } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hesabım",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const identity = await getSessionIdentity();
  if (!identity) redirect("/giris");
  if (identity.type === "admin") redirect("/admin");

  const customer = identity.customer;
  const orders = await listOrdersForCustomer(customer.id, customer.email);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Hesabım</p>
          <h1 className="mt-2 text-[32px]">{customer.firstName} {customer.lastName}</h1>
          <p className="mt-1 text-sm text-muted">{customer.email}</p>
        </div>
        <form action={customerLogoutAction}>
          <button type="submit" className="btn-quiet">Çıkış yap</button>
        </form>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <h2 className="text-lg">Siparişlerim</h2>
            <span className="text-xs text-muted">{orders.length} sipariş</span>
          </div>
          {orders.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted">Henüz siparişiniz yok.</p>
              <Link href="/arama" className="btn-dark mt-4">Koleksiyonu keşfet</Link>
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {orders.map((order) => (
                <li key={order.id} className="px-5 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{order.orderNumber}</p>
                      <p className="text-[11px] text-muted">{formatDate(order.createdAt, true)}</p>
                    </div>
                    <span className={`badge ${ORDER_STATUS_TONE[order.status] ?? "border-line bg-white text-muted"}`}>
                      {ORDER_STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm">{formatMoney(order.grandTotal)}</p>
                    <Link
                      href={`/siparis/${order.orderNumber}`}
                      className="text-[11px] uppercase tracking-[0.12em] text-muted underline decoration-line underline-offset-4 hover:text-charcoal"
                    >
                      Detay ve iade
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 className="text-lg">Profil</h2>
            <dl className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Ad soyad</dt>
                <dd>{customer.firstName} {customer.lastName}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">E-posta</dt>
                <dd className="truncate">{customer.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted">Oturum</dt>
                <dd>DB destekli, HttpOnly çerez</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 text-sm">
            <h2 className="text-lg">İletişim izinleri</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Pazarlama izni sipariş işleminden ayrı tutulur. Siparişlerinizle ilgili güncel bilgiye{" "}
              <Link href="/siparis-takip" className="underline decoration-line underline-offset-2">
                sipariş takip
              </Link>{" "}
              sayfasından ulaşabilirsiniz.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-ivory p-5 text-xs leading-relaxed text-muted">
            <p className="font-medium text-charcoal">Yardım</p>
            <ul className="mt-2 space-y-1.5">
              <li><Link href="/siparis-takip" className="underline decoration-line underline-offset-2">Sipariş takibi</Link></li>
              <li><Link href="/yasal/iade" className="underline decoration-line underline-offset-2">İade ve değişim</Link></li>
              <li><Link href="/yasal/kvkk" className="underline decoration-line underline-offset-2">KVKK aydınlatma metni</Link></li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
