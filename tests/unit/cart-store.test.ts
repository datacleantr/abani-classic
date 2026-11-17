import { describe, expect, it } from "vitest";

import { mergeCartLine, type CartLine } from "@/components/cart/cart-store";

const line = (overrides: Partial<CartLine> = {}): CartLine => ({
  variantId: "v1",
  productId: "p1",
  productSlug: "urun",
  productName: "Ürün",
  brandName: "Marka",
  variantLabel: "Siyah / M",
  image: "/a.jpg",
  unitPrice: 1000,
  quantity: 1,
  maxQuantity: 3,
  ...overrides,
});

describe("sepete ekleme (stok sınırı)", () => {
  it("yeni satırı ekler; sınır aşılmadıysa bildirmez", () => {
    const { lines, result } = mergeCartLine([], line());
    expect(lines).toHaveLength(1);
    expect(result).toEqual({ quantity: 1, added: 1, limited: false, maxQuantity: 3 });
  });

  it("aynı varyantta adedi artırır ve sınırda kırpınca bildirir", () => {
    const start = [line({ quantity: 2 })];
    const first = mergeCartLine(start, line({ quantity: 1 }));
    expect(first.result).toEqual({ quantity: 3, added: 1, limited: false, maxQuantity: 3 });
    const second = mergeCartLine(first.lines, line({ quantity: 1 }));
    expect(second.lines[0].quantity).toBe(3);
    expect(second.result).toEqual({ quantity: 3, added: 0, limited: true, maxQuantity: 3 });
  });

  it("yeni satırda istenen adet sınırdan büyükse kırpar", () => {
    const { lines, result } = mergeCartLine([], line({ quantity: 5, maxQuantity: 2 }));
    expect(lines[0].quantity).toBe(2);
    expect(result).toMatchObject({ quantity: 2, added: 2, limited: true });
  });

  it("diğer satırlara dokunmaz", () => {
    const other = line({ variantId: "v2", quantity: 4, maxQuantity: 9 });
    const { lines } = mergeCartLine([other, line()], line());
    expect(lines[0]).toBe(other);
    expect(lines[1].quantity).toBe(2);
  });
});
