import "dotenv/config";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";

import { db, pool } from "./index";
import * as s from "./schema";
import { hashPassword } from "../lib/password";

const tl = (value: number) => Math.round(value * 100);

type ProductSeed = {
  brand: string;
  category: string;
  name: string;
  slug: string;
  modelCode: string;
  shortDescription: string;
  description: string;
  fabric: string;
  care: string;
  packInfo?: string;
  listPrice: number;
  salePrice: number;
  featured?: boolean;
  isNew?: boolean;
  image: string;
  colors: string[];
  sizes: string[];
  packQuantity?: number;
  reviews?: { name: string; rating: number; title: string; body: string }[];
};

const brandsSeed = [
  {
    name: "Abani Classic",
    slug: "abani-classic",
    description:
      "İstanbul merkezli iç giyim atölyesi. Uzun elyaf pamuk, ölçülü kalıplar ve zamansız renkler.",
    origin: "İstanbul, Türkiye",
  },
  {
    name: "Tutku",
    slug: "tutku",
    description: "Günlük konforu önceleyen, yumuşak dokulu temel iç giyim koleksiyonları.",
    origin: "Türkiye",
  },
  {
    name: "Seher Yıldızı",
    slug: "seher-yildizi",
    description: "Nefes alan kumaşlar ve klasik kesimlerle üretilen zamansız parçalar.",
    origin: "Bursa, Türkiye",
  },
  {
    name: "Jiber",
    slug: "jiber",
    description: "Teknik kumaş deneyimi ile günlük giyim arasında köprü kuran üretici.",
    origin: "Denizli, Türkiye",
  },
  {
    name: "Çift Kaplan",
    slug: "cift-kaplan",
    description: "Aile atölyesinde üretilen, dayanıklı ve sade erkek çorap ve iç giyim.",
    origin: "Gaziantep, Türkiye",
  },
];

const categoriesSeed = [
  {
    name: "Erkek Boxer",
    slug: "erkek-boxer",
    shortName: "Boxer",
    description: "Nefes alan pamuklu ve modal boxer modelleri. Her gün konforu.",
    seoText:
      "Erkek boxer modellerinde uzun elyaf pamuk, modal karışım ve ölçülü kalıp. Dikişsiz bel, renk vermeyen boya ve çoklu paket avantajları.",
    imageUrl: "/images/boxer.jpg",
    sortOrder: 1,
  },
  {
    name: "Erkek Slip",
    slug: "erkek-slip",
    shortName: "Slip",
    description: "Klasik kesim slip modelleri, yumuşak lastik ve pamuklu dokular.",
    seoText:
      "Erkek slip çeşitlerinde sıkı dokuma pamuk, esnek bel lastiği ve minimal dikiş detayları. Günlük kullanım için ideal.",
    imageUrl: "/images/slip.jpg",
    sortOrder: 2,
  },
  {
    name: "Erkek Atlet",
    slug: "erkek-atlet",
    shortName: "Atlet",
    description: "Yaz-kış katmanlanabilen fitilli ve pamuklu atletler.",
    seoText:
      "Erkek atlet modelleri; fitilli pamuk, askı detayı ve nefes alan kumaş yapısı ile gün boyu serinlik sağlar.",
    imageUrl: "/images/atlet.jpg",
    sortOrder: 3,
  },
  {
    name: "Erkek Fanila",
    slug: "erkek-fanila",
    shortName: "Fanila",
    description: "Gömlek altına ideal, ince ve yumuşak fanila seçenekleri.",
    seoText:
      "Erkek fanila koleksiyonunda ince pamuk jersey, dikişsiz yaka ve gömlek altında görünmeyen kalıplar öne çıkar.",
    imageUrl: "/images/atlet.jpg",
    sortOrder: 4,
  },
  {
    name: "Erkek Çorap",
    slug: "erkek-corap",
    shortName: "Çorap",
    description: "Mercerize ve bambu karışım erkek çoraplar, çoklu paketlerde.",
    seoText:
      "Erkek çorap modelleri; mercerize pamuk, bambu karışım ve ekstra dayanıklı topuk yapısı ile uzun ömürlü kullanım sunar.",
    imageUrl: "/images/corap.jpg",
    sortOrder: 5,
  },
  {
    name: "Termal İçlik",
    slug: "termal-iclik",
    shortName: "Termal",
    description: "Soğuk günler için ısı dengeleyen termal içlikler.",
    seoText:
      "Termal içliklerde ısı yalıtımı sağlayan waffle örgü, nem yönetimi ve esnek kalıp bir arada.",
    imageUrl: "/images/hero.jpg",
    sortOrder: 6,
  },
];

const productsSeed: ProductSeed[] = [
  {
    brand: "Abani Classic",
    category: "erkek-boxer",
    name: "Essential Modal Boxer",
    slug: "abani-essential-modal-boxer",
    modelCode: "AC-BOX-01",
    shortDescription: "Uzun elyaf modal karışım, dikişsiz bel ve mat finish.",
    description:
      "Abani Classic Essential, gün boyu konfor için tasarlanmış temel bir parça. Uzun elyaf pamuk ve modal karışımı, nefes alan yapısı ile ısıyı dengeler. Bel lastiği dikişsiz olarak bağlandı; böylece gömlek altında iz bırakmaz. Kalıp, bacak kenarında toparlanmayı önleyen esnek bir yapıya sahiptir.",
    fabric: "%55 modal, %40 pamuk, %5 elastan",
    care: "30°C hassas yıkamada, benzer renklerle yıkayın. Kurutma makinesi önerilmez.",
    listPrice: tl(429.9),
    salePrice: tl(349.9),
    featured: true,
    isNew: true,
    image: "/images/boxer.jpg",
    colors: ["Antrasit", "Ekru"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    reviews: [
      {
        name: "Mert K.",
        rating: 5,
        title: "Kalıp tam beklediğim gibi",
        body: "İlk yıkamadan sonra formunu korudu, lastik izi bırakmıyor. Antrasit rengi çok dengeli.",
      },
      {
        name: "Burak Ş.",
        rating: 4,
        title: "Kumaş kalitesi iyi",
        body: "Modal karışım gerçekten fark ediyor. Bir beden büyük almanızı öneririm.",
      },
    ],
  },
  {
    brand: "Abani Classic",
    category: "erkek-boxer",
    name: "3'lü Essential Boxer Paketi",
    slug: "abani-3lu-essential-boxer-paketi",
    modelCode: "AC-BOX-03",
    shortDescription: "Üç parçalık hediye kutusunda, dikişsiz bel konforu.",
    description:
      "Aynı kalıbın üç renkli seti. Fiziksel paket olarak depolanır, tek SKU olarak satılır. Set içeriği: antrasit, ekru ve lacivert. Hediye kutusu cilalı karton üzerine pamuk kurdele ile hazırlanır.",
    fabric: "%55 modal, %40 pamuk, %5 elastan",
    care: "30°C hassas yıkama. Kurutma makinesi önerilmez.",
    packInfo: "3 adet boxer / kutu",
    listPrice: tl(1049.7),
    salePrice: tl(899.9),
    featured: true,
    image: "/images/hero.jpg",
    colors: ["Karma"],
    sizes: ["S", "M", "L", "XL"],
    packQuantity: 3,
    reviews: [
      {
        name: "Kerem A.",
        rating: 5,
        title: "Set almak daha mantıklı",
        body: "Tekli fiyatlara göre belirgin avantaj var, kutu da hediye için uygun.",
      },
    ],
  },
  {
    brand: "Tutku",
    category: "erkek-boxer",
    name: "Soft Touch Boxer",
    slug: "tutku-soft-touch-boxer",
    modelCode: "TT-BOX-22",
    shortDescription: "Yumuşak jersey dokusu, günlük kullanım için ideal.",
    description:
      "Tutku Soft Touch, hafif ve akışkan jersey dokusuyla günlük kullanımda konfor sağlar. Esnek bel lastiği ve kısa paça kesimi ile spor sonrası da rahattır.",
    fabric: "%95 pamuk, %5 elastan",
    care: "Makine yıkaması 30°C, düşük devirde sıkma.",
    listPrice: tl(299.9),
    salePrice: tl(249.9),
    image: "/images/boxer.jpg",
    colors: ["Siyah", "Lacivert"],
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    brand: "Jiber",
    category: "erkek-boxer",
    name: "Cotton Stretch Boxer",
    slug: "jiber-cotton-stretch-boxer",
    modelCode: "JB-BOX-07",
    shortDescription: "Esnek pamuk, hareketli günler için destekli kalıp.",
    description:
      "Jiber Cotton Stretch, spor ve hareketli günler için tasarlandı. Destekli ön panel ve dört yönlü esneme sağlayan dokusu ile kalıbını korur.",
    fabric: "%92 pamuk, %8 elastan",
    care: "30°C yıkama, ters çevirerek kurutun.",
    listPrice: tl(329.9),
    salePrice: tl(279.9),
    isNew: true,
    image: "/images/boxer.jpg",
    colors: ["Antrasit"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    brand: "Abani Classic",
    category: "erkek-slip",
    name: "Minimal Slip",
    slug: "abani-minimal-slip",
    modelCode: "AC-SLP-02",
    shortDescription: "Klasik kesim, ince bel lastiği ve pamuklu yüzey.",
    description:
      "Minimal Slip, klasik kesimi sade bir yaklaşımla yeniden yorumlar. İnce bel lastiği ve yumuşak pamuk yüzeyi, gün içinde fark edilmemek üzere tasarlandı.",
    fabric: "%100 pamuk",
    care: "40°C pamuklu programda yıkanabilir. Beyazlarla yıkayın.",
    listPrice: tl(349.9),
    salePrice: tl(299.9),
    image: "/images/slip.jpg",
    colors: ["Beyaz", "Ekru"],
    sizes: ["S", "M", "L", "XL", "XXL"],
    reviews: [
      {
        name: "Onur T.",
        rating: 4,
        title: "Sade ve rahat",
        body: "Pamuk kalitesi beklediğimden iyi. Bel lastiği iz yapmıyor.",
      },
    ],
  },
  {
    brand: "Seher Yıldızı",
    category: "erkek-slip",
    name: "Klasik Pamuk Slip",
    slug: "seher-yildizi-klasik-pamuk-slip",
    modelCode: "SY-SLP-11",
    shortDescription: "Sıkı dokuma pamuk, zamansız kesim.",
    description:
      "Seher Yıldızı Klasik Slip, sıkı dokunan pamuklu kumaşı ve yüksek kesim kalıbıyla günlük kullanımda formunu korur. Paket halinde alındığında avantajlıdır.",
    fabric: "%100 pamuk",
    care: "40°C yıkama, orta ısıda ütü.",
    listPrice: tl(279.9),
    salePrice: tl(229.9),
    image: "/images/slip.jpg",
    colors: ["Beyaz", "Antrasit"],
    sizes: ["M", "L", "XL"],
  },
  {
    brand: "Abani Classic",
    category: "erkek-atlet",
    name: "Ribbed Atlet",
    slug: "abani-ribbed-atlet",
    modelCode: "AC-ATL-01",
    shortDescription: "Fitilli pamuk, esnek yaka ve temiz kesim.",
    description:
      "Fitilli pamuk dokusu, yıkama sonrası formunu koruyacak şekilde işlendi. Geniş kol oyuntusu ve yumuşak yaka banda sahiptir. Gömlek altında görünmeyen bir kalıba sahiptir.",
    fabric: "%100 penye pamuk",
    care: "30°C hassas programda yıkayın, beyazlarla birlikte.",
    listPrice: tl(299.9),
    salePrice: tl(249.9),
    featured: true,
    image: "/images/atlet.jpg",
    colors: ["Beyaz"],
    sizes: ["M", "L", "XL", "XXL"],
  },
  {
    brand: "Tutku",
    category: "erkek-atlet",
    name: "Pamuk Atlet",
    slug: "tutku-pamuk-atlet",
    modelCode: "TT-ATL-04",
    shortDescription: "Yumuşak penye pamuk, üçlü paket seçeneği.",
    description:
      "Tutku Pamuk Atlet, günlük kullanım için yumuşak penye pamuktan üretildi. Üçlü paket seçeneği ile pratiktir. Renkleri solmaya karşı dayanıklıdır.",
    fabric: "%100 pamuk",
    care: "40°C yıkama. Renkli deterjan kullanmayın.",
    listPrice: tl(229.9),
    salePrice: tl(189.9),
    image: "/images/atlet.jpg",
    colors: ["Beyaz"],
    sizes: ["M", "L", "XL"],
  },
  {
    brand: "Abani Classic",
    category: "erkek-fanila",
    name: "Premium Fanila",
    slug: "abani-premium-fanila",
    modelCode: "AC-FNL-01",
    shortDescription: "İnce jersey, dikişsiz yaka, gömlek altı kalıbı.",
    description:
      "Premium Fanila, gömlek altında görünmeyecek şekilde tasarlandı. İnce jersey dokusu ısıyı dengeler; dikişsiz yaka gün içinde rahatsızlık vermez.",
    fabric: "%95 pamuk, %5 elastan",
    care: "30°C yıkama. Kurutma önerilmez.",
    listPrice: tl(379.9),
    salePrice: tl(329.9),
    isNew: true,
    image: "/images/atlet.jpg",
    colors: ["Ekru", "Beyaz"],
    sizes: ["M", "L", "XL"],
  },
  {
    brand: "Jiber",
    category: "erkek-fanila",
    name: "Yumuşak Fanila",
    slug: "jiber-yumusak-fanila",
    modelCode: "JB-FNL-09",
    shortDescription: "Ekstra yumuşak dokulu, kışlık katman parçası.",
    description:
      "Jiber Yumuşak Fanila, fırçalanmış iç yüzeyi ile kış aylarında ekstra konfor sağlar. İnce yapısı sayesinde üst üste katmanlanabilir.",
    fabric: "%90 pamuk, %10 viskon",
    care: "30°C hassas yıkama, düşük ısıda ütü.",
    listPrice: tl(309.9),
    salePrice: tl(259.9),
    image: "/images/atlet.jpg",
    colors: ["Beyaz", "Antrasit"],
    sizes: ["M", "L", "XL"],
  },
  {
    brand: "Abani Classic",
    category: "erkek-corap",
    name: "Mercerize Çorap 3'lü",
    slug: "abani-mercerize-corap-3lu",
    modelCode: "AC-CRP-03",
    shortDescription: "Mercerize pamuk, el bağlama burun, üçlü paket.",
    description:
      "Mercerize pamuğun hafif parlaklığı ve ekstra dayanıklı topuk bölgesi ile hazırlanan üçlü set. İnce yapısı klasik ayakkabılarla uyumludur.",
    fabric: "%80 mercerize pamuk, %17 poliamid, %3 elastan",
    care: "30°C yıkama, kurutma makinesi kullanmayın.",
    packInfo: "3 çift / paket",
    listPrice: tl(249.9),
    salePrice: tl(199.9),
    featured: true,
    image: "/images/corap.jpg",
    colors: ["Antrasit", "Kum"],
    sizes: ["39-42", "43-46"],
    packQuantity: 3,
    reviews: [
      {
        name: "Ali R.",
        rating: 5,
        title: "İnce ve şık",
        body: "Takım elbise ile kullandım, kaymıyor ve parlaklığı çok dengeli.",
      },
    ],
  },
  {
    brand: "Çift Kaplan",
    category: "erkek-corap",
    name: "Bambu Çorap",
    slug: "cift-kaplan-bambu-corap",
    modelCode: "CK-CRP-18",
    shortDescription: "Bambu karışım, nem dengeleyen doku.",
    description:
      "Çift Kaplan Bambu Çorap, bambu lifinin nem dengeleme özelliğiyle gün boyu kuru hissi korur. Günlük kullanım için idealdir.",
    fabric: "%55 bambu viskon, %40 pamuk, %5 elastan",
    care: "30°C yıkama, gölgede kurutun.",
    listPrice: tl(179.9),
    salePrice: tl(149.9),
    image: "/images/corap.jpg",
    colors: ["Kum"],
    sizes: ["39-42", "43-46"],
  },
  {
    brand: "Abani Classic",
    category: "termal-iclik",
    name: "Thermal Üst",
    slug: "abani-thermal-ust",
    modelCode: "AC-TRM-01",
    shortDescription: "Waffle örgü, ısı dengeleyen yapı.",
    description:
      "Thermal Üst, waffle örgü yapısıyla vücut ısısını dengelerken nemi dışarıya aktarır. Gizli dikişler, gömlek altında pürüzsüz bir yüzey sağlar.",
    fabric: "%62 polyester, %34 pamuk, %4 elastan",
    care: "30°C hassas yıkama. Yumuşatıcı kullanmayın.",
    listPrice: tl(549.9),
    salePrice: tl(449.9),
    isNew: true,
    image: "/images/hero.jpg",
    colors: ["Antrasit"],
    sizes: ["S", "M", "L", "XL"],
  },
  {
    brand: "Jiber",
    category: "termal-iclik",
    name: "Thermal Alt",
    slug: "jiber-thermal-alt",
    modelCode: "JB-TRM-05",
    shortDescription: "Esnek termal alt, hareket özgürlüğü.",
    description:
      "Jiber Thermal Alt, dört yönlü esneyen dokusuyla hareket özgürlüğü sağlar. Yüksek bel kesimi ve düz dikişleri ile katman altında konforludur.",
    fabric: "%60 polyester, %35 viskon, %5 elastan",
    care: "30°C yıkama. Kurutma önerilmez.",
    listPrice: tl(499.9),
    salePrice: tl(399.9),
    image: "/images/hero.jpg",
    colors: ["Antrasit"],
    sizes: ["S", "M", "L", "XL"],
  },
];

function skuFor(product: ProductSeed, color: string, size: string, index: number) {
  const colorCode = color
    .toUpperCase()
    .replaceAll("İ", "I")
    .replaceAll("Ş", "S")
    .replaceAll("Ğ", "G")
    .replaceAll("Ü", "U")
    .replaceAll("Ö", "O")
    .replaceAll("Ç", "C")
    .slice(0, 3);
  const sizeCode = size.replace("-", "").replaceAll(" ", "");
  return `AB-${product.modelCode}-${colorCode}-${sizeCode}-${String(index).padStart(2, "0")}`;
}

async function main() {
  const force = process.argv.includes("--force");

  // Demo verisi: sahte ürün/sipariş/yorum ve bilinen parolalı hesaplar içerir.
  if (process.env.NODE_ENV === "production") {
    throw new Error("Seed üretim ortamında çalıştırılamaz (demo verisi ve bilinen parolalar içerir).");
  }
  const existing = await db.select({ count: sql<number>`count(*)::int` }).from(s.products);
  const real = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.products)
    .where(sql`${s.products.sourceKey} = 'pazarama'`);
  if (force && (real[0]?.count ?? 0) > 0 && !process.argv.includes("--wipe-real-catalog")) {
    throw new Error(
      `--force gerçek kataloğu (${real[0]?.count} Pazarama ürünü) silerdi. ` +
        "Bilerek silmek için --wipe-real-catalog ekleyin.",
    );
  }

  if ((existing[0]?.count ?? 0) > 0 && !force) {
    console.log(`Seed skipped: ${existing[0]?.count} products already exist. Use --force to reset.`);
    await pool.end();
    return;
  }

  if (force) {
    await db.execute(sql`
      truncate table
        audit_logs, payment_events, payments, order_status_history, return_requests,
        shipments, order_items, orders, import_items, import_batches,
        idempotency_keys, newsletter_subscribers, reviews, stock_movements, marketplace_listings,
        inventory, product_variants, product_images, products, categories, brands,
        coupons, sessions, admin_users, customers
      restart identity cascade
    `);
    console.log("Existing commerce data cleared.");
  }

  const brands = await db.insert(s.brands).values(brandsSeed).returning();
  const categories = await db.insert(s.categories).values(categoriesSeed).returning();
  const brandBySlug = new Map(brands.map((b) => [b.slug, b]));
  const brandByName = new Map(brands.map((b) => [b.name, b]));
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  const variantsBySku = new Map<string, { id: string; productId: string; label: string }>();
  const productBySlug = new Map<string, { id: string; name: string; image: string; price: number }>();

  for (let pIndex = 0; pIndex < productsSeed.length; pIndex += 1) {
    const seed = productsSeed[pIndex];
    const brand = brandByName.get(seed.brand);
    const category = categoryBySlug.get(seed.category);
    if (!brand || !category) throw new Error(`Missing brand/category for ${seed.name}`);

    const [product] = await db
      .insert(s.products)
      .values({
        brandId: brand.id,
        categoryId: category.id,
        name: seed.name,
        slug: seed.slug,
        modelCode: seed.modelCode,
        shortDescription: seed.shortDescription,
        description: seed.description,
        fabric: seed.fabric,
        care: seed.care,
        packInfo: seed.packInfo,
        listPrice: seed.listPrice,
        salePrice: seed.salePrice,
        status: "published",
        isFeatured: seed.featured ?? false,
        isNew: seed.isNew ?? false,
        sourceKey: pIndex % 3 === 0 ? "trendyol" : pIndex % 3 === 1 ? "hepsiburada" : "own",
        publishedAt: new Date(),
      })
      .returning();

    await db.insert(s.productImages).values([
      { productId: product.id, url: seed.image, alt: `${seed.name} ürün görseli`, sortOrder: 0 },
      {
        productId: product.id,
        url: "/images/hero.jpg",
        alt: `${seed.name} kumaş detayı`,
        sortOrder: 1,
      },
    ]);

    productBySlug.set(seed.slug, {
      id: product.id,
      name: seed.name,
      image: seed.image,
      price: seed.salePrice,
    });

    let vIndex = 0;
    for (const color of seed.colors) {
      for (const size of seed.sizes) {
        vIndex += 1;
        const sku = skuFor(seed, color, size, vIndex);
        const [variant] = await db
          .insert(s.productVariants)
          .values({
            productId: product.id,
            sku,
            barcode: `868${String(pIndex + 1).padStart(3, "0")}${String(vIndex).padStart(6, "0")}`,
            size,
            color,
            packQuantity: seed.packQuantity ?? 1,
          })
          .returning();

        const lowStock = (pIndex + vIndex) % 11 === 0;
        const onHand = lowStock ? 2 : 8 + ((pIndex * 9 + vIndex * 13) % 46);

        await db.insert(s.inventory).values({
          variantId: variant.id,
          warehouseCode: "MAIN",
          onHand,
          reserved: 0,
          reorderLevel: 6,
        });

        await db.insert(s.stockMovements).values({
          variantId: variant.id,
          type: "initial_stock",
          quantity: onHand,
          reference: "seed",
          actor: "system",
          note: "Açılış stok kaydı",
        });

        variantsBySku.set(sku, {
          id: variant.id,
          productId: product.id,
          label: [color, size, seed.packQuantity && seed.packQuantity > 1 ? `${seed.packQuantity}'lü` : null]
            .filter(Boolean)
            .join(" / "),
        });
      }
    }

    if (seed.reviews?.length) {
      await db.insert(s.reviews).values(
        seed.reviews.map((review) => ({
          productId: product.id,
          customerName: review.name,
          rating: review.rating,
          title: review.title,
          body: review.body,
          isApproved: true,
          isVerifiedPurchase: true,
        })),
      );
    }
  }

  await db.insert(s.coupons).values([
    {
      code: "ABANI10",
      description: "750 TL üzeri alışverişlerde %10 indirim",
      type: "percent",
      value: 10,
      minSubtotal: tl(750),
    },
    {
      code: "HOSGELDIN",
      description: "İlk siparişlerde 100 TL indirim (500 TL üzeri)",
      type: "fixed",
      value: tl(100),
      minSubtotal: tl(500),
    },
    {
      code: "KARGOBENDEN",
      description: "1.000 TL üzeri kargo bizden",
      type: "shipping",
      value: 0,
      minSubtotal: tl(1000),
    },
  ]);

  await db.insert(s.adminUsers).values([
    {
      email: "owner@abaniclassic.com",
      name: "Selin Aydın",
      passwordHash: hashPassword("Abani2026!"),
      role: "super_admin",
    },
    {
      email: "katalog@abaniclassic.com",
      name: "Deniz Yalçın",
      passwordHash: hashPassword("Katalog2026!"),
      role: "catalog_manager",
    },
    {
      email: "operasyon@abaniclassic.com",
      name: "Ece Demir",
      passwordHash: hashPassword("Operasyon2026!"),
      role: "order_manager",
    },
  ]);

  const [customer] = await db
    .insert(s.customers)
    .values({
      email: "ayse@example.com",
      firstName: "Ayşe",
      lastName: "Yılmaz",
      phone: "05321234567",
      passwordHash: hashPassword("Musteri2026!"),
      defaultCity: "İstanbul",
      marketingConsent: true,
    })
    .returning();

  // Demo orders so operations dashboards are meaningful in the preview environment.
  const demoOrders: {
    number: string;
    status: string;
    paymentStatus: string;
    email: string;
    firstName: string;
    lastName: string;
    city: string;
    district: string;
    items: { slug: string; qty: number }[];
    daysAgo: number;
    coupon?: string;
    customerId?: string;
  }[] = [
    {
      number: "AB-2602-1041",
      status: "delivered",
      paymentStatus: "paid",
      email: "ayse@example.com",
      firstName: "Ayşe",
      lastName: "Yılmaz",
      city: "İstanbul",
      district: "Kadıköy",
      items: [
        { slug: "abani-essential-modal-boxer", qty: 2 },
        { slug: "abani-mercerize-corap-3lu", qty: 1 },
      ],
      daysAgo: 12,
      customerId: customer.id,
    },
    {
      number: "AB-2602-1042",
      status: "shipped",
      paymentStatus: "paid",
      email: "mert.k@example.com",
      firstName: "Mert",
      lastName: "Kaya",
      city: "İzmir",
      district: "Bornova",
      items: [{ slug: "abani-3lu-essential-boxer-paketi", qty: 1 }],
      daysAgo: 5,
      coupon: "HOSGELDIN",
    },
    {
      number: "AB-2602-1043",
      status: "processing",
      paymentStatus: "paid",
      email: "burak@example.com",
      firstName: "Burak",
      lastName: "Şen",
      city: "Ankara",
      district: "Çankaya",
      items: [
        { slug: "abani-premium-fanila", qty: 2 },
        { slug: "abani-ribbed-atlet", qty: 1 },
      ],
      daysAgo: 2,
      coupon: "ABANI10",
    },
    {
      number: "AB-2602-1044",
      status: "pending_payment",
      paymentStatus: "pending",
      email: "onur@example.com",
      firstName: "Onur",
      lastName: "Tekin",
      city: "Bursa",
      district: "Nilüfer",
      items: [{ slug: "jiber-thermal-alt", qty: 1 }],
      daysAgo: 0,
    },
  ];

  for (const demo of demoOrders) {
    const createdAt = new Date(Date.now() - demo.daysAgo * 24 * 60 * 60 * 1000);
    const lineItems = demo.items.flatMap(({ slug, qty }) => {
      const product = productBySlug.get(slug);
      if (!product) return [];
      const unitPrice = product.price;
      return [
        {
          productId: product.id,
          variantId: null,
          sku: `AB-DEMO-${slug.slice(0, 8).toUpperCase()}`,
          productName: product.name,
          variantLabel: "Antrasit / M",
          imageUrl: product.image,
          unitPrice,
          quantity: qty,
          discount: 0,
          taxRate: 10,
          taxAmount: Math.round((unitPrice * qty * 10) / 110),
          lineTotal: unitPrice * qty,
          currency: "TRY",
        },
      ];
    });

    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountTotal =
      demo.coupon === "ABANI10"
        ? Math.round(subtotal * 0.1)
        : demo.coupon === "HOSGELDIN"
          ? tl(100)
          : 0;
    const shippingTotal = subtotal - discountTotal >= tl(1000) ? 0 : tl(49.9);
    const grandTotal = subtotal - discountTotal + shippingTotal;

    const [order] = await db
      .insert(s.orders)
      .values({
        orderNumber: demo.number,
        status: demo.status,
        paymentStatus: demo.paymentStatus,
        customerId: demo.customerId ?? null,
        email: demo.email,
        phone: "05320000000",
        firstName: demo.firstName,
        lastName: demo.lastName,
        addressLine: "Örnek Mahallesi, Abani Sokak No: 12 Daire 4",
        district: demo.district,
        city: demo.city,
        postalCode: "34000",
        subtotal,
        discountTotal,
        shippingTotal,
        grandTotal,
        couponCode: demo.coupon ?? null,
        marketingConsent: true,
        createdAt,
        updatedAt: createdAt,
      })
      .returning();

    await db.insert(s.orderItems).values(lineItems.map((item) => ({ ...item, orderId: order.id })));

    await db.insert(s.orderStatusHistory).values([
      {
        orderId: order.id,
        fromStatus: null,
        toStatus: "pending_payment",
        note: "Sipariş oluşturuldu",
        actor: "checkout",
        createdAt,
      },
      ...(demo.paymentStatus === "paid"
        ? [
            {
              orderId: order.id,
              fromStatus: "pending_payment",
              toStatus: "paid",
              note: "Ödeme sağlayıcı bildirimi doğrulandı",
              actor: "payment-webhook",
              createdAt,
            },
            {
              orderId: order.id,
              fromStatus: "paid",
              toStatus: demo.status,
              note: "Operasyon güncellemesi",
              actor: "operasyon@abaniclassic.com",
              createdAt,
            },
          ]
        : []),
    ]);

    if (demo.paymentStatus === "paid") {
      await db.insert(s.payments).values({
        orderId: order.id,
        provider: "mockpay",
        providerRef: `mock_${demo.number}`,
        status: "succeeded",
        amount: grandTotal,
        currency: "TRY",
        createdAt,
      });
    }
  }

  const firstProduct = productBySlug.get("abani-essential-modal-boxer");
  if (firstProduct) {
    await db.insert(s.marketplaceListings).values([
      {
        sourceKey: "trendyol",
        sourceListingId: "TY-882311",
        sourceSku: "TY-BOX-ANT-M",
        productId: firstProduct.id,
        sourcePriceMinor: tl(389.9),
        sourceStock: 24,
        matchScore: 100,
        matchedBy: "barcode",
      },
      {
        sourceKey: "hepsiburada",
        sourceListingId: "HB-551029",
        sourceSku: "HB-BOX-ANT-M",
        productId: firstProduct.id,
        sourcePriceMinor: tl(399),
        sourceStock: 11,
        matchScore: 86,
        matchedBy: "brand_model",
      },
    ]);
  }

  const demoFromSku = [...variantsBySku.entries()][0];
  const [batch] = await db
    .insert(s.importBatches)
    .values({
      sourceKey: "trendyol",
      fileName: "trendyol-urunler-subat.csv",
      fileHash: createHash("sha256").update("seed-trendyol-export").digest("hex"),
      mode: "dry_run",
      status: "needs_review",
      totalRows: 5,
      validRows: 4,
      errorRows: 1,
      matchRows: 2,
      newRows: 2,
      createdBy: "katalog@abaniclassic.com",
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(s.importItems).values([
    {
      batchId: batch.id,
      rowNumber: 2,
      title: "Abani Essential Modal Boxer",
      brandName: "Abani Classic",
      categoryPath: "İç Giyim > Erkek > Boxer",
      barcode: "868001000001",
      sourceSku: demoFromSku?.[0] ?? "AC-BOX-01",
      sourcePriceMinor: tl(389.9),
      sourceStock: 18,
      status: "match",
      matchScore: 100,
      matchedProductId: firstProduct?.id,
      message: "Barkod tam eşleşmesi",
    },
    {
      batchId: batch.id,
      rowNumber: 3,
      title: "Tutku Soft Boxer 3'lü",
      brandName: "Tutku",
      barcode: "868001000002",
      sourceSku: "TT-SOFT-3",
      sourcePriceMinor: tl(649.9),
      sourceStock: 9,
      status: "new",
      matchScore: 0,
      message: "Katalogda yeni ürün adayı",
    },
    {
      batchId: batch.id,
      rowNumber: 4,
      title: "Jiber Termal Ust",
      brandName: "Jiber",
      barcode: "868001000003",
      sourcePriceMinor: tl(479),
      sourceStock: 4,
      status: "new",
      matchScore: 72,
      message: "Model kodu yok, insan incelemesi gerekli",
    },
    {
      batchId: batch.id,
      rowNumber: 5,
      title: "Gömleksiz Fanila",
      brandName: "Bilinmeyen",
      sourcePriceMinor: null,
      status: "error",
      message: "Zorunlu alan eksik: marka, fiyat",
    },
  ]);

  await db.insert(s.auditLogs).values([
    {
      actorType: "admin",
      actorEmail: "owner@abaniclassic.com",
      action: "catalog.seed",
      entityType: "catalog",
      entityId: null,
      summary: "Demo katalog ve operasyon verisi yüklendi.",
      metadata: { products: productsSeed.length },
    },
    {
      actorType: "admin",
      actorEmail: "katalog@abaniclassic.com",
      action: "import.parse",
      entityType: "import_batch",
      entityId: batch.id,
      summary: "Trendyol dışa aktarımı dry-run olarak ayrıştırıldı.",
      metadata: { rows: 5, mode: "dry_run" },
    },
  ]);

  console.log(`Seed complete: ${productsSeed.length} products, ${variantsBySku.size} variants.`);
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
