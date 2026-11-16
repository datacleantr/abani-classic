# Abani Classic — Claude Code Çalışma Kılavuzu

Abani Classic markasının kendi alan adında doğrudan satış yapacağı e-ticaret platformu.
Türkiye pazarı, Türkçe arayüz, premium ve mobil öncelikli tasarım, **modüler monolith**.

Ana referans: `ABANI_CLASSIC_IMPLEMENTATION_BLUEPRINT.md` (kullanıcıda; repoda yoksa isteyin).
Mevcut durum ve eksikler: `docs/GAP_REPORT.md`. İşletme kararı bekleyenler: `docs/OPEN_DECISIONS.md`.

@AGENTS.md

## Komutlar

```bash
npm run dev                 # geliştirme sunucusu
npm run check               # typecheck + lint + birim testleri (her değişiklikten sonra)
npm run test:integration    # gerçek PostgreSQL'e karşı sipariş/stok/ödeme testleri (*_test DB kurar)
npm run build               # üretim build'i

npm run db:generate -- --name=<ad>   # şema değişikliğinden migration üret
npm run db:migrate                   # migration'ları uygula
npm run db:seed                      # YALNIZCA demo verisi (üretimde çalışmaz)

npm run source:pazarama:fetch        # Pazarama mağaza ilanlarını topla → data/sources/pazarama/
npm run source:pazarama:import -- --dry-run   # kataloğa aday olarak aktar (review durumunda)
npm run catalog:publish -- --source=pazarama  # ön izleme; yayın için --confirm
```

Yerel veritabanı Docker'daki `abani-pg` konteyneridir (`127.0.0.1:5433`). Aynı makinede başka
projelerin konteynerleri de çalışır (`mercek-*`, port 5432) — **onlara dokunma**.

## Mimari

- `src/app/(store)` vitrin · `src/app/admin/(panel)` yönetim · `src/app/api` route handler'lar
- `src/app/actions` server action'lar: **Zod doğrulama → yetki kontrolü → servis çağrısı → audit**
- `src/lib` iş mantığı ve veri erişimi. React bileşenleri veritabanına doğrudan erişmez.
  - `orders.ts` sipariş, stok rezervasyonu, ödeme olayı, durum makinesi
  - `pricing.ts` sunucu tarafı fiyat/kupon/kargo (saf `computeQuote`)
  - `payments.ts` ödeme yöntemi çözümleyici · `auth.ts` oturum + RBAC · `rate-limit.ts`
  - `imports.ts` CSV içe aktarım · `sources/pazarama.ts` ilan → ürün adayı gruplama (saf)
  - `catalog.ts` vitrin sorguları · `env.ts` ortam şeması · `logger.ts` JSON log (PII maskeli)
- `src/db/schema.ts` tek şema dosyası · `drizzle/` sürüm kontrollü migration'lar
- `tests/unit` (DB'siz) · `tests/integration` (tek kullanımlık `*_test` veritabanı)

Not: Blueprint §4'teki `src/modules/<alan>/` yapısına henüz geçilmedi; mantık `src/lib` altında
alan dosyalarına ayrılmış durumda. Yeni büyük alan eklerken modül klasörü açmak tercih edilir.

## Değişmez kurallar

Bunlar ihlal edildiğinde para, stok veya kişisel veri kaybı olur. Değiştirmeden önce sor.

1. **Ödeme:** Sipariş yalnızca (a) imzası doğrulanmış sağlayıcı bildirimi, (b) geliştirme sandbox
   adımı veya (c) yetkili yöneticinin havale onayı ile "ödendi" olur. Checkout ucu asla ödeme
   onaylamaz. Sandbox üretimde etkinleşmez (`payments.ts` + testi).
2. **Fiyat:** Tutarlar her zaman sunucuda, veritabanı satırlarından hesaplanır. İstemciden gelen
   fiyat/tutar alanı okunmaz. Para **integer kuruş**tur; float kullanılmaz.
3. **Stok:** `available = on_hand - reserved`. Her değişiklik transaction + satır kilidi içinde
   yapılır ve `stock_movements` tablosuna yeni kayıt ekler (geçmiş kayıt değiştirilmez).
   DB kısıtları (`on_hand >= 0`, `0 <= reserved <= on_hand`) son savunma hattıdır.
4. **Sipariş durumu:** Yalnızca `ORDER_TRANSITIONS` üzerinden değişir. Doğrudan `status` yazma.
5. **Sipariş kalemi snapshot'tır:** ad, SKU, fiyat, vergi sipariş anında kopyalanır; sonradan
   ürün değişse de geçmiş sipariş aynı görünür.
6. **Sipariş erişimi:** Sipariş numarası tahmin edilebilir. Sipariş sayfası/iade yalnızca sahip
   oturumu, yönetici veya `access_token` ile açılır.
7. **Yetki:** Her server action ve route handler sunucuda rol kontrolü yapar. Menü gizlemek
   yetkilendirme değildir.
8. **Katalog doğruluğu:** Pazaryeri verisi kataloğa `review` durumunda girer; yayın ayrı ve
   bilinçli bir onaydır. Kaynak fiyatı mağaza fiyatı değildir (ayrı alanda saklanır).
   Ham kaynak kaydı (`source_products`) değiştirilmez/silinmez.
9. **Görsel hakları:** Vitrin yalnızca `authorized` ve `seller_listing` görselleri gösterir.
10. **Uydurma veri yok:** Sahte yorum, puan, stok, takip numarası, kargo firması, ürün açıklaması
    veya yasal bilgi üretme. Bilinmeyen değer boş kalır ve `docs/OPEN_DECISIONS.md`'ye yazılır.
11. **Gizli değerler:** `.env` okunmaz/commit edilmez; anahtarlar koda yazılmaz; loglara e-posta,
    telefon, adres, token yazılmaz (`logger.ts` kullan).
12. **Erişim korumaları aşılmaz:** Pazaryeri 403/CAPTCHA veriyorsa dur; satıcı paneli dışa
    aktarımı veya resmi API yolunu öner.

## Çalışma biçimi

- Önce ilgili kodu ve `docs/GAP_REPORT.md`'yi oku; var olan çalışan kodu ve veriyi koru.
- Şema değişikliği = `schema.ts` düzenle → `npm run db:generate` → migration dosyasını incele →
  `npm run db:migrate`. `drizzle-kit push` kullanma. Yıkıcı değişiklikte expand-and-contract.
- Sipariş/stok/ödeme mantığına dokunan her değişiklik `tests/integration` testi ile gelir.
- Bitirmeden önce: `npm run check` ve ilgiliyse `npm run test:integration` + `npm run build`.
- Çalışmayan entegrasyonu çalışıyor gibi gösterme; ödeme/kargo/e-posta sağlayıcısı sözleşmesi
  ve resmi dokümanı olmadan adapter yazma.
- Kullanıcıya dönük tüm metinler Türkçe; kod tanımlayıcıları İngilizce.
- Uzun görev sonunda blueprint §21.4 biçiminde sprint raporu ver (`/sprint-raporu`).

## Tasarım sistemi

Token'lar `src/app/globals.css` içinde (`@theme`): `charcoal #171717`, `ivory #F5F2EC`,
`sand #B5A38A`, `muted`, `line`. Başlıklar serif (`font-display`), gövde sans. Hazır sınıflar:
`.container-page`, `.btn-dark/.btn-outline/.btn-quiet`, `.input`, `.field-label`, `.card`,
`.badge`, `.eyebrow`. Yeni renk/yarıçap uydurmak yerine bunları kullan. Görünür focus halkası
ve `prefers-reduced-motion` desteği korunmalı; hedef WCAG 2.2 AA.
