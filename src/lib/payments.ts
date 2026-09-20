import "server-only";
import crypto from "crypto";

/**
 * Provider-agnostic payment architecture.
 *
 * Real gateways (Paymob / Fawry / Stripe / etc.) are integrated by
 * implementing the `PaymentProvider` interface below and registering them in
 * `getPaymentProvider()`. The rest of the application (order creation,
 * webhook handling, enrollment granting) never depends on a specific vendor.
 *
 * A `MockProvider` is included and active by default so the full
 * order -> checkout -> webhook -> verification -> enrollment flow is
 * exercised end-to-end without real banking credentials. Never trust the
 * frontend: enrollment is only ever created after server-side verification
 * of a webhook/callback payload.
 */

export type CreateCheckoutInput = {
  orderId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  courseTitle: string;
};

export type CheckoutSession = {
  provider: string;
  checkoutUrl: string;
  providerReference: string;
};

export interface PaymentProvider {
  name: string;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean;
}

class MockProvider implements PaymentProvider {
  name = "mock";
  private secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-mock-secret";

  async createCheckout(input: CreateCheckoutInput): Promise<CheckoutSession> {
    const providerReference = `mock_${crypto.randomUUID()}`;
    // In a real provider this would be a hosted checkout page URL returned by
    // the vendor API. We redirect internally to a page that simulates the
    // bank/wallet confirmation UI and then triggers our own webhook route,
    // exactly like a real provider would call back our server.
    const checkoutUrl = `/checkout/${input.orderId}?ref=${providerReference}`;
    return { provider: this.name, checkoutUrl, providerReference };
  }

  signPayload(payload: string) {
    return crypto.createHmac("sha256", this.secret).update(payload).digest("hex");
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!signatureHeader) return false;
    const expected = this.signPayload(rawBody);
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }
}

const providers: Record<string, PaymentProvider> = {
  mock: new MockProvider(),
};

export function getPaymentProvider(name: string = process.env.PAYMENT_PROVIDER || "mock") {
  return providers[name] ?? providers.mock;
}

export function getMockProvider() {
  return providers.mock as MockProvider;
}
