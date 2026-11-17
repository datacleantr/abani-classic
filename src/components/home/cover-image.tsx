import Image from "next/image";

/**
 * Kapak görseli: yerel `/images/*` dosyaları `next/image` ile optimize edilir; uzak ürün
 * görselleri (Pazarama CDN) için next.config'de `remotePatterns` olmadığından düz <img>.
 * Üst öğe `relative` olmalı ve boyutu (ör. aspect-ratio) belirlemelidir.
 */
export function CoverImage({
  src,
  alt,
  sizes,
  className = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  if (src.startsWith("/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={className} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
