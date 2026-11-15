"use server";

import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import type { ActionResult } from "@/lib/auth";
import { createReturnRequest } from "@/lib/orders";
import { newsletterSchema, returnRequestSchema } from "@/lib/schemas";
import { getSessionIdentity } from "@/lib/auth";

export async function subscribeNewsletterAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = newsletterSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, message: "Geçerli bir e-posta adresi girin." };
  }
  try {
    await db
      .insert(newsletterSubscribers)
      .values({ email: parsed.data.email.toLowerCase(), consentSource: "footer" })
      .onConflictDoNothing();
    return { ok: true, message: "Bültenimize kaydınız alındı." };
  } catch {
    return { ok: false, message: "Kayıt tamamlanamadı, lütfen tekrar deneyin." };
  }
}

export async function createReturnAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const identity = await getSessionIdentity();
  const parsed = returnRequestSchema.safeParse({
    orderNumber: formData.get("orderNumber"),
    orderItemId: formData.get("orderItemId") ?? "",
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Form geçersiz." };
  }
  const result = await createReturnRequest({
    orderNumber: parsed.data.orderNumber,
    orderItemId: parsed.data.orderItemId || undefined,
    reason: parsed.data.reason,
    actorEmail:
      identity?.type === "customer" ? identity.customer.email : "misafir-musteri",
  });
  return { ok: result.ok, message: result.message };
}
