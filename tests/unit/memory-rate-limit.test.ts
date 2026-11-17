import { describe, expect, it } from "vitest";

import { createMemoryRateLimiter, requestIp } from "@/lib/memory-rate-limit";

describe("bellek içi hız sınırı", () => {
  it("pencere içinde sınırı uygular, pencere bitince sıfırlar", () => {
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 1000 });
    expect(limiter.check("1.1.1.1", 0).allowed).toBe(true);
    expect(limiter.check("1.1.1.1", 10).allowed).toBe(true);
    const blocked = limiter.check("1.1.1.1", 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    // Başka IP etkilenmez.
    expect(limiter.check("2.2.2.2", 20).allowed).toBe(true);
    expect(limiter.check("1.1.1.1", 1000).allowed).toBe(true);
  });

  it("anahtar sayısını sınırlar (bellek büyümez)", () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000, maxKeys: 3 });
    for (const key of ["a", "b", "c", "d", "e"]) limiter.check(key, 0);
    // En eski anahtarlar atıldığı için "a" yeniden izin alır.
    expect(limiter.check("a", 1).allowed).toBe(true);
  });

  it("istemci IP'sini başlıklardan okur", () => {
    expect(requestIp(new Request("http://t", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
    expect(requestIp(new Request("http://t", { headers: { "x-real-ip": "8.8.8.8" } }))).toBe("8.8.8.8");
    expect(requestIp(new Request("http://t"))).toBe("unknown");
  });
});
