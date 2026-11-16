# Abani Classic — D2C E-Ticaret Platformu

Next.js 16 (App Router) + React 19 + PostgreSQL + Drizzle ORM ile geliştirilen, Türkçe,
modüler monolith e-ticaret uygulaması.

> **Durum:** geliştirme aşamasında, canlıya hazır değil. Ne var/ne eksik: `docs/GAP_REPORT.md`.
> Sizden beklenen kararlar: `docs/OPEN_DECISIONS.md`. Ajan çalışma kuralları: `CLAUDE.md`.

## Kurulum

```bash
npm install
cp .env.example .env          # DATABASE_URL değerini girin
npm run db:migrate            # şemayı sürüm kontrollü migration'larla kur
npm run dev                   # http://localhost:3000
```

Gerçek katalog (Pazarama mağaza ilanları):

```bash
npm run source:pazarama:fetch                    # ilanları topla (ham kayıt)
npm run source:pazarama:import -- --dry-run      # ne oluşacağını gör
npm run source:pazarama:import                   # onay bekleyen aday olarak aktar
npm run catalog:publish -- --source=pazarama     # ön izleme; yayın için --confirm
```

İlk yönetici: `npm run admin:create`. Demo verisi (`npm run db:seed`) yalnızca geliştirme
içindir; sahte ürün/sipariş ve bilinen parolalı hesaplar oluşturur, üretimde çalışmaz.

## Kalite kapıları

```bash
npm run check               # typecheck + lint + birim testleri
npm run test:integration    # gerçek PostgreSQL'e karşı sipariş/stok/ödeme testleri
npm run build
```

Entegrasyon testleri `DATABASE_URL`'deki veritabanının yanına tek kullanımlık `<ad>_test`
veritabanı kurar; geliştirme verisine dokunmaz.

## Mimari

- `src/app/(store)` vitrin · `src/app/admin/(panel)` yönetim paneli · `src/app/api` uçlar
- `src/app/actions` server action'lar (Zod doğrulama + yetki + audit)
- `src/lib` iş mantığı: `orders`, `pricing`, `payments`, `auth`, `catalog`, `imports`,
  `sources/pazarama`, `rate-limit`, `env`, `logger`
- `src/db/schema.ts` şema · `drizzle/` migration'lar · `tests/` birim ve entegrasyon testleri

## Ödeme

| `PAYMENT_PROVIDER` | Davranış |
| --- | --- |
| boş / `sandbox` | Yalnızca geliştirme: ödeme simülasyon ekranı. Üretimde checkout kapalıdır. |
| `bank_transfer` | Havale/EFT: sipariş ödeme bekler, yetkili yönetici tahsilatı panelden onaylar. |
| `iyzico` / `paytr` / `param` | Adapter henüz yok; sözleşme ve resmi API dokümanı sonrası yazılacak. |

Sipariş hiçbir koşulda checkout isteğiyle "ödendi" olmaz. Kart verisi saklanmaz.

## Zamanlanmış görev

`GET /api/cron/expire-reservations` (`Authorization: Bearer $CRON_SECRET`) süresi dolan stok
rezervasyonlarını serbest bırakır. `vercel.json` içinde 10 dakikada bir tanımlıdır.
