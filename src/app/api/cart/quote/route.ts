import { z } from "zod";

import { quoteCart } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  items: z
    .array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .max(40),
  couponCode: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ ok: false, message: "Sepet verisi geçersiz." }, { status: 422 });
  }

  try {
    const quote = await quoteCart(parsed.data.items, parsed.data.couponCode);
    return Response.json({ ok: true, quote });
  } catch {
    return Response.json({ ok: false, message: "Fiyat hesaplanamadı." }, { status: 500 });
  }
}
