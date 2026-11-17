import type { Metadata } from "next";
import Link from "next/link";

import { FavoritesView } from "./favorites-view";

export const metadata: Metadata = {
  title: "Favorilerim",
  description: "Abani Classic'te beğendiğiniz ürünler.",
  robots: { index: false, follow: true },
  alternates: { canonical: "/favoriler" },
};

export default function FavoritesPage() {
  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/" className="hover:text-charcoal">
          Ana sayfa
        </Link>
        <span className="mx-2 text-line" aria-hidden="true">
          /
        </span>
        <span className="text-charcoal" aria-current="page">
          Favoriler
        </span>
      </nav>
      <h1 className="mt-4 text-[32px] sm:text-[40px]">Favorilerim</h1>
      <FavoritesView />
    </div>
  );
}
