import { describe, expect, it } from "vitest";

import { parseDelimited, parsePriceToMinor, sanitizeCell } from "@/lib/imports";

describe("parsePriceToMinor", () => {
  it.each([
    ["1.299,90 TL", 129990],
    ["1299,9", 129990],
    ["689.64", 68964],
    ["450", 45000],
    ["₺ 75,00", 7500],
  ])("%s → %i kuruş", (input, expected) => {
    expect(parsePriceToMinor(input)).toBe(expected);
  });

  it("boş veya sayısal olmayan değerde null döner", () => {
    expect(parsePriceToMinor("")).toBeNull();
    expect(parsePriceToMinor("fiyat yok")).toBeNull();
  });
});

describe("parseDelimited", () => {
  it("noktalı virgül ayracını, BOM'u ve tırnaklı alanları işler", () => {
    const { headers, rows } = parseDelimited(
      '﻿Ürün Adı;Marka;Fiyat\r\n"Boxer; 6\'lı ""Paket""";Tutku;696,60\r\n\r\n',
    );
    expect(headers).toEqual(["Ürün Adı", "Marka", "Fiyat"]);
    expect(rows).toEqual([['Boxer; 6\'lı "Paket"', "Tutku", "696,60"]]);
  });

  it("virgül ayraçlı dosyayı ve baştaki sıfırları korur", () => {
    const { rows } = parseDelimited("title,barcode\nAtlet,0086816729652\n");
    expect(rows[0][1]).toBe("0086816729652");
  });
});

describe("sanitizeCell", () => {
  it("formül enjeksiyonu başlatan hücreleri etkisizleştirir", () => {
    expect(sanitizeCell("=HYPERLINK(\"http://x\")")).toBe("'=HYPERLINK(\"http://x\")");
    expect(sanitizeCell("+1")).toBe("'+1");
    expect(sanitizeCell("@cmd")).toBe("'@cmd");
    expect(sanitizeCell("  Normal değer ")).toBe("Normal değer");
  });
});
