import { ProductCard } from "@/components/store/product-card";
import type { ProductCardView } from "@/lib/catalog";

import { SectionHeading, SectionLink } from "./section-heading";

/**
 * "Çok tercih edilenler": sıralama Pazarama ilanlarındaki değerlendirme sayısına dayanır.
 * Sayı ve puan Pazarama'nındır, burada gösterilmez; yalnızca kaynak notu verilir.
 */
export function MostPreferred({ products }: { products: ProductCardView[] }) {
  if (products.length === 0) return null;

  return (
    <section aria-labelledby="cok-tercih-baslik" className="border-y border-line/60 bg-white py-16 sm:py-20">
      <div className="container-page">
        <SectionHeading
          id="cok-tercih-baslik"
          eyebrow="Öne çıkanlar"
          title="Çok tercih edilenler"
          lead="Pazarama mağazamızdaki değerlendirme sayısına göre sıralanmıştır. Fiyatlara KDV dahildir."
          action={<SectionLink href="/arama">Tüm ürünleri gör</SectionLink>}
        />
        <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:mt-10 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
