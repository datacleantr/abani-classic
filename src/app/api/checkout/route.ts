import { placeOrder } from "@/lib/orders";
import { getPaymentConfig } from "@/lib/payments";
import { checkoutSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * Sipariş oluşturur ve stoğu süreli rezerve eder. Sipariş burada ASLA "ödendi"
 * yapılmaz: ödeme durumu yalnızca imzalı sağlayıcı bildirimi (webhook), sandbox
 * onay adımı veya yetkili yöneticinin havale onayı ile değişir.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ ok: false, message: "Geçersiz istek gövdesi." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      {
        ok: false,
        message: "Lütfen form alanlarını kontrol edin.",
        fieldErrors: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const payment = getPaymentConfig();
  if (!payment.ok) {
    return Response.json({ ok: false, message: payment.message }, { status: 503 });
  }

  const order = await placeOrder(parsed.data, payment);
  if (!order.ok) {
    return Response.json({ ok: false, message: order.message }, { status: 409 });
  }

  const token = encodeURIComponent(order.accessToken);
  const next =
    payment.method === "sandbox"
      ? `/odeme/sandbox/${order.orderNumber}?t=${token}`
      : `/siparis/${order.orderNumber}?t=${token}&yeni=1`;

  return Response.json({
    ok: true,
    orderNumber: order.orderNumber,
    grandTotal: order.grandTotal,
    paymentMethod: payment.method,
    next,
  });
}
