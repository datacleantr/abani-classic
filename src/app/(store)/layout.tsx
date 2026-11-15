import type { ReactNode } from "react";

import { CartProvider } from "@/components/cart/cart-store";
import { CartDrawer } from "@/components/store/cart-drawer";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getSessionIdentity } from "@/lib/auth";
import { getStoreBrands, getStoreCategories } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function StoreLayout({ children }: { children: ReactNode }) {
  const [categories, brands, identity] = await Promise.all([
    getStoreCategories(),
    getStoreBrands(),
    getSessionIdentity(),
  ]);

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader
          categories={categories.map((category) => ({ name: category.name, slug: category.slug }))}
          brands={brands.map((brand) => ({ name: brand.name, slug: brand.slug }))}
          customerName={
            identity?.type === "customer" ? `${identity.customer.firstName} ${identity.customer.lastName}` : null
          }
        />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <CartDrawer />
      </div>
    </CartProvider>
  );
}
