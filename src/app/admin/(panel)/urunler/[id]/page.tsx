import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AddVariantForm, ProductForm, StockAdjustForm } from "@/components/admin/forms";
import { getAdminFormOptions, getAdminProduct } from "@/lib/admin";
import { canManageCatalog, canManageInventory, requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role) && !canManageInventory(admin.role)) redirect("/admin");
  const { id } = await params;
  const [product, options] = await Promise.all([getAdminProduct(id), getAdminFormOptions()]);
  if (!product) notFound();

  return (
    <div className="max-w-5xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Katalog · {product.brandName}</p>
          <h1 className="mt-1 text-2xl">{product.name}</h1>
          <p className="mt-1 text-xs text-muted">
            {product.categoryName} · {product.variants.length} varyant · son güncelleme {formatDate(product.updatedAt, true)}
          </p>
        </div>
        <div className="flex gap-2">
          {product.status === "published" ? (
            <Link href={`/urun/${product.slug}`} className="btn-quiet">Mağazada gör</Link>
          ) : null}
          <Link href="/admin/urunler" className="btn-outline">Listeye dön</Link>
        </div>
      </header>

      {canManageCatalog(admin.role) ? (
        <ProductForm
          options={options}
          product={{
            id: product.id,
            name: product.name,
            slug: product.slug,
            brandId: product.brandId,
            categoryId: product.categoryId,
            modelCode: product.modelCode,
            shortDescription: product.shortDescription,
            description: product.description,
            fabric: product.fabric,
            care: product.care,
            listPrice: product.listPrice,
            salePrice: product.salePrice,
            status: product.status,
          }}
        />
      ) : (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
          Görüntüleme yetkiniz var; ürün düzenleme için katalog yetkisi gerekir.
        </p>
      )}

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg">Varyantlar ve stok</h2>
          <p className="text-[11px] text-muted">SKU teslim edilen stok = on_hand − reserved</p>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="table-base min-w-[680px]">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Renk / Beden</th>
                <th>Barkod</th>
                <th>Stok</th>
                <th>Rezerve</th>
                <th>Kullanılabilir</th>
                <th>Düzeltme</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant) => {
                const available = (variant.onHand ?? 0) - (variant.reserved ?? 0);
                return (
                  <tr key={variant.id}>
                    <td className="text-[11px]">{variant.sku}</td>
                    <td className="text-xs">{variant.color} / {variant.size}</td>
                    <td className="text-[11px] text-muted">{variant.barcode ?? "—"}</td>
                    <td className="text-xs">{variant.onHand ?? 0}</td>
                    <td className="text-xs">{variant.reserved ?? 0}</td>
                    <td className={`text-xs ${available <= 0 ? "text-red-700" : available <= 5 ? "text-amber-700" : ""}`}>
                      {available}
                    </td>
                    <td>{canManageInventory(admin.role) ? <StockAdjustForm variantId={variant.id} /> : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {canManageCatalog(admin.role) ? <AddVariantForm productId={product.id} /> : null}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <h2 className="text-lg">Fiyat geçmişi ve maliyet notu</h2>
        <div className="mt-2 grid gap-3 text-xs sm:grid-cols-3">
          <div>
            <p className="text-muted">Liste fiyatı</p>
            <p className="mt-1 text-sm">{formatMoney(product.listPrice)}</p>
          </div>
          <div>
            <p className="text-muted">Satış fiyatı</p>
            <p className="mt-1 text-sm">{formatMoney(product.salePrice)}</p>
          </div>
          <div>
            <p className="text-muted">KDV oranı</p>
            <p className="mt-1 text-sm">%{product.taxRate} (fiyata dahil)</p>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Kâr raporu; maliyet, ödeme komisyonu, kargo ve iade maliyetleri tanımlandıktan sonra
          açılacaktır. Kaynak pazaryeri fiyatı satış fiyatı alanına yazılmaz.
        </p>
      </section>
    </div>
  );
}
