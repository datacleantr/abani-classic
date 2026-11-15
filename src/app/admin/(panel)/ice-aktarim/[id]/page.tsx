import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplyImportForm, ResolveImportItemForm } from "@/components/admin/forms";
import { listAdminProducts } from "@/lib/admin";
import { canManageImports, requireAdmin } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { getImportBatch } from "@/lib/imports";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

const statusTone: Record<string, string> = {
  match: "border-emerald-200 bg-emerald-50 text-emerald-800",
  review: "border-amber-200 bg-amber-50 text-amber-800",
  new: "border-sky-200 bg-sky-50 text-sky-800",
  applied: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-700",
};

export default async function ImportBatchPage({ params }: PageProps) {
  const admin = await requireAdmin();
  if (!canManageImports(admin.role)) redirect("/admin");
  const { id } = await params;
  const batch = await getImportBatch(id);
  if (!batch) notFound();
  const productOptions = await listAdminProducts({});
  const pendingRows = batch.items.filter((item) => item.status === "review" || item.status === "new");

  const applicable = batch.items.some(
    (item) => item.status === "new" || item.status === "match" || item.status === "review",
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow">İçe aktarım · {batch.sourceKey}</p>
          <h1 className="mt-1 text-2xl">{batch.fileName}</h1>
          <p className="mt-1 text-xs text-muted">
            {formatDate(batch.createdAt, true)} · {batch.createdBy} · mod: {batch.mode} · hash:{" "}
            {batch.fileHash.slice(0, 12)}…
          </p>
        </div>
        <Link href="/admin/ice-aktarim" className="btn-quiet">Listeye dön</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-5">
        {[
          { label: "Toplam satır", value: batch.totalRows },
          { label: "Geçerli", value: batch.validRows },
          { label: "Hatalı", value: batch.errorRows },
          { label: "Eşleşme", value: batch.matchRows },
          { label: "Yeni aday", value: batch.newRows },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{card.label}</p>
            <p className="mt-1 font-display text-xl">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-lg">Onay ve uygulama</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Uygulama; eşleşen satırlar için marketplace_listings kaydı oluşturur, yeni adaylar için
              taslak ürün üretir. Hiçbir ürün otomatik yayınlanmaz. Eksik marka veya barkod çelişkisi
              olan satırlar hata olarak kalır.
            </p>
            {pendingRows.length > 0 ? (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                {pendingRows.length} satır insan kararı bekliyor. Belirsiz eşleşmeler otomatik
                birleştirilmez; sağdaki karar kolonundan ürün seçin veya yeni ürün olarak işaretleyin.
              </p>
            ) : null}
          </div>
          <div>
            <ApplyImportForm batchId={batch.id} disabled={!applicable} />
            {!applicable ? (
              <p className="mt-2 text-[11px] text-muted">Bu paket uygulanmış veya uygulanabilir satır yok.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[900px]">
          <thead>
            <tr>
              <th>Satır</th>
              <th>Ürün</th>
              <th>Marka</th>
              <th>Barkod / SKU</th>
              <th>Kaynak fiyat</th>
              <th>Stok</th>
              <th>Skor</th>
              <th>Durum</th>
              <th>Not</th>
              <th>İnsan kararı</th>
            </tr>
          </thead>
          <tbody>
            {batch.items.map((item) => (
              <tr key={item.id}>
                <td className="text-xs">{item.rowNumber}</td>
                <td className="text-xs">{item.title ?? "—"}</td>
                <td className="text-xs">{item.brandName ?? "—"}</td>
                <td className="text-[11px] text-muted">
                  {item.barcode ?? "—"}
                  <p>{item.sourceSku ?? ""}</p>
                </td>
                <td className="text-xs">
                  {item.sourcePriceMinor ? formatMoney(item.sourcePriceMinor) : "—"}
                  <p className="text-[10px] text-muted">satış fiyatı değil</p>
                </td>
                <td className="text-xs">{item.sourceStock ?? "—"}</td>
                <td className="text-xs">{item.matchScore ?? "—"}</td>
                <td>
                  <span className={`badge ${statusTone[item.status] ?? "border-line"}`}>{item.status}</span>
                </td>
                <td className="text-[11px] text-muted">{item.message ?? "—"}</td>
                <td>
                  {item.status === "review" || item.status === "new" ? (
                    <ResolveImportItemForm
                      itemId={item.id}
                      batchId={batch.id}
                      products={productOptions.map((product) => ({ id: product.id, name: product.name }))}
                    />
                  ) : (
                    <span className="text-[10px] text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
