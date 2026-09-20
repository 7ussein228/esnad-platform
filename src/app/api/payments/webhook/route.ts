import { NextRequest, NextResponse } from "next/server";
import { getMockProvider, isMockSimulationAllowed } from "@/lib/payments";
import { confirmPayment } from "@/lib/payments-core";

// Server-to-server webhook endpoint. A real payment provider (Paymob,
// Fawry, Stripe, etc.) would call this route after the customer completes
// payment. We NEVER trust a frontend "success" flag: the signature is
// verified here before anything is written to the database, and the
// transaction is idempotent via a unique idempotencyKey.
export async function POST(req: NextRequest) {
  // Mock callbacks are only accepted where simulation is allowed (dev/staging).
  if (!isMockSimulationAllowed()) {
    return NextResponse.json({ error: "PROVIDER_NOT_CONFIGURED" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-signature");

  const provider = getMockProvider();
  if (!provider.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "INVALID_SIGNATURE" }, { status: 401 });
  }

  let payload: { orderId: string; paymentId: string; providerReference: string; status: string };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "INVALID_PAYLOAD" }, { status: 400 });
  }

  if (payload.status !== "SUCCESS") {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const result = await confirmPayment(payload.orderId, payload.paymentId, payload.providerReference);
    return NextResponse.json({ received: true, ...result });
  } catch {
    // Never leak internal/DB error details.
    return NextResponse.json({ error: "WEBHOOK_PROCESSING_FAILED" }, { status: 400 });
  }
}
