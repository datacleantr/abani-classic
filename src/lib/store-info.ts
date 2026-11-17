/**
 * İşletme bilgileri: kurumsal sayfaların (Hakkımızda, İletişim, SSS, Kargo ve Teslimat) tek kaynağı.
 *
 * Bu değerler YALNIZCA işletme sahibinden gelir; kodlama ajanı uydurmaz
 * (docs/OPEN_DECISIONS.md #3, #9, #15, #16). `null` / boş alan vitrinde hiç gösterilmez ve
 * yerine sistemin gerçekten yaptığını anlatan genel bir cümle çıkar. Geliştirme ortamında
 * eksik alanlar sayfanın altında listelenir (canlıda görünmez).
 *
 * Gizli değer DEĞİLDİR: ticari unvan, adres, telefon gibi bilgiler 6563 sayılı Kanun gereği
 * zaten sitede yayımlanır; bu yüzden ortam değişkeni yerine sürüm kontrollü bu dosyada durur.
 */
export type StoreInfo = {
  /** Ticari unvan (ör. "… Tekstil Ltd. Şti."). */
  legalName: string | null;
  mersisNumber: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  /** Açık adres (tek satır veya satır sonlu). */
  address: string | null;
  kepAddress: string | null;
  /** Müşteri hizmetleri e-postası. */
  email: string | null;
  /** Müşteri hizmetleri telefonu, görünen biçimiyle (ör. "0212 000 00 00"). */
  phone: string | null;
  /** Ör. "Hafta içi 09.00–18.00". */
  supportHours: string | null;
  /** Fiziksel konum: İletişim sayfasındaki harita, yol tarifi ve yapılandırılmış veri. */
  location: {
    /** İşletmenin Google Haritalar kaydı (proje sahibinin verdiği bağlantı). */
    mapsUrl: string;
    /** Haritadaki işaretçi: Google kaydındaki koordinat. */
    lat: number;
    lng: number;
    /** schema.org PostalAddress alanları. */
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
  } | null;
  shipping: {
    /** Anlaşmalı kargo firmaları. Boşsa firma adı yazılmaz. */
    carriers: string[];
    /** Hazırlık süresi cümlesi, ör. "Ödemesi onaylanan siparişler 2 iş günü içinde kargoya verilir." */
    dispatchTime: string | null;
    /**
     * `src/lib/pricing.ts` içindeki kargo ücreti ve ücretsiz kargo eşiği işletmece onaylandı mı?
     * `false` iken sayfalarda rakam yazılmaz; yalnızca "ödeme adımında gösterilir" denir.
     */
    feesConfirmed: boolean;
  };
  about: {
    /** Hakkımızda sayfasındaki marka hikâyesi paragrafları (işletme sahibinin metni). */
    story: string[];
  };
};

export const STORE_INFO: StoreInfo = {
  legalName: null,
  mersisNumber: null,
  taxOffice: null,
  taxNumber: null,
  // Adres, telefon ve konum: proje sahibi, 17 Kasım 2026 (Google Haritalar kaydı).
  address: "Oğuzlar Mah., Balgat, 1371. Sk. No:2/D, 06520 Çankaya/Ankara",
  kepAddress: null,
  email: null,
  phone: "0312 220 58 07",
  // Google kaydında yalnızca "19.00'da kapanıyor" görünüyor; açılış saati ve günler teyit edilmedi.
  supportHours: null,
  location: {
    mapsUrl: "https://maps.app.goo.gl/NTy45drBWKJtY9zt7",
    lat: 39.897965,
    lng: 32.815948,
    streetAddress: "Oğuzlar Mah., 1371. Sk. No:2/D, Balgat",
    addressLocality: "Çankaya",
    addressRegion: "Ankara",
    postalCode: "06520",
  },
  shipping: {
    carriers: [],
    dispatchTime: null,
    feesConfirmed: false,
  },
  about: {
    story: [],
  },
};

export type MissingInfoKey =
  | "legalName"
  | "mersisNumber"
  | "taxOffice"
  | "taxNumber"
  | "address"
  | "kepAddress"
  | "email"
  | "phone"
  | "supportHours"
  | "carriers"
  | "dispatchTime"
  | "feesConfirmed"
  | "story";

export const MISSING_INFO_LABELS: Record<MissingInfoKey, string> = {
  legalName: "Ticari unvan",
  mersisNumber: "MERSİS numarası",
  taxOffice: "Vergi dairesi",
  taxNumber: "Vergi numarası",
  address: "Açık adres",
  kepAddress: "KEP adresi",
  email: "Müşteri hizmetleri e-postası",
  phone: "Müşteri hizmetleri telefonu",
  supportHours: "Çalışma saatleri",
  carriers: "Kargo firması",
  dispatchTime: "Kargoya verilme süresi",
  feesConfirmed: "Kargo ücreti ve ücretsiz kargo eşiği onayı (pricing.ts)",
  story: "Marka hikâyesi metni",
};

const hasText = (value: string | null) => Boolean(value && value.trim());

/** İstenen alanlardan hangilerinin işletmece henüz girilmediğini döndürür (sıra korunur). */
export function missingStoreInfo(info: StoreInfo, keys: readonly MissingInfoKey[]): MissingInfoKey[] {
  return keys.filter((key) => {
    switch (key) {
      case "carriers":
        return info.shipping.carriers.every((carrier) => !carrier.trim());
      case "dispatchTime":
        return !hasText(info.shipping.dispatchTime);
      case "feesConfirmed":
        return !info.shipping.feesConfirmed;
      case "story":
        return info.about.story.every((paragraph) => !paragraph.trim());
      default:
        return !hasText(info[key]);
    }
  });
}

/** "0212 000 00 00" → "tel:+902120000000". Geçersizse null (bağlantı verilmez, metin gösterilir). */
export function telHref(phone: string): string | null {
  const digits = phone.replace(/[^\d+]/g, "");
  if (/^\+\d{10,15}$/.test(digits)) return `tel:${digits}`;
  if (/^0\d{10}$/.test(digits)) return `tel:+90${digits.slice(1)}`;
  if (/^\d{10}$/.test(digits)) return `tel:+90${digits}`;
  return null;
}

/**
 * schema.org Organization'a eklenecek iletişim alanları; yalnızca girilmiş olanlar.
 * Telefon E.164 biçiminde ("+903122205807"), adres PostalAddress olarak.
 */
export function organizationContactSchema(info: StoreInfo): Record<string, unknown> {
  const schema: Record<string, unknown> = {};
  const tel = info.phone ? telHref(info.phone) : null;
  if (tel) schema.telephone = tel.replace(/^tel:/, "");
  if (info.email && mailHref(info.email)) schema.email = info.email.trim();
  if (info.location) {
    const { streetAddress, addressLocality, addressRegion, postalCode, lat, lng, mapsUrl } = info.location;
    schema.address = {
      "@type": "PostalAddress",
      streetAddress,
      addressLocality,
      addressRegion,
      postalCode,
      addressCountry: "TR",
    };
    schema.location = {
      "@type": "Place",
      geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
      hasMap: mapsUrl,
    };
  }
  return schema;
}

type Coordinates = { lat: number; lng: number };

/** Anahtarsız Google Haritalar gömme adresi (işaretçi koordinatta, Türkçe arayüz). */
export function mapEmbedUrl({ lat, lng }: Coordinates): string {
  return `https://www.google.com/maps?q=${lat},${lng}&z=16&hl=tr&output=embed`;
}

/** Google Maps URLs API ile yol tarifi (uygulama yüklüyse mobilde uygulamada açılır). */
export function directionsUrl({ lat, lng }: Coordinates): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Basit doğrulama: bağlantı yalnızca makul bir e-posta için verilir. */
export function mailHref(email: string): string | null {
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? `mailto:${trimmed}` : null;
}
