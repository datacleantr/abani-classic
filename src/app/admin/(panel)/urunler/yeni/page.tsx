import Link from "next/link";
import { redirect } from "next/navigation";

import { ProductForm } from "@/components/admin/forms";
import { getAdminFormOptions } from "@/lib/admin";
import { canManageCatalog, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role)) redirect("/admin/urunler");
  const options = await getAdminFormOptions();

  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <p className="eyebrow">Katalog</p>
        <h1 className="mt-1 text-2xl">Yeni ürün</h1>
        <p className="mt-1 text-xs text-muted">
          Ürün önce taslak/onay bekliyor olarak oluşturulur. Yayına almak için stok ve içerik
          kontrolünden sonra durumu değiştirin.
        </p>
      </header>
      {options.brands.length === 0 || options.categories.length === 0 ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          Marka ve kategori kayıtları bulunamadı. Önce seed verisini yükleyin.
        </p>
      ) : (
        <ProductForm options={options} />
      )}
      <Link href="/admin/urunler" className="link-quiet">Ürün listesine dön</Link>
    </div>
  );
}
