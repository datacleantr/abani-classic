export type LegalSection = { heading: string; paragraphs?: string[]; bullets?: string[] };

export type LegalDocument = {
  title: string;
  description: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
};

export const legalDocuments: Record<string, LegalDocument> = {
  kvkk: {
    title: "KVKK Aydınlatma Metni",
    description:
      "Abani Classic tarafından kişisel verilerin işlenmesine ilişkin KVKK aydınlatma metni.",
    updatedAt: "2026-02-01",
    intro:
      "Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu kapsamında veri sorumlusu sıfatıyla hareket eden Abani Classic tarafından hazırlanmıştır. Yayına almadan önce şirket unvanı, adres ve veri işleme envanteri ile uyumlu şekilde hukuk kontrolünden geçirilmelidir.",
    sections: [
      {
        heading: "İşlenen kişisel veriler",
        bullets: [
          "Kimlik ve iletişim: ad, soyad, e-posta, telefon, teslimat adresi.",
          "Sipariş ve işlem güvenliği: sipariş içeriği, ödeme referansı, işlem zamanı, IP ve oturum bilgisi.",
          "Pazarlama izni: yalnızca açık rıza verilmesi halinde e-posta izin kaydı, izin tarihi ve metin sürümü.",
        ],
      },
      {
        heading: "İşleme amaçları ve hukuki sebepler",
        paragraphs: [
          "Kişisel veriler; sözleşmenin kurulması ve ifası, sipariş ve kargo operasyonunun yürütülmesi, yasal saklama yükümlülükleri, ödeme ve muhasebe süreçleri ile talep ve şikâyetlerin yönetilmesi amacıyla işlenir.",
          "Pazarlama iletişimi, sipariş sürecinden ayrı olarak açık rıza şartına bağlanmıştır. Rızanın geri alınması geçmiş sipariş işlemlerini etkilemez.",
        ],
      },
      {
        heading: "Aktarım ve saklama",
        paragraphs: [
          "Veriler; ödeme kuruluşu, kargo firması, e-posta gönderim sağlayıcısı ve barındırma hizmet sağlayıcıları ile yalnızca hizmetin gerektirdiği ölçüde paylaşılır. Yurt dışına aktarım gerekiyorsa mevzuatın öngördüğü şartlar ve uygun güvenceler sağlanır.",
          "Veriler, ilgili mevzuatta öngörülen süreler boyunca saklanır; süre sonunda silinir, yok edilir veya anonim hale getirilir.",
        ],
      },
      {
        heading: "Haklarınız",
        bullets: [
          "Kişisel verilerinizin işlenip işlenmediğini öğrenme ve işlenmişse buna ilişkin bilgi talep etme.",
          "İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme.",
          "Eksik veya yanlış işlenen verilerin düzeltilmesini talep etme.",
          "Silinmesini veya yok edilmesini talep etme.",
          "Aktarıldığı üçüncü kişileri öğrenme ve zararın giderilmesini talep etme.",
        ],
      },
    ],
  },
  gizlilik: {
    title: "Gizlilik ve Çerez Politikası",
    description: "Abani Classic çerez kullanımı, analitik ve pazarlama teknolojileri politikası.",
    updatedAt: "2026-02-01",
    intro:
      "Bu politika, sitemizde kullanılan çerezleri ve izleme teknolojilerini açıklar. Zorunlu çerezler sitenin çalışması için gereklidir; analitik ve pazarlama çerezleri yalnızca izin verilmesi halinde etkinleştirilir.",
    sections: [
      {
        heading: "Çerez kategorileri",
        bullets: [
          "Zorunlu: oturum yönetimi, sepet sürekliliği ve güvenlik. İzin gerektirmez.",
          "Analitik: sayfa görüntüleme ve dönüşüm ölçümü. İzin gerektirir.",
          "Pazarlama: yeniden hedefleme ve reklam ölçümü. İzin gerektirir.",
        ],
      },
      {
        heading: "Tarayıcı sepeti",
        paragraphs: [
          "Sepet bilgileri, giriş yapmadan alışveriş deneyimini sürdürebilmeniz için tarayıcınızın yerel depolama alanında tutulur. Bu veriler ödeme adımında sunucuda yeniden fiyatlanır ve doğrulanır.",
        ],
      },
      {
        heading: "Tercihlerin yönetimi",
        paragraphs: [
          "Tarayıcı ayarlarınızdan çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin engellenmesi halinde sepet ve oturum işlevleri çalışmayabilir.",
        ],
      },
    ],
  },
  "mesafeli-satis": {
    title: "Mesafeli Satış Sözleşmesi",
    description: "Abani Classic mesafeli satış sözleşmesi taslağı.",
    updatedAt: "2026-02-01",
    intro:
      "Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği kapsamında düzenlenmiştir. Yayına almadan önce satıcı bilgileri, ödeme ve teslimat hükümleri ile birlikte hukuk kontrolünden geçirilmelidir.",
    sections: [
      {
        heading: "Taraflar ve konu",
        paragraphs: [
          "Sözleşme, alıcının sitede belirtilen ürünleri sipariş etmesi üzerine elektronik ortamda kurulur. Sipariş özetinde ürün adı, adedi, satış fiyatı, vergiler, kargo ücreti ve toplam tutar yer alır.",
        ],
      },
      {
        heading: "Teslimat",
        paragraphs: [
          "Siparişler stok durumuna göre 1-3 iş günü içinde kargoya verilir. Teslimat, sipariş sırasında bildirilen adrese yapılır. Kargo firmasından kaynaklanan gecikmelerde alıcı bilgilendirilir.",
        ],
      },
      {
        heading: "Cayma hakkı",
        paragraphs: [
          "Alıcı, teslimattan itibaren 14 gün içinde gerekçe göstermeksizin cayma hakkına sahiptir. İç giyim ve hijyen niteliği taşıyan ürünlerde, ambalajı açılmış ürünlere ilişkin istisnalar mevzuat çerçevesinde değerlendirilir.",
        ],
      },
      {
        heading: "Ödeme ve iade",
        paragraphs: [
          "Ödeme, seçilen ödeme sağlayıcısı üzerinden alınır. Kart bilgileri satıcı sistemlerinde saklanmaz. Cayma hakkının kullanılması halinde bedel, mevzuatta öngörülen süre içinde ödeme aracına uygun şekilde iade edilir.",
        ],
      },
    ],
  },
  iade: {
    title: "İade ve Değişim",
    description: "Abani Classic iade ve değişim süreci.",
    updatedAt: "2026-02-01",
    intro:
      "Teslimattan sonra 14 gün içinde iade talebi oluşturabilirsiniz. Talebiniz, ürünün niteliği ve ambalaj durumu dikkate alınarak değerlendirilir.",
    sections: [
      {
        heading: "Süreç",
        bullets: [
          "Sipariş detay sayfanızdan iade talebi oluşturun.",
          "Ekibimiz 2 iş günü içinde kargo kodu ve yönlendirme paylaşır.",
          "Ürün depoya ulaştığında nitelik kontrolü yapılır.",
          "Onaylanan iadelerde bedel, ödeme sağlayıcısı üzerinden iade edilir.",
        ],
      },
      {
        heading: "Hijyen ürünleri",
        paragraphs: [
          "İç giyim ürünlerinde ambalajı açılmış, kullanılmış veya hijyen açısından yeniden satışa uygun olmayan ürünlerde cayma hakkı istisnası uygulanabilir. Sistem otomatik ret kararı vermez; her talep ayrıca ve gerekçeli olarak değerlendirilir.",
        ],
      },
      {
        heading: "Değişim",
        paragraphs: [
          "Beden değişimi, stok durumuna göre yapılır. Değişim talebini iade talebi olarak oluşturup notunuza beden tercihinizi ekleyebilirsiniz.",
        ],
      },
    ],
  },
  "on-bilgilendirme": {
    title: "Ön Bilgilendirme Formu",
    description: "Sipariş öncesi ön bilgilendirme formu.",
    updatedAt: "2026-02-01",
    intro:
      "Bu form, ödeme adımından önce tüketiciye sunulmak üzere hazırlanmıştır. Ticari unvan, MERSİS, vergi bilgileri ve iletişim bilgileri yayına almadan önce tamamlanmalıdır.",
    sections: [
      {
        heading: "Ürün ve satıcı bilgileri",
        bullets: [
          "Satıcı: Abani Classic (ticari unvan onay bekliyor).",
          "Ürünler: Sipariş özetinde adet, beden, renk ve fiyat bilgisiyle gösterilir.",
          "Toplam tutar: Ürün bedeli, kargo ücreti ve varsa indirimler ödeme adımında gösterilir.",
        ],
      },
      {
        heading: "Teslimat ve cayma",
        paragraphs: [
          "Teslimat süresi 1-3 iş günüdür. Cayma hakkı süresi teslimattan itibaren 14 gündür. İade kargo süreci ve istisnalar hakkında İade ve Değişim sayfası bilgi verir.",
        ],
      },
    ],
  },
  cerezler: {
    title: "Çerez Tercihleri",
    description: "Çerez kategorileri ve izin yönetimi.",
    updatedAt: "2026-02-01",
    intro:
      "Zorunlu çerezler dışındaki analitik ve pazarlama çerezleri yalnızca açık izinle çalıştırılır. Bu sürümde analitik ve pazarlama etiketleri varsayılan olarak yüklü değildir.",
    sections: [
      {
        heading: "Varsayılan durum",
        bullets: [
          "Zorunlu çerezler: etkin.",
          "Analitik çerezler: izin verilene kadar devre dışı.",
          "Pazarlama çerezleri: izin verilene kadar devre dışı.",
        ],
      },
      {
        heading: "İzin kaydı",
        paragraphs: [
          "İzin kayıtları zaman, kaynak ve metin sürümü ile saklanır. İzninizi geri almak için destek kanalını kullanabilirsiniz.",
        ],
      },
    ],
  },
};

export function getLegalDocument(slug: string): LegalDocument | null {
  return legalDocuments[slug] ?? null;
}
