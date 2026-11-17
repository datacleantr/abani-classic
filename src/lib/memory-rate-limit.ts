/**
 * Bellek içi sabit pencereli hız sınırlayıcı (DB'siz). Herkese açık, düşük riskli okuma uçları
 * (ör. /api/products) için kaba bir taşkın koruması sağlar. Sayaçlar süreç başınadır: birden
 * fazla sunucu örneğinde sınır örnek başına uygulanır; hassas uçlar `rate-limit.ts` (PostgreSQL)
 * kullanmaya devam eder.
 */
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

export type MemoryRateLimiter = {
  check: (key: string, now?: number) => RateLimitResult;
  /** Yalnızca testler için. */
  reset: () => void;
};

export function createMemoryRateLimiter({
  limit,
  windowMs,
  maxKeys = 10_000,
}: {
  limit: number;
  windowMs: number;
  /** Bellek sınırı: anahtar sayısı aşılırsa süresi dolanlar, yine aşılırsa en eskiler atılır. */
  maxKeys?: number;
}): MemoryRateLimiter {
  const buckets = new Map<string, { count: number; resetAt: number }>();

  function prune(now: number) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    // Map ekleme sırasını korur: hâlâ fazlaysa en eski anahtarlar atılır.
    for (const key of buckets.keys()) {
      if (buckets.size < maxKeys) break;
      buckets.delete(key);
    }
  }

  return {
    check(key, now = Date.now()) {
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        if (!bucket && buckets.size >= maxKeys) prune(now);
        bucket = { count: 0, resetAt: now + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      const allowed = bucket.count <= limit;
      return {
        allowed,
        remaining: Math.max(0, limit - bucket.count),
        retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    },
    reset() {
      buckets.clear();
    },
  };
}

/** İstek başlıklarından istemci IP'si (ters vekil arkasında ilk `x-forwarded-for` değeri). */
export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
