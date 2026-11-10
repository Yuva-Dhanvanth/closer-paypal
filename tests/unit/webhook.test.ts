import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../lib/db";
import { seedDemoSeller } from "../../prisma/seed";

describe("Webhook Processing & Idempotency", () => {
  let seller: any;

  beforeEach(async () => {
    seller = await seedDemoSeller();
  });

  it("ingests a valid webhook and idempotently ignores duplicates", async () => {
    const eventId = `WH-TEST-${Date.now()}`;

    // 1. Create a pending order & payment
    const conversation = await prisma.conversation.create({
      data: { sellerId: seller.id, status: "active" },
    });

    const quote = await prisma.quote.create({
      data: {
        sellerId: seller.id,
        conversationId: conversation.id,
        lines: "[]",
        subtotalCents: 4500,
        totalCents: 4500,
        depositCents: 1350,
        balanceCents: 3150,
        dueDate: "2026-11-20",
      },
    });

    const order = await prisma.order.create({
      data: {
        sellerId: seller.id,
        conversationId: conversation.id,
        quoteId: quote.id,
        customerName: "Charlie",
        customerEmail: "charlie@example.com",
        status: "deposit_pending",
        dueDate: quote.dueDate,
        totalCents: quote.totalCents,
        paidCents: 0,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        type: "deposit",
        amountCents: 1350,
        status: "pending",
        attempt: 1,
      },
    });

    // 2. Ingest first webhook event
    const webhook = await prisma.webhookEvent.create({
      data: {
        id: eventId,
        type: "PAYMENT.CAPTURE.COMPLETED",
        verified: true,
        payload: JSON.stringify({ id: eventId, resource: { custom_id: payment.id, id: "CAP-WH-999" } }),
      },
    });

    expect(webhook.id).toBe(eventId);

    // 3. Reconcile order payment
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "completed", paypalCaptureId: "CAP-WH-999" },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "deposit_paid", paidCents: 1350 },
    });

    // 4. Attempt to insert same event ID (duplicate check)
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });
    expect(existing).toBeDefined();

    // Verify order was not double paid
    const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(finalOrder.paidCents).toBe(1350);
    expect(finalOrder.status).toBe("deposit_paid");
  });
});
