"use server";

import { redirect } from "next/navigation";

import { applyPaymentEvent, getOrderByNumber, tokensMatch } from "@/lib/orders";
import { isSandboxEnabled } from "@/lib/payments";

/**
 * Geliştirme ortamında ödeme sağlayıcısının imzalı bildirimini taklit eder.
 * Üretimde `isSandboxEnabled()` false döner ve bu işlem hiçbir şey yapmaz.
 */
export async function sandboxPaymentAction(formData: FormData): Promise<void> {
  if (!isSandboxEnabled()) redirect("/");

  const orderNumber = String(formData.get("orderNumber") ?? "");
  const token = String(formData.get("token") ?? "");
  const outcome = formData.get("outcome") === "fail" ? "failed" : "succeeded";

  const order = await getOrderByNumber(orderNumber);
  if (!order || !tokensMatch(order.accessToken, token)) redirect("/");

  await applyPaymentEvent({
    providerEventId: `sandbox_${order.orderNumber}_${outcome}`,
    orderNumber: order.orderNumber,
    type: outcome,
    amount: order.grandTotal,
    signatureValid: true,
  });

  redirect(`/siparis/${order.orderNumber}?t=${encodeURIComponent(token)}&yeni=1`);
}
