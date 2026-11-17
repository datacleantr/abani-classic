import Link from "next/link";
import type { ReactNode } from "react";

import { MISSING_INFO_LABELS, type MissingInfoKey } from "@/lib/store-info";

import { SUPPORT_LINKS } from "./navigation";

/**
 * Kurumsal sayfa iskeleti (Hakkımızda, İletişim, SSS, Kargo ve Teslimat): breadcrumb, başlık,
 * içerik ve lg+ ekranda yan menü. Yan menü mobilde içeriğin altına iner.
 */
export function InfoPage({
  path,
  eyebrow,
  title,
  lead,
  missing = [],
  children,
}: {
  path: string;
  eyebrow: string;
  title: string;
  lead: ReactNode;
  missing?: MissingInfoKey[];
  children: ReactNode;
}) {
  return (
    <div className="container-page py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-navy">
              Ana sayfa
            </Link>
          </li>
          <li aria-hidden="true" className="text-line">
            /
          </li>
          <li aria-current="page" className="text-navy">
            {title}
          </li>
        </ol>
      </nav>

      <div className="mt-6 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
        <div className="min-w-0 max-w-3xl">
          <header>
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 text-[34px] leading-[1.1] text-navy sm:text-[44px]">{title}</h1>
            <div className="section-lead mt-4 text-[16px]">{lead}</div>
          </header>
          <div className="mt-10 space-y-12">{children}</div>
          <MissingInfoNotice missing={missing} />
        </div>

        <aside aria-labelledby="yardim-menu" className="lg:sticky lg:top-28 lg:self-start">
          <h2 id="yardim-menu" className="eyebrow font-sans">
            Yardım ve kurumsal
          </h2>
          <ul className="mt-4 divide-y divide-line/80 border-y border-line/80">
            {SUPPORT_LINKS.map((link) => {
              const current = link.href === path;
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={current ? "page" : undefined}
                    className={
                      current
                        ? "flex min-h-11 items-center border-l-2 border-brand-red pl-3 text-[14px] font-medium text-navy"
                        : "flex min-h-11 items-center border-l-2 border-transparent pl-3 text-[14px] text-muted transition-colors hover:text-navy"
                    }
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

/** Kurumsal sayfa bölümü: bölüm başlığı + içerik. `id` sayfa içi bağlantı içindir. */
export function InfoSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="scroll-mt-28 font-display text-[24px] leading-tight text-navy sm:text-[28px]">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-charcoal/85">{children}</div>
    </section>
  );
}

/**
 * Yalnızca geliştirmede: işletmenin henüz girmediği bilgileri listeler, böylece sayfada neyin
 * neden görünmediği bellidir. Canlıda hiçbir şey render edilmez (müşteri "eklenmedi" görmez).
 */
function MissingInfoNotice({ missing }: { missing: MissingInfoKey[] }) {
  if (process.env.NODE_ENV === "production" || missing.length === 0) return null;
  return (
    <div className="mt-12 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
      <p className="font-semibold">Geliştirme notu (canlıda görünmez)</p>
      <p className="mt-1">
        Aşağıdaki bilgiler işletme tarafından girilmediği için bu sayfada gösterilmiyor. Değerler
        <code className="mx-1 rounded bg-amber-100 px-1">src/lib/store-info.ts</code>
        dosyasına girilince sayfa kendiliğinden güncellenir:
      </p>
      <ul className="mt-2 list-disc pl-5">
        {missing.map((key) => (
          <li key={key}>{MISSING_INFO_LABELS[key]}</li>
        ))}
      </ul>
    </div>
  );
}
