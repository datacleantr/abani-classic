---
description: Pazaryeri verisini güvenli sırayla içe aktar (topla → dry-run → aktar → ön izleme)
argument-hint: [kaynak, varsayılan pazarama]
---

Kaynak: $ARGUMENTS (boşsa `pazarama`).

1. `npm run source:pazarama:fetch` — yalnızca robots.txt'in izin verdiği sayfalar. 403 veya
   CAPTCHA gelirse DUR; korumayı aşmaya çalışma, satıcı paneli dışa aktarımını öner.
2. `npm run source:pazarama:import -- --dry-run` — kaç ürün adayı/varyant oluşacağını raporla.
3. Kullanıcı onaylarsa `npm run source:pazarama:import` — ürünler `review` durumunda oluşur.
4. `npm run catalog:publish -- --source=pazarama` — yalnızca ön izleme; engelli ürünleri listele.
5. Yayınlama (`--confirm`) fiyat ve görsel kullanımını onaylamak demektir: kullanıcıya açıkça
   sor, onay gelmeden çalıştırma.

Trendyol, Hepsiburada, n11 ve Amazon otomatik erişimi engelliyor; bu kaynaklar için satıcı
panelinden alınan CSV dosyası `/admin/ice-aktarim` ekranından yüklenir.
