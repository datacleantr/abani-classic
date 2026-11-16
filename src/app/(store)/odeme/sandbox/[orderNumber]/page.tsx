import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { sandboxPaymentAction } from "@/app/actions/sandbox-payment";
import { formatMoney } from "@/lib/format";
import { getOrderByNumber, tokensMatch } from "@/lib/orders";
import { isSandboxEnabled } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Test ödemesi",
  robots: { index: false, follow: false },
};

type PageProps = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ t?: string }>;
};

export default async function SandboxPaymentPage({ params, searchParams }: PageProps) {
  if (!isSandboxEnabled()) notFound();

  const { orderNumber } = await params;
  const { t } = await searchParams;
  const order = await getOrderByNumber(orderNumber);
  if (!order || !tokensMatch(order.accessToken, t)) notFound();
  if (order.status !== "pending_payment") {
    redirect(`/siparis/${order.orderNumber}?t=${encodeURIComponent(t ?? "")}`);
  }

  return (
    <div className="container-page max-w-lg py-14">
      <p className="eyebrow">Test ortamı</p>
      <h1 className="mt-2 text-[30px]">Ödeme sağlayıcı simülasyonu</h1>
      <p className="mt-2 text-sm text-muted">
        Bu ekran yalnızca geliştirme ortamında görünür ve gerçek ödeme sağlayıcısının yerini tutar.
        Gerçek kart bilgisi istenmez. Canlı ortamda bu adım kapalıdır.
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-white p-5">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Sipariş</dt>
            <dd>{order.orderNumber}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Tutar</dt>
            <dd>{formatMoney(order.grandTotal)}</dd>
          </div>
        </dl>

        <form action={sandboxPaymentAction} className="mt-5 grid gap-2 sm:grid-cols-2">
          <input type="hidden" name="orderNumber" value={order.orderNumber} />
          <input type="hidden" name="token" value={t ?? ""} />
          <button type="submit" name="outcome" value="success" className="btn-dark">
            Ödemeyi onayla
          </button>
          <button type="submit" name="outcome" value="fail" className="btn-outline">
            Ödemeyi reddet
          </button>
        </form>
      </div>
    </div>
  );
}
