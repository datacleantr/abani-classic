import type { Metadata } from "next";
import Link from "next/link";

import { InfoPage, InfoSection } from "@/components/store/info-page";
import { ORDER_STATUS_LABELS } from "@/lib/format";
import { getPaymentConfig } from "@/lib/payments";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from "@/lib/pricing";
import { missingStoreInfo, STORE_INFO } from "@/lib/store-info";
import { carrierText, dispatchText, ORDER_JOURNEY, reservationDays, shippingFeeText } from "@/lib/support-content";

export const metadata: Metadata = {
  title: "Kargo ve Teslimat",
  description: "Abani Classic siparişlerinde kargo ücreti, kargoya verilme, sipariş adımları ve kargo takibi.",
  alternates: { canonical: "/kargo-ve-teslimat" },
};

export const dynamic = "force-dynamic";

const linkClass = "text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy";

/**
 * Yalnızca sistemin gerçek davranışı ve işletmenin `STORE_INFO`'ya girdiği bilgiler yazılır.
 * Teslim süresi, kargo firması ve ücret onaylanmadıkça rakam/isim verilmez (OPEN_DECISIONS #9, #15, #16).
 */
export default function ShippingPage() {
  const payment = getPaymentConfig();
  const bankTransfer = payment.ok && payment.method === "bank_transfer";
  const days = bankTransfer ? reservationDays(payment) : null;

  return (
    <InfoPage
      path="/kargo-ve-teslimat"
      eyebrow="Yardım"
      title="Kargo ve teslimat"
      lead={<p>Siparişinizin ödemeden teslimata kadar izlediği adımlar ve kargo takibi.</p>}
      missing={missingStoreInfo(STORE_INFO, ["feesConfirmed", "dispatchTime", "carriers"])}
    >
      <InfoSection id="kargo-ucreti" title="Kargo ücreti">
        <p>{shippingFeeText(STORE_INFO, { flat: SHIPPING_FLAT, freeThreshold: FREE_SHIPPING_THRESHOLD })}</p>
        <p>Ürün fiyatlarına KDV dahildir.</p>
      </InfoSection>

      <InfoSection id="kargoya-verilme" title="Kargoya verilme">
        <p>{dispatchText(STORE_INFO)}</p>
        {bankTransfer ? (
          <p>
            Havale/EFT ile verilen siparişler, ödeme hesabımızda doğrulandıktan sonra hazırlanmaya başlar.
            {days
              ? ` Ürünler ${days} gün boyunca sizin için ayrılır; bu sürede ödemesi doğrulanmayan siparişler iptal edilir.`
              : null}
          </p>
        ) : null}
      </InfoSection>

      <InfoSection id="siparis-adimlari" title="Sipariş adımları">
        <p>Sipariş sayfanızda ve Sipariş takibi ekranında siparişinizin hangi adımda olduğunu görebilirsiniz.</p>
        <ol className="mt-2 border-l border-line">
          {ORDER_JOURNEY.map((step, index) => (
            <li key={step.status} className="relative pb-6 pl-8 last:pb-0">
              <span
                aria-hidden="true"
                className="absolute -left-3 top-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-navy text-[11px] font-semibold text-white"
              >
                {index + 1}
              </span>
              <p className="font-medium text-navy">{ORDER_STATUS_LABELS[step.status] ?? step.status}</p>
              <p className="mt-1 text-[14px] text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </InfoSection>

      <InfoSection id="kargo-takibi" title="Kargo firması ve takip">
        <p>{carrierText(STORE_INFO)}</p>
        <p>
          <Link href="/siparis-takip" className={linkClass}>
            Sipariş takibi
          </Link>{" "}
          sayfasında sipariş numaranız ve siparişte kullandığınız e-posta adresiyle sorgulama yapabilirsiniz.
        </p>
      </InfoSection>

      <InfoSection id="teslimat-adresi" title="Teslimat adresi">
        <p>
          Teslimat, ödeme adımında girdiğiniz adrese yapılır. Siparişi onaylamadan önce adres ve telefon
          bilgilerinizi kontrol etmenizi öneririz.
        </p>
      </InfoSection>

      <InfoSection id="pazaryeri-siparisleri" title="Pazaryeri siparişleri">
        <p>
          Pazaryeri mağazalarımızdan verdiğiniz siparişlerin kargo ve teslimat süreci ilgili pazaryerinin
          sisteminde yürütülür ve orada takip edilir.
        </p>
      </InfoSection>

      <InfoSection id="sorun" title="Bir sorun mu var?">
        <p>
          Teslimatla ilgili sorularınız için{" "}
          <Link href="/iletisim" className={linkClass}>
            İletişim
          </Link>{" "}
          sayfasındaki kanallardan bize ulaşabilirsiniz. İade ve değişim koşulları{" "}
          <Link href="/yasal/iade" className={linkClass}>
            İade ve Değişim
          </Link>{" "}
          sayfasındadır.
        </p>
      </InfoSection>
    </InfoPage>
  );
}
