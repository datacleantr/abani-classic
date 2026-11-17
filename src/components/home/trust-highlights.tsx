import Link from "next/link";
import type { ReactNode } from "react";

import { BagIcon, ShieldIcon } from "@/components/store/icons";

/* Yalnızca bu bölüme özgü iki dekoratif ikon (store/icons ile aynı çizgi dili). */
function SvgIcon({ children }: { children: ReactNode }) {
  return (
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
      {children}
    </svg>
  );
}

function TagIcon() {
  return (
    <SvgIcon>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0l-8.5-8.1Z" />
      <circle cx="8.2" cy="8.2" r="1.4" />
    </SvgIcon>
  );
}

function ChatIcon() {
  return (
    <SvgIcon>
      <path d="M4.5 6.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H10l-4.5 3.5V16.5h-1v-10Z" />
      <path d="M8.5 9.5h7M8.5 12.5h4.5" />
    </SvgIcon>
  );
}

type TrustItem = {
  title: string;
  text: string;
  icon: ReactNode;
  link?: { href: string; label: string };
};

/**
 * Güven alanı. Yalnızca doğrulanabilir ifadeler: iade/kargo süresi, ücretsiz kargo, "orijinal ürün
 * garantisi" ve doğrulanmamış telefon/e-posta yazılmaz (docs/OPEN_DECISIONS.md).
 */
export function TrustHighlights({ brandNames }: { brandNames: string[] }) {
  const brandList =
    brandNames.length > 1
      ? `${brandNames.slice(0, -1).join(", ")} ve ${brandNames[brandNames.length - 1]}`
      : (brandNames[0] ?? "");

  const items: TrustItem[] = [
    {
      title: "Güvenli ödeme",
      text: "Ödeme yöntemleri ve tutar ödeme adımında açıkça gösterilir; kart bilgisi sitemizde saklanmaz.",
      icon: <ShieldIcon />,
    },
    {
      title: "Kolay alışveriş",
      text: "Üye olmadan misafir olarak sipariş verebilir, siparişinizi sipariş numaranızla takip edebilirsiniz.",
      icon: <BagIcon />,
    },
    {
      title: "Güvenilir marka seçenekleri",
      text: brandList
        ? `${brandList} ürünleri tek mağazada.`
        : "Bilinen iç giyim markalarının ürünleri tek mağazada.",
      icon: <TagIcon />,
      link: { href: "/markalar", label: "Markaları incele" },
    },
    {
      title: "Müşteri desteği",
      text: "Şu an destek kanalımız sipariş takip sayfasıdır: sipariş numaranız ve e-posta adresinizle siparişinizin güncel durumunu görebilirsiniz.",
      icon: <ChatIcon />,
      link: { href: "/siparis-takip", label: "Sipariş takibi" },
    },
  ];

  return (
    <section aria-labelledby="guven-baslik" className="border-y border-line/60 bg-white py-12 sm:py-14">
      <div className="container-page">
        <h2 id="guven-baslik" className="sr-only">
          Neden Abani Classic?
        </h2>
        <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-line/70">
          {items.map((item) => (
            <li key={item.title} className="flex gap-4 lg:px-6 lg:first:pl-0 lg:last:pr-0">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-red-soft text-brand-red">
                {item.icon}
              </span>
              <div className="min-w-0">
                <h3 className="font-sans text-[13px] font-semibold uppercase tracking-[0.12em] text-navy">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
                {item.link ? (
                  <Link
                    href={item.link.href}
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-medium text-navy underline decoration-brand-red/60 underline-offset-4 hover:decoration-navy"
                  >
                    {item.link.label}
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
