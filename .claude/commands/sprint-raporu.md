---
description: Blueprint §21.4 biçiminde sprint raporu üret
---

`git status`, `git diff --stat` ve son test çıktılarından yararlanarak aşağıdaki biçimde
Türkçe bir rapor yaz. Yalnızca gerçekten yapılanı ve doğrulananı yaz; çalıştırmadığın testi
"geçti" diye yazma.

```
SPRINT:
Tamamlanan işler:
Değiştirilen dosyalar:
Yeni migration:
Eklenen API/servisler:
Test komutları:
Test sonuçları:
Açık hatalar:
Güvenlik notları:
Sonraki sprint:
Manuel onay gereken kararlar:
```

Ardından `docs/GAP_REPORT.md` ve `docs/OPEN_DECISIONS.md` dosyalarını güncel duruma getir.
