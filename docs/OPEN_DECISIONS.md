# Abani Classic — Açık Kararlar

Canlıya geçmeden önce işletme tarafından verilmesi gereken kararlar ve sağlanması gereken
girdiler. Kodlama ajanı bu değerleri uydurmaz; eksikken ilgili özellik kapalı kalır.
Teknik durum için `docs/GAP_REPORT.md`.

## Sizden beklenen girdiler

| # | Konu | Durum | Neden gerekli / şu an ne oluyor |
| --- | --- | --- | --- |
| 1 | Resmi alan adı (`APP_URL`) | Açık | Kanonik URL, sitemap, e-posta bağlantıları. |
| 2 | Logo ve marka varlıkları | Açık | Şu an tipografik logotype kullanılıyor; renkler logoya göre kesinleşmeli. |
| 3 | Ticari unvan, MERSİS, vergi dairesi/no, adres, iletişim | Açık | Yasal metinler, footer ve İletişim sayfası. Değerler `src/lib/store-info.ts` dosyasına girilir; boşken sayfada gösterilmez. **Adres, telefon ve harita konumu girildi (17 Kasım 2026).** Bekleyen: ticari unvan (Google kaydında "Abani Classic Tekstil Sanayi Ticaret A.Ş." görünüyor, teyit edilmedi), MERSİS, vergi dairesi/no, KEP, destek e-postası, çalışma saatleri. Adresin yasal (tebligat) adresle aynı olduğu varsayıldı. |
| 4 | Trendyol / Hepsiburada / n11 / Amazon satıcı paneli ürün dışa aktarımları | Açık | Bu siteler otomatik erişimi engelliyor. CSV dosyaları `/admin/ice-aktarim` ile yüklenir. |
| 5 | SKU / barkod ana listesi | Açık | Şu an SKU'lar geçici (`PZ-<Pazarama ilan kodu>`); yalnızca 36 varyantta barkod var. |
| 6 | **Gerçek depo stok dosyası** ve tek doğruluk kaynağı | Açık | Yerel veritabanındaki stok (varyant başına 25) deneme değeridir. Üretimde stok 0 açılır. |
| 7 | **Satış fiyatı politikası** ve maliyetler | Açık | Fiyatlar Pazarama vitrin fiyatından *öneri* olarak kopyalandı. Kâr raporu maliyet olmadan açılmaz. |
| 8 | Ödeme sağlayıcısı (iyzico / PayTR / Param) | Açık | Kart ödemesi yok. Hazır olan: havale/EFT (`PAYMENT_PROVIDER=bank_transfer` + IBAN). |
| 9 | Kargo firması, anlaşma ve API erişimi | Açık | Takip numarası panelden elle giriliyor. Firma adı `store-info.ts` → `shipping.carriers`; boşken Kargo/SSS sayfalarında firma adı yazılmaz. |
| 10 | E-posta gönderim alan adı ve sağlayıcı | Açık | **Hiç e-posta gönderilmiyor** (sipariş onayı, kargo bildirimi, şifre sıfırlama yok). |
| 11 | **Ürün görseli dosyaları ve kullanım hakkı teyidi** | Açık | Görseller Pazarama adresinden gösteriliyor (kopyalanamadı). Canlı için özgün dosyalar gerekli. Üretici markalara (Tutku, Berrak, Anıt…) ait görsellerin kendi sitenizde kullanım izni teyit edilmeli. |
| 12 | İade/cayma prosedürü, iç giyimde hijyen istisnası | Açık | Hukuk kontrolü gerekli. Sistem otomatik ret vermiyor. |
| 13 | KVKK aydınlatma, ETBİS, İYS, mesafeli satış metinleri | Açık | `src/lib/legal.ts` içindeki metinler taslaktır; hukuk onayı olmadan yayınlanmamalı. |
| 14 | KDV oranları | Açık | Tüm ürünlerde %10 varsayıldı; mali müşavir teyidi gerekli. |
| 15 | Kargo ücreti ve ücretsiz kargo eşiği | Açık | Kodda 49,90 TL ve 1.000 TL (`src/lib/pricing.ts`) — önceki taslaktan kalma, onaylanmadı. Onaylanınca `store-info.ts` → `shipping.feesConfirmed: true`; o zamana kadar Kargo/SSS sayfaları rakam yazmaz. |
| 16 | Vitrindeki vaatler | Açık | "14 gün iade", "1-2 iş günü kargo", "%100 pamuk / modal", "Türkiye üretimi" gibi ifadeler önceki taslaktan kalma ve doğrulanmadı. Onaylamadıklarınız kaldırılmalı. |
| 17 | Ürün açıklamaları | Açık | Kaynakta metin açıklama yok; uydurulmadı. Özellik tablosu gösteriliyor. |
| 18 | Kadın ürünleri ve çocuk ürünü vitrinde olacak mı? | Açık | Pazarama mağazasında var; 4 kadın kategorisi eklendi. Marka konumlandırma kararı. |
| 19 | Üretici markaların yetkili satıcılığı | Açık | 12+ marka listeleniyor; kendi sitenizde marka adı/logo kullanımı için yetki durumu. |
| 20 | Barındırma, veritabanı, görsel depolama, arka plan işi sağlayıcısı | Açık | `vercel.json` cron tanımı hazır; ortamlar kurulmadı. |
| 21 | Yedekleme hedefleri (RPO/RTO) | Açık | Yedekleme ve geri yükleme testi yapılmadı. |
| 22 | Kargoya verilme süresi ve Hakkımızda metni | Açık | `store-info.ts` → `shipping.dispatchTime` ve `about.story`. Boşken süre yazılmaz, marka hikâyesi bölümü çıkmaz. |
| 23 | İletişim formu | Açık | Mesajları saklayacak tablo (şema değişikliği) ve e-posta sağlayıcısı (#10) gerekir; şimdilik İletişim sayfasında form yok. |

## Uygulanan kararlar

- **ADR-001** Modüler monolith (Next.js App Router, route groups + servis katmanı).
- **ADR-002/003** PostgreSQL + Drizzle ORM; para alanları integer kuruş; migration'lar sürüm kontrollü.
- **ADR-005** Katalog kaynağı: herkese açık ve robots.txt'in izin verdiği kendi mağaza sayfaları
  veya satıcı paneli dışa aktarımı. Erişim korumaları (403, CAPTCHA) aşılmaz.
- **ADR-006** Eşleştirme insan onaylıdır; ürünler `review` durumunda oluşur, yayın ayrı onaydır.
- **ADR-010** Vitrin yalnızca `authorized` ve `seller_listing` görselleri gösterir.
- **ADR-011** RBAC sunucu tarafında; kritik işlemler audit log yazar. MFA henüz yok.
- **ADR-013** Ödeme: sipariş yalnızca imzalı bildirim, sandbox adımı (yalnızca geliştirme) veya
  yetkili yöneticinin havale onayı ile ödenmiş olur. Kart verisi saklanmaz.
- **ADR-014** Stok: checkout'ta süreli rezervasyon (kart 30 dk, havale 3 gün), ödemeyle
  kesinleşir, süre dolunca zamanlanmış görev serbest bırakır.
- **ADR-015** Sipariş sayfası erişimi: sahip oturumu, yönetici veya tahmin edilemez erişim anahtarı.

## Yerel geliştirme veritabanı hakkında

Vitrinin gerçek veriyle değerlendirilebilmesi için yerel veritabanında şu adımlar atıldı;
bunlar **üretim için verilmiş karar değildir**:

- 295 Pazarama ürünü önerilen fiyatlarla yayınlandı (`audit_logs`: `catalog.bulk_publish`).
- Varyantlara 25'er adet deneme stoğu girildi.
- Önceki 14 uydurma demo ürün arşive alındı (silinmedi).
