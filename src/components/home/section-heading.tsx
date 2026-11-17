import Link from "next/link";
import type { ReactNode } from "react";

import { ChevronRightIcon } from "@/components/store/icons";

/** Ana sayfa bölüm başlığı: eyebrow + h2 (+ açıklama) ve isteğe bağlı sağda bir bağlantı. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  action,
}: {
  /** h2'nin kimliği; bölümün `aria-labelledby` değeri. */
  id: string;
  eyebrow: string;
  title: string;
  lead?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-10">
      <div className="max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="section-title mt-3">
          {title}
        </h2>
        {lead ? <p className="section-lead mt-3">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Bölüm başlığının yanındaki "tümünü gör" bağlantısı (≥44px dokunma hedefi). */
export function SectionLink({ href, children }: { href: string; children: string }) {
  return (
    <Link
      href={href}
      className="group inline-flex min-h-11 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-navy underline-offset-[6px] hover:underline"
    >
      {children}
      <ChevronRightIcon size={16} className="text-brand-red transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
