import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { ArrowUpRightIcon, MapPinIcon, TruckIcon } from "@/components/store/icons";
import { InfoPage, InfoSection } from "@/components/store/info-page";
import { INSTAGRAM_URL, MARKETPLACE_STORES } from "@/components/store/navigation";
import { StoreMap } from "@/components/store/store-map";
import {
  directionsUrl,
  mailHref,
  mapEmbedUrl,
  missingStoreInfo,
  STORE_INFO,
  telHref,
} from "@/lib/store-info";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Abani Classic'e siparişiniz, ürünlerimiz veya iade süreciniz hakkında ulaşabileceğiniz kanallar.",
  alternates: { canonical: "/iletisim" },
};

const linkClass = "text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy";

/**
 * İletişim formu bilinçli olarak yok: mesajların saklanacağı tablo (şema değişikliği, onay gerekir)
 * ve e-posta sağlayıcısı (OPEN_DECISIONS #10) olmadan form "gönderildi" deyip mesajı kaybederdi.
 * Telefon, e-posta, adres ve satıcı bilgileri yalnızca `STORE_INFO`'ya girildiyse gösterilir.
 */
export default function ContactPage() {
  const info = STORE_INFO;
  const email = info.email?.trim() || null;
  const phone = info.phone?.trim() || null;
  const hours = info.supportHours?.trim() || null;
  const address = info.address?.trim() || null;
  const location = info.location;

  const seller: { label: string; value: string }[] = [
    { label: "Ticari unvan", value: info.legalName },
    { label: "Adres", value: info.address },
    { label: "MERSİS no", value: info.mersisNumber },
    { label: "Vergi dairesi", value: info.taxOffice },
    { label: "Vergi no", value: info.taxNumber },
    { label: "KEP adresi", value: info.kepAddress },
  ].flatMap((row) => (row.value?.trim() ? [{ label: row.label, value: row.value.trim() }] : []));

  return (
    <InfoPage
      path="/iletisim"
      eyebrow="Kurumsal"
      title="İletişim"
      lead={<p>Siparişiniz, ürünlerimiz veya iade süreciniz hakkında bize aşağıdaki kanallardan ulaşabilirsiniz.</p>}
      missing={missingStoreInfo(info, [
        "email",
        "phone",
        "supportHours",
        "legalName",
        "address",
        "mersisNumber",
        "taxOffice",
        "taxNumber",
        "kepAddress",
      ])}
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {email ? (
          <ContactCard title="E-posta">
            <ContactValue href={mailHref(email)} value={email} />
          </ContactCard>
        ) : null}
        {phone ? (
          <ContactCard title="Telefon">
            <ContactValue href={telHref(phone)} value={phone} />
            {hours ? <p className="mt-1 text-[13px] text-muted">{hours}</p> : null}
          </ContactCard>
        ) : null}
        {address ? (
          <ContactCard title="Adres">
            <address className="text-[15px] not-italic leading-relaxed text-charcoal">{address}</address>
            {location ? (
              <a
                href="#adres"
                className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-[14px] font-medium text-navy underline decoration-navy/30 underline-offset-4 hover:decoration-navy"
              >
                <MapPinIcon size={16} />
                Haritada gör
              </a>
            ) : null}
          </ContactCard>
        ) : null}
        <ContactCard title="Instagram">
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-[16px] font-medium text-navy hover:text-brand-red"
          >
            @abaniclassic
            <ArrowUpRightIcon size={15} />
            <span className="sr-only"> (yeni sekmede açılır)</span>
          </a>
          <p className="mt-1 text-[13px] text-muted">Instagram hesabımızdan bize mesaj gönderebilirsiniz.</p>
        </ContactCard>
        <ContactCard title="Siparişiniz">
          <Link
            href="/siparis-takip"
            className="inline-flex min-h-11 items-center gap-2 text-[16px] font-medium text-navy hover:text-brand-red"
          >
            <TruckIcon size={18} />
            Sipariş takibi
          </Link>
          <p className="mt-1 text-[13px] text-muted">Sipariş numaranız ve e-posta adresinizle durumunu görün.</p>
        </ContactCard>
      </ul>

      {location && address ? (
        <InfoSection id="adres" title="Adresimiz">
          <address className="not-italic">{address}</address>
          <StoreMap embedSrc={mapEmbedUrl(location)} title={`Abani Classic konumu: ${address}`} />
          <ul className="flex flex-wrap gap-2">
            {[
              { href: directionsUrl(location), label: "Yol tarifi al" },
              { href: location.mapsUrl, label: "Google Haritalar'da aç" },
            ].map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-navy/20 px-4 text-[14px] text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
                >
                  {link.label}
                  <ArrowUpRightIcon size={13} />
                  <span className="sr-only"> (yeni sekmede açılır)</span>
                </a>
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      <InfoSection id="siparis-ve-iade" title="Sipariş ve iade talepleri">
        <p>
          Siparişinizin durumunu{" "}
          <Link href="/siparis-takip" className={linkClass}>
            Sipariş takibi
          </Link>{" "}
          sayfasından görebilirsiniz. Kargoya verilmiş veya teslim edilmiş siparişlerde iade talebinizi sipariş
          sayfanızdaki “İade talebi” bölümünden oluşturabilirsiniz; koşullar{" "}
          <Link href="/yasal/iade" className={linkClass}>
            İade ve Değişim
          </Link>{" "}
          sayfasındadır.
        </p>
        <p>
          Sık sorulan konuların cevapları için{" "}
          <Link href="/sss" className={linkClass}>
            Sıkça sorulan sorular
          </Link>{" "}
          sayfasına bakabilirsiniz.
        </p>
      </InfoSection>

      {MARKETPLACE_STORES.length > 0 ? (
        <InfoSection id="pazaryerleri" title="Pazaryeri mağazalarımız">
          <p>
            Pazaryerinden verdiğiniz siparişler o pazaryerinin sisteminde yer alır. Bu siparişlerle ilgili
            sorularınızı ilgili pazaryerindeki mağaza sayfamız üzerinden iletebilirsiniz.
          </p>
          <ul className="flex flex-wrap gap-2">
            {MARKETPLACE_STORES.map((store) => (
              <li key={store.name}>
                <a
                  href={store.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-navy/20 px-4 text-[14px] text-navy transition-colors hover:border-navy hover:bg-navy hover:text-white"
                >
                  {store.name}
                  <ArrowUpRightIcon size={13} />
                  <span className="sr-only"> (yeni sekmede açılır)</span>
                </a>
              </li>
            ))}
          </ul>
        </InfoSection>
      ) : null}

      {/* Satıcı bilgileri ticari unvanla birlikte anlam taşır; yalnızca adres varsa yukarıda gösterilir. */}
      {info.legalName?.trim() ? (
        <InfoSection id="satici-bilgileri" title="Satıcı bilgileri">
          <dl className="grid gap-x-6 gap-y-3 rounded-2xl border border-line bg-white p-5 sm:grid-cols-[160px_1fr]">
            {seller.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted sm:pt-0.5">
                  {row.label}
                </dt>
                <dd className="whitespace-pre-line text-[15px] text-charcoal">{row.value}</dd>
              </div>
            ))}
          </dl>
        </InfoSection>
      ) : null}
    </InfoPage>
  );
}

function ContactCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="card p-5">
      <h2 className="eyebrow font-sans">{title}</h2>
      <div className="mt-2">{children}</div>
    </li>
  );
}

/** Geçerli e-posta/telefon bağlantı olur; değilse düz metin gösterilir (kırık bağlantı yok). */
function ContactValue({ href, value }: { href: string | null; value: string }) {
  const className = "inline-flex min-h-11 items-center break-all text-[16px] font-medium text-navy";
  return href ? (
    <a href={href} className={`${className} hover:text-brand-red`}>
      {value}
    </a>
  ) : (
    <p className={className}>{value}</p>
  );
}
