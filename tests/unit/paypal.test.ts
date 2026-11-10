import { describe, it, expect } from "vitest";
import { getPayPalClient } from "../../lib/paypal";

describe("PayPal Client (Mock Mode)", () => {
  const client = getPayPalClient();

  it("acquires access token in mock mode", async () => {
    const token = await client.getAccessToken();
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
  });

  it("creates a mock order with expected approval URL", async () => {
    const order = await client.createOrder({
      paymentId: "test-pay-123",
      attempt: 1,
      amountCents: 4500,
      description: "Test Cake Order",
    });

    expect(order.orderId).toContain("MOCK-ORD");
    expect(order.approvalUrl).toContain("/mock-paypal/");
    expect(order.approvalUrl).toContain("paymentId=test-pay-123");
  });

  it("captures a mock order", async () => {
    const capture = await client.captureOrder("MOCK-ORD-999");
    expect(capture.captureId).toContain("MOCK-CAP");
    expect(capture.status).toBe("COMPLETED");
  });

  it("refunds a mock capture", async () => {
    const refund = await client.refundCapture({
      captureId: "MOCK-CAP-999",
      amountCents: 2500,
      noteToPayer: "Customer requested cancellation within 50% tier",
    });

    expect(refund.refundId).toContain("MOCK-REF");
    expect(refund.status).toBe("COMPLETED");
    expect(refund.amountCents).toBe(2500);
  });

  it("verifies mock webhook signatures as successful", async () => {
    const verification = await client.verifyWebhook({
      headers: {},
      body: { event_type: "PAYMENT.CAPTURE.COMPLETED" },
    });

    expect(verification.verified).toBe(true);
    expect(verification.status).toBe("SUCCESS");
  });
});
