# Abani Classic — Canlıya Geçiş Rehberi (GitHub → Vercel → Alan Adı)

Bu kılavuz, projenin `github.com/datacleantr` altındaki yeni bir repo'ya yüklenip
üretim ortamında yayınlanması için adım adım talimattır. Her aşamanın sonunda
"kontrol noktası" bulunur; bir aşama geçmeden kontrol noktasını doğrulayın.

Önerilen mimari (blueprint ADR-001/002/004 ile uyumlu):

```
GitHub (datacleantr/abani-classic)  ──push──▶  Vercel (Next.js uygulaması)
                                                    │
                                          DATABASE_URL (env)
                                                    ▼
                                          Neon / yönetilen PostgreSQL
                                                    │
                                          Harici servisler: ödeme (iyzico/PayTR/Param),
                                          kargo API, e-posta (Resend), Sentry
```

Maliyet dostü başlangıç: **Vercel Hobby (ücretsiz) + Neon Free (ücretsiz)** ile
başlanabilir; trafik büyüdükçe plan yükseltilir.

---

## Aşama 0 — Kodu GitHub'a yükleme (github.com/datacleantr)

### 0.1 Yeni repo oluşturma (tarayıcıdan)
1. https://github.com/new adresine gidin (oturumunuz `datacleantr` ile açık olmalı).
2. **Repository name**: `abani-classic`
3. **Description**: "Abani Classic — premium D2C e-ticaret platformu (Next.js + PostgreSQL + Drizzle)"
4. **Public** veya **Private** seçin (öneri: başlangıçta **Private**, canlıya geçince public yapılabilir).
5. **Add README / .gitignore / license kutularını işaretlemeyin** — proje zaten bunları içeriyor.
6. **Create repository** deyin.

### 0.2 Yerel proje ile bağlama ve ilk push
Proje klasöründe (bu dizin) şu komutları çalıştırın:

```bash
cd abani-classic          # proje klasörü
git init -b main
git add -A
git -c user.name="datacleantr" -c user.email="datacleantr@users.noreply.github.com" \
  commit -m "Abani Classic: ilk sürüm — storefront, admin, katalog motoru, sipariş/ödeme akışı"
git remote add origin https://github.com/datacleantr/abani-classic.git
git push -u origin main
```

> Not: `git config --global user.name "Adınız"` ve `git config --global user.email "sizin@email.com"`
> ile kalıcı kimlik tanımlayın.

Alternatif (GitHub CLI kuruluysa):

```bash
gh auth login                       # tarayıcıda datacleantr ile giriş
gh repo create datacleantr/abani-classic --source . --push   # repo zaten varsa:
git remote add origin https://github.com/datacleantr/abani-classic.git && git push -u origin main
```

### 0.3 Kontrol noktası
- https://github.com/datacleantr/abani-classic adresinde dosyalar görünüyor mu?
- `.env` dosyasının **listede olmadığını** doğrulayın (`.gitignore` engeller). GitHub'da görünüyorsa:
  ```bash
  git rm --cached .env
  git commit -m "chore: .env dosyasını repodan çıkar"
  git push
  ```
  ve `.env` içindeki değerleri (varsa) her yerde yenileyin.

### 0.4 CI (otomatik test) — zaten dahil
`.github/workflows/ci.yml` her push'ta `tsc`, `eslint` ve `next build` çalıştırır.
Repo'da **Actions** sekmesinden yeşil tikleri izleyin. Kırmızı olursa logdan düzeltip
tekrar push edin.

---

## Aşama 1 — Yönetilen PostgreSQL oluşturma (Neon önerilir)

Vercel Postgres storage'ı deprecated olduğu için **Neon** (neon.tech) önerilir:
- Ücretsiz plan: 0.5 GB, branch desteği, PITR yedekleme.
- Bölge: **AWS eu-central-1 (Frankfurt)** — Türkiye'ye en yakın.

Adımlar:
1. https://neon.tech → Sign up (GitHub ile giriş yapılabilir).
2. **Create project** → Name: `abani-classic-prod`, Region: `Frankfurt (eu-central-1)`, Postgres 16+.
3. Proje açılınca **Dashboard → Connection details** → "Pooled connection" olarak:
   `postgresql://abani_...:***@ep-...-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`
   Bu string'i kopyalayın — bu sizin **üretim `DATABASE_URL`** değeriniz.
4. (Opsiyonel ama önerilir) Neon konsolunda bir **development branch** açın; preview deploy'lar
   için ayrı bir URL kullanın.

### Şemayı生产 veritabanına uygulama
Yerelde, üretim URL'si ile:

```bash
export DATABASE_URL='postgresql://...üretim...?sslmode=require'
npx drizzle-kit push        # şemayı uygular
```

> Üretimde `drizzle-kit push` yerine migration dosyaları (`drizzle-kit generate` + `migrate`)
> kullanmak daha güvenlidir. İlk yayında push kabul edilebilir; sonrası için migration'a geçin.

### Seed (yalnızca demo/test verisi)
```bash
npx tsx src/db/seed.ts
```
**Dikkat:** Production'a seed koymak demo sipariş/müşteri oluşturur. Kararınız:
- Pilot/test için seed koyun (hesaplar: `owner@abaniclassic.com / Abani2026!` vb.).
- Gerçek katalog için seed'i atlayın; admin panelden veya CSV içe aktarımla ürün girin.
- Seed sonrası **mutlaka demo parolaları değiştirin**.

### 1.x Kontrol noktası
```bash
psql "$DATABASE_URL" -c "select count(*) from products;"
```
Çıktı > 0 (veya seed koymadıysanız 0) ve hata yoksa devam.

---

## Aşama 2 — Vercel'e deploy (GitHub entegrasyonu)

1. https://vercel.com → **Add New → Project** → "Import Git Repository".
2. GitHub Technix/Vercel izin ekranında `datacleantr` organizasyonunu/onayı verin.
3. `datacleantr/abani-classic` repo'sunu seçin → **Import**.
4. Framework otomatik **Next.js** algılar. **Root Directory**: `./` (repo kökü) — proje zaten
   kökteyse dokunmayın.
5. **Environment Variables** bölümüne (aşağıdaki tabloyu producción için doldurun):

| Değişken | Değer | Not |
|---|---|---|
| `DATABASE_URL` | Neon pooled URL | `?sslmode=require` içermeli |
| `APP_URL` | `https://abaniclassic.com` (veya geçici `https://abani-classic.vercel.app`) | Kanonik URL, sitemap/OG için |
| `SESSION_SECRET` | `openssl rand -hex 32` çıktısı | Oturum imzalama |
| `PAYMENT_WEBHOOK_SECRET` | `openssl rand -hex 32` çıktısı | Webhook HMAC doğrulama |
| `PAYMENT_PROVIDER` | `iyzico` / `paytr` / `param` | Sözleşme sonrası |
| `PAYMENT_API_KEY`, `PAYMENT_SECRET` | sağlayıcıdan | **Production** env'e canlı anahtarlar |
| `SHIPPING_API_KEY` | kargo firmasından | Aşama 4 |
| `RESEND_API_KEY`, `EMAIL_FROM` | Resend'den | Aşama 5 |
| `GOOGLE_ANALYTICS_ID` | `G-XXXX` | İzinli çerezle birlikte |
| `SENTRY_DSN` | opsiyonel | Hata izleme |

   Her değişken için ortamı seçin: **Production**, tercihen **Preview** (ayrı test DB ile).
6. **Deploy** deyin. İlk build ~2-4 dk sürer.

### Preview (staging) akışı — önerilen
- Repo'ya her `push` → otomatik **Preview deployment** (örn. `abani-classic-abc123.vercel.app`).
- `main`'e merge → **Production** deployment.
- Preview için ayrı bir Neon branch + `DATABASE_URL` (Preview env) kullanarak production verisini
  riske atmayın.

### 2.x Kontrol noktası
- Vercel projesinin **Deployments** sekmesinde durum **Ready**.
- `https://<proje>.vercel.app/api/health` → `{"ok":true}` dönmeli (DB bağlıysa).
- Mağaza ana sayfası (`/`) 200 ve ürünler görünüyor mu?

---

## Aşama 3 — Alan adı (domain) ve DNS

1. Alan adı alın: `abaniclassic.com` (veya `.com.tr`) — Namecheap, Turhost, İsimtescil vb.
   från registrar panelinden.
2. Vercel → Project → **Settings → Domains** → `abaniclassic.com` ve `www.abaniclassic.com` ekleyin.
   Vercel size DNS kayıtlarını verir (genelde `A 76.76.21.21` + `CNAME www cname.vercel-dns.com`).
3. Registrar'da (Namecheap vb.) şu kayıtları girin:
   - `@` (apex) → Vercel A kaydı
   - `www` → CNAME `cname.vercel-dns.com`
4. DNS yayılımı 5 dk – 24 saat sürebilir. `nslookup abaniclassic.com` ile kontrol edin.
5. SSL (Let's Encrypt) Vercel tarafından otomatik verilir; **Settings → Domains** altında
   "Valid Configuration" görün.
6. `APP_URL=https://abaniclassic.com` olarak Production env'ini güncelleyin ve **Redeploy** yapın
   (sitemap, canonical, OG ve çerezler bu değeri kullanır).

### 3.x Kontrol noktası
- `https://abaniclassic.com` HTTPS ile açılıyor, tarayıcıda kilit işareti var.
- `https://abaniclassic.com/sitemap.xml` ve `/robots.txt` yayında.

---

## Aşama 4 — Ödeme sağlayıcısı (Türkiye)

Adaylar: **iyzico**, **PayTR**, **Param**. Karşılaştırma kriterleri: komisyon, taksit,
bloke/vade, iade (refund) API'si, 3DS desteği, sandbox.

1. Seçtiğiniz sağlayıcıda **ticari hesap + API anahtarları** alın (önce **test/sandbox**).
2. Vercel Production env'e: `PAYMENT_PROVIDER`, `PAYMENT_API_KEY`, `PAYMENT_SECRET`,
   `PAYMENT_WEBHOOK_SECRET` ekleyin.
3. Sağlayıcı panelinde **webhook URL** olarak şunu verin:
   `https://abaniclassic.com/api/payments/webhook`
   Bu endpoint HMAC imza doğrular; imza geçersizse 401 döner. Test:
   ```bash
   BODY='{"providerEventId":"evt_test_1","orderNumber":"AB-XXXX-0000","type":"succeeded","amount":1000}'
   SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$PAYMENT_WEBHOOK_SECRET" -hex | awk '{print $2}')
   curl -X POST https://abaniclassic.com/api/payments/webhook \
     -H "Content-Type: application/json" -H "x-abani-signature: sha256=$SIG" -d "$BODY"
   ```
4. Test senaryoları (blueprint §10.3): başarılı kart, reddedilen kart, kullanıcı sayfayı
   kapatır, webhook geç gelir, aynı webhook iki kez gelir, tutar uyuşmazlığı, kısmi/tam iade.
   Sandbox'ta hepsini geçmeden canlı anahtarlara geçmeyin.
5. Uygulamadaki `mockpay` adapter'ı gerçek sağlayıcı adapter'ı ile değiştirin
   (`src/app/api/checkout/route.ts` içindeki simülasyon çağrısını gerçek
   `createPayment` ile değiştirin; webhook zaten sağlayıcıdan bağımsız imza doğruluyor).

---

## Aşama 5 — Kargo ve e-posta

**Kargo:** Kullandığınız firma (Aras/Yurtiçi/MNG/Sürat) ile API anlaşması yapın;
anahtarları `SHIPPING_API_KEY` olarak env'e ekleyin. `shipments` tablosu manuel takip no ile
çalışmaya devam eder; API bağlanınca `createShipment`/`trackShipment` adapter'ı eklenir.

**E-posta (Resend önerilir):**
1. https://resend.com → domain ekle (`abaniclassic.com`) → DNS'e SPF/DKIM kayıtlarını ekle.
2. API key alın → `RESEND_API_KEY`; `EMAIL_FROM= siparis@abaniclassic.com`.
3. Domain doğrulanınca transactional e-postalar (sipariş onayı, kargo) gönderimi açılır.

---

## Aşama 6 — Yasal ve uyumluluk (canlıya geçiş öncesi ZORUNLU)

Hukuk/mali müşavir kontrolü şart:
1. **KVKK**: aydınlatma metni (`/yasal/kvkk`), veri sahibi başvuru süreci, İYS kaydı,
   çerez/analitik izinleri.
2. **ETBİS**: e-ticaret bildirimi (etbis.gov.tr).
3. **Mesafeli satış**: ön bilgilendirme formu + sözleşme (sitedeki taslakları şirket
   bilgileriyle doldurun: ticari unvan, adres, MERSİS, VKN).
4. **İade/cayma**: iç giyim hijyen istisnası hukuki değerlendirme; sistem otomatik ret vermiyor.
5. Fatura: e-fatura/e-arşiv entegrasyonu (GİB veya entegratör).

---

## Aşama 7 — Güvenlik sertleştirme

- Tüm secret'lar yalnızca Vercel env'de; GitHub'da **Settings → Secrets** (CI için gerekirse).
- `SESSION_SECRET` ve `PAYMENT_WEBHOOK_SECRET` güçlü ve benzersiz.
- Admin calculation: MFA eklemeyi değerlendirin (blueprint §15.1).
- Demo hesapların parolaları production'da değiştirildi.
- CSP/security header'ları `next.config.ts`'e eklenebilir (roadmap).
- Bağımlılık taraması: GitHub → **Security → Dependabot** aktif; `npm audit` CI'ye eklenebilir.

---

## Aşama 8 — İzleme, yedekleme, SEO

- **Sentry**: `SENTRY_DSN` env + `@sentry/nextjs` kurulumu; PII maskeleme.
- **Yedekleme**: Neon otomatik backup + PITR aktif; haftalık mantıksal `pg_dump` alıp
  ayrı bucket'ta saklayın; **restore testi** yapın (RPO/RTO hedefini yazın).
- **SEO**: Google Search Console'a domain ekle, `https://abaniclassic.com/sitemap.xml`
  gönder; Merchant Center + GA4 (izinli çerezle) bağla; `robots.txt` zaten yayında.
- **Performans**: Vercel Analytics + Core Web Vitals; görselleri `next/image` ile optimize
  etme (roadmap — şu an `<img>` kullanılıyor).

---

## Aşama 9 — Canlıya geçiş sırası (blueprint §20.3) ve rollback

1. Preview DB oluşturuldu, seed/test verisi yüklendi.
2. Production env değişkenleri tanımlandı.
3. Production'a `drizzle-kit push` (ilk) / migration.
4. Preview smoke test: sepete ekle → checkout → webhook → kargo durumu.
5. Production DB yedeği alındı (ilk deploy öncesi boş da olsa not alın).
6. Production deploy → `/api/health` yeşil.
7. Ödeme sandbox → kontrollü pilot (gerçek az sayıda işlem) → canlı anahtarlar.
8. 24-48 saat log/hata oranı izleme (Vercel Logs + Sentry).

**Rollback planı:** Vercel → Deployments → önceki yeşil deploy → **Promote to Production**.
Veritabanı için: yıkıcı migration'larda expand-and-contract kullanın; Neon branch ile
önce staging'de deneyin.

---

## Sık yapılan hatalar

| Hata | Çözüm |
|---|---|
| `.env` GitHub'da göründü | `git rm --cached .env`, commit, push; tüm anahtarları yenile |
| Vercel build `DATABASE_URL is required` | Uygulamada DB bağlantısı artık build'de zorunlu değil; yine de env'i ekle |
| `/api/health` 500 | Production `DATABASE_URL` yanlış/erişilemez; Neon IP allowlist + `sslmode=require` kontrol et |
| Webhook 401 | `PAYMENT_WEBHOOK_SECRET` production'da farklı; sağlayıcı panelindeki secret ile eşleşmeli |
| DNS açılmıyor | 24 saat bekle; `dig abaniclassic.com` ile kayıtları doğrula |
| Seed production'da demo veri bıraktı | `npx tsx src/db/seed.ts --force` yerine manuel temizlik veya yeni DB; parolaları değiştir |
| Preview production verisini gördü | Preview env'e ayrı Neon branch URL'si ver |

## Faydalı komutlar

```bash
# şema uygulama
DATABASE_URL='...' npx drizzle-kit push

# migration üretme (üretim pratiği)
npx drizzle-kit generate
npx drizzle-kit migrate   # (DATABASE_URL ile)

# seed
npx tsx src/db/seed.ts            # varsa atlar
npx tsx src/db/seed.ts --force    # sıfırlar ve yeniden yükler

# lokal geliştirme
npm run dev
npm run build && npm run start
```
