import { and, eq, gt, lt, sql } from "drizzle-orm";
import { headers } from "next/headers";

import { db } from "@/db";
import { loginAttempts } from "@/db/schema";

/**
 * PostgreSQL tabanlı basit hız sınırlama. Redis gerektirmez; giriş gibi düşük
 * hacimli hassas uç noktalar için yeterlidir. Kovalar e-posta ve IP bazlıdır.
 */
const WINDOW_MINUTES = 15;
const MAX_FAILURES_PER_ACCOUNT = 8;
const MAX_FAILURES_PER_IP = 30;

export async function clientIp(): Promise<string> {
  const list = await headers();
  const forwarded = list.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || list.get("x-real-ip") || "unknown";
}

function windowStart(): Date {
  return new Date(Date.now() - WINDOW_MINUTES * 60 * 1000);
}

async function countFailures(bucket: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(and(eq(loginAttempts.bucket, bucket), gt(loginAttempts.createdAt, windowStart())));
  return rows[0]?.count ?? 0;
}

export async function isLoginBlocked(scope: string, email: string, ip: string): Promise<boolean> {
  const [byAccount, byIp] = await Promise.all([
    countFailures(`${scope}:email:${email}`),
    countFailures(`${scope}:ip:${ip}`),
  ]);
  return byAccount >= MAX_FAILURES_PER_ACCOUNT || byIp >= MAX_FAILURES_PER_IP;
}

export async function recordLoginFailure(scope: string, email: string, ip: string): Promise<void> {
  await db.insert(loginAttempts).values([
    { bucket: `${scope}:email:${email}` },
    { bucket: `${scope}:ip:${ip}` },
  ]);
}

export async function clearLoginFailures(scope: string, email: string): Promise<void> {
  await db.delete(loginAttempts).where(eq(loginAttempts.bucket, `${scope}:email:${email}`));
}

export async function purgeOldLoginAttempts(): Promise<void> {
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}

export const LOGIN_BLOCKED_MESSAGE =
  "Çok fazla hatalı deneme yapıldı. Lütfen 15 dakika sonra tekrar deneyin.";
