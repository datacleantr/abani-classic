# Abani Classic — Açık Kararlar

Bu dosya, canlıya geçiş öncesi işletme tarafından onaylanması gereken kararları listeler.
Uygulama bu değerler eksikken çalışır, ancak üretim ortamında aşağıdaki maddeler
tamamlanmadan yayına alınmamalıdır.

| # | Konu | Durum | Not |
|---|------|-------|-----|
| 1 | Resmi alan adı (`APP_URL`) | Açık | Kanonik URL ve sitemap bu değere bağlı. |
| 2 | Logo ve marka varlıkları | Açık | Şu an tipografik logotype kullanılıyor. |
| 3 | Şirket ticari unvanı, MERSİS, vergi bilgileri | Açık | Yasal metinlerde ve fatura akışında gerekli. |
| 4 | Pazaryeri ürün export dosyaları | Açık | Gerçek Trendyol/Hepsiburada/Pazarama/n11/Amazon dosyaları bekleniyor. |
| 5 | SKU / barkod ana listesi | Açık | Eşleştirmede birincil sinyal. |
| 6 | Gerçek depo stok kaynağı | Açık | Tek doğruluk kaynağı seçilmeli (depo, ERP veya pazaryeri). |
| 7 | Maliyet ve satış fiyatı politikası | Açık | Kâr raporu bu veri olmadan açılmaz. |
| 8 | Ödeme sağlayıcısı (iyzico / PayTR / Param) | Açık | Sandbox adapter hazır; gerçek adapter sözleşme sonrası. |
| 9 | Kargo firması ve API erişimi | Açık | `Shipment` kaydı manuel takip numarası ile çalışıyor. |
| 10 | E-posta gönderim domain'i | Açık | Şu an e-posta kuyruğu simüle ediliyor. |
| 11 | Görsel ve açıklama kullanım hakları | Açık | Hak durumu `product_images.rights_status` alanında izleniyor. |
| 12 | İade/cayma prosedürü ve hijyen istisnası | Açık | Hukuk kontrolü gerekli; sistem otomatik ret vermiyor. |
| 13 | KVKK / ETBİS / İYS kayıtları | Açık | Yasal metinler taslak. |
| 14 | Background job/queue sağlayıcısı | Açık | Uzun import işleri HTTP içinde çalıştırılmamalı. |

## Uygulanan kararlar

- **ADR-001** Modüler monolith (Next.js App Router, route groups + servis katmanı).
- **ADR-002** PostgreSQL + Drizzle ORM; para alanları integer kuruş.
- **ADR-005** Katalog kaynağı: yetkili export/CSV, ham veri saklanır.
- **ADR-006** Ürün eşleştirme: açıklanabilir skor + insan onayı; ≥95 güçlü aday, 75–94 inceleme, <75 yeni.
- **ADR-010** Görsel hakları doğrulanmadan yayın yok.
- **ADR-011** RBAC sunucu tarafında uygulanır; tüm kritik işlemler audit log yazar.
- **ADR-013** Ödeme: imzalı webhook + idempotency; kart verisi saklanmaz.
- **ADR-014** Stok: checkout'ta süreli rezervasyon, ödeme onayı ile kesinleşir.

## Ortam değişkenleri

`APP_URL`, `DATABASE_URL`, `SESSION_SECRET`, `PAYMENT_WEBHOOK_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`, `SHIPPING_API_KEY`, `GOOGLE_ANALYTICS_ID`.
Değerler yalnızca ortam panelinde tutulur; repoya yazılmaz.
