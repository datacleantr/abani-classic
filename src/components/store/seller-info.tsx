import { sellerDetails, STORE_INFO } from "@/lib/store-info";

/**
 * Satıcı kimlik bilgileri (İletişim sayfası ve yasal metinler). Ticari unvan girilmeden
 * render edilmez: unvansız bir "satıcı bilgileri" kutusu yanıltıcı olur.
 */
export function SellerInfo({ className = "" }: { className?: string }) {
  if (!STORE_INFO.legalName?.trim()) return null;
  const rows = sellerDetails(STORE_INFO);
  return (
    <dl
      className={`grid gap-x-6 gap-y-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[160px_1fr] ${className}`}
    >
      {rows.map((row) => (
        <div key={row.label} className="contents">
          <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted sm:pt-0.5">{row.label}</dt>
          <dd className="break-words text-[15px] text-charcoal">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
