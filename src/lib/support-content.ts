import { formatMoney } from "./format";
import type { PaymentConfig } from "./payments";
import type { StoreInfo } from "./store-info";

/**
 * Kurumsal sayfaların (SSS, Kargo ve Teslimat) metinleri. Saf fonksiyonlardır: yalnızca
 * `STORE_INFO`'daki işletme bilgisine ve sistemin gerçek davranışına (ödeme yapılandırması,
 * sipariş durum makinesi) göre cümle kurar. Onaylanmamış süre, ücret veya firma adı yazmaz.
 */

export type ShippingFees = { flat: number; freeThreshold: number };

export type SupportLink = { href: string; label: string };

export type FaqItem = { id: string; question: string; answer: string; link?: SupportLink };

export type FaqGroup = { id: string; title: string; items: FaqItem[] };

const listTr = (items: string[]) =>
  new Intl.ListFormat("tr-TR", { style: "long", type: "conjunction" }).format(items);

/** Kargo ücreti cümlesi. Ücretler onaylanmadıysa rakam yazılmaz. */
export function shippingFeeText(info: StoreInfo, fees: ShippingFees): string {
  if (!info.shipping.feesConfirmed) {
    return "Kargo ücreti, siparişi onaylamadan önce ödeme adımında toplam tutarla birlikte açıkça gösterilir.";
  }
  const fee = `Kargo ücreti: ${formatMoney(fees.flat)}.`;
  const free =
    fees.freeThreshold > 0 ? ` ${formatMoney(fees.freeThreshold)} ve üzeri siparişlerde kargo ücretsizdir.` : "";
  return `${fee}${free} Ücret, siparişi onaylamadan önce ödeme adımında gösterilir.`;
}

/** Kargoya verilme cümlesi. İşletme süre vermediyse süre yazılmaz; sistemdeki akış anlatılır. */
export function dispatchText(info: StoreInfo): string {
  const dispatch = info.shipping.dispatchTime?.trim();
  if (dispatch) return dispatch;
  return "Siparişiniz, ödemesi onaylandıktan sonra hazırlanır ve kargoya verilir. Kargoya verildiğinde durumu “Kargoda” olarak güncellenir.";
}

/** Kargo firması cümlesi. Firma girilmediyse firma adı yazılmaz. */
export function carrierText(info: StoreInfo): string {
  const carriers = info.shipping.carriers.map((carrier) => carrier.trim()).filter(Boolean);
  const tracking =
    "kargo firması ve takip numarası sipariş sayfanızda ve Sipariş takibi ekranında gösterilir.";
  if (carriers.length === 0) return `Siparişiniz kargoya verildiğinde ${tracking}`;
  return `Siparişleriniz ${listTr(carriers)} ile gönderilir. Siparişiniz kargoya verildiğinde ${tracking}`;
}

/** Havale/EFT'de stok ayırma süresi (gün) — yalnızca tam gün ise; değilse null. */
export function reservationDays(payment: PaymentConfig): number | null {
  if (!payment.ok) return null;
  const days = payment.reservationMinutes / (24 * 60);
  return Number.isInteger(days) && days >= 1 ? days : null;
}

/** Ödeme yöntemleri cevabı: yalnızca gerçekten etkin olan yöntem anlatılır. */
export function paymentAnswer(payment: PaymentConfig): string {
  if (payment.ok && payment.method === "bank_transfer") {
    const days = reservationDays(payment);
    const reservation = days
      ? ` Sipariş verdiğiniz ürünler ${days} gün boyunca sizin için ayrılır; bu sürede ödemesi doğrulanmayan siparişler iptal edilir.`
      : "";
    return (
      "Şu anda havale/EFT ile ödeme kabul ediyoruz. Siparişinizi tamamladığınızda hesap bilgileri ve ödenecek tutar sipariş sayfanızda gösterilir; ödeme açıklamasına sipariş numaranızı yazın. Ödemeniz hesabımızda doğrulandığında siparişiniz hazırlanmaya başlar." +
      reservation
    );
  }
  return "Kullanabileceğiniz ödeme yöntemleri, siparişi onaylamadan önce ödeme adımında gösterilir.";
}

/** Sipariş akışı (durum makinesindeki mutlu yol) ve müşteriye açıklaması. */
export const ORDER_JOURNEY: { status: string; description: string }[] = [
  {
    status: "pending_payment",
    description: "Sipariş oluşturuldu; ürünler sizin için ayrıldı. Havale/EFT'de ödemeniz hesabımıza ulaşana kadar bu adımda kalır.",
  },
  { status: "paid", description: "Ödemeniz doğrulandı." },
  { status: "processing", description: "Siparişiniz depoda hazırlanıyor." },
  { status: "packed", description: "Ürünleriniz paketlendi, kargoya teslim edilmeyi bekliyor." },
  { status: "shipped", description: "Siparişiniz kargoya verildi; kargo firması ve takip numarası sipariş sayfanızda görünür." },
  { status: "delivered", description: "Siparişiniz teslim edildi." },
];

export function buildFaq({
  info,
  payment,
  fees,
  marketplaces,
}: {
  info: StoreInfo;
  payment: PaymentConfig;
  fees: ShippingFees;
  /** Pazaryeri mağaza adları (navigation.ts `MARKETPLACE_STORES`). Boşsa soru eklenmez. */
  marketplaces: string[];
}): FaqGroup[] {
  return [
    {
      id: "siparis",
      title: "Sipariş",
      items: [
        {
          id: "uyelik",
          question: "Sipariş vermek için üye olmam gerekiyor mu?",
          answer:
            "Hayır, misafir olarak sipariş verebilirsiniz. Üye girişi yaparak verdiğiniz siparişler Hesabım sayfasında listelenir.",
          link: { href: "/giris", label: "Giriş yap / Üye ol" },
        },
        {
          id: "takip",
          question: "Siparişimi nasıl takip ederim?",
          answer:
            "Sipariş takibi sayfasına sipariş numaranızı ve siparişte kullandığınız e-posta adresini girin. Güvenlik için iki bilgi birlikte doğrulanır. Siparişiniz kargoya verildiğinde kargo firması ve takip numarası da burada görünür.",
          link: { href: "/siparis-takip", label: "Sipariş takibi" },
        },
        {
          id: "siparis-numarasi",
          question: "Sipariş numaramı nerede bulurum?",
          answer:
            "Sipariş numaranız, siparişi tamamladığınızda açılan sipariş sayfasının üst kısmında yer alır. Bu sayfanın bağlantısını saklamanızı öneririz. Üye girişiyle verdiğiniz siparişleri Hesabım sayfasında da görebilirsiniz.",
        },
      ],
    },
    {
      id: "odeme",
      title: "Ödeme",
      items: [
        { id: "odeme-yontemleri", question: "Hangi ödeme yöntemlerini kullanabilirim?", answer: paymentAnswer(payment) },
        {
          id: "kdv",
          question: "Fiyatlara KDV dahil mi?",
          answer:
            "Evet, ürün fiyatlarına KDV dahildir. Kargo ücreti ve varsa indirimler, ödeme adımında toplam tutara yansıtılarak gösterilir.",
        },
        {
          id: "kart-bilgisi",
          question: "Kart bilgilerim saklanıyor mu?",
          answer: "Hayır. Kart bilgileri sitemizde saklanmaz.",
        },
      ],
    },
    {
      id: "kargo",
      title: "Kargo ve teslimat",
      items: [
        {
          id: "kargo-ucreti",
          question: "Kargo ücreti ne kadar?",
          answer: shippingFeeText(info, fees),
          link: { href: "/kargo-ve-teslimat", label: "Kargo ve teslimat" },
        },
        {
          id: "kargoya-verilme",
          question: "Siparişim ne zaman kargoya verilir?",
          answer: dispatchText(info),
          link: { href: "/kargo-ve-teslimat#siparis-adimlari", label: "Sipariş adımları" },
        },
        { id: "kargo-firmasi", question: "Hangi kargo firmasıyla gönderiyorsunuz?", answer: carrierText(info) },
      ],
    },
    {
      id: "iade",
      title: "İade ve değişim",
      items: [
        {
          id: "iade-talebi",
          question: "İade talebini nasıl oluştururum?",
          answer:
            "Kargoya verilmiş veya teslim edilmiş siparişlerde, sipariş sayfanızdaki “İade talebi” bölümünden iade etmek istediğiniz ürünleri ve iade nedeninizi seçerek talep oluşturabilirsiniz. Talebiniz ekibimiz tarafından incelenir.",
          link: { href: "/yasal/iade", label: "İade ve değişim koşulları" },
        },
        {
          id: "degisim",
          question: "Beden değişimi yapabilir miyim?",
          answer: "Beden değişimiyle ilgili koşullar ve süreç İade ve Değişim sayfasında açıklanmıştır.",
          link: { href: "/yasal/iade", label: "İade ve değişim" },
        },
      ],
    },
    {
      id: "urunler",
      title: "Ürünler",
      items: [
        {
          id: "beden",
          question: "Beden seçimini nasıl yaparım?",
          answer:
            "Ürün sayfasında seçtiğiniz renkte sunulan bedenler listelenir; tükenen bedenler üstü çizili gösterilir. Ölçülerle ilgili sorularınız için bize ulaşabilirsiniz.",
          link: { href: "/iletisim", label: "İletişim" },
        },
        {
          id: "coklu-paket",
          question: "Çoklu paket nedir?",
          answer:
            "Bazı ürünler birden fazla adedin tek pakette satıldığı seçeneklerle sunulur. Paketteki adet ürün kartında ve ürün sayfasında belirtilir; fiyat paketin tamamı içindir.",
          link: { href: "/kampanyalar#coklu-paket", label: "Çoklu paketler" },
        },
        {
          id: "favoriler",
          question: "Favorilerim nerede saklanıyor?",
          answer:
            "Favorileriniz bu cihazdaki tarayıcınızda saklanır ve üye girişi gerektirmez. Başka bir cihazda veya tarayıcıda görünmez.",
          link: { href: "/favoriler", label: "Favorilerim" },
        },
        ...(marketplaces.length > 0
          ? [
              {
                id: "pazaryerleri",
                question: "Ürünlerinizi pazaryerlerinden de alabilir miyim?",
                answer: `Evet. Abani Classic'in ${listTr(marketplaces)} üzerinde mağazaları bulunuyor. Pazaryerinden verdiğiniz siparişler o pazaryerinin sisteminde yer alır; sorularınızı ilgili pazaryerindeki mağaza sayfamız üzerinden iletebilirsiniz.`,
                link: { href: "/iletisim#pazaryerleri", label: "Pazaryeri mağazalarımız" },
              },
            ]
          : []),
      ],
    },
  ];
}

/** schema.org FAQPage (yalnızca sayfada görünen soru ve cevaplar). */
export function faqJsonLd(groups: FaqGroup[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: groups.flatMap((group) =>
      group.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    ),
  };
}
