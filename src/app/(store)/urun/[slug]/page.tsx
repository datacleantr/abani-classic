import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartForm } from "@/components/store/add-to-cart-form";
import { ProductCard } from "@/components/store/product-card";
import { getProductDetail } from "@/lib/catalog";
import { formatDate, formatMoney, jsonLd } from "@/lib/format";
import { packLabel, PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/product-card-helpers";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) return { title: "Ürün bulunamadı" };
  // Yalnızca gerçek alanlar: kısa açıklama yoksa ad, marka, (kayıtlıysa) kumaş ve paket bilgisi.
  const description =
    product.shortDescription?.trim() ||
    [product.name, product.brandName, product.fabric?.trim(), packLabel(product.packQuantity) ?? product.packInfo?.trim()]
      .filter(Boolean)
      .join(" · ");
  return {
    title: `${product.name} — ${product.brandName}`,
    description,
    alternates: { canonical: `/urun/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.image === PRODUCT_IMAGE_PLACEHOLDER ? undefined : [{ url: product.image }],
      type: "website",
    },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.images.map((image) => image.url).filter((url) => url !== PRODUCT_IMAGE_PLACEHOLDER),
    description: product.description ?? product.shortDescription ?? product.name,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: product.brandName },
    offers: {
      "@type": "Offer",
      url: `/urun/${product.slug}`,
      priceCurrency: "TRY",
      price: (product.price / 100).toFixed(2),
      availability:
        product.stockTotal > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Abani Classic" },
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Ana sayfa", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: product.categoryName,
        item: `/kategoriler/${product.categorySlug}`,
      },
      { "@type": "ListItem", position: 3, name: product.name, item: `/urun/${product.slug}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />

      <div className="container-page py-8">
        <nav aria-label="Breadcrumb" className="text-[11px] uppercase tracking-[0.14em] text-muted">
          <Link href="/" className="hover:text-charcoal">Ana sayfa</Link>
          <span className="mx-2 text-line">/</span>
          <Link href={`/kategoriler/${product.categorySlug}`} className="hover:text-charcoal">
            {product.categoryName}
          </Link>
          <span className="mx-2 text-line">/</span>
          <span className="text-charcoal">{product.name}</span>
        </nav>

        <div className="mt-5 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-line bg-ivory-deep">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.images[0]?.url ?? product.image}
                alt={product.images[0]?.alt ?? product.name}
                className="aspect-[4/5] w-full object-cover"
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {product.images.slice(1, 3).map((image, index) => (
                <div key={`${image.url}-${index}`} className="overflow-hidden rounded-xl border border-line bg-ivory-deep">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt ?? `${product.name} görsel ${index + 2}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="eyebrow">{product.brandName}</p>
            <h1 className="mt-2 text-[30px] leading-tight sm:text-[38px]">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span>Model: {product.modelCode ?? "—"}</span>
              {product.reviewCount > 0 ? (
                <span aria-label={`${product.rating} yıldız, ${product.reviewCount} yorum`}>
                  ★ {product.rating.toFixed(1)} · {product.reviewCount} yorum
                </span>
              ) : (
                <span>İlk yorumu siz yazın</span>
              )}
              {product.packInfo ? <span>{product.packInfo}</span> : null}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-charcoal/75">{product.shortDescription}</p>

            <AddToCartForm product={product} />

            <div className="mt-7 grid gap-3 rounded-2xl border border-line bg-white p-5 text-sm">
              <details className="group">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  Kumaş ve bakım
                  <span aria-hidden="true" className="text-muted">+</span>
                </summary>
                <div className="mt-2 space-y-1 text-xs leading-relaxed text-muted">
                  <p>{product.fabric}</p>
                  <p>{product.care}</p>
                </div>
              </details>
              <details className="group border-t border-line pt-3">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  Kargo ve teslimat
                  <span aria-hidden="true" className="text-muted">+</span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  Kargo ücreti sepet tutarına göre hesaplanır ve ödeme adımında sipariş özetinde
                  gösterilir. Siparişinizi kargoya verildikten sonra takip numarasıyla izleyebilirsiniz.
                </p>
              </details>
              <details className="group border-t border-line pt-3">
                <summary className="flex cursor-pointer items-center justify-between font-medium">
                  İade ve değişim
                  <span aria-hidden="true" className="text-muted">+</span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  İade ve cayma koşulları{" "}
                  <Link href="/yasal/iade" className="underline decoration-line underline-offset-2">
                    İade ve Değişim
                  </Link>{" "}
                  sayfasında yer alır. İç giyim ve hijyen ürünlerinde her talep ayrıca incelenir.
                </p>
              </details>
            </div>
          </div>
        </div>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-xl">{product.description ? "Ürün açıklaması" : "Ürün özellikleri"}</h2>
            {product.description ? (
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-charcoal/75">
                {product.description}
              </p>
            ) : null}
            {Object.keys(product.attributes).length > 0 ? (
              <dl className="mt-4 grid grid-cols-1 gap-x-6 text-sm sm:grid-cols-2">
                {Object.entries(product.attributes).map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4 border-b border-line/70 py-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-right text-charcoal">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {product.packInfo ? (
              <p className="mt-4 rounded-lg bg-ivory px-3 py-2 text-xs text-muted">
                Paket içeriği: {product.packInfo}
              </p>
            ) : null}
          </div>
          <div className="rounded-2xl border border-line bg-white p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl">Müşteri yorumları</h2>
              {product.reviewCount > 0 ? (
                <p className="text-xs text-muted">{product.rating.toFixed(1)} / 5</p>
              ) : null}
            </div>
            {product.reviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Bu ürün için henüz doğrulanmış yorum yok. Yalnızca satın alma doğrulanmış yorumlar
                yayınlanır.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-line/70">
                {product.reviews.map((review) => (
                  <li key={review.id} className="py-4 first:pt-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{review.title ?? "Değerlendirme"}</p>
                      <span className="text-xs text-navy" aria-label={`${review.rating} yıldız`}>
                        {"★".repeat(review.rating)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed text-charcoal/75">{review.body}</p>
                    <p className="mt-2 text-[11px] text-muted">
                      {review.customerName}
                      {review.isVerifiedPurchase ? " · Doğrulanmış alışveriş" : ""} ·{" "}
                      {formatDate(review.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-line/70 bg-ivory-deep/60 p-6">
          <p className="eyebrow">Beden tablosu</p>
          <div className="mt-3 overflow-x-auto">
            <table className="table-base min-w-[420px]">
              <thead>
                <tr>
                  <th>Beden</th>
                  <th>Bel (cm)</th>
                  <th>Kalça (cm)</th>
                  <th>Boy (cm)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["S", "72-78", "88-94", "165-172"],
                  ["M", "78-84", "94-100", "170-177"],
                  ["L", "84-90", "100-106", "175-182"],
                  ["XL", "90-98", "106-112", "178-185"],
                  ["XXL", "98-106", "112-118", "180-188"],
                ].map((row) => (
                  <tr key={row[0]}>
                    {row.map((cell) => (
                      <td key={cell} className="text-xs">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Ölçüler vücut ölçüsüdür; ürün kalıbı esnektir. Arada kaldığınızda bir beden büyük tercih
            edebilirsiniz.
          </p>
        </section>

        {product.relatedProducts.length > 0 ? (
          <section className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="eyebrow">Tamamlayıcılar</p>
                <h2 className="mt-2 text-2xl">Bunlarla iyi gider</h2>
              </div>
              <Link href={`/kategoriler/${product.categorySlug}`} className="link-quiet">
                {product.categoryName} kategorisi →
              </Link>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
              {product.relatedProducts.map((related) => (
                <ProductCard key={related.id} product={related} />
              ))}
            </div>
          </section>
        ) : null}

        <p className="mt-10 text-center text-[11px] text-muted">
          Liste fiyatı {formatMoney(product.listPrice)} · Güncel fiyat {formatMoney(product.price)} ·
          Fiyatlara KDV dahildir.
        </p>
      </div>
    </>
  );
}
