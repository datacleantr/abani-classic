import Link from "next/link";
import { redirect } from "next/navigation";

import { ImportUploadForm } from "@/components/admin/forms";
import { listImportBatches } from "@/lib/imports";
import { canManageImports, requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusTone: Record<string, string> = {
  needs_review: "border-amber-200 bg-amber-50 text-amber-800",
  applied: "border-emerald-200 bg-emerald-50 text-emerald-800",
  parsed: "border-line bg-ivory text-muted",
};

export default async function ImportPage() {
  const admin = await requireAdmin();
  if (!canManageImports(admin.role)) redirect("/admin");
  const batches = await listImportBatches();

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Catalog Intelligence Engine</p>
        <h1 className="mt-1 text-2xl">Pazaryeri içe aktarımı</h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
          Yetkili satıcı dışa aktarımı → ham kayıt → doğrulama → eşleştirme → insan onayı →
          yayın. Dosya hash&apos;i tekrar yüklemelerde uyarı üretir; aynı paket iki kez uygulanmaz.
        </p>
      </header>

      <ImportUploadForm />

      <section className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[760px]">
          <thead>
            <tr>
              <th>Paket</th>
              <th>Kaynak</th>
              <th>Satır</th>
              <th>Hatalı</th>
              <th>Eşleşme</th>
              <th>Yeni</th>
              <th>Mod</th>
              <th>Durum</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td className="text-xs">
                  <p className="line-clamp-1">{batch.fileName}</p>
                  <p className="text-[10px] text-muted">{formatDate(batch.createdAt, true)} · {batch.createdBy}</p>
                </td>
                <td className="text-xs">{batch.sourceKey}</td>
                <td className="text-xs">{batch.totalRows}</td>
                <td className="text-xs">{batch.errorRows}</td>
                <td className="text-xs">{batch.matchRows}</td>
                <td className="text-xs">{batch.newRows}</td>
                <td className="text-xs">{batch.mode}</td>
                <td>
                  <span className={`badge ${statusTone[batch.status] ?? "border-line"}`}>{batch.status}</span>
                </td>
                <td>
                  <Link href={`/admin/ice-aktarim/${batch.id}`} className="text-[11px] underline underline-offset-2">
                    İncele
                  </Link>
                </td>
              </tr>
            ))}
            {batches.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-6 text-center text-xs text-muted">Henüz içe aktarım yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
