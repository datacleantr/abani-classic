"use client";

import { useActionState } from "react";

import { createReturnAction } from "@/app/actions/store";
import type { ActionResult } from "@/lib/auth";

export function ReturnRequestForm({
  orderNumber,
  accessToken,
  items,
}: {
  orderNumber: string;
  accessToken?: string;
  items: { id: string; productName: string; variantLabel: string | null }[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createReturnAction,
    null,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      {accessToken ? <input type="hidden" name="accessToken" value={accessToken} /> : null}
      <div>
        <label htmlFor="orderItemId" className="field-label">İade edilecek ürün</label>
        <select id="orderItemId" name="orderItemId" className="input" defaultValue="">
          <option value="">Tüm sipariş</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.productName} {item.variantLabel ? `— ${item.variantLabel}` : ""}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="reason" className="field-label">İade nedeni</label>
        <textarea
          id="reason"
          name="reason"
          rows={3}
          required
          minLength={10}
          placeholder="Beden uyumsuzluğu, kumaş beklentisi, hasarlı ürün…"
          className="input"
        />
      </div>
      <p className="text-[11px] leading-relaxed text-muted">
        İç giyim ürünlerinde hijyen gereği ambalajı açılmış ürünlerde cayma hakkı istisnası
        uygulanabilir. Talebiniz hukuki değerlendirme sonrası yanıtlanır; sistem otomatik ret
        vermez.
      </p>
      <button type="submit" disabled={pending} className="btn-outline w-full">
        {pending ? "Gönderiliyor…" : "İade talebi oluştur"}
      </button>
      {state ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-xs ${
            state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
