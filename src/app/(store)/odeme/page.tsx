import type { Metadata } from "next";

import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getSessionIdentity } from "@/lib/auth";
import { getPaymentConfig } from "@/lib/payments";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ödeme",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const identity = await getSessionIdentity();
  const customer = identity?.type === "customer" ? identity.customer : null;
  const config = getPaymentConfig();
  const payment = config.ok
    ? ({ available: true, method: config.method } as const)
    : ({ available: false, message: config.message } as const);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="eyebrow">Güvenli ödeme</p>
          <h1 className="mt-2 text-[32px] sm:text-[38px]">Ödeme adımı</h1>
        </div>
        <ol className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted">
          <li>Sepet</li>
          <li aria-hidden="true">→</li>
          <li className="text-charcoal">Ödeme</li>
          <li aria-hidden="true">→</li>
          <li>Onay</li>
        </ol>
      </div>

      {!customer ? (
        <p className="mt-4 max-w-2xl rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
          Misafir olarak devam edebilirsiniz. Dilerseniz{" "}
          <a href="/giris" className="underline decoration-line underline-offset-2">giriş yaparak</a>{" "}
          siparişlerinizi hesabınızdan takip edebilirsiniz.
        </p>
      ) : null}

      <CheckoutForm
        payment={payment}
        prefill={{
          firstName: customer?.firstName ?? "",
          lastName: customer?.lastName ?? "",
          email: customer?.email ?? "",
          phone: "",
        }}
      />
    </div>
  );
}
