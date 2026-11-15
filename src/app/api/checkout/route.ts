import { applyPaymentEvent, placeOrder } from "@/lib/orders";
import { checkoutSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";

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

  const order = await placeOrder(parsed.data);
  if (!order.ok) {
    return Response.json({ ok: false, message: order.message }, { status: 409 });
  }

  // Sandbox payment provider: in production this callback arrives from the PSP and
  // is verified through /api/payments/webhook. The same idempotent handler is used.
  const payment = await applyPaymentEvent({
    providerEventId: `mock_evt_${order.orderNumber}`,
    orderNumber: order.orderNumber,
    type: parsed.data.paymentMode === "failure" ? "failed" : "succeeded",
    amount: order.grandTotal,
    signatureValid: true,
  });

  return Response.json({
    ok: true,
    orderNumber: order.orderNumber,
    grandTotal: order.grandTotal,
    paymentStatus: payment.ok ? (parsed.data.paymentMode === "failure" ? "failed" : "paid") : "pending",
    paymentMessage: payment.message,
  });
}
