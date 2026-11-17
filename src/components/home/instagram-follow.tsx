import { ArrowUpRightIcon } from "@/components/store/icons";
import { INSTAGRAM_URL } from "@/components/store/navigation";

/**
 * Instagram çağrısı. Canlı akış entegrasyonu olmadığından gönderi ızgarası gösterilmez;
 * ürün görselleri Instagram gönderisi gibi sunulmaz. Yalnızca hesaba giden bağlantı.
 */
export function InstagramFollow() {
  return (
    <section aria-labelledby="instagram-baslik" className="pb-2">
      <div className="container-page">
        <div className="flex flex-col gap-6 py-12 sm:py-16 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-navy/15 text-navy">
              <svg
                width={22}
                height={22}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                focusable="false"
              >
                <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                <circle cx="12" cy="12" r="4" />
                <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" />
              </svg>
            </span>
            <div>
              <p className="eyebrow">Instagram</p>
              <h2 id="instagram-baslik" className="mt-2 font-display text-[24px] leading-tight text-navy sm:text-[28px]">
                Bizi Instagram&apos;da takip edin
              </h2>
              <p className="mt-2 text-[15px] text-muted">
                Abani Classic&apos;i <span className="font-medium text-navy">@abaniclassic</span> hesabından takip
                edebilirsiniz.
              </p>
            </div>
          </div>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline-navy min-h-12 w-full shrink-0 normal-case tracking-[0.04em] sm:w-auto"
          >
            @abaniclassic
            <ArrowUpRightIcon size={16} />
            <span className="sr-only"> Instagram hesabı (yeni sekmede açılır)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
