import type { ReactNode } from "react";

import { CartProvider } from "@/components/cart/cart-store";
import { FavoritesProvider } from "@/components/favorites/favorites-store";
import { AnnouncementBar } from "@/components/store/announcement-bar";
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

  const navCategories = categories.map((category) => ({
    name: category.name,
    slug: category.slug,
    productCount: category.productCount,
  }));

  return (
    <CartProvider>
      <FavoritesProvider>
        <div className="flex min-h-screen flex-col">
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-navy focus:px-5 focus:py-3 focus:text-sm focus:text-white"
          >
            İçeriğe geç
          </a>
          <AnnouncementBar />
          <SiteHeader
            categories={navCategories}
            brands={brands.map((brand) => ({ name: brand.name, slug: brand.slug }))}
            customerName={
              identity?.type === "customer" ? `${identity.customer.firstName} ${identity.customer.lastName}` : null
            }
          />
          <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
            {children}
          </main>
          <SiteFooter categories={navCategories} />
          <CartDrawer />
        </div>
      </FavoritesProvider>
    </CartProvider>
  );
}
