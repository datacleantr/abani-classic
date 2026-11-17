import { describe, expect, it } from "vitest";

import {
  autoplayAvailable,
  liveRegionMode,
  nextIndex,
  prevIndex,
  shouldAutoAdvance,
  swipeDirection,
  wrapIndex,
  type AutoplayConditions,
} from "@/lib/carousel";
import { isWomenCategory, womenMenuCategories, womenShortLabel } from "@/components/store/navigation";

const base: AutoplayConditions = {
  slideCount: 2,
  userPaused: false,
  reducedMotion: false,
  hovered: false,
  focusWithin: false,
  documentHidden: false,
};

describe("carousel index", () => {
  it("sonraki/önceki uçlarda sarar", () => {
    expect(nextIndex(0, 2)).toBe(1);
    expect(nextIndex(1, 2)).toBe(0);
    expect(prevIndex(0, 2)).toBe(1);
    expect(prevIndex(1, 3)).toBe(0);
    expect(prevIndex(0, 3)).toBe(2);
  });

  it("aralık dışı ve geçersiz değerleri güvenle sarar", () => {
    expect(wrapIndex(5, 2)).toBe(1);
    expect(wrapIndex(-3, 2)).toBe(1);
    expect(wrapIndex(1.7, 3)).toBe(1);
    expect(wrapIndex(3, 0)).toBe(0);
    expect(nextIndex(0, 1)).toBe(0);
  });
});

describe("shouldAutoAdvance", () => {
  it("hiçbir engel yoksa ilerler", () => {
    expect(shouldAutoAdvance(base)).toBe(true);
  });

  it.each([
    ["kullanıcı durdurdu", { userPaused: true }],
    ["azaltılmış hareket", { reducedMotion: true }],
    ["fare üzerinde", { hovered: true }],
    ["odak içeride", { focusWithin: true }],
    ["sekme gizli", { documentHidden: true }],
    ["tek slayt", { slideCount: 1 }],
    ["slayt yok", { slideCount: 0 }],
  ])("%s → durur", (_label, override) => {
    expect(shouldAutoAdvance({ ...base, ...override })).toBe(false);
  });

  it("azaltılmış harekette Oynat düğmesi de sunulmaz", () => {
    expect(autoplayAvailable(2, false)).toBe(true);
    expect(autoplayAvailable(2, true)).toBe(false);
    expect(autoplayAvailable(1, false)).toBe(false);
  });

  it("canlı bölge dönüşte off, aksi hâlde polite", () => {
    expect(liveRegionMode(true)).toBe("off");
    expect(liveRegionMode(false)).toBe("polite");
  });
});

describe("swipeDirection", () => {
  it("sola kaydırma sonraki, sağa kaydırma önceki", () => {
    expect(swipeDirection(-80, 5)).toBe("next");
    expect(swipeDirection(80, -5)).toBe("prev");
  });

  it("kısa veya dikey ağırlıklı hareketi yok sayar", () => {
    expect(swipeDirection(-20, 0)).toBeNull();
    expect(swipeDirection(-60, 70)).toBeNull();
    expect(swipeDirection(0, 200)).toBeNull();
  });
});

describe("kadın menüsü yardımcıları", () => {
  it("yalnızca ürünü olan kadın kategorilerini döndürür", () => {
    const list = womenMenuCategories([
      { name: "Erkek Boxer", slug: "erkek-boxer", productCount: 9 },
      { name: "Kadın Külot", slug: "kadin-kulot", productCount: 5 },
      { name: "Kadın Tayt", slug: "kadin-tayt", productCount: 0 },
      { name: "Kadın Çorap", slug: "kadin-corap" },
    ]);
    expect(list.map((category) => category.slug)).toEqual(["kadin-kulot", "kadin-corap"]);
    expect(isWomenCategory("kadin-atlet")).toBe(true);
  });

  it("kısa etiket 'Kadın' önekini atar", () => {
    expect(womenShortLabel("Kadın Atlet & Body")).toBe("Atlet & Body");
    expect(womenShortLabel("KADIN Külot")).toBe("Külot");
    expect(womenShortLabel("Kadın")).toBe("Kadın");
  });
});
