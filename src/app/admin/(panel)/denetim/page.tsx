import { listAuditLogs } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireAdmin();
  const logs = await listAuditLogs(80);

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Uyumluluk</p>
        <h1 className="mt-1 text-2xl">Denetim kayıtları</h1>
        <p className="mt-1 text-xs text-muted">
          Kritik işlemler aktör, zaman ve özet ile append-only olarak kaydedilir. Loglarda kart
          bilgisi veya parola yer almaz.
        </p>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[820px]">
          <thead>
            <tr>
              <th>Zaman</th>
              <th>Aktör</th>
              <th>İşlem</th>
              <th>Varlık</th>
              <th>Özet</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="text-[11px] text-muted">{formatDate(log.createdAt, true)}</td>
                <td className="text-xs">
                  {log.actorEmail ?? log.actorType}
                  <p className="text-[10px] text-muted">{log.actorType}</p>
                </td>
                <td className="text-xs">{log.action}</td>
                <td className="text-[11px] text-muted">
                  {log.entityType}
                  <p className="truncate">{log.entityId ?? "—"}</p>
                </td>
                <td className="text-xs">{log.summary ?? "—"}</td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-xs text-muted">Kayıt yok.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
