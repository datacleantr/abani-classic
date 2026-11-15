import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/store/catalog-view";
import { getBrandBySlug, listProducts } from "@/lib/catalog";
import { parseListSearch, type RawParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) return { title: "Marka bulunamadı" };
  return {
    title: `${brand.name} koleksiyonu`,
    description: brand.description ?? `${brand.name} ürünleri — Abani Classic.`,
    alternates: { canonical: `/markalar/${brand.slug}` },
  };
}

export default async function BrandPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const raw = await searchParams;
  const { options, sort } = parseListSearch(raw);
  const result = await listProducts({ ...options, brandSlug: slug, sort });

  return (
    <CatalogView
      title={brand.name}
      intro={brand.description}
      seoText={`${brand.name} ürünleri, yetkili satıcı olduğumuz katalogdan yayınlanır. Kaynak pazaryeri ilanları yalnızca insan onayı sonrası ana ürünlerle ilişkilendirilir.`}
      basePath={`/markalar/${brand.slug}`}
      params={raw}
      result={result}
      activeSort={sort ?? "recommended"}
    />
  );
}
