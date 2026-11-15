import type { Metadata } from "next";

import { CartPageView } from "@/components/cart/cart-page-view";

export const metadata: Metadata = {
  title: "Sepet",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container-page py-10">
      <p className="eyebrow">Sepet</p>
      <h1 className="mt-2 text-[32px] sm:text-[38px]">Alışveriş sepetiniz</h1>
      <CartPageView />
    </div>
  );
}
