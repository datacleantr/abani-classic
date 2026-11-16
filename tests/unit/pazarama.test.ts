import { describe, expect, it } from "vitest";

import {
  baseTitle,
  groupListings,
  isValidEan13,
  mapCategory,
  parsePackQuantity,
  provisionalSku,
  type SourceListing,
} from "@/lib/sources/pazarama";
import { parseListing, parseListingUrls, parseTotalCount } from "../../scripts/sources/pazarama-fetch";

function listing(overrides: Partial<SourceListing>): SourceListing {
  return {
    sourceKey: "pazarama",
    sourceListingId: "ID1",
    url: "https://www.pazarama.com/x-p-ID1",
    fetchedAt: "2026-11-16T00:00:00.000Z",
    parserVersion: "test",
    title: "Tutku 0117 Erkek Penye Boxer 6'lı Paket",
    brandName: "Tutku",
    sourceProductId: null,
    color: "Siyah",
    size: "L",
    priceMinor: 68964,
    listPriceMinor: 69660,
    currency: "TRY",
    inStock: true,
    ratingValue: null,
    reviewCount: null,
    categoryPath: ["Moda", "Erkek Giyim", "Erkek Boxer, Slip, Külot", "Tutku Erkek Boxer, Slip, Külot"],
    attributes: { Renk: "Siyah", "Beden/Yaş": "L", "Kumaş Tipi": "Penye" },
    images: ["https://img.pzrmcdn.com/asset/ID1/a-1.jpg"],
    ...overrides,
  };
}

describe("isValidEan13", () => {
  it("kontrol hanesini doğrular", () => {
    expect(isValidEan13("8681672965235")).toBe(true);
    expect(isValidEan13("8681672965236")).toBe(false);
    expect(isValidEan13("ACP0117060028")).toBe(false);
  });
});

describe("parsePackQuantity", () => {
  it("özellikten ve başlıktan paket adedini okur", () => {
    expect(parsePackQuantity({ title: "x", attributes: { "Parça Sayısı": "6'lı" } })).toBe(6);
    expect(parsePackQuantity({ title: "x", attributes: { "Parça Sayısı": "Tekli" } })).toBe(1);
    expect(parsePackQuantity({ title: "Tutku Erkek Atlet 12 Adet Beyaz", attributes: {} })).toBe(12);
    expect(parsePackQuantity({ title: "Erkek Boxer 3'lü Paket", attributes: {} })).toBe(3);
    expect(parsePackQuantity({ title: "Bambu Çorap 6 Çift", attributes: {} })).toBe(6);
  });

  it("çıkarılamıyorsa uydurmaz", () => {
    expect(parsePackQuantity({ title: "Erkek Termal Alt İçlik", attributes: {} })).toBeNull();
  });
});

describe("mapCategory", () => {
  const path = (leaf: string) => ["Moda", leaf, `Marka ${leaf}`];
  it("erkek iç giyimi doğru kategoriye eşler", () => {
    const boxer = path("Erkek Boxer, Slip, Külot");
    expect(mapCategory({ title: "Erkek Likralı Boxer", categoryPath: boxer, attributes: {} })).toBe("erkek-boxer");
    expect(mapCategory({ title: "Pamuklu Erkek Slip Külot", categoryPath: boxer, attributes: {} })).toBe("erkek-slip");
    const atlet = path("Erkek Atlet, Fanila");
    expect(mapCategory({ title: "Penye Atlet", categoryPath: atlet, attributes: { "Kol Tipi": "Askılı" } })).toBe("erkek-atlet");
    expect(mapCategory({ title: "Bisiklet Yaka Fanila", categoryPath: atlet, attributes: {} })).toBe("erkek-fanila");
    expect(mapCategory({ title: "Bambu Çorap", categoryPath: path("Erkek Çorap"), attributes: {} })).toBe("erkek-corap");
  });

  it("kadın ürünlerini ayrı kategorilere, bilinmeyeni null'a eşler", () => {
    expect(mapCategory({ title: "Kadın Külot", categoryPath: path("Kadın Külot"), attributes: {} })).toBe("kadin-kulot");
    expect(mapCategory({ title: "Tişört", categoryPath: path("Erkek Tişört"), attributes: {} })).toBeNull();
  });
});

describe("baseTitle", () => {
  it("yalnızca bağımsız beden/renk belirteçlerini çıkarır", () => {
    expect(baseTitle({ title: "Berrak 1004 Erkek Atlet 6lı Paket Beyaz L", size: "L", color: "Beyaz" })).toBe(
      "Berrak 1004 Erkek Atlet 6lı Paket",
    );
    // "L" harfi sözcük içinde geçtiğinde dokunulmaz.
    expect(baseTitle({ title: "Likralı Boxer L", size: "L", color: null })).toBe("Likralı Boxer");
    expect(baseTitle({ title: "Bambu Çorap 40-44", size: "40 - 44", color: null })).toBe("Bambu Çorap");
  });
});

describe("groupListings", () => {
  it("aynı ürünün renk/beden ilanlarını tek ürün altında toplar", () => {
    const candidates = groupListings([
      listing({ sourceListingId: "A", title: "Tutku 0117 Erkek Penye Boxer 6'lı Paket Siyah L" }),
      listing({ sourceListingId: "B", title: "Tutku 0117 Erkek Penye Boxer 6'lı Paket Beyaz XL", color: "Beyaz", size: "XL" }),
      listing({ sourceListingId: "C", title: "Tutku 0117 Erkek Penye Boxer 6'lı Paket Siyah L" }),
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].variants.map((variant) => `${variant.color}/${variant.size}`)).toEqual([
      "Siyah/L",
      "Beyaz/XL",
    ]);
    expect(candidates[0].variants[0].duplicateListings).toHaveLength(1);
    expect(candidates[0].name).toBe("Tutku 0117 Erkek Penye Boxer 6'lı Paket");
    expect(candidates[0].packQuantity).toBe(6);
  });

  it("farklı marka veya farklı paket adedini asla birleştirmez", () => {
    const candidates = groupListings([
      listing({ sourceListingId: "A" }),
      listing({ sourceListingId: "B", brandName: "Berrak" }),
      listing({ sourceListingId: "C", title: "Tutku 0117 Erkek Penye Boxer 3'lü Paket" }),
    ]);
    expect(candidates).toHaveLength(3);
  });

  it("kaynak vitrin fiyatını öneri olarak alır ve farklı varyant fiyatını korur", () => {
    const [candidate] = groupListings([
      listing({ sourceListingId: "A" }),
      listing({ sourceListingId: "B", size: "XL" }),
      listing({ sourceListingId: "C", size: "3XL", listPriceMinor: 75000 }),
    ]);
    expect(candidate.basePriceMinor).toBe(69660);
    expect(candidate.variants.map((variant) => variant.priceMinor)).toEqual([69660, 69660, 75000]);
  });

  it("geçerli EAN kodunu barkod, diğerlerini yalnızca geçici SKU yapar", () => {
    const [candidate] = groupListings([
      listing({ sourceListingId: "8681672965235" }),
      listing({ sourceListingId: "acp-0117/06", size: "XL" }),
    ]);
    expect(candidate.variants[0].barcode).toBe("8681672965235");
    expect(candidate.variants[1].barcode).toBeNull();
    expect(provisionalSku({ sourceListingId: "acp-0117/06" })).toBe("PZ-ACP-0117-06");
  });
});

describe("pazarama HTML ayrıştırıcı", () => {
  const html = `<html><head>
    <script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[{"name":"Anasayfa"},{"name":"Moda"},{"name":"Erkek Atlet, Fanila"}]}</script>
    <script type="application/ld+json">{"@type":"Product","sku":"uuid-1","name":"Tutku Erkek Penye Atlet 6'lı Paket 0101","brand":{"@type":"Brand","name":"Tutku"},"image":"https://img.pzrmcdn.com/asset/00000110161-4/x/atlet-1.jpg","aggregateRating":{"reviewCount":264,"ratingValue":4.5},"offers":{"price":689.64,"priceCurrency":"TRY","availability":"https://schema.org/InStock"},"color":"Beyaz"}</script>
    </head><body>
    <a href="/tutku-atlet-p-00000110161-4?magaza=abani-classic">x</a>
    <a href="/baska-urun-p-999">mağaza dışı</a>
    <p>Toplam 20 / 531 ürün</p>
    <img src="https://img.pzrmcdn.com/mnresize/600/600/asset/00000110161-4/x/atlet-2.jpg">
    <img src="https://img.pzrmcdn.com/mnresize/600/600/asset/BASKA/x/ilgisiz.jpg">
    <p class="text-4xl font-bold mb-1 text-gray-600"> 1.696,60 TL </p>
    <div class="w-1/2 feature" data-v><div class="flex" data-v><span data-v> Beden/Yaş </span> <span data-v> XL </span></div></div>
    <div class="w-1/2 feature" data-v><div class="flex" data-v><span data-v> Kumaş Tipi </span> <span data-v> Penye </span></div></div>
    <script>window.__NUXT__=(function(){ /* <a href="/gizli-p-1?magaza=abani-classic"> */ })()</script>
    </body></html>`;

  it("liste sayfasından yalnızca mağaza ilanlarını ve toplamı okur", () => {
    expect(parseListingUrls(html)).toEqual(["/tutku-atlet-p-00000110161-4"]);
    expect(parseTotalCount(html)).toBe(531);
  });

  it("ilan detayını düz veriden çıkarır", () => {
    const parsed = parseListing(html, "/tutku-atlet-p-00000110161-4");
    expect(parsed).toMatchObject({
      sourceListingId: "00000110161-4",
      title: "Tutku Erkek Penye Atlet 6'lı Paket 0101",
      brandName: "Tutku",
      color: "Beyaz",
      size: "XL",
      priceMinor: 68964,
      listPriceMinor: 169660,
      inStock: true,
      reviewCount: 264,
      categoryPath: ["Moda", "Erkek Atlet, Fanila"],
      attributes: { "Beden/Yaş": "XL", "Kumaş Tipi": "Penye" },
    });
    expect(parsed.images).toEqual([
      "https://img.pzrmcdn.com/asset/00000110161-4/x/atlet-1.jpg",
      "https://img.pzrmcdn.com/asset/00000110161-4/x/atlet-2.jpg",
    ]);
  });
});
