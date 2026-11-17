import Link from "next/link";

import { STORE_INFO, telHref } from "@/lib/store-info";

import { ArrowUpRightIcon, MapPinIcon, PhoneIcon } from "./icons";
import {
  categoryHref,
  INSTAGRAM_URL,
  MARKETPLACE_STORES,
  splitCategories,
  SUPPORT_LINKS,
  type NavCategory,
} from "./navigation";
import { NewsletterForm } from "./newsletter-form";

/** Yalnızca var olan sayfalar linklenir. Kurumsal sayfalar `SUPPORT_LINKS` (navigation.ts) üzerinden. */
const HELP_LINKS = [...SUPPORT_LINKS, { href: "/hesabim", label: "Hesabım" }];

const LEGAL_LINKS = [
  { href: "/yasal/kvkk", label: "KVKK Aydınlatma Metni" },
  { href: "/yasal/gizlilik", label: "Gizlilik ve Çerez Politikası" },
  { href: "/yasal/cerezler", label: "Çerez Tercihleri" },
  { href: "/yasal/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi" },
  { href: "/yasal/on-bilgilendirme", label: "Ön Bilgilendirme Formu" },
  { href: "/yasal/iade", label: "İade ve Değişim" },
];

const linkClass = "inline-flex min-h-7 items-center text-ivory/75 transition-colors hover:text-white";
const headingClass = "eyebrow-light font-sans";

function ExternalLink({ href, children }: { href: string; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${linkClass} gap-1.5`}>
      {children}
      <ArrowUpRightIcon size={13} className="text-brand-red-light" />
      <span className="sr-only"> (yeni sekmede açılır)</span>
    </a>
  );
}

export function SiteFooter({ categories }: { categories: NavCategory[] }) {
  const { men, women } = splitCategories(categories);
  const address = STORE_INFO.address?.trim() || null;
  const phone = STORE_INFO.phone?.trim() || null;

  return (
    <footer className="surface-dark mt-20">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="sm:col-span-2 lg:col-span-4 lg:pr-6">
          <Link href="/" aria-label="Abani Classic ana sayfa" className="inline-flex flex-col leading-none">
            <span className="font-display text-2xl font-medium tracking-[0.24em]">ABANI</span>
            <span className="mt-1.5 text-[9px] font-medium uppercase tracking-[0.46em] text-brand-red-light">Classic</span>
          </Link>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/75">
            Erkek iç giyimde güvendiğiniz markaları bir araya getiren mağaza: Tutku, Jiber, Seher Yıldızı,
            Çift Kaplan ve Abani Classic.
          </p>
          {address || phone ? (
            <address className="mt-5 space-y-1 text-sm not-italic leading-relaxed text-ivory/75">
              {address ? (
                <Link href="/iletisim#adres" className="flex gap-2 transition-colors hover:text-white">
                  <MapPinIcon size={16} className="mt-0.5 shrink-0 text-brand-red-light" />
                  <span>{address}</span>
                </Link>
              ) : null}
              {phone ? (
                <a href={telHref(phone) ?? undefined} className="flex min-h-7 items-center gap-2 transition-colors hover:text-white">
                  <PhoneIcon size={16} className="shrink-0 text-brand-red-light" />
                  {phone}
                </a>
              ) : null}
            </address>
          ) : null}
          <h2 className={`${headingClass} mt-8`}>Bülten</h2>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-ivory/70">
            Yeni ürün ve duyurulardan e-posta ile haberdar olun. İletişim izninizi dilediğiniz an geri
            alabilirsiniz.
          </p>
          <NewsletterForm />
        </div>

        <nav aria-labelledby="footer-shop" className="lg:col-span-2">
          <h2 id="footer-shop" className={headingClass}>
            Alışveriş
          </h2>
          <ul className="mt-4 space-y-1 text-sm">
            {[...men, ...women].map((category) => (
              <li key={category.slug}>
                <Link href={categoryHref(category.slug)} className={linkClass}>
                  {category.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/markalar" className={linkClass}>
                Markalar
              </Link>
            </li>
            <li>
              <Link href="/kampanyalar" className={linkClass}>
                Kampanyalar
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-help" className="lg:col-span-2">
          <h2 id="footer-help" className={headingClass}>
            Yardım
          </h2>
          <ul className="mt-4 space-y-1 text-sm">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-legal" className="lg:col-span-2">
          <h2 id="footer-legal" className={headingClass}>
            Yasal
          </h2>
          <ul className="mt-4 space-y-1 text-sm">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-2">
          <h2 className={headingClass}>Bizi takip edin</h2>
          <ul className="mt-4 space-y-1 text-sm">
            <li>
              <ExternalLink href={INSTAGRAM_URL}>Instagram</ExternalLink>
            </li>
          </ul>
          <h2 className={`${headingClass} mt-8`}>Pazaryeri mağazalarımız</h2>
          <ul className="mt-4 space-y-1 text-sm">
            {MARKETPLACE_STORES.map((store) => (
              <li key={store.name}>
                <ExternalLink href={store.href}>{store.name}</ExternalLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page py-5 text-xs text-ivory/70">
          <p>© {new Date().getFullYear()} Abani Classic. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
