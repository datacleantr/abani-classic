import Link from "next/link";

import { NewsletterForm } from "./newsletter-form";

export function SiteFooter() {
  return (
    <footer className="mt-20 bg-charcoal text-ivory">
      <div className="container-page grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-display text-2xl tracking-[0.24em]">ABANI</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.42em] text-sand">Classic</p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ivory/70">
            Uzun elyaf pamuk, ölçülü kalıplar ve sade renkler. İstanbul&apos;da tasarlanan, Türkiye&apos;de
            üretilen erkek iç giyim temelleri.
          </p>
          <p className="eyebrow mt-6 text-sand">Bülten</p>
          <p className="mt-1 text-xs text-ivory/60">
            Yeni seçkiler ve bakım önerileri. İletişim izninizi dilediğiniz an geri alabilirsiniz.
          </p>
          <NewsletterForm />
        </div>

        <div>
          <p className="eyebrow text-sand">Alışveriş</p>
          <ul className="mt-3 space-y-2 text-sm text-ivory/75">
            <li><Link href="/kategoriler/erkek-boxer" className="hover:text-white">Erkek Boxer</Link></li>
            <li><Link href="/kategoriler/erkek-slip" className="hover:text-white">Erkek Slip</Link></li>
            <li><Link href="/kategoriler/erkek-atlet" className="hover:text-white">Erkek Atlet</Link></li>
            <li><Link href="/kategoriler/erkek-corap" className="hover:text-white">Erkek Çorap</Link></li>
            <li><Link href="/kategoriler/termal-iclik" className="hover:text-white">Termal İçlik</Link></li>
            <li><Link href="/markalar" className="hover:text-white">Markalar</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow text-sand">Kurumsal</p>
          <ul className="mt-3 space-y-2 text-sm text-ivory/75">
            <li><Link href="/yasal/mesafeli-satis" className="hover:text-white">Mesafeli satış sözleşmesi</Link></li>
            <li><Link href="/yasal/kvkk" className="hover:text-white">KVKK aydınlatma metni</Link></li>
            <li><Link href="/yasal/gizlilik" className="hover:text-white">Gizlilik ve çerezler</Link></li>
            <li><Link href="/yasal/iade" className="hover:text-white">İade ve değişim</Link></li>
            <li><Link href="/siparis-takip" className="hover:text-white">Sipariş takibi</Link></li>
            <li><Link href="/admin" className="hover:text-white">Yönetim paneli</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-5 text-[11px] text-ivory/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Abani Classic. Tüm hakları saklıdır.</p>
          <p>Güvenli ödeme altyapısı · 256-bit TLS · Kart bilgisi saklanmaz</p>
        </div>
      </div>
    </footer>
  );
}
