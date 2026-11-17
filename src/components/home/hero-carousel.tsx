"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FocusEvent, type PointerEvent, type ReactNode } from "react";

import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "@/components/store/icons";
import {
  autoplayAvailable,
  CAROUSEL_INTERVAL_MS,
  liveRegionMode,
  nextIndex,
  prevIndex,
  shouldAutoAdvance,
  swipeDirection,
  wrapIndex,
} from "@/lib/carousel";
import { cn } from "@/lib/format";

export type HeroSlide = {
  /** Slayt seçici düğmesinin adında kullanılır (ör. "Erkek iç giyim"). */
  name: string;
  content: ReactNode;
};

/* ----------------------------- tarayıcı durumları ----------------------------- */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const getDocumentHidden = () => document.hidden;
const serverFalse = () => false;

function isKeyboardFocus(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  try {
    return target.matches(":focus-visible");
  } catch {
    return true;
  }
}

const controlClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ivory transition-colors hover:bg-white/10";

/**
 * Hero slider (WAI-ARIA APG Carousel). Slaytlar sunucuda render edilip `content` olarak gelir;
 * ilk slayt SSR'da görünür (LCP ve JS'siz kullanım korunur). Slaytlar aynı ızgara hücresinde üst üste
 * durur: yükseklik en uzun slayttır, geçişte zıplama olmaz. Pasif slayt `inert` (erişilebilirlik
 * ağacından ve tab sırasından çıkar). Otomatik geçiş kuralları `src/lib/carousel.ts` içinde.
 */
export function HeroCarousel({ label, slides }: { label: string; slides: HeroSlide[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, serverFalse);
  const documentHidden = useSyncExternalStore(subscribeVisibility, getDocumentHidden, serverFalse);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);

  const rotating = shouldAutoAdvance({ slideCount: count, userPaused, reducedMotion, hovered, focusWithin, documentHidden });
  const canAutoplay = autoplayAvailable(count, reducedMotion);
  const current = wrapIndex(index, count);

  // Her slayt değişiminde süre baştan başlar (elle geçişten hemen sonra otomatik atlama olmaz).
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setTimeout(() => setIndex((value) => nextIndex(value, count)), CAROUSEL_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [rotating, current, count]);

  if (count === 0) return null;

  const goTo = (target: number) => setIndex(wrapIndex(target, count));

  const togglePlay = () => {
    if (userPaused) {
      // Kullanıcı açıkça başlattı: düğmede odak/fare olsa da dönüş sürsün (APG).
      setHovered(false);
      setFocusWithin(false);
      setUserPaused(false);
    } else {
      setUserPaused(true);
    }
  };

  const onFocus = (event: FocusEvent<HTMLElement>) => {
    // Yalnızca klavye odağı duraklatır; fareyle tıklama zaten "üzerinde" sayılır.
    if (isKeyboardFocus(event.target)) setFocusWithin(true);
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    const next = event.relatedTarget as Node | null;
    if (!next || !event.currentTarget.contains(next)) setFocusWithin(false);
  };

  const onPointerEnter = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHovered(true);
  };
  const onPointerLeave = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") setHovered(false);
  };

  // Dokunmatik kaydırma: `touch-action: pan-y` dikey sayfa kaydırmasını tarayıcıya bırakır.
  const onSwipeStart = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" || !event.isPrimary) return;
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onSwipeEnd = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.id !== event.pointerId) return;
    const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (direction === "next") setIndex((value) => nextIndex(value, count));
    else if (direction === "prev") setIndex((value) => prevIndex(value, count));
  };

  if (count === 1) {
    return (
      <section aria-label={label} className="relative isolate bg-navy-deep">
        {slides[0].content}
      </section>
    );
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      onFocus={onFocus}
      onBlur={onBlur}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      className="surface-dark relative isolate bg-navy-deep"
    >
      {/* Kontroller DOM'da slaytlardan önce (tab sırasında ilk: Durdur/Oynat); görsel olarak altta. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 sm:bottom-6">
        <div className="container-page flex justify-center lg:justify-end">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-full bg-navy-deep/95 p-1 shadow-lg shadow-black/20 ring-1 ring-white/15">
            {canAutoplay ? (
              <button
                type="button"
                onClick={togglePlay}
                aria-label={userPaused ? "Otomatik geçişi başlat" : "Otomatik geçişi durdur"}
                className={controlClass}
              >
                {userPaused ? <PlayIcon size={18} /> : <PauseIcon size={18} />}
              </button>
            ) : null}
            <button type="button" onClick={() => goTo(current - 1)} aria-label="Önceki slayt" className={controlClass}>
              <ChevronLeftIcon size={20} />
            </button>
            <ul className="flex items-center" aria-label="Slayt seçimi">
              {slides.map((slide, slideIndex) => {
                const active = slideIndex === current;
                return (
                  <li key={slide.name}>
                    <button
                      type="button"
                      onClick={() => goTo(slideIndex)}
                      aria-label={`Slayt ${slideIndex + 1}: ${slide.name}`}
                      aria-current={active ? "true" : undefined}
                      className="group inline-flex h-11 min-w-9 items-center justify-center rounded-full px-1.5"
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "block h-2 rounded-full transition-all duration-300 motion-reduce:transition-none",
                          active ? "w-6 bg-ivory" : "w-2 bg-white/55 group-hover:bg-white/80",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
            <button type="button" onClick={() => goTo(current + 1)} aria-label="Sonraki slayt" className={controlClass}>
              <ChevronRightIcon size={20} />
            </button>
          </div>
        </div>
      </div>

      <div
        aria-live={liveRegionMode(rotating)}
        onPointerDown={onSwipeStart}
        onPointerUp={onSwipeEnd}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
        className="grid touch-pan-y"
      >
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === current;
          return (
            <div
              key={slide.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} / ${count}`}
              inert={!active}
              className={cn(
                "col-start-1 row-start-1 transition-[opacity,visibility] duration-500 ease-out motion-reduce:transition-none",
                active ? "visible z-10 opacity-100" : "invisible z-0 opacity-0",
              )}
            >
              {slide.content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
