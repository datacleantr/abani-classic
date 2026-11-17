import Image from "next/image";

import { cn } from "@/lib/format";

/** Proje sahibinin verdiği gerçek logo (320×320, beyaz zemin, saydamlık yok). Dosya düzenlenmez. */
export const BRAND_LOGO_PATH = "/brand/abani-classic-logo.webp";

/*
 * Logo karesinde içerik çevresinde geniş beyaz boşluk var (içerik ≈ x 56–274, y 67–235). Dosyayı
 * yeniden kodlamamak için kırpma CSS ile yapılır: kutu 230×180'lik bölgeyi (x 50–280, y 61–241)
 * gösterir, görsel bu kutuya göre büyütülüp kaydırılır.
 */
const CROP = { x: 50, y: 61, width: 230, height: 180, source: 320 };

/**
 * Logo. Yüksekliği `className` ile verin (ör. `h-[52px]`); genişlik en-boy oranından gelir.
 * `mix-blend-multiply`: beyaz zemin açık (paper/ivory) arka planda görünmez. Koyu zeminde kullanmayın.
 */
export function BrandLogo({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <span
      className={cn("relative block overflow-hidden", className)}
      style={{ aspectRatio: `${CROP.width} / ${CROP.height}` }}
    >
      <Image
        src={BRAND_LOGO_PATH}
        alt="Abani Classic"
        width={CROP.source}
        height={CROP.source}
        preload={preload}
        sizes="112px"
        className="absolute h-auto max-w-none mix-blend-multiply"
        style={{
          width: `${(CROP.source / CROP.width) * 100}%`,
          left: `${(-CROP.x / CROP.width) * 100}%`,
          top: `${(-CROP.y / CROP.height) * 100}%`,
        }}
      />
    </span>
  );
}
