import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CatalogView } from "@/components/store/catalog-view";
import { getCategoryBySlug, listProducts } from "@/lib/catalog";
import { parseListSearch, type RawParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawParams>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Kategori bulunamadı" };
  return {
    title: category.name,
    description: category.description ?? `${category.name} koleksiyonu — Abani Classic.`,
    alternates: { canonical: `/kategoriler/${category.slug}` },
    openGraph: {
      title: `${category.name} | Abani Classic`,
      description: category.description ?? undefined,
      images: category.imageUrl ? [{ url: category.imageUrl }] : undefined,
    },
  };
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const raw = await searchParams;
  const { options, sort } = parseListSearch(raw);
  const result = await listProducts({ ...options, categorySlug: slug, sort });

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana sayfa", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: category.name,
        item: `/kategoriler/${category.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <CatalogView
        title={category.name}
        intro={category.description}
        seoText={category.seoText}
        basePath={`/kategoriler/${category.slug}`}
        params={raw}
        result={result}
        activeSort={sort ?? "recommended"}
      />
    </>
  );
}
