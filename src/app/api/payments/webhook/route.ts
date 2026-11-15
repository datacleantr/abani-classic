import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { applyPaymentEvent } from "@/lib/orders";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
  providerEventId: z.string().trim().min(6).max(120),
  orderNumber: z.string().trim().min(5).max(32),
  type: z.enum(["succeeded", "failed"]),
  amount: z.number().int().min(0),
});

function isValidSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (provided.length !== expectedBuffer.length) return false;
  return timingSafeEqual(provided, expectedBuffer);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-abani-signature");

  if (!isValidSignature(rawBody, signature)) {
    return Response.json({ ok: false, message: "İmza doğrulanamadı." }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return Response.json({ ok: false, message: "Geçersiz gövde." }, { status: 400 });
  }

  const parsed = eventSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Olay verisi geçersiz." }, { status: 422 });
  }

  const result = await applyPaymentEvent({ ...parsed.data, signatureValid: true });
  return Response.json(result, { status: result.ok ? 200 : 409 });
}
