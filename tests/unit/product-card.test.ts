import { describe, expect, it } from "vitest";

import {
  cardPricing,
  chooseColor,
  chooseSize,
  colorOptions,
  diversifyByKey,
  initialChoice,
  interleaveGroups,
  maxActivePackQuantity,
  needsVariantChoice,
  orderSizes,
  packLabel,
  packOptions,
  resolveVariant,
  sizeOptions,
  summarizeSizes,
  toProductCardData,
  variantLabel,
  type PickableVariant,
} from "@/lib/product-card-helpers";
import { MAX_PRODUCT_IDS, parseProductIdsParam, sanitizeProductIds } from "@/lib/product-ids";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function v(
  id: string,
  color: string | null,
  size: string | null,
  stock: number,
  active = true,
  packQuantity?: number,
): PickableVariant {
  return { id, color, size, stock, active, packQuantity };
}

describe("beden özeti", () => {
  it("harf ve sayısal bedenleri doğru sıralar (2XL, XXL eşdeğer; sayısal aralıklar sonra)", () => {
    expect(orderSizes(["2XL", "M", "S", "XL", "L", null, "", "M"])).toEqual(["S", "M", "L", "XL", "2XL"]);
    expect(orderSizes(["43 - 46", "39 - 42"])).toEqual(["39 - 42", "43 - 46"]);
  });

  it("ardışık harf bedenlerini aralık olarak kısaltır", () => {
    expect(summarizeSizes(["S", "M", "L", "XL", "2XL"])?.short).toBe("S–2XL");
    expect(summarizeSizes(["M", "L", "XL"])?.short).toBe("M–XL");
  });

  it("aralıklı veya karışık bedenlerde ilk 4 + kalan sayısını gösterir", () => {
    const summary = summarizeSizes(["S", "M", "XL", "2XL", "4XL", "5XL"]);
    expect(summary?.short).toBe("S / M / XL / 2XL +2");
    expect(summary?.full).toBe("S, M, XL, 2XL, 4XL, 5XL");
    expect(summarizeSizes(["S", "L"])?.short).toBe("S / L");
    expect(summarizeSizes(["40 - 44"])?.short).toBe("40-44");
    expect(summarizeSizes([null, ""])).toBeNull();
  });
});

describe("paket etiketi", () => {
  it("Türkçe ünlü uyumuna göre ek alır", () => {
    expect(packLabel(2)).toBe("2'li paket");
    expect(packLabel(3)).toBe("3'lü paket");
    expect(packLabel(4)).toBe("4'lü paket");
    expect(packLabel(5)).toBe("5'li paket");
    expect(packLabel(6)).toBe("6'lı paket");
    expect(packLabel(8)).toBe("8'li paket");
    expect(packLabel(9)).toBe("9'lu paket");
    expect(packLabel(10)).toBe("10'lu paket");
    expect(packLabel(12)).toBe("12'li paket");
    expect(packLabel(24)).toBe("24'lü paket");
    expect(packLabel(40)).toBe("40'lı paket");
    expect(packLabel(100)).toBe("100'lü paket");
  });

  it("tekli veya geçersiz adette etiket üretmez", () => {
    expect(packLabel(1)).toBeNull();
    expect(packLabel(0)).toBeNull();
    expect(packLabel(null)).toBeNull();
    expect(packLabel(2.5)).toBeNull();
  });
});

describe("kart içi varyant seçimi", () => {
  // Gerçek katalogdaki gibi seyrek matris: her renk her bedende yok.
  const variants = [
    v("siyah-m", "Siyah", "M", 0),
    v("siyah-l", "Siyah", "L", 4),
    v("gri-m", "Gri", "M", 2),
    v("gri-xl", "Gri", "XL", 0),
    v("lacivert-s", "Lacivert", "S", 0),
    v("pasif", "Beyaz", "M", 9, false),
  ];

  it("tek bileşimde seçim istemez, birden fazlasında ister", () => {
    expect(needsVariantChoice([v("a", "Siyah", "M", 3)])).toBe(false);
    expect(needsVariantChoice([v("a", "Siyah", "M", 3), v("b", "Beyaz", "M", 9, false)])).toBe(false);
    expect(needsVariantChoice(variants)).toBe(true);
  });

  it("renk seçeneklerinde pasifleri atar, stoksuz rengi seçilemez işaretler", () => {
    expect(colorOptions(variants)).toEqual([
      { value: "Siyah", label: "Siyah", available: true },
      { value: "Gri", label: "Gri", available: true },
      { value: "Lacivert", label: "Lacivert", available: false },
    ]);
  });

  it("bedenleri renge göre ve sıralı verir", () => {
    expect(sizeOptions(variants, "Gri")).toEqual([
      { value: "M", label: "M", available: true },
      { value: "XL", label: "XL", available: false },
    ]);
  });

  it("ilk seçim satılabilir varyanttır; stokta olmayan varyant asla çözülmez", () => {
    expect(initialChoice(variants)).toEqual({ color: "Siyah", size: "L", pack: 1 });
    expect(resolveVariant(variants, { color: "Siyah", size: "L", pack: 1 })?.id).toBe("siyah-l");
    expect(resolveVariant(variants, { color: "Siyah", size: "M", pack: 1 })).toBeNull();
    expect(resolveVariant(variants, { color: "Beyaz", size: "M", pack: 1 })).toBeNull();
    expect(initialChoice([v("a", "Siyah", "M", 0)])).toEqual({ color: null, size: null, pack: null });
  });

  it("renk değişince bedeni korur ya da ilk satılabilir bedene geçer", () => {
    const withShared = [...variants, v("gri-l", "Gri", "L", 1)];
    expect(chooseColor(withShared, "Gri", "L")).toEqual({ color: "Gri", size: "L", pack: 1 });
    expect(chooseColor(variants, "Gri", "L")).toEqual({ color: "Gri", size: "M", pack: 1 });
    expect(chooseColor(variants, "Lacivert", "L")).toEqual({ color: "Lacivert", size: null, pack: null });
  });

  it("renksiz/bedensiz varyantlar da seçilebilir kalır", () => {
    const plain = [v("std", null, "M", 2), v("std-l", null, "L", 1)];
    expect(colorOptions(plain)).toEqual([]);
    const choice = initialChoice(plain);
    expect(choice).toEqual({ color: "", size: "M", pack: 1 });
    expect(resolveVariant(plain, { ...choice, size: "L" })?.id).toBe("std-l");
  });
});

describe("kart içi paket seçimi", () => {
  // Aynı renk ve bedende tekli ve 3'lü paket: paket de sorulmalı.
  const variants = [
    v("siyah-m-1", "Siyah", "M", 2, true, 1),
    v("siyah-m-3", "Siyah", "M", 5, true, 3),
    v("siyah-l-3", "Siyah", "L", 4, true, 3),
    v("siyah-l-6", "Siyah", "L", 0, true, 6),
    v("siyah-xl-12", "Siyah", "XL", 9, false, 12),
  ];

  it("aynı renk/bedende farklı paket varsa seçim ister", () => {
    expect(needsVariantChoice([v("a", "Siyah", "M", 2, true, 1), v("b", "Siyah", "M", 2, true, 3)])).toBe(true);
    expect(needsVariantChoice([v("a", "Siyah", "M", 2, true, 3), v("b", "Siyah", "M", 2, false, 6)])).toBe(false);
  });

  it("paket seçeneklerini renk/bedene göre, artan ve stok durumuyla verir; tek paket varsa sormaz", () => {
    expect(packOptions(variants, "Siyah", "M")).toEqual([
      { value: 1, label: "Tekli", available: true },
      { value: 3, label: "3'lü paket", available: true },
    ]);
    expect(packOptions(variants, "Siyah", "L")).toEqual([
      { value: 3, label: "3'lü paket", available: true },
      { value: 6, label: "6'lı paket", available: false },
    ]);
    // Pasif 12'li paket sayılmaz; XL'de etkin paket yok → soru yok.
    expect(packOptions(variants, "Siyah", "XL")).toEqual([]);
  });

  it("varyantı renk + beden + paket ile çözer; beden değişince satılabilir pakete geçer", () => {
    const first = initialChoice(variants);
    expect(first).toEqual({ color: "Siyah", size: "M", pack: 1 });
    expect(resolveVariant(variants, first)?.id).toBe("siyah-m-1");
    expect(resolveVariant(variants, { ...first, pack: 3 })?.id).toBe("siyah-m-3");
    expect(resolveVariant(variants, { color: "Siyah", size: "L", pack: 6 })).toBeNull();
    // M/3'lü seçiliyken L'ye geçilince 3'lü korunur; M/tekli seçiliyken L'de tekli yok → 3'lü.
    expect(chooseSize(variants, "Siyah", "L", 3)).toEqual({ color: "Siyah", size: "L", pack: 3 });
    expect(chooseSize(variants, "Siyah", "L", 1)).toEqual({ color: "Siyah", size: "L", pack: 3 });
  });

  it("sepet etiketi paketi içerir", () => {
    expect(variantLabel({ color: "Siyah", size: "M", packQuantity: 3 })).toBe("Siyah / M / 3'lü paket");
    expect(variantLabel({ color: "Siyah", size: "M", packQuantity: 1 })).toBe("Siyah / M");
  });

  it("kartın paket adedi yalnızca etkin varyantlardan hesaplanır", () => {
    expect(
      maxActivePackQuantity([
        { packQuantity: 3, active: true },
        { packQuantity: 12, active: false },
      ]),
    ).toBe(3);
    expect(maxActivePackQuantity([{ packQuantity: 6, active: false }])).toBe(1);
  });
});

describe("kart fiyatı", () => {
  const variant = (price: number, stock = 3, active = true) => ({ price, stock, active });

  it("gösterilen fiyat ürün fiyatıysa indirim aynı tabandan hesaplanır", () => {
    expect(cardPricing({ price: 8000, listPrice: 10000, variants: [variant(8000), variant(9000)] })).toEqual({
      price: 8000,
      priceVaries: true,
      compareAtPrice: 10000,
      discountPercent: 20,
    });
  });

  it("varyanta özel (daha düşük) fiyat gösteriliyorsa liste fiyatıyla kıyaslamaz", () => {
    const pricing = cardPricing({ price: 70000, listPrice: 90000, variants: [variant(45000), variant(70000)] });
    expect(pricing.price).toBe(45000);
    expect(pricing.compareAtPrice).toBeNull();
    expect(pricing.discountPercent).toBe(0);
  });

  it("indirim yoksa üstü çizili fiyat yok; stokta varyant yoksa tüm varyantlardan en düşük", () => {
    expect(cardPricing({ price: 5000, listPrice: 5000, variants: [variant(5000)] }).compareAtPrice).toBeNull();
    expect(cardPricing({ price: 5000, listPrice: 5000, variants: [variant(6000, 0), variant(5500, 0)] }).price).toBe(5500);
    expect(cardPricing({ price: 5000, listPrice: 5000, variants: [] }).price).toBe(5000);
  });
});

describe("kart verisi (API yanıtı)", () => {
  it("yalnızca kart alanlarını döndürür; SKU ve satış adedi gibi alanları atar", () => {
    const full = {
      id: A,
      name: "Ürün",
      slug: "urun",
      brandName: "Marka",
      brandSlug: "marka",
      image: "/a.jpg",
      hoverImage: null,
      price: 100,
      listPrice: 100,
      packInfo: null,
      packQuantity: 1,
      isNew: false,
      rating: 0,
      reviewCount: 0,
      soldCount: 42,
      modelCode: "GIZLI-1",
      shortDescription: "x",
      variants: [
        { id: B, sku: "SKU-1", size: "M", color: null, packQuantity: 1, price: 100, stock: 2, active: true },
      ],
    };
    const data = toProductCardData(full);
    expect(Object.keys(data)).not.toContain("soldCount");
    expect(Object.keys(data)).not.toContain("modelCode");
    expect(Object.keys(data.variants[0])).not.toContain("sku");
    expect(data.variants[0]).toEqual({ id: B, size: "M", color: null, packQuantity: 1, price: 100, stock: 2, active: true });
  });
});

describe("ürün kimliği doğrulama", () => {
  it("boş parametre boş listedir", () => {
    expect(parseProductIdsParam(null)).toEqual({ ok: true, ids: [] });
    expect(parseProductIdsParam("")).toEqual({ ok: true, ids: [] });
  });

  it("tekrarları atar, sırayı korur, büyük harfi normalize eder", () => {
    expect(parseProductIdsParam(`${B}, ${A},${B.toUpperCase()},`)).toEqual({ ok: true, ids: [B, A] });
  });

  it("UUID olmayan değeri ve 100'den fazla kimliği reddeder", () => {
    expect(parseProductIdsParam(`${A},'; drop table products;--`).ok).toBe(false);
    const many = Array.from({ length: MAX_PRODUCT_IDS + 1 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
    ).join(",");
    expect(parseProductIdsParam(many).ok).toBe(false);
  });

  it("sunucu tarafı temizleyici geçersizleri sessizce atar ve sınırlar", () => {
    expect(sanitizeProductIds([A, "x", A, B])).toEqual([A, B]);
    expect(sanitizeProductIds([A, B], 1)).toEqual([A]);
  });
});

describe("vitrin çeşitlendirme", () => {
  const ranked = [
    { id: 1, brand: "tutku" },
    { id: 2, brand: "tutku" },
    { id: 3, brand: "tutku" },
    { id: 4, brand: "tutku" },
    { id: 5, brand: "seher" },
    { id: 6, brand: "jiber" },
  ];

  it("marka başına sınır uygular ve aynı markayı mümkünse art arda getirmez", () => {
    const picked = diversifyByKey(ranked, (item) => item.brand, { limit: 6, maxPerKey: 2 });
    expect(picked.map((item) => item.id)).toEqual([1, 5, 2, 6]);
  });

  it("sınırı doldurmak için gevşetmez, limitte durur", () => {
    expect(diversifyByKey(ranked, (item) => item.brand, { limit: 2, maxPerKey: 3 })).toHaveLength(2);
  });

  it("grupları sırayla karıştırır", () => {
    expect(interleaveGroups([["6a", "6b", "6c"], ["3a"], ["12a", "12b"]], 5)).toEqual([
      "6a",
      "3a",
      "12a",
      "6b",
      "12b",
    ]);
  });
});

describe("sortSizes (filtreler)", () => {
  it("harf bedenlerini, 2XL'i ve çorap aralıklarını doğru sıralar", async () => {
    const { sortSizes } = await import("@/lib/format");
    expect(sortSizes(["2XL", "41 - 45", "M", "XS", "40 - 44", "XXL", "L", "3XL"])).toEqual([
      "XS",
      "M",
      "L",
      "2XL", // XXL ile aynı beden; eşitlikte alfabetik
      "XXL",
      "3XL",
      "40 - 44",
      "41 - 45",
    ]);
  });
});
