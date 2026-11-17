import { describe, expect, it } from "vitest";

import { parseFavorites, toggleFavorite } from "@/components/favorites/favorites-store";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

describe("favoriler", () => {
  it("bozuk veya yabancı veriyi yok sayar", () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites("{bozuk")).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    expect(parseFavorites(JSON.stringify([A, "<script>", 5, A, B]))).toEqual([A, B]);
  });

  it("ekler (başa) ve çıkarır", () => {
    expect(toggleFavorite([A], B)).toEqual([B, A]);
    expect(toggleFavorite([B, A], B)).toEqual([A]);
  });
});
