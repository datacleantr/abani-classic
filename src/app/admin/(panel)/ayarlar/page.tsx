import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const roleMatrix = [
  { role: "Süper yönetici", product: "Tam", stock: "Tam", orders: "Tam", refund: "Evet", users: "Evet" },
  { role: "Katalog yöneticisi", product: "Tam", stock: "Tam", orders: "Hayır", refund: "Hayır", users: "Hayır" },
  { role: "Stok yöneticisi", product: "Hayır", stock: "Tam", orders: "Sınırlı", refund: "Hayır", users: "Hayır" },
  { role: "Sipariş yöneticisi", product: "Hayır", stock: "Sınırlı", orders: "Tam", refund: "Evet", users: "Hayır" },
  { role: "İçerik editörü", product: "İçerik", stock: "Hayır", orders: "Hayır", refund: "Hayır", users: "Hayır" },
  { role: "Müşteri destek", product: "Hayır", stock: "Hayır", orders: "Sınırlı", refund: "Hayır", users: "Hayır" },
  { role: "Analist", product: "Salt okunur", stock: "Salt okunur", orders: "Salt okunur", refund: "Hayır", users: "Hayır" },
];

const decisions = [
  { id: "ADR-001", title: "Mimari", decision: "Modüler monolith (Next.js App Router)", status: "Kabul edildi" },
  { id: "ADR-002", title: "Veritabanı", decision: "PostgreSQL + Drizzle ORM", status: "Kabul edildi" },
  { id: "ADR-005", title: "Katalog kaynağı", decision: "Yetkili export/API önceliği", status: "Kabul edildi" },
  { id: "ADR-006", title: "Ürün eşleştirme", decision: "İnsan onaylı kuyruk", status: "Kabul edildi" },
  { id: "ADR-008", title: "Ödeme sağlayıcısı", decision: "iyzico / PayTR / Param karşılaştırması", status: "Açık" },
  { id: "ADR-009", title: "Kargo sağlayıcısı", decision: "Mevcut operasyon firması", status: "Açık" },
  { id: "ADR-010", title: "Görsel hakları", decision: "Hak doğrulanmadan yayın yok", status: "Kabul edildi" },
  { id: "ADR-012", title: "Background jobs", decision: "Ayrı worker/queue (import, e-posta)", status: "Açık" },
];

export default async function SettingsPage() {
  const admin = await requireAdmin();

  const envChecks = [
    { key: "DATABASE_URL", label: "PostgreSQL bağlantısı", required: true },
    { key: "APP_URL", label: "Kanonik alan adı", required: true },
    { key: "PAYMENT_WEBHOOK_SECRET", label: "Ödeme webhook imza anahtarı", required: false },
    { key: "RESEND_API_KEY", label: "E-posta gönderim servisi", required: false },
    { key: "SHIPPING_API_KEY", label: "Kargo entegrasyonu", required: false },
    { key: "GOOGLE_ANALYTICS_ID", label: "GA4 ölçüm kimliği", required: false },
  ];

  return (
    <div className="space-y-5">
      <header>
        <p className="eyebrow">Sistem</p>
        <h1 className="mt-1 text-2xl">Ayarlar ve karar kayıtları</h1>
        <p className="mt-1 text-xs text-muted">
          Oturum: {admin.email} · Bu ekran yalnızca okuma sağlar; gizli değerler maskelenir.
        </p>
      </header>

      <section className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">Ortam değişkenleri</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {envChecks.map((check) => {
              const present = Boolean(process.env[check.key]);
              return (
                <li key={check.key} className="flex items-center justify-between gap-2">
                  <div>
                    <p>{check.label}</p>
                    <p className="text-[10px] text-muted">{check.key}</p>
                  </div>
                  <span
                    className={`badge ${
                      present
                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                        : check.required
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}
                  >
                    {present ? "Tanımlı" : check.required ? "Zorunlu" : "Bekliyor"}
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Gizli değerler hiçbir zaman istemciye gönderilmez. Webhook imza anahtarı yoksa ödeme
            bildirimleri reddedilir.
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg">Açık kararlar</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {decisions.map((decision) => (
              <li key={decision.id} className="flex items-start justify-between gap-2 border-b border-line/60 pb-2">
                <div>
                  <p>{decision.title}</p>
                  <p className="text-[10px] text-muted">{decision.id} · {decision.decision}</p>
                </div>
                <span
                  className={`badge ${
                    decision.status === "Açık"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {decision.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="overflow-x-auto rounded-2xl border border-line bg-white">
        <div className="border-b border-line px-5 py-3">
          <h2 className="text-lg">Rol yetki matrisi</h2>
          <p className="text-[11px] text-muted">
            Menü gizleme yeterli değildir; her server action ve route handler yetkiyi sunucuda
            doğrular.
          </p>
        </div>
        <table className="table-base min-w-[720px]">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Ürün</th>
              <th>Stok</th>
              <th>Sipariş</th>
              <th>Refund</th>
              <th>Kullanıcı</th>
            </tr>
          </thead>
          <tbody>
            {roleMatrix.map((row) => (
              <tr key={row.role}>
                <td className="text-xs">{row.role}</td>
                <td className="text-xs">{row.product}</td>
                <td className="text-xs">{row.stock}</td>
                <td className="text-xs">{row.orders}</td>
                <td className="text-xs">{row.refund}</td>
                <td className="text-xs">{row.users}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-2xl border border-line bg-charcoal p-5 text-ivory">
        <h2 className="text-lg">Ödeme ve kargo sözleşmeleri</h2>
        <p className="mt-2 text-xs leading-relaxed text-ivory/70">
          Canlıya geçiş öncesi ödeme sağlayıcısı sözleşmesi, kargo entegrasyonu, e-posta domain
          doğrulaması, ETBİS/İYS kayıtları ve hukuk kontrolü tamamlanmalıdır. Bu önizleme ortamında
          ödeme sağlayıcısı sandbox modunda simüle edilir; gerçek kart bilgisi işlenmez.
        </p>
      </section>
    </div>
  );
}
