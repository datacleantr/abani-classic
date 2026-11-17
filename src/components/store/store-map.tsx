"use client";

import { useEffect, useRef, useState } from "react";

import { MapPinIcon } from "./icons";

/**
 * Tıklayınca yüklenen Google Haritalar çerçevesi. Harita Google çerezleri bıraktığı için
 * sayfa açılışında yüklenmez (çerez politikası: zorunlu olmayan üçüncü taraf içerik izinle).
 * CSP'de yalnızca `frame-src https://www.google.com` açıktır (next.config.ts).
 */
export function StoreMap({ embedSrc, title }: { embedSrc: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  // Düğme kaybolunca klavye odağı sayfanın başına düşmesin: haritaya taşınır.
  useEffect(() => {
    if (loaded) frameRef.current?.focus();
  }, [loaded]);

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-navy-tint sm:aspect-[16/9]">
      {loaded ? (
        <iframe
          ref={frameRef}
          src={embedSrc}
          title={title}
          loading="lazy"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {/* Dekoratif ızgara: harita yer tutucusu */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60 [background-image:linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] [background-size:44px_44px]"
          />
          <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-sm">
            <MapPinIcon size={26} />
          </span>
          <button type="button" onClick={() => setLoaded(true)} className="btn-navy relative min-h-12">
            Haritayı göster
          </button>
          {/* Düz zemin: ızgara çizgileri metnin altına girmesin (muted/navy-tint 4.6:1) */}
          <p className="relative max-w-sm rounded-md bg-navy-tint px-2 py-1 text-[12px] leading-relaxed text-muted">
            Harita Google Haritalar&apos;dan yüklenir; Google bu sırada çerez kullanabilir.
          </p>
        </div>
      )}
    </div>
  );
}
