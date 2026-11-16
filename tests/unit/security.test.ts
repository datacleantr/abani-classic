import { afterEach, describe, expect, it, vi } from "vitest";

import { parseEnv } from "@/lib/env";
import { allowedNextStatuses, ORDER_TRANSITIONS, tokensMatch } from "@/lib/orders";
import { getBankTransferDetails, getPaymentConfig, isSandboxEnabled } from "@/lib/payments";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ödeme yöntemi", () => {
  it("geliştirmede sandbox açıktır", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("PAYMENT_PROVIDER", "");
    expect(getPaymentConfig()).toMatchObject({ ok: true, method: "sandbox" });
  });

  it("üretimde sandbox ASLA etkinleşmez", () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const provider of ["", "sandbox"]) {
      vi.stubEnv("PAYMENT_PROVIDER", provider);
      expect(getPaymentConfig().ok).toBe(false);
      expect(isSandboxEnabled()).toBe(false);
    }
  });

  it("adapter'ı yazılmamış sağlayıcıyı reddeder", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "iyzico");
    expect(getPaymentConfig().ok).toBe(false);
  });

  it("havale yalnızca geçerli IBAN ile açılır", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PAYMENT_PROVIDER", "bank_transfer");
    vi.stubEnv("BANK_TRANSFER_ACCOUNT_NAME", "Örnek Ticaret");
    vi.stubEnv("BANK_TRANSFER_IBAN", "TR00 bozuk");
    expect(getPaymentConfig().ok).toBe(false);
    vi.stubEnv("BANK_TRANSFER_IBAN", "TR12 0001 0002 0003 0004 0005 06");
    expect(getPaymentConfig()).toMatchObject({ ok: true, method: "bank_transfer" });
    expect(getBankTransferDetails()?.iban).toBe("TR120001000200030004000506");
  });
});

describe("sipariş durum makinesi", () => {
  it("son durumlardan çıkış yoktur", () => {
    expect(allowedNextStatuses("cancelled")).toEqual([]);
    expect(allowedNextStatuses("refunded")).toEqual([]);
    expect(allowedNextStatuses("bilinmeyen")).toEqual([]);
  });

  it("ödenmemiş sipariş hazırlanamaz veya kargolanamaz", () => {
    for (const status of ["pending_payment", "payment_failed"]) {
      expect(ORDER_TRANSITIONS[status]).not.toContain("processing");
      expect(ORDER_TRANSITIONS[status]).not.toContain("shipped");
    }
    expect(ORDER_TRANSITIONS.payment_failed).not.toContain("paid");
  });

  it("her hedef durum tanımlıdır", () => {
    for (const targets of Object.values(ORDER_TRANSITIONS)) {
      for (const target of targets) expect(ORDER_TRANSITIONS).toHaveProperty(target);
    }
  });
});

describe("tokensMatch", () => {
  it("yalnızca birebir eşleşmeyi kabul eder", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
    expect(tokensMatch("abc123", "abc124")).toBe(false);
    expect(tokensMatch("abc123", "abc")).toBe(false);
    expect(tokensMatch("abc123", "")).toBe(false);
    expect(tokensMatch("abc123", undefined)).toBe(false);
  });
});

describe("ortam doğrulama", () => {
  const base = { DATABASE_URL: "postgresql://u:p@localhost/db" };

  it("geliştirmede yalnızca DATABASE_URL zorunludur", () => {
    expect(parseEnv({ ...base, NODE_ENV: "development" }).ok).toBe(true);
    expect(parseEnv({ NODE_ENV: "development" }).ok).toBe(false);
  });

  it("üretimde https APP_URL ve güçlü CRON_SECRET ister", () => {
    const weak = parseEnv({ ...base, NODE_ENV: "production", APP_URL: "http://site.com", CRON_SECRET: "kisa" });
    expect(weak.ok).toBe(false);
    if (!weak.ok) expect(weak.problems.join(" ")).toMatch(/APP_URL/);
    const strong = parseEnv({
      ...base,
      NODE_ENV: "production",
      APP_URL: "https://site.com",
      CRON_SECRET: "x".repeat(32),
    });
    expect(strong.ok).toBe(true);
  });
});

describe("jsonLd", () => {
  it("dış kaynaklı metin betik etiketini kapatamaz", async () => {
    const { jsonLd } = await import("@/lib/format");
    const output = jsonLd({ name: 'Boxer</script><script>alert(1)</script>' });
    expect(output).not.toContain("</script>");
    expect(JSON.parse(output).name).toBe('Boxer</script><script>alert(1)</script>');
  });
});
