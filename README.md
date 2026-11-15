# Abani Classic — Premium D2C E-Ticaret Platformu

Next.js (App Router) + PostgreSQL + Drizzle ORM ile geliştirilmiş, Türkçe, modüler monolith
e-ticaret uygulaması. Ürün kataloğu doğruluğu, güvenli sipariş akışı ve operasyonel
yönetilebilirlik önceliklidir.

## Canlıya geçiş

GitHub'a yükleme, Neon PostgreSQL, Vercel deploy, alan adı/DNS, ödeme webhook'u,
yasal uyumluluk ve canlıya geçiş sırası için adım adım kılavuz:
👉 **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

Kodu GitHub'a tek komutla yüklemek için (PAT ile):
```bash
export GH_TOKEN=github_pat_...   # Settings → Developer settings → PAT (repo kapsamı)
./scripts/push-to-github.sh
```
Veya tek tıkla deploy: yukarıdaki **Deploy with Vercel** butonu.
Veya manuel: `git remote add origin https://github.com/datacleantr/abani-classic.git && git push -u origin main`

Açık iş kararları: **[docs/OPEN_DECISIONS.md](./docs/OPEN_DECISIONS.md)**

## Çalıştırma

```bash
cp .env.example .env        # DATABASE_URL'i kendi ortamınla doldur
npm install
npx drizzle-kit push        # şemayı uygula
npx tsx src/db/seed.ts      # demo katalog + operasyon verisi (--force ile sıfırlar)
npm run dev
```

## Demo hesaplar

| Rol | E-posta | Parola |
|-----|---------|--------|
| Süper yönetici | owner@abaniclassic.com | Abani2026! |
| Katalog yöneticisi | katalog@abaniclassic.com | Katalog2026! |
| Sipariş yöneticisi | operasyon@abaniclassic.com | Operasyon2026! |
| Müşteri | ayse@example.com | Musteri2026! |

Kuponlar: `ABANI10` (%10, min 750 TL), `HOSGELDIN` (100 TL, min 500 TL),
`KARGOBENDEN` (ücretsiz kargo, min 1.000 TL).

## Mimari

- `src/db/schema.ts` — katalog, stok, sipariş, ödeme, import, RBAC ve audit tabloları.
- `src/lib/catalog.ts` — yayınlanmış ürün sorguları, filtre/facet ve detay toplama.
- `src/lib/pricing.ts` — sunucu tarafı fiyat/kupon/kargo hesabı (istemci fiyatına güvenilmez).
- `src/lib/orders.ts` — transaction içinde rezervasyon, idempotent ödeme olayı, durum geçişleri.
- `src/lib/imports.ts` — CSV parse, doğrulama, eşleştirme skoru, dry-run ve uygulama.
- `src/lib/auth.ts` — DB destekli oturum, scrypt parola, rol yetkileri.
- `src/app/(store)` — vitrin; `src/app/admin/(panel)` — yönetim paneli.
- `src/app/actions` — server action'lar (Zod doğrulama + RBAC + audit).
- `.github/workflows/ci.yml` — her push'ta typecheck + lint + build.

## Güvenlik notları

- `.env` asla commit edilmez (`.gitignore` ile engelli).
- Kart verisi hiçbir tabloya yazılmaz; ödeme sağlayıcısı sandbox adapter ile simüle edilir.
- `/api/payments/webhook` HMAC imza doğrular; `payment_events` tablosundaki benzersiz olay
  kimliği sayesinde aynı bildirim iki kez stok düşmez.
- Fiyat, stok ve kupon kuralları yalnızca sunucuda hesaplanır.
- Yasal metinler taslaktır; yayına almadan önce hukuk kontrolü gerekir (bkz. `docs/OPEN_DECISIONS.md`).
