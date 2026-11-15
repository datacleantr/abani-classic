import type { Metadata } from "next";
import Link from "next/link";

import { getStoreBrands } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Markalar",
  description: "Abani Classic kataloğunda yer alan üretici ve markalar.",
  alternates: { canonical: "/markalar" },
};

export default async function BrandsPage() {
  const brands = await getStoreBrands();

  return (
    <div className="container-page py-10">
      <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
        <Link href="/" className="hover:text-charcoal">Ana sayfa</Link>
        <span className="mx-2 text-line">/</span>
        <span className="text-charcoal">Markalar</span>
      </nav>
      <h1 className="mt-4 text-[32px] sm:text-[40px]">Markalar</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-charcoal/70">
        Yalnızca yetkili satıcısı olduğumuz ve kullanım hakkı doğrulanmış ürünleri listeliyoruz.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/markalar/${brand.slug}`}
            className="group rounded-2xl border border-line bg-white p-6 transition hover:border-sand"
          >
            <p className="eyebrow">{brand.origin ?? "Türkiye"}</p>
            <h2 className="mt-2 font-display text-2xl">{brand.name}</h2>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
              {brand.description ?? "Katalogda yer alan ürünler."}
            </p>
            <p className="mt-4 text-xs text-charcoal group-hover:text-sand">
              {brand.productCount} ürün · Koleksiyonu gör →
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
