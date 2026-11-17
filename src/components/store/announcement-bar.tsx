import Link from "next/link";

import { PackageIcon, ShieldIcon } from "./icons";

/**
 * Header üstü duyuru bandı. Yalnızca doğrulanabilir mesajlar: kargo eşiği, iade süresi,
 * teslimat süresi gibi işletmece onaylanmamış vaatler (docs/OPEN_DECISIONS.md #15, #16) yazılmaz.
 * Sabittir (otomatik dönen kayan yazı yok): okunabilirlik ve hareket hassasiyeti için.
 */
export function AnnouncementBar() {
  return (
    <aside aria-label="Mağaza bilgileri" className="surface-dark bg-navy-deep">
      <div className="container-page flex h-9 items-center justify-center gap-6 text-[11px] tracking-[0.02em] sm:text-xs sm:tracking-[0.06em] md:justify-between">
        <ul className="flex min-w-0 items-center gap-2 sm:gap-6">
          <li className="flex shrink-0 items-center gap-2">
            <ShieldIcon size={15} className="hidden text-brand-red-light sm:block" />
            Güvenli alışveriş
          </li>
          <li className="flex min-w-0 items-center gap-2">
            <span aria-hidden="true" className="text-brand-red-light sm:hidden">
              ·
            </span>
            <PackageIcon size={15} className="hidden shrink-0 text-brand-red-light sm:block" />
            <span className="truncate">Çoklu paket seçenekleri</span>
          </li>
        </ul>
        <Link
          href="/markalar"
          className="hidden shrink-0 text-brand-red-light underline-offset-4 transition-colors hover:text-ivory hover:underline md:inline"
        >
          Tutku · Jiber · Seher Yıldızı · Çift Kaplan
        </Link>
      </div>
    </aside>
  );
}
