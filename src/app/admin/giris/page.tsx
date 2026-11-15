import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/forms";
import { getSessionIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Yönetim girişi",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const identity = await getSessionIdentity();
  if (identity?.type === "admin") redirect("/admin");

  return (
    <div className="grid min-h-screen bg-charcoal lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 text-ivory lg:flex">
        <div>
          <p className="font-display text-2xl tracking-[0.24em]">ABANI</p>
          <p className="mt-1 text-[9px] uppercase tracking-[0.42em] text-sand">Classic · Operations</p>
        </div>
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight">Doğru veri, güvenilir ticaret.</h1>
          <p className="mt-4 text-sm leading-relaxed text-ivory/60">
            Katalog onayı, stok hareketleri, sipariş yaşam döngüsü ve içe aktarım kararları tek
            panelde. Tüm kritik işlemler rol kontrolü ve denetim kaydı ile korunur.
          </p>
          <ul className="mt-6 space-y-2 text-xs text-ivory/60">
            <li>— Pest kontrolü olmadan ürün yayını yapılmaz.</li>
            <li>— Pazaryeri fiyatı satış fiyatı olarak kullanılmaz.</li>
            <li>— Stok yalnızca transaction içinde değişir.</li>
          </ul>
        </div>
        <p className="text-[11px] text-ivory/40">© {new Date().getFullYear()} Abani Classic Teknoloji</p>
      </div>

      <div className="flex items-center justify-center bg-ivory p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden">
            <p className="font-display text-2xl tracking-[0.24em]">ABANI</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.42em] text-muted">Classic · Operations</p>
          </div>
          <p className="eyebrow mt-8 lg:mt-0">Yönetim paneli</p>
          <h1 className="mt-2 text-[30px]">Operasyona giriş</h1>
          <p className="mt-2 text-xs text-muted">
            Oturumlar veritabanında tutulur; çerez HttpOnly ve SameSite=Lax olarak işaretlenir.
          </p>
          <AdminLoginForm />
          <p className="mt-4 text-center text-[11px] text-muted">
            <Link href="/" className="underline decoration-line underline-offset-4">Mağazaya dön</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
