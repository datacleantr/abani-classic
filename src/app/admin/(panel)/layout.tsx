import Link from "next/link";
import type { ReactNode } from "react";

import { adminLogoutAction } from "@/app/actions/auth";
import { AdminNav, type AdminNavItem } from "@/components/admin/admin-nav";
import { canManageCatalog, canManageImports, canManageOrders, requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  super_admin: "Süper yönetici",
  catalog_manager: "Katalog yöneticisi",
  inventory_manager: "Stok yöneticisi",
  order_manager: "Sipariş yöneticisi",
  content_editor: "İçerik editörü",
  customer_support: "Müşteri destek",
  analyst: "Analist",
};

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  const items: AdminNavItem[] = [
    { href: "/admin", label: "Panel", description: "KPI ve operasyon özeti" },
    ...(canManageCatalog(admin.role) || admin.role === "inventory_manager" || admin.role === "analyst"
      ? [{ href: "/admin/urunler", label: "Ürünler", description: "Katalog ve varyantlar" }]
      : []),
    ...(canManageOrders(admin.role) || admin.role === "analyst"
      ? [{ href: "/admin/siparisler", label: "Siparişler", description: "Yaşam döngüsü ve kargo" }]
      : []),
    ...(canManageImports(admin.role)
      ? [{ href: "/admin/ice-aktarim", label: "İçe aktarım", description: "Pazaryeri dry-run" }]
      : []),
    ...(admin.role !== "content_editor"
      ? [{ href: "/admin/stok", label: "Stok", description: "Hareket ve düzeltme" }]
      : []),
    ...(canManageCatalog(admin.role)
      ? [{ href: "/admin/yorumlar", label: "Yorumlar", description: "Moderasyon kuyruğu" }]
      : []),
    { href: "/admin/denetim", label: "Denetim", description: "Audit log kayıtları" },
    { href: "/admin/ayarlar", label: "Ayarlar", description: "Kararlar ve ortam" },
  ];

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="flex flex-col gap-6 bg-charcoal p-4 text-ivory lg:min-h-screen lg:p-5">
        <div>
          <p className="font-display text-xl tracking-[0.22em]">ABANI</p>
          <p className="mt-1 text-[8px] uppercase tracking-[0.4em] text-sand">Classic · Admin</p>
        </div>
        <AdminNav items={items} />
        <div className="mt-auto hidden rounded-xl border border-white/10 p-3 lg:block">
          <p className="text-[10px] uppercase tracking-[0.14em] text-ivory/40">Oturum</p>
          <p className="mt-1 text-sm">{admin.name}</p>
          <p className="text-[11px] text-sand">{roleLabels[admin.role] ?? admin.role}</p>
          <p className="mt-1 truncate text-[10px] text-ivory/40">{admin.email}</p>
          <form action={adminLogoutAction} className="mt-3">
            <button type="submit" className="w-full rounded-md border border-white/20 px-2 py-1.5 text-[11px] text-ivory/70 hover:bg-white/10">
              Çıkış yap
            </button>
          </form>
          <Link href="/" className="mt-2 block text-center text-[10px] text-ivory/40 underline underline-offset-2">
            Mağazayı görüntüle
          </Link>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-3 lg:px-8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            Abani Classic · Operasyon paneli
          </p>
          <div className="flex items-center gap-3 text-[11px] text-muted">
            <span className="rounded-full border border-line px-2 py-1">{roleLabels[admin.role] ?? admin.role}</span>
            <span className="hidden sm:inline">{admin.email}</span>
            <form action={adminLogoutAction} className="lg:hidden">
              <button type="submit" className="rounded-md border border-line px-2 py-1">Çıkış</button>
            </form>
          </div>
        </header>
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
