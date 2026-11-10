/**
 * Closer PayPal Client
 *
 * Implements PayPal Orders v2, Captures, Refunds, and Webhook signature verification.
 * Supports both 'mock' (offline development & automated tests) and 'sandbox' (live PayPal APIs).
 */

export interface CreateOrderParams {
  paymentId: string;
  attempt: number;
  amountCents: number;
  description: string;
  brandName?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface CreateOrderResult {
  orderId: string;
  approvalUrl: string;
  raw: any;
}

export interface CaptureOrderResult {
  captureId: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  amountCents: number;
  raw: any;
}

export interface RefundCaptureParams {
  captureId: string;
  amountCents: number;
  invoiceId?: string;
  noteToPayer?: string;
}

export interface RefundCaptureResult {
  refundId: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
  amountCents: number;
  raw: any;
}

export interface VerifyWebhookParams {
  headers: Record<string, string | undefined>;
  body: any;
  webhookId?: string;
}

export interface VerifyWebhookResult {
  verified: boolean;
  status: string;
}

export interface IPayPalClient {
  getAccessToken(): Promise<string>;
  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>;
  captureOrder(orderId: string): Promise<CaptureOrderResult>;
  refundCapture(params: RefundCaptureParams): Promise<RefundCaptureResult>;
  verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult>;
}

// In-memory token cache for sandbox mode
let cachedToken: { token: string; expiresAt: number } | null = null;

class RealPayPalClient implements IPayPalClient {
  private baseUrl = "https://api-m.sandbox.paypal.com";
  private clientId: string;
  private clientSecret: string;
  private defaultWebhookId?: string;

  constructor() {
    this.clientId = process.env.PAYPAL_CLIENT_ID || "";
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET || "";
    this.defaultWebhookId = process.env.PAYPAL_WEBHOOK_ID;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (cachedToken && cachedToken.expiresAt > now + 60000) {
      return cachedToken.token;
    }

    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET in environment variables."
      );
    }

    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to obtain PayPal access token (${res.status}): ${errText}`);
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: now + data.expires_in * 1000,
    };
    return cachedToken.token;
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const token = await this.getAccessToken();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const appUrl = process.env.APP_URL || "http://localhost:3000";

    const value = (params.amountCents / 100).toFixed(2);
    const invoiceId = `CLOSER-${params.paymentId}-${params.attempt}`;

    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.paymentId,
          invoice_id: invoiceId,
          description: params.description,
          amount: {
            currency_code: "USD",
            value,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: params.brandName || "Closer Store",
            locale: "en-US",
            landing_page: "LOGIN",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: params.returnUrl || `${appUrl}/api/paypal/return`,
            cancel_url: params.cancelUrl || `${appUrl}/api/paypal/cancel`,
          },
        },
      },
    };

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(
        `PayPal create order failed (${res.status}): ${JSON.stringify(data)}`
      );
    }

    const approvalLink = data.links?.find(
      (link: any) => link.rel === "payer-action" || link.rel === "approve"
    );

    if (!approvalLink?.href) {
      throw new Error("PayPal response did not include an approval or payer-action link.");
    }

    return {
      orderId: data.id,
      approvalUrl: approvalLink.href,
      raw: data,
    };
  }

  async captureOrder(orderId: string): Promise<CaptureOrderResult> {
    const token = await this.getAccessToken();
    const requestId = `cap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const res = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      body: JSON.stringify({}),
    });

    const data = await res.json();

    // Check for idempotent case: ORDER_ALREADY_CAPTURED
    if (!res.ok) {
      const details = data.details || [];
      const alreadyCaptured = details.some(
        (d: any) => d.issue === "ORDER_ALREADY_CAPTURED"
      );

      if (alreadyCaptured) {
        // Fetch existing order details
        const getRes = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const orderData = await getRes.json();
        const existingCapture =
          orderData.purchase_units?.[0]?.payments?.captures?.[0];

        if (existingCapture) {
          const amountCents = Math.round(parseFloat(existingCapture.amount.value) * 100);
          return {
            captureId: existingCapture.id,
            status: existingCapture.status === "COMPLETED" ? "COMPLETED" : "PENDING",
            amountCents,
            raw: orderData,
          };
        }
      }

      throw new Error(`PayPal capture failed (${res.status}): ${JSON.stringify(data)}`);
    }

    const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
    if (!capture?.id) {
      throw new Error("No capture ID returned in PayPal capture response.");
    }

    const amountCents = Math.round(parseFloat(capture.amount?.value || "0") * 100);

    return {
      captureId: capture.id,
      status: capture.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      amountCents,
      raw: data,
    };
  }

  async refundCapture(params: RefundCaptureParams): Promise<RefundCaptureResult> {
    const token = await this.getAccessToken();
    const requestId = `ref_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const value = (params.amountCents / 100).toFixed(2);

    const payload: any = {
      amount: {
        currency_code: "USD",
        value,
      },
      note_to_payer: params.noteToPayer || "Refund processed under store policy.",
    };

    if (params.invoiceId) {
      payload.invoice_id = params.invoiceId;
    }

    const res = await fetch(`${this.baseUrl}/v2/payments/captures/${params.captureId}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": requestId,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`PayPal refund failed (${res.status}): ${JSON.stringify(data)}`);
    }

    return {
      refundId: data.id,
      status: data.status === "COMPLETED" ? "COMPLETED" : "PENDING",
      amountCents: Math.round(parseFloat(data.amount?.value || value) * 100),
      raw: data,
    };
  }

  async verifyWebhook(params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    const token = await this.getAccessToken();
    const webhookId = params.webhookId || this.defaultWebhookId;

    if (!webhookId) {
      console.warn("⚠️ PAYPAL_WEBHOOK_ID not set; skipping signature verification in dev.");
      return { verified: true, status: "SKIPPED_NO_WEBHOOK_ID" };
    }

    const headers = params.headers;
    const transmissionId =
      headers["paypal-transmission-id"] || headers["PAYPAL-TRANSMISSION-ID"];
    const transmissionTime =
      headers["paypal-transmission-time"] || headers["PAYPAL-TRANSMISSION-TIME"];
    const certUrl =
      headers["paypal-cert-url"] || headers["PAYPAL-CERT-URL"];
    const authAlgo =
      headers["paypal-auth-algo"] || headers["PAYPAL-AUTH-ALGO"];
    const transmissionSig =
      headers["paypal-transmission-sig"] || headers["PAYPAL-TRANSMISSION-SIG"];

    if (!transmissionId || !transmissionSig || !certUrl) {
      return { verified: false, status: "MISSING_REQUIRED_HEADERS" };
    }

    const verifyPayload = {
      transmission_id: transmissionId,
      transmission_time: transmissionTime,
      cert_url: certUrl,
      auth_algo: authAlgo,
      transmission_sig: transmissionSig,
      webhook_id: webhookId,
      webhook_event: params.body,
    };

    const res = await fetch(`${this.baseUrl}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(verifyPayload),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { verified: false, status: `HTTP_${res.status}: ${errText}` };
    }

    const data = await res.json();
    const verified = data.verification_status === "SUCCESS";
    return {
      verified,
      status: data.verification_status || "UNKNOWN",
    };
  }
}

class MockPayPalClient implements IPayPalClient {
  async getAccessToken(): Promise<string> {
    return "MOCK_ACCESS_TOKEN_FOR_OFFLINE_TESTING";
  }

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    const orderId = `MOCK-ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const approvalUrl = `${appUrl}/mock-paypal/${orderId}?token=${orderId}&paymentId=${params.paymentId}&amount=${params.amountCents}`;

    return {
      orderId,
      approvalUrl,
      raw: {
        id: orderId,
        status: "CREATED",
        mode: "mock",
        amountCents: params.amountCents,
        paymentId: params.paymentId,
      },
    };
  }

  async captureOrder(orderId: string): Promise<CaptureOrderResult> {
    const captureId = `MOCK-CAP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      captureId,
      status: "COMPLETED",
      amountCents: 0, // In mock capture, server reconciles with DB payment amount
      raw: {
        id: orderId,
        status: "COMPLETED",
        mode: "mock",
        purchase_units: [
          {
            payments: {
              captures: [{ id: captureId, status: "COMPLETED" }],
            },
          },
        ],
      },
    };
  }

  async refundCapture(params: RefundCaptureParams): Promise<RefundCaptureResult> {
    const refundId = `MOCK-REF-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      refundId,
      status: "COMPLETED",
      amountCents: params.amountCents,
      raw: {
        id: refundId,
        status: "COMPLETED",
        captureId: params.captureId,
        amount: {
          currency_code: "USD",
          value: (params.amountCents / 100).toFixed(2),
        },
        mode: "mock",
      },
    };
  }

  async verifyWebhook(_params: VerifyWebhookParams): Promise<VerifyWebhookResult> {
    return {
      verified: true,
      status: "SUCCESS",
    };
  }
}

/**
 * Returns the configured PayPal client instance based on PAYPAL_MODE.
 */
export function getPayPalClient(): IPayPalClient {
  const mode = process.env.PAYPAL_MODE || "mock";
  if (mode === "sandbox") {
    return new RealPayPalClient();
  }
  return new MockPayPalClient();
}

export const paypalClient = getPayPalClient();
