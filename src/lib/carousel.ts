/**
 * Ana sayfa hero slider'ının saf durum mantığı (DOM/React bağımsız; birim testli).
 * WAI-ARIA APG Carousel deseni: otomatik geçiş kullanıcı durdurmadıysa ve kullanıcı slider ile
 * etkileşimde değilse (fare üzerinde / odak içeride) çalışır; azaltılmış hareket tercihinde hiç başlamaz.
 */

export const CAROUSEL_INTERVAL_MS = 7000;
/** Yatay kaydırmanın geçiş sayılması için en az mesafe (px). */
export const SWIPE_THRESHOLD_PX = 48;

export function wrapIndex(index: number, count: number): number {
  if (count <= 0) return 0;
  return ((Math.trunc(index) % count) + count) % count;
}

export const nextIndex = (index: number, count: number) => wrapIndex(index + 1, count);
export const prevIndex = (index: number, count: number) => wrapIndex(index - 1, count);

export type AutoplayConditions = {
  slideCount: number;
  /** Kullanıcı Durdur düğmesine bastı. */
  userPaused: boolean;
  /** `prefers-reduced-motion: reduce` */
  reducedMotion: boolean;
  hovered: boolean;
  focusWithin: boolean;
  /** `document.hidden` (sekme arka planda) */
  documentHidden: boolean;
};

/** Otomatik geçiş şu an ilerlemeli mi? */
export function shouldAutoAdvance(conditions: AutoplayConditions): boolean {
  return (
    conditions.slideCount > 1 &&
    !conditions.reducedMotion &&
    !conditions.userPaused &&
    !conditions.hovered &&
    !conditions.focusWithin &&
    !conditions.documentHidden
  );
}

/** Otomatik geçiş özelliği bu kullanıcıya sunulur mu (Durdur/Oynat düğmesi görünür mü)? */
export function autoplayAvailable(slideCount: number, reducedMotion: boolean): boolean {
  return slideCount > 1 && !reducedMotion;
}

/** APG: slayt bölgesi otomatik geçiş sürerken "off", aksi hâlde "polite". */
export function liveRegionMode(rotating: boolean): "off" | "polite" {
  return rotating ? "off" : "polite";
}

/**
 * Dokunmatik kaydırma sonucu: belirgin yatay hareket ileri/geri; dikey ağırlıklı hareket (sayfa
 * kaydırma) veya kısa hareket geçiş sayılmaz.
 */
export function swipeDirection(dx: number, dy: number, threshold = SWIPE_THRESHOLD_PX): "next" | "prev" | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.2) return null;
  return dx < 0 ? "next" : "prev";
}
