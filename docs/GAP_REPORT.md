# Abani Classic — Denetim ve Boşluk Raporu

Tarih: 17 Kasım 2026 · Kapsam: blueprint'e göre mevcut kodun denetimi, bu turda kapatılanlar
ve kalanlar. Durum sütunu yalnızca doğrulanmış olanı yansıtır.

## 1. Özet

Repoda çalışan bir Next.js 16 + PostgreSQL + Drizzle uygulaması vardı (vitrin, sepet, checkout,
yönetim paneli, CSV içe aktarım). Derleniyordu ama **canlıya çıkmayı engelleyen güvenlik
açıkları**, sürümsüz şema, sıfır test ve uydurma demo katalog içeriyordu. Bu turda P0 açıklar
kapatıldı, test ve migration altyapısı kuruldu, Pazarama mağazasındaki 531 gerçek ilan kataloğa
alındı. Platform **henüz canlıya hazır değil**: ödeme, kargo, e-posta entegrasyonları ve aşağıdaki
işletme kararları eksik.

## 2. Bu turda kapatılan kritik bulgular

| # | Bulgu | Etki | Çözüm |
| --- | --- | --- | --- |
| P0-1 | `/api/checkout` istemciden gelen `paymentMode` ile siparişi anında "ödendi" yapıyordu | Ödemesiz sipariş | Checkout artık yalnızca `pending_payment` sipariş açar; sandbox ayrı adım ve üretimde kapalı (`lib/payments.ts`) |
| P0-2 | Sipariş sayfası tahmin edilebilir numarayla (`AB-YYMM-4 hane`) herkese açıktı | Ad, adres bölgesi, sipariş içeriği sızıntısı | 48 karakterlik `access_token`; sayfa yalnızca sahip/yönetici/anahtar ile açılır |
| P0-3 | İade talebi herhangi bir sipariş numarası için sahiplik kontrolsüz açılabiliyordu | Yetkisiz işlem | Sahip e-postası veya erişim anahtarı zorunlu |
| P1-1 | Yönetici elle "ödendi" yaptığında stok düşmüyor, rezervasyon asılı kalıyordu | Stok tutarsızlığı | Webhook ile aynı kesinleştirme yolu; ayrı yetki (`canConfirmPayment`) |
| P1-2 | Başarısız ödemeden sonra iptal, rezervasyonu ikinci kez çözüyordu | Başka siparişin rezervasyonu siliniyordu | Rezervasyon yalnızca `pending_payment` iken çözülür |
| P1-3 | Rezervasyon süresi/temizliği yoktu | Terk edilen checkout stoğu kalıcı kilitliyordu | `reservation_expires_at` + `/api/cron/expire-reservations` |
| P1-4 | Kargoya verirken firma/takip no boşsa "Aras Kargo" ve sahte takip numarası üretiliyordu | Müşteriye uydurma bilgi | İkisi de zorunlu |
| P1-5 | Oturum çerezi üretimde varsayılan `SameSite=None` | CSRF yüzeyi | Varsayılan `Lax` |
| P1-6 | Oturum belirteci veritabanında düz metin | DB sızıntısında oturum çalınır | SHA-256 özeti saklanır |
| P1-7 | Giriş denemelerinde sınır yok | Parola deneme saldırısı | Hesap + IP bazlı sınır (15 dk) |
| P1-8 | Güvenlik başlıkları/CSP yok | XSS, clickjacking | CSP, HSTS, nosniff, frame, referrer başlıkları |
| P1-9 | JSON-LD kaçışsız `<script>` içine basılıyordu | Ürün adı üzerinden XSS | `jsonLd()` güvenli serileştirici |
| P1-10 | Stokta DB kısıtı yok | Negatif/tutarsız stok mümkün | `on_hand >= 0`, `0 <= reserved <= on_hand` kısıtları |
| P1-11 | `drizzle.config.json` içinde sabit DB adresi (başka projenin portu) | Yanlış veritabanına şema yazma riski | Dosya kaldırıldı |
| P1-12 | Next.js 16.4.2'de bilinen açık (GHSA-mfr8-8qww-v76h) | Bilgi sızıntısı | 16.4.6'ya yükseltildi; `npm audit` 0 açık |
| P2-1 | Şema `drizzle-kit push` ile yönetiliyordu | Geri alınamaz, izlenemez | `drizzle/` migration'ları + `npm run db:migrate` |
| P2-2 | Hiç test yoktu | Regresyon riski | 40 birim + 10 entegrasyon testi, CI'da PostgreSQL |
| P2-3 | Sipariş hataları loglanmadan yutuluyordu | Sorun teşhis edilemez | `lib/logger.ts` (JSON, PII maskeli) |
| P2-4 | Ortam değişkeni doğrulaması yok | Eksik ayarla sessiz çalışma | `lib/env.ts` + `instrumentation.ts` |
| P2-5 | Görsel hak durumu saklanıyor ama vitrinde uygulanmıyordu | ADR-010 ihlali | Vitrin sorguları hak durumuna göre filtreliyor |
| P2-6 | Seed üretimde çalışabiliyor, `--force` her şeyi siliyordu | Veri kaybı | Üretim engeli + gerçek katalog koruması |

## 3. Gerçek katalog (Pazarama)

- Kaynak: `https://www.pazarama.com/magaza/abani-classic` — robots.txt'in izin verdiği sayfalar,
  düşük hızda; 531/531 ilan, 0 hata. Ham kayıt: `data/sources/pazarama/listings.jsonl` ve
  `source_products` tablosu.
- 531 ilan → **299 ürün adayı, 520 varyant**, 12 marka, 10 kategori. 295'i yayına hazır,
  4'ü kategori eşlenemediği için `review` durumunda.
- Blueprint varsayımından farklar: marka sayısı 5 değil 12+ (Berrak, Anıt, Dündar, Erdem,
  Tatkan, Ay Yıldız, Tutku Elit…); **kadın ürünleri** var (atlet/body, külot, tayt, çorap) —
  4 kadın kategorisi eklendi.
- **Trendyol, Hepsiburada, n11, Amazon otomatik erişimi reddediyor (403/503).** Koruma
  aşılmadı. Bu kaynaklar için satıcı panelinden CSV alınıp `/admin/ice-aktarim` ile yüklenmeli.

Bilinen sınırlar (hepsi insan kontrolü gerektirir):

1. **Görseller Pazarama CDN adresinden gösteriliyor.** CDN otomatik indirmeyi engelliyor;
   dosyalar kopyalanamadı. Canlıda kendi görsel dosyalarınız yüklenmeli.
2. **Stok gerçek değil.** Kaynak yalnızca "stokta" bilgisi veriyor. Yerel veritabanında varyant
   başına 25 adet *deneme* stoğu var (`stock_movements.type = dev_seed`).
3. **Fiyatlar öneridir:** Pazarama vitrin fiyatı kopyalandı. Kendi mağaza fiyat politikanız
   (komisyonsuz) belirlenmeli.
4. **SKU'lar geçicidir** (`PZ-<ilan kodu>`). Yalnızca 36 ilanda geçerli EAN-13 barkod var.
5. **Ürün açıklaması yok** — kaynak sayfada metin açıklama bulunmuyor; uydurulmadı. Özellik
   tablosu (kumaş, yaka, kalıp…) aktarıldı.
6. **Gruplama muhafazakârdır:** yalnızca marka + paket adedi + (beden/renk çıkarılmış) başlık
   aynıysa birleştirir. Farklı başlıkla açılmış aynı ürünler ayrı ürün olarak durur
   (ör. "Tutku 0114 … 6'lı Paket" iki ayrı kayıt). Panelde ürün birleştirme aracı henüz yok.
7. 8 üründe paket adedi kaynaktan çıkarılamadı (1 varsayıldı, kontrol edilmeli).

## 4. Blueprint karşılaştırması

✅ var ve doğrulandı · 🟡 kısmi · ❌ yok

| Bölüm | Konu | Durum | Not |
| --- | --- | --- | --- |
| §3 | Next.js 16 / React 19 / TS strict / Tailwind 4 / Drizzle / Zod | ✅ | |
| §3 | DB destekli oturum, scrypt parola | ✅ | |
| §3 | Redis, object storage, e-posta, Sentry | ❌ | Sağlayıcı kararı bekliyor |
| §3.2 / §4 | `modules/<alan>` yapısı, repository/service ayrımı | 🟡 | Mantık `src/lib` altında alan dosyalarında; bazı action'lar doğrudan DB'ye yazıyor |
| §5 | Tasarım token'ları, responsive vitrin, focus, reduced-motion | ✅ | WCAG kontrast ölçümü yapılmadı |
| §5.3 | Ana sayfa, kategori, ürün, sepet, checkout, hesap | ✅ | Hesapta adres defteri, şifre değiştirme, izin yönetimi yok |
| §6 | brands, categories, products, variants, images, inventory, stock_movements | ✅ | |
| §6 | attributes (jsonb), marketplace_listings, source_products | ✅ | |
| §6 | bundles, price_lists/history, warehouses, reservations tablosu, consents, addresses, refunds, webhook_events, system_settings | ❌ | Rezervasyon `inventory.reserved` + sipariş üzerinden izleniyor |
| §7 | CSV içe aktarım, dry-run, eşleşme skoru, insan onayı, dosya hash | ✅ | |
| §7 | XLSX, MIME/içerik doğrulama, arka plan işi, dosyanın private storage'da saklanması | ❌ | İçe aktarım HTTP isteği içinde çalışıyor (500 satır sınırı) |
| §7 | Pazaryerleri arası eşleştirme (aynı ürünün farklı kaynak ilanları) | 🟡 | Motor var; tek gerçek kaynak Pazarama |
| §8 | Sunucu tarafı fiyat, kupon, stok modeli, append-only hareket | ✅ | |
| §8 | Maliyet/marj alanları, paket/bundle stok tüketimi | ❌ | |
| §9 | Misafir sepeti, checkout yeniden fiyatlama, durum makinesi, snapshot | ✅ | Sepet tarayıcıda tutuluyor; giriş sonrası birleştirme yok |
| §9.4 | Süreli rezervasyon + serbest bırakma + idempotent kesinleştirme | ✅ | Entegrasyon testli |
| §10 | PaymentProvider soyutlaması, imzalı webhook, idempotency, tutar kontrolü | 🟡 | Webhook ucu hazır; **gerçek sağlayıcı adapter'ı yok** |
| §10 | Havale/EFT (elle onay) | ✅ | Sağlayıcı sözleşmesi beklerken kullanılabilir tek gerçek yöntem |
| §10 | İade (refund) sağlayıcı üzerinden | ❌ | Yalnızca durum kaydı |
| §11 | Kargo adapter'ı, etiket, takip olayları | ❌ | Takip numarası elle giriliyor |
| §11.3 | İade talebi, otomatik ret yok | 🟡 | Talep açılıyor; panelde iade yönetim ekranı yok |
| §12 | 7 rol, sunucu tarafı yetki, audit log | ✅ | |
| §12 | Marka/kategori/kupon/müşteri/iade/rapor ekranları, kullanıcı yönetimi, MFA | ❌ | Mevcut: panel, ürün, stok, sipariş, içe aktarım, yorum, denetim, ayarlar |
| §13 | Arama + filtre (marka, beden, renk, fiyat, stok) | 🟡 | `ILIKE`; Türkçe karakter normalizasyonu ve tam metin arama yok. Liste sorgusu tüm ürünleri belleğe alıyor — ~300 üründe sorun değil, büyürse SQL'e taşınmalı |
| §14 | Metadata, canonical, sitemap, robots, Product/Breadcrumb JSON-LD | ✅ | Sahte puan üretilmiyor |
| §14 | Slug değişiminde 301, facet noindex politikası, Merchant feed, GA4, çerez izni | ❌ | |
| §15 | Çerez, CSP, hız sınırı, Zod, parametreli sorgu | ✅ | CSP `unsafe-inline` içeriyor (nonce'a geçilmeli) |
| §15 | Şifre sıfırlama, e-posta doğrulama, oturum yönetimi ekranı, MFA | ❌ | E-posta sağlayıcısına bağlı |
| §15.2 | İzin kayıtları (zaman/kaynak/metin sürümü), saklama-imha | ❌ | Yalnızca `marketing_consent` boolean |
| §16 | JSON log, health check | 🟡 | Request ID, hata izleme servisi yok |
| §16.2 | Yedekleme, geri yükleme testi | ❌ | Barındırma kararına bağlı |
| §17 | Unit + integration | ✅ | E2E (Playwright) yok |
| §20 | Ortam şeması, CI (audit, typecheck, lint, test, migration, build) | ✅ | Preview/production ortamları kurulmadı |
| §23 | ADR kayıtları `docs/decisions/` | ❌ | Kararlar `OPEN_DECISIONS.md` içinde özet |

## 5. Önerilen sıra

1. **İşletme girdileri** (`OPEN_DECISIONS.md`): gerçek stok dosyası, fiyat politikası, görsel
   dosyaları, şirket/yasal bilgiler, ödeme ve kargo sağlayıcısı.
2. Diğer dört pazaryerinin satıcı paneli dışa aktarımları → içe aktarım + eşleştirme; XLSX desteği.
3. Panel: ürün birleştirme, marka/kategori/kupon yönetimi, iade ekranı, toplu fiyat/stok güncelleme.
4. Ödeme sağlayıcı adapter'ı (sandbox testleriyle) + kargo adapter'ı + e-posta bildirimleri.
5. Müşteri hesabı: şifre sıfırlama, adres defteri, izin kayıtları.
6. Görsel depolama (Blob/S3), Türkçe arama, liste sorgusunun SQL'e taşınması.
7. E2E testleri, hata izleme, yedekleme/geri yükleme, hukuk kontrolü, UAT, canlıya geçiş.
