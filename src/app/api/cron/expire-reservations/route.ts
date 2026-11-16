import { timingSafeEqual } from "node:crypto";

import { expireStaleReservations } from "@/lib/orders";
import { purgeOldLoginAttempts } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

/** Zamanlanmış görev: süresi dolan stok rezervasyonlarını serbest bırakır. */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return Response.json({ ok: false }, { status: 401 });
  }
  const expired = await expireStaleReservations();
  await purgeOldLoginAttempts();
  return Response.json({ ok: true, expiredOrders: expired.length });
}
