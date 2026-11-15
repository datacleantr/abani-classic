import { redirect } from "next/navigation";

import { ReviewToggleForm } from "@/components/admin/forms";
import { listReviewsForAdmin } from "@/lib/admin";
import { canManageCatalog, requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const admin = await requireAdmin();
  if (!canManageCatalog(admin.role)) redirect("/admin");
  const reviews = await listReviewsForAdmin();

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">İçerik</p>
        <h1 className="mt-1 text-2xl">Yorum moderasyonu</h1>
        <p className="mt-1 text-xs text-muted">
          Yalnızca doğrulanmış yorumlar yayınlanır. Sahte yorum veya gerçeği yansıtmayan puan
          üretilmez.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm">{review.title ?? "Değerlendirme"}</p>
                <p className="text-[10px] text-muted">
                  {review.customerName} · {review.productName} · {formatDate(review.createdAt)}
                </p>
              </div>
              <span className="text-xs text-sand" aria-label={`${review.rating} yıldız`}>
                {"★".repeat(review.rating)}
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-charcoal/75">{review.body}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className={`badge ${review.isApproved ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                {review.isApproved ? "Yayında" : "Onay bekliyor"}
              </span>
              <ReviewToggleForm reviewId={review.id} approved={review.isApproved} />
            </div>
          </article>
        ))}
        {reviews.length === 0 ? (
          <p className="text-xs text-muted">Yorum kaydı yok.</p>
        ) : null}
      </div>
    </div>
  );
}
