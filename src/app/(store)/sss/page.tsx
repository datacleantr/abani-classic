import type { Metadata } from "next";
import Link from "next/link";

import { ChevronDownIcon } from "@/components/store/icons";
import { InfoPage } from "@/components/store/info-page";
import { MARKETPLACE_STORES } from "@/components/store/navigation";
import { getPaymentConfig } from "@/lib/payments";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT } from "@/lib/pricing";
import { missingStoreInfo, STORE_INFO } from "@/lib/store-info";
import { buildFaq, faqJsonLd } from "@/lib/support-content";

export const metadata: Metadata = {
  title: "Sıkça Sorulan Sorular",
  description: "Abani Classic'te sipariş, ödeme, kargo, iade ve ürünlerle ilgili sıkça sorulan sorular.",
  alternates: { canonical: "/sss" },
};

/** Ödeme yapılandırması ortama göre değiştiği için istek anında render edilir. */
export const dynamic = "force-dynamic";

export default function FaqPage() {
  const groups = buildFaq({
    info: STORE_INFO,
    payment: getPaymentConfig(),
    fees: { flat: SHIPPING_FLAT, freeThreshold: FREE_SHIPPING_THRESHOLD },
    marketplaces: MARKETPLACE_STORES.map((store) => store.name),
  });

  return (
    <InfoPage
      path="/sss"
      eyebrow="Yardım"
      title="Sıkça sorulan sorular"
      lead={
        <p>
          Aradığınız cevabı bulamazsanız{" "}
          <Link href="/iletisim" className="text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy">
            bize ulaşın
          </Link>
          .
        </p>
      }
      missing={missingStoreInfo(STORE_INFO, ["feesConfirmed", "dispatchTime", "carriers"])}
    >
      <script
        type="application/ld+json"
        // JSON.stringify çıktısındaki "<" kaçışlanır: metin içinden </script> enjeksiyonu olmasın.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(groups)).replace(/</g, "\\u003c") }}
      />

      <nav aria-label="Konular">
        <ul className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="inline-flex min-h-11 items-center rounded-full border border-navy/20 px-4 text-[14px] text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
              >
                {group.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {groups.map((group) => (
        <section key={group.id} aria-labelledby={group.id}>
          <h2 id={group.id} className="scroll-mt-28 font-display text-[24px] leading-tight text-navy sm:text-[28px]">
            {group.title}
          </h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {group.items.map((item) => (
              <details key={item.id} id={item.id} className="group scroll-mt-28">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-medium text-navy marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <ChevronDownIcon
                    size={18}
                    className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
                  />
                </summary>
                <div className="pb-5 pr-8 text-[15px] leading-relaxed text-charcoal/85">
                  <p>{item.answer}</p>
                  {item.link ? (
                    <Link
                      href={item.link.href}
                      className="mt-3 inline-flex min-h-11 items-center text-[14px] font-medium text-brand-red underline decoration-brand-red/30 underline-offset-4 hover:decoration-brand-red"
                    >
                      {item.link.label}
                    </Link>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </InfoPage>
  );
}
