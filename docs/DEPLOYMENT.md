# Abani Classic — Canlıya Geçiş Rehberi

Bu rehber projeyi GitHub'a yüklemekten gerçek müşteriye satış yapmaya kadar olan
yolu aşama aşama anlatır. Her aşamanın sonunda "Kontrol" maddesi vardır; geçmeden
sonraki aşamaya ilerlemeyin.

---

## Aşama 0 — Hazırlık (30 dk)

Gerekli hesaplar:

| Servis | Amaç | Ücret |
|---|---|---|
| GitHub (datacleantr) | Kaynak kod | Ücretsiz |
| Neon.tech | Yönetilen PostgreSQL | Ücretsiz plan yeterli |
| Vercel | Hosting + SSL + CDN | Ücretsiz plan ile başlanır |
| Resend | E-posta gönderimi | Ücretsiz 3.000/ay |

Bilgisayarınızda: Node.js 20+, Git, bir kod editörü (VS Code).

---

## Aşama 1 — Kodu GitHub'a yükleme

```bash
# 1. Projeyi indirip klasöre girin
cd abani-classic

# 2. .env dosyasının repoya gitmeyeceğinden emin olun
cat .gitignore | grep "^.env"      # ".env" satırı görünmeli

# 3. Git başlat ve ilk commit
git init
git add .
git commit -m "feat: Abani Classic e-ticaret platformu ilk sürüm"

# 4. GitHub'da boş bir repo oluşturun: github.com/new
#    Ad: abani-classic · Private seçin · README eklemeyin

# 5. Bağla ve gönder
git branch -M main
git remote add origin https://github.com/datacleantr/abani-classic.git
git push -u origin main
```

**Kontrol:** GitHub'da Actions sekmesinde CI yeşil olmalı. Repo içinde `.env`
dosyası GÖRÜNMEMELİ. Görünüyorsa hemen `git rm --cached .env` yapıp commit atın
ve içindeki tüm şifreleri değiştirin.

---

## Aşama 2 — Üretim veritabanı (Neon)

1. neon.tech → New Project → Region: **Frankfurt (eu-central-1)** (Türkiye'ye en yakın).
2. Dashboard'dan **Pooled connection** string'ini kopyalayın:
   `postgresql://...@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
3. Bilgisayarınızda şemayı uygulayın:

```bash
# Geçici olarak üretim DB'sine bağlan
export DATABASE_URL="postgresql://...neon.tech/neondb?sslmode=require"
npx drizzle-kit push
```

4. İlk gerçek yöneticiyi oluşturun (demo hesapları YÜKLEMEYİN):

```bash
npx tsx scripts/create-admin.ts "Adınız Soyadınız" siz@firmaniz.com "EnAz12KarakterParola!" super_admin
```

5. Kategori ve markaları eklemek için seed'i çalıştırabilir, ardından demo
   sipariş/müşterileri temizleyebilirsiniz:

```bash
npx tsx src/db/seed.ts
npx tsx scripts/remove-demo-data.ts --confirm
npx tsx scripts/create-admin.ts "Adınız" siz@firmaniz.com "Parola!" super_admin
```

**Kontrol:** Neon SQL Editor'de `select count(*) from products;` çalışmalı.

---

## Aşama 3 — Vercel deploy

1. vercel.com → Add New → Project → GitHub'dan `abani-classic` seçin.
2. Framework: Next.js (otomatik algılanır). Build ayarlarına dokunmayın.
3. **Environment Variables** bölümüne ekleyin (Production + Preview):

| Anahtar | Değer |
|---|---|
| `DATABASE_URL` | Neon pooled connection string |
| `APP_URL` | `https://abani-classic.vercel.app` (sonra alan adınız) |
| `PAYMENT_WEBHOOK_SECRET` | `openssl rand -hex 32` çıktısı |
| `SESSION_SECRET` | `openssl rand -hex 32` çıktısı |
| `NODE_ENV` | `production` |

4. Deploy'a basın. 2–3 dk sonra site yayında.

**Kontrol:** `https://....vercel.app/api/health` → `{"ok":true}` dönmeli.
`/admin/giris` ile oluşturduğunuz yönetici hesabıyla giriş yapabilmelisiniz.

---

## Aşama 4 — Alan adı ve HTTPS

1. Alan adınızı (örn. `abaniclassic.com`) bir kayıt şirketinden alın.
2. Vercel → Project → Settings → Domains → alan adını ekleyin.
3. Kayıt şirketinde Vercel'in verdiği A / CNAME kayıtlarını girin.
4. SSL otomatik; 10–30 dk içinde aktif olur.
5. Vercel env'de `APP_URL` değerini `https://abaniclassic.com` yapın → Redeploy.

**Kontrol:** `https://abaniclassic.com/sitemap.xml` kendi alan adınızla URL'ler
üretmeli. Google Search Console'a siteyi ekleyin ve sitemap'i gönderin.

---

## Aşama 5 — Gerçek katalog

1. **Görseller:** `public/images/` içine kendi ürün fotoğraflarınızı koyun
   (4:5 oran, 1200×1500 px, JPG, <300 KB). Kullanım hakkı sizde olmayan
   pazaryeri görsellerini KULLANMAYIN.
2. **Ürünler:** Admin → Ürünler → Yeni ürün. Her ürün için renk/beden girin;
   oluşturulan varyantlara stok ekleyin.
3. **Toplu aktarım:** Trendyol/Hepsiburada satıcı panelinden ürün listesini
   CSV olarak indirin → Admin → İçe aktarım → Dry-run → satırları inceleyin →
   Onayla. Belirsiz eşleşmeler için "İnsan kararı" kolonunu kullanın.
4. **Fiyat:** Pazaryeri fiyatı otomatik kopyalanmaz. Her ürüne maliyet + marj
   hesabıyla kendi satış fiyatınızı girin.
5. Kontrol ettiğiniz ürünlerin durumunu "Yayında" yapın.

**Kontrol:** Ana sayfa, kategori ve ürün sayfaları gerçek verilerle görünmeli.

---

## Aşama 6 — Gerçek ödeme entegrasyonu

Şu an `src/app/api/checkout/route.ts` içinde ödeme sandbox olarak simüle
edilir. Gerçek sağlayıcı için:

1. **Sağlayıcı seçin:** iyzico (en yaygın, kolay onboarding), PayTR veya Param.
   Şirket evrakları (vergi levhası, imza sirküleri, banka hesabı) gerekir;
   onay 3–10 iş günü sürer.
2. Sandbox API anahtarlarını alın; Vercel env'e `PAYMENT_API_KEY`,
   `PAYMENT_SECRET` ekleyin.
3. Geliştirme işi (bir geliştiriciye veya AI asistanına verilecek görev):
   - `src/lib/payments/iyzico.ts` adaptörü: `createPayment` (ödeme formu
     başlatma) ve `verifyWebhook` (imza doğrulama).
   - `/api/checkout` içindeki `applyPaymentEvent` çağrısını kaldırıp
     sağlayıcının ödeme sayfasına yönlendirme ekleyin.
   - `/api/payments/webhook` içinde `isValidSignature` fonksiyonunu
     sağlayıcının imza şemasına uyarlayın. Idempotency ve stok mantığı
     zaten hazır; değiştirmeyin.
4. Sağlayıcı panelinde webhook URL'sini kaydedin:
   `https://abaniclassic.com/api/payments/webhook`
5. Test senaryoları (blueprint §10.3): başarılı, reddedilen kart, sayfa kapatma,
   geç webhook, çift webhook, tutar uyuşmazlığı.

**Kontrol:** Sandbox kartla gerçek bir sipariş tamamlanmalı, admin'de "Ödendi"
görünmeli, stok düşmeli.

---

## Aşama 7 — Kargo ve e-posta

**Kargo (başlangıç için manuel yeterli):**
Admin → Sipariş → Durum güncelle → "Kargoda" + taşıyıcı + takip no. Müşteri
sipariş sayfasında görür. Günlük 20+ sipariş olunca kargo API'si entegre edin
(Aras, Yurtiçi, MNG, Sürat — hepsinde kurumsal sözleşme gerekir).

**E-posta (Resend):**
1. resend.com → Domain ekle → DNS kayıtlarını (SPF, DKIM) girin.
2. Vercel env: `RESEND_API_KEY`, `EMAIL_FROM=siparis@abaniclassic.com`.
3. Geliştirme işi: sipariş onayı, kargoya verildi ve iade bildirimi e-postaları
   (`src/lib/notifications.ts` oluşturulup `transitionOrder` ve
   `applyPaymentEvent` içinden çağrılır).

---

## Aşama 8 — Yasal zorunluluklar (Türkiye)

Bunlar yazılım değil, işletme işidir; **canlıya satış açmadan önce** tamamlanmalı:

| Zorunluluk | Nereden | Not |
|---|---|---|
| Şahıs/Limited şirket + vergi levhası | Mali müşavir | Ödeme sağlayıcısı ister |
| ETBİS kaydı | etbis.ticaret.gov.tr | E-ticaret siteleri için zorunlu |
| İYS (İleti Yönetim Sistemi) | iys.org.tr | Pazarlama e-postası/SMS için |
| KVKK VERBİS (gerekiyorsa) | verbis.kvkk.gov.tr | Çalışan sayısı/ciro eşiğine bağlı |
| Mesafeli satış sözleşmesi, ön bilgilendirme, KVKK metni | Avukat | `/yasal/*` sayfalarındaki taslakları onaylatın; şirket bilgilerini `src/lib/legal.ts` içine yazın |
| e-Fatura / e-Arşiv | Mali müşavir + entegratör | Her sipariş için fatura kesilmeli |
| İç giyim cayma hakkı istisnası | Avukat | Hijyen ürünü politikası |

Footer'daki şirket bilgileri: `src/components/store/site-footer.tsx`.

---

## Aşama 9 — İzleme, yedek, güvenlik

- **Hata izleme:** Vercel → Integrations → Sentry (ücretsiz plan).
- **Yedek:** Neon otomatik 7 günlük point-in-time recovery sağlar. Ayda bir
  `pg_dump` alıp şifreli saklayın; bir kez geri yükleme testi yapın.
- **Analitik:** GA4 ölçüm kimliğini aldıktan sonra çerez izni bileşeniyle
  birlikte ekleyin (izinsiz yüklemeyin).
- **Güvenlik:** Admin parolaları 12+ karakter; Vercel'de 2FA açın; GitHub'da
  Dependabot'u etkinleştirin (Settings → Code security).
- **Uptime:** betteruptime.com veya uptimerobot.com ile `/api/health` izleyin.

---

## Aşama 10 — Yumuşak açılış kontrol listesi

- [ ] Demo hesaplar silindi, gerçek yönetici oluşturuldu
- [ ] Tüm ürünlerde gerçek fiyat, stok, görsel ve kullanım hakkı var
- [ ] Kendi kartınızla 1 TL'lik gerçek sipariş: ödeme → stok → e-posta → kargo → teslim → iade akışı çalıştı
- [ ] Mobilde (gerçek telefon) ana sayfa → ürün → sepet → ödeme denendi
- [ ] Yasal metinler avukat onaylı, şirket bilgileri yazıldı
- [ ] ETBİS kaydı yapıldı, İYS hesabı açıldı
- [ ] Google Search Console + sitemap gönderildi
- [ ] Sentry ve uptime izleme aktif
- [ ] Yedek geri yükleme testi yapıldı
- [ ] İlk hafta: yakın çevre + mevcut pazaryeri müşterilerinize sınırlı duyuru;
      sorun yoksa reklam/kampanya

---

## Günlük geliştirme akışı (sonrası için)

```bash
git checkout -b feature/odeme-iyzico     # her iş için ayrı dal
# ... değişiklikler ...
npm run lint && npx tsc --noEmit && npm run build
git commit -am "feat: iyzico ödeme adaptörü"
git push -u origin feature/odeme-iyzico  # Vercel otomatik preview URL üretir
# GitHub'da PR aç → CI yeşil → main'e birleştir → otomatik production deploy
```

Şema değişikliği gerektiğinde: `src/db/schema.ts` düzenle →
`npx drizzle-kit generate` → migration dosyasını commit et →
production'da `npx drizzle-kit migrate` (yıkıcı değişikliklerde önce yedek al).
