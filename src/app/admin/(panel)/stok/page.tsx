import { StockAdjustForm } from "@/components/admin/forms";
import { listInventoryRows } from "@/lib/admin";
import { canManageInventory, requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const admin = await requireAdmin();
  const rows = await listInventoryRows();
  const lowCount = rows.filter((row) => row.available <= (row.reorderLevel ?? 5)).length;

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Stok</p>
        <h1 className="mt-1 text-2xl">Envanter</h1>
        <p className="mt-1 text-xs text-muted">
          {rows.length} varyant · {lowCount} düşük stok. Satılabilir stok = on_hand − reserved.
          Düzeltmeler append-only hareket kaydı üretir.
        </p>
      </header>

      {!canManageInventory(admin.role) ? (
        <p className="rounded-xl border border-line bg-white px-4 py-3 text-xs text-muted">
          Bu hesap stok düzeltmesi yapamaz; kayıtları görüntüleyebilir.
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-line bg-white">
        <table className="table-base min-w-[860px]">
          <thead>
            <tr>
              <th>Ürün / SKU</th>
              <th>Varyant</th>
              <th>Durum</th>
              <th>On hand</th>
              <th>Rezerve</th>
              <th>Satılabilir</th>
              <th>Güncelleme</th>
              <th>Düzeltme</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.variantId}>
                <td className="text-xs">
                  {row.productName}
                  <p className="text-[10px] text-muted">{row.sku}</p>
                </td>
                <td className="text-xs">{row.color} / {row.size}</td>
                <td className="text-[11px] text-muted">{row.status}</td>
                <td className="text-xs">{row.onHand ?? 0}</td>
                <td className="text-xs">{row.reserved ?? 0}</td>
                <td className={`text-xs ${row.available <= 0 ? "text-red-700" : row.available <= (row.reorderLevel ?? 5) ? "text-amber-700" : ""}`}>
                  {row.available}
                </td>
                <td className="text-[10px] text-muted">{formatDate(row.updatedAt)}</td>
                <td>
                  {canManageInventory(admin.role) ? <StockAdjustForm variantId={row.variantId} /> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
