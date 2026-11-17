import type { MetadataRoute } from "next";

import { getStoreBrands, getStoreCategories, listProducts } from "@/lib/catalog";

const baseUrl = process.env.APP_URL ?? "https://abaniclassic.com";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, priority: 1 },
    { url: `${baseUrl}/arama`, priority: 0.6 },
    { url: `${baseUrl}/markalar`, priority: 0.6 },
    { url: `${baseUrl}/kampanyalar`, priority: 0.6 },
    { url: `${baseUrl}/hakkimizda`, priority: 0.4 },
    { url: `${baseUrl}/iletisim`, priority: 0.4 },
    { url: `${baseUrl}/sss`, priority: 0.4 },
    { url: `${baseUrl}/kargo-ve-teslimat`, priority: 0.4 },
    { url: `${baseUrl}/siparis-takip`, priority: 0.3 },
    { url: `${baseUrl}/yasal/kvkk`, priority: 0.2 },
    { url: `${baseUrl}/yasal/mesafeli-satis`, priority: 0.2 },
    { url: `${baseUrl}/yasal/iade`, priority: 0.2 },
    { url: `${baseUrl}/yasal/gizlilik`, priority: 0.2 },
  ];

  try {
    const [categories, brands, products] = await Promise.all([
      getStoreCategories(),
      getStoreBrands(),
      listProducts({ perPage: 500 }),
    ]);

    return [
      ...staticRoutes,
      ...categories.map((category) => ({
        url: `${baseUrl}/kategoriler/${category.slug}`,
        priority: 0.9,
      })),
      ...brands.map((brand) => ({ url: `${baseUrl}/markalar/${brand.slug}`, priority: 0.7 })),
      ...products.items.map((product) => ({
        url: `${baseUrl}/urun/${product.slug}`,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
