---
description: Tüm kalite kapılarını çalıştır (typecheck, lint, birim, entegrasyon, build)
---

Sırayla çalıştır ve her birinin sonucunu gerçek çıktıyla raporla:

1. `npm run check`
2. `npm run test:integration`
3. `npm run build`
4. `npm audit --omit=dev`

Bir adım başarısız olursa dur, hatayı çıktısıyla göster ve kök nedeni açıkla. Başarısız testi
geçsin diye testi gevşetme; önce davranışın mı testin mi yanlış olduğunu belirle.
