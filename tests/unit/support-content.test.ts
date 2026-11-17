import { describe, expect, it } from "vitest";

import {
  directionsUrl,
  mailHref,
  mapEmbedUrl,
  missingStoreInfo,
  organizationContactSchema,
  STORE_INFO,
  telHref,
  type StoreInfo,
} from "@/lib/store-info";
import {
  buildFaq,
  carrierText,
  dispatchText,
  faqJsonLd,
  paymentAnswer,
  reservationDays,
  shippingFeeText,
} from "@/lib/support-content";

const FEES = { flat: 4990, freeThreshold: 100000 };
const MARKETPLACES = ["Trendyol", "Hepsiburada"];

const EMPTY: StoreInfo = {
  legalName: null,
  mersisNumber: null,
  taxOffice: null,
  taxNumber: null,
  address: null,
  kepAddress: null,
  email: null,
  phone: null,
  supportHours: null,
  location: null,
  shipping: { carriers: [], dispatchTime: null, feesConfirmed: false },
  about: { story: [] },
};

const FILLED: StoreInfo = {
  legalName: "Örnek Tekstil Ltd. Şti.",
  mersisNumber: "0000000000000000",
  taxOffice: "Merkez",
  taxNumber: "0000000000",
  address: "Örnek Mah. 1. Sok. No:1",
  kepAddress: "ornek@hs01.kep.tr",
  email: "destek@example.com",
  phone: "0212 000 00 00",
  supportHours: "Hafta içi 09.00–18.00",
  location: null,
  shipping: { carriers: ["Örnek Kargo", "Deneme Kargo"], dispatchTime: "2 iş günü içinde kargoya verilir.", feesConfirmed: true },
  about: { story: ["Hikâye."] },
};

const BANK = { ok: true, method: "bank_transfer", reservationMinutes: 3 * 24 * 60 } as const;
const SANDBOX = { ok: true, method: "sandbox", reservationMinutes: 30 } as const;
const OFF = { ok: false, message: "kapalı" } as const;

/** İşletme onayı olmadan sayfalarda görünmemesi gereken somut vaatler. */
const UNCONFIRMED_CLAIM = /\d+\s*(iş\s*)?gün(ü)? içinde|\d[\d.,]*\s*TL|ücretsiz kargo|Kargo ücreti:/i;

describe("STORE_INFO", () => {
  it("yalnızca proje sahibinin verdiği adres ve telefon dolu; gerisi uydurulmamış", () => {
    expect(missingStoreInfo(STORE_INFO, ["address", "phone"])).toEqual([]);
    expect(
      missingStoreInfo(STORE_INFO, ["legalName", "email", "supportHours", "carriers", "dispatchTime", "feesConfirmed", "story"]),
    ).toHaveLength(7);
    expect(telHref(STORE_INFO.phone ?? "")).toBe("tel:+903122205807");
  });

  it("harita ve yol tarifi adresleri koordinattan üretilir", () => {
    const point = { lat: 39.897965, lng: 32.815948 };
    expect(mapEmbedUrl(point)).toBe("https://www.google.com/maps?q=39.897965,32.815948&z=16&hl=tr&output=embed");
    expect(directionsUrl(point)).toBe("https://www.google.com/maps/dir/?api=1&destination=39.897965,32.815948");
    // CSP yalnızca bu kaynağa çerçeve izni verir (next.config.ts frame-src).
    expect(new URL(mapEmbedUrl(point)).origin).toBe("https://www.google.com");
  });

  it("Organization şemasına yalnızca girilmiş iletişim alanları eklenir", () => {
    expect(organizationContactSchema(EMPTY)).toEqual({});
    const schema = organizationContactSchema(STORE_INFO);
    expect(schema.telephone).toBe("+903122205807");
    expect(schema).not.toHaveProperty("email");
    expect(schema.address).toMatchObject({ "@type": "PostalAddress", postalCode: "06520", addressCountry: "TR" });
  });

  it("missingStoreInfo yalnızca boş alanları, istenen sırayla döndürür", () => {
    expect(missingStoreInfo(EMPTY, ["phone", "email", "story"])).toEqual(["phone", "email", "story"]);
    expect(missingStoreInfo(FILLED, ["phone", "email", "carriers", "dispatchTime", "feesConfirmed", "story"])).toEqual([]);
    expect(missingStoreInfo({ ...EMPTY, email: "   ", shipping: { ...EMPTY.shipping, carriers: [" "] } }, ["email", "carriers"]))
      .toEqual(["email", "carriers"]);
  });
});

describe("telHref / mailHref", () => {
  it("Türkiye numaralarını E.164 bağlantısına çevirir", () => {
    expect(telHref("0212 000 00 00")).toBe("tel:+902120000000");
    expect(telHref("0850 000 00 00")).toBe("tel:+908500000000");
    expect(telHref("(212) 000 00 00")).toBe("tel:+902120000000");
    expect(telHref("(0312) 220 58 07")).toBe("tel:+903122205807");
    expect(telHref("+90 212 000 00 00")).toBe("tel:+902120000000");
  });

  it("geçersiz numara/e-posta için bağlantı vermez", () => {
    expect(telHref("123")).toBeNull();
    expect(mailHref("destek")).toBeNull();
    expect(mailHref(" destek@example.com ")).toBe("mailto:destek@example.com");
  });
});

describe("kargo metinleri", () => {
  it("onay yokken ücret, süre veya firma adı yazmaz", () => {
    expect(shippingFeeText(EMPTY, FEES)).not.toMatch(UNCONFIRMED_CLAIM);
    expect(dispatchText(EMPTY)).not.toMatch(/\d/);
    expect(carrierText(EMPTY)).not.toMatch(/Örnek|Deneme/);
  });

  it("onaylanınca pricing.ts değerlerini ve işletmenin girdiklerini yazar", () => {
    const fee = shippingFeeText(FILLED, FEES);
    expect(fee).toContain("49,90 TL");
    expect(fee).toContain("1.000,00 TL");
    expect(shippingFeeText(FILLED, { flat: 4990, freeThreshold: 0 })).not.toContain("ücretsiz");
    expect(dispatchText(FILLED)).toBe("2 iş günü içinde kargoya verilir.");
    expect(carrierText(FILLED)).toContain("Örnek Kargo ve Deneme Kargo");
  });
});

describe("ödeme cevabı", () => {
  it("yalnızca etkin yöntemi anlatır", () => {
    expect(paymentAnswer(BANK)).toContain("havale/EFT");
    expect(paymentAnswer(BANK)).toContain("3 gün");
    expect(paymentAnswer(SANDBOX)).not.toMatch(/havale|kart/i);
    expect(paymentAnswer(OFF)).not.toMatch(/havale|kart/i);
  });

  it("stok ayırma süresini yalnızca tam gün ise yazar", () => {
    expect(reservationDays(BANK)).toBe(3);
    expect(reservationDays(SANDBOX)).toBeNull();
    expect(reservationDays(OFF)).toBeNull();
  });
});

describe("SSS", () => {
  it("işletme bilgisi yokken hiçbir cevapta onaylanmamış vaat yok", () => {
    const groups = buildFaq({ info: EMPTY, payment: SANDBOX, fees: FEES, marketplaces: MARKETPLACES });
    for (const item of groups.flatMap((group) => group.items)) {
      expect(item.answer, item.id).not.toMatch(UNCONFIRMED_CLAIM);
      expect(item.answer, item.id).not.toMatch(/14 gün|orijinal|%100|Türkiye üretimi/i);
    }
  });

  it("kimlikler benzersiz; pazaryeri yoksa o soru çıkmaz", () => {
    const groups = buildFaq({ info: EMPTY, payment: BANK, fees: FEES, marketplaces: MARKETPLACES });
    const ids = [...groups.map((group) => group.id), ...groups.flatMap((group) => group.items.map((item) => item.id))];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("pazaryerleri");

    const without = buildFaq({ info: EMPTY, payment: BANK, fees: FEES, marketplaces: [] });
    expect(without.flatMap((group) => group.items.map((item) => item.id))).not.toContain("pazaryerleri");
  });

  it("FAQPage JSON-LD sayfadaki soruların tamamını içerir", () => {
    const groups = buildFaq({ info: EMPTY, payment: BANK, fees: FEES, marketplaces: MARKETPLACES });
    const jsonLd = faqJsonLd(groups);
    expect(jsonLd["@type"]).toBe("FAQPage");
    expect(jsonLd.mainEntity).toHaveLength(groups.reduce((sum, group) => sum + group.items.length, 0));
  });
});
