import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/auth-panel";
import { getSessionIdentity } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Giriş / Üyelik",
  description: "Abani Classic hesabınıza giriş yapın veya yeni hesap oluşturun.",
};

export default async function LoginPage() {
  const identity = await getSessionIdentity();
  if (identity?.type === "customer") redirect("/hesabim");
  if (identity?.type === "admin") redirect("/admin");

  return (
    <div className="container-page py-12">
      <div className="mx-auto max-w-md text-center">
        <p className="eyebrow">Hesabım</p>
        <h1 className="mt-2 text-[32px]">Abani Classic hesabınız</h1>
        <p className="mt-2 text-sm text-muted">
          Siparişlerinizi takip edin, iade talebi oluşturun ve iletişim izinlerinizi yönetin.
        </p>
      </div>
      <div className="mt-8">
        <AuthPanel />
      </div>
    </div>
  );
}
