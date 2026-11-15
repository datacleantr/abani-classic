import type { ListOptions } from "./catalog";

export type RawParams = Record<string, string | string[] | undefined>;

function toArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
}

function toMinorPrice(value: string | string[] | undefined): number | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  const parsed = Number.parseFloat(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return Math.round(parsed * 100);
}

export function parseListSearch(raw: RawParams): {
  options: ListOptions;
  sort: ListOptions["sort"];
  page: number;
  q: string;
} {
  const sortValue = typeof raw.sort === "string" ? raw.sort : "recommended";
  const allowedSorts = ["recommended", "best_sellers", "price_asc", "price_desc", "newest"] as const;
  const sort = (allowedSorts as readonly string[]).includes(sortValue)
    ? (sortValue as ListOptions["sort"])
    : "recommended";
  const pageRaw = typeof raw.page === "string" ? Number.parseInt(raw.page, 10) : 1;
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
  const q = typeof raw.q === "string" ? raw.q.slice(0, 80) : "";

  return {
    sort,
    page,
    q,
    options: {
      q: q || undefined,
      sort,
      page,
      perPage: 12,
      brandFilters: toArray(raw.marka),
      sizeFilters: toArray(raw.beden),
      colorFilters: toArray(raw.renk),
      minPrice: toMinorPrice(raw.min),
      maxPrice: toMinorPrice(raw.max),
      inStockOnly: raw.stok === "1",
    },
  };
}
