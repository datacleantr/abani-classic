import type { Metadata } from "next";

import { CatalogView } from "@/components/store/catalog-view";
import { listProducts } from "@/lib/catalog";
import { parseListSearch, type RawParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Arama",
  description: "Abani Classic kataloğunda ürün, marka ve model kodu arayın.",
  robots: { index: false, follow: true },
};

type PageProps = { searchParams: Promise<RawParams> };

export default async function SearchPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const { options, sort, q } = parseListSearch(raw);
  const result = await listProducts({ ...options, sort });

  return (
    <CatalogView
      title={q ? `“${q}” için sonuçlar` : "Tüm ürünler"}
      intro={
        q
          ? `${result.total} ürün bulundu. Türkçe karakter farkları aramada dikkate alınmaz.`
          : "Abani Classic kataloğundaki tüm yayınlanmış ürünler."
      }
      basePath="/arama"
      params={raw}
      result={result}
      activeSort={sort ?? "recommended"}
    />
  );
}
