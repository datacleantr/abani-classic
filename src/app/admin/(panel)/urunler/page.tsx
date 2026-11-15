import Link from "next/link";

import { listAdminProducts } from "@/lib/admin";
import { canManageCatalog, requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney, PRODUCT_STATUS_LABELS } from "@/lib/format";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ durum?: string; q?: string }> };

const statusTone: Record<string, string> = {
  published: "border-emerald-200 bg-emerald-50 text-emerald-800",
  draft: "border-line bg-ivory text-muted",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  archived: "border-neutral-200 bg-neutral-100 text-neutral-600",
};

export default async function AdminProductsPage({ searchParams }: PageProps) {
  const admin = await requireAdmin();
  const { durum, q } = await searchParams;
  const status = durum ?? "all";
  const products = await listAdminProducts({ status, q });

  const tabs = [
    { key: "all", label: "Tümü" },
    { key: "published", label: "Yayında" },
    { key: "review", label: "Onay bekleyen" },
    { key: "draft", label: "Taslak" },
    { key: "archived", label: "Arşiv" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Katalog</p>
          <h1 className="mt-1 text-2xl">Ürünler</h1>
          <p className="mt-1 text-xs text-muted">
            {products.length} ürün listeleniyor. Varyant ve stok işlemleri ürün detayından yapılır.
          </p>
        </div>
        {canManageCatalog(admin.role) ? (
          <Link href="/admin/urunler/yeni" className="btn-dark">Yeni ürün</Link>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={`/admin/urunler?durum=${tab.key}`}
              className={
                tab.key === status
                  ? "rounded-full bg-charcoal px-3 py-1.5 text-ivory"
                  : "rounded-full border border-line bg-white px-3 py-1.5 text-muted hover:border-charcoal"
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <form method="get" action="/admin/urunler" className="flex gap-2">
          <input type="hidden" name="durum" value={status} />
          <input name="q" defaultValue={q ?? ""} placeholder="Ürün adı veya model kodu" className="input py-1.5 text-xs" />
          <button type="submit" className="btn-quiet py-1.5">Ara</button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[760px]">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Marka / Kategori</th>
              <th>Fiyat</th>
              <th>Varyant</th>
              <th>Stok</th>
              <th>Durum</th>
              <th>Güncelleme</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>
                  <p className="text-sm">{product.name}</p>
                  <p className="text-[10px] text-muted">{product.slug}</p>
                </td>
                <td className="text-xs">
                  {product.brandName}
                  <p className="text-[10px] text-muted">{product.categoryName}</p>
                </td>
                <td className="text-xs">
                  {formatMoney(product.salePrice)}
                  {product.listPrice > product.salePrice ? (
                    <p className="text-[10px] text-muted line-through">{formatMoney(product.listPrice)}</p>
                  ) : null}
                </td>
                <td className="text-xs">{product.variantCount}</td>
                <td className={`text-xs ${product.stock <= 0 ? "text-red-700" : ""}`}>{product.stock}</td>
                <td>
                  <span className={`badge ${statusTone[product.status] ?? "border-line"}`}>
                    {PRODUCT_STATUS_LABELS[product.status] ?? product.status}
                  </span>
                </td>
                <td className="text-[11px] text-muted">{formatDate(product.updatedAt)}</td>
                <td>
                  <Link href={`/admin/urunler/${product.id}`} className="text-[11px] underline underline-offset-2">
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
