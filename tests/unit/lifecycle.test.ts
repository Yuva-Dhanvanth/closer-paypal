import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../lib/db";
import { runAgentConversation } from "../../lib/agent/run";
import { seedDemoSeller } from "../../prisma/seed";
import { getPayPalClient } from "../../lib/paypal";
import { addDays, formatISODate } from "../../lib/engine/clock";

describe("Complete End-to-End Order & Refund Lifecycle", () => {
  let seller: any;

  beforeEach(async () => {
    seller = await seedDemoSeller();
  });

  it("runs full lifecycle: quote -> deposit capture -> balance request -> paid_in_full -> refund", async () => {
    // 1. Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        sellerId: seller.id,
        status: "active",
      },
    });

    // 2. Chat with agent requesting 2kg cake for next week
    const runOutput = await runAgentConversation({
      sellerSlug: seller.slug,
      conversationId: conversation.id,
      userMessage: "I need a 2kg vanilla cake for next Saturday",
    });

    const quoteCard = runOutput.uiCards.find((c: any) => c.type === "quote");
    expect(quoteCard).toBeDefined();
    const quoteId = quoteCard.quoteId;

    // 3. Accept quote
    const quote = await prisma.quote.findUniqueOrThrow({ where: { id: quoteId } });
    const order = await prisma.order.create({
      data: {
        sellerId: seller.id,
        conversationId: conversation.id,
        quoteId: quote.id,
        customerName: "Alice Miller",
        customerEmail: "alice@example.com",
        status: "deposit_pending",
        dueDate: quote.dueDate,
        totalCents: quote.totalCents,
        paidCents: 0,
      },
    });

    const depositPayment = await prisma.payment.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        type: "deposit",
        amountCents: quote.depositCents,
        status: "pending",
        attempt: 1,
      },
    });

    // 4. Create PayPal order & capture
    const client = getPayPalClient();
    const paypalOrder = await client.createOrder({
      paymentId: depositPayment.id,
      attempt: 1,
      amountCents: depositPayment.amountCents,
      description: "Deposit",
    });

    await prisma.payment.update({
      where: { id: depositPayment.id },
      data: { paypalOrderId: paypalOrder.orderId },
    });

    const capture = await client.captureOrder(paypalOrder.orderId);
    expect(capture.status).toBe("COMPLETED");

    // Reconcile capture in DB
    await prisma.payment.update({
      where: { id: depositPayment.id },
      data: {
        status: "completed",
        paypalCaptureId: capture.captureId,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        paidCents: depositPayment.amountCents,
        status: "deposit_paid",
      },
    });

    const updatedOrderAfterDeposit = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(updatedOrderAfterDeposit.status).toBe("deposit_paid");
    expect(updatedOrderAfterDeposit.paidCents).toBe(quote.depositCents);

    // 5. Balance collection
    const remainingBalance = updatedOrderAfterDeposit.totalCents - updatedOrderAfterDeposit.paidCents;
    expect(remainingBalance).toBe(quote.balanceCents);

    const balancePayment = await prisma.payment.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        type: "balance",
        amountCents: remainingBalance,
        status: "pending",
        attempt: 1,
      },
    });

    // Capture balance
    const balanceCapture = await client.captureOrder("MOCK-ORD-BALANCE");
    await prisma.payment.update({
      where: { id: balancePayment.id },
      data: {
        status: "completed",
        paypalCaptureId: balanceCapture.captureId,
      },
    });

    const orderPaidInFull = await prisma.order.update({
      where: { id: order.id },
      data: {
        paidCents: updatedOrderAfterDeposit.totalCents,
        status: "paid_in_full",
      },
    });

    expect(orderPaidInFull.status).toBe("paid_in_full");
    expect(orderPaidInFull.paidCents).toBe(orderPaidInFull.totalCents);

    // 6. Cancellation and refund
    const refundRes = await client.refundCapture({
      captureId: capture.captureId,
      amountCents: depositPayment.amountCents,
      noteToPayer: "Order cancelled under policy",
    });

    expect(refundRes.status).toBe("COMPLETED");
    expect(refundRes.refundId).toContain("MOCK-REF");

    const finalOrder = await prisma.order.update({
      where: { id: order.id },
      data: { status: "refunded" },
    });
    expect(finalOrder.status).toBe("refunded");
  });

  it("escalates 0% tier late cancellation and processes refund when owner approves", async () => {
    const today = new Date();
    const twoDaysFromNow = formatISODate(addDays(today, 2));

    const conversation = await prisma.conversation.create({
      data: { sellerId: seller.id, status: "active" },
    });

    const quote = await prisma.quote.create({
      data: {
        sellerId: seller.id,
        conversationId: conversation.id,
        lines: "[]",
        subtotalCents: 5000,
        totalCents: 5000,
        depositCents: 1500,
        balanceCents: 3500,
        dueDate: twoDaysFromNow,
      },
    });

    const order = await prisma.order.create({
      data: {
        sellerId: seller.id,
        conversationId: conversation.id,
        quoteId: quote.id,
        customerName: "Bob Smith",
        customerEmail: "bob@example.com",
        status: "deposit_paid",
        dueDate: twoDaysFromNow,
        totalCents: 5000,
        paidCents: 1500,
      },
    });

    await prisma.payment.create({
      data: {
        sellerId: seller.id,
        orderId: order.id,
        type: "deposit",
        amountCents: 1500,
        status: "completed",
        paypalCaptureId: "CAP-TEST-1234",
      },
    });

    // Customer requests cancellation in chat
    const output = await runAgentConversation({
      sellerSlug: seller.slug,
      conversationId: conversation.id,
      userMessage: "I need to cancel my order for this weekend",
    });

    // Verify late cancellation escalation for this conversation
    const escalations = await prisma.escalation.findMany({
      where: { conversationId: conversation.id, status: "open" },
    });
    expect(escalations.length).toBe(1);
    expect(escalations[0].kind).toBe("refund_exception");

    // Owner approves $15.00 refund
    const escalation = escalations[0];
    const client = getPayPalClient();
    const refundResult = await client.refundCapture({
      captureId: "CAP-TEST-1234",
      amountCents: 1500,
    });

    await prisma.escalation.update({
      where: { id: escalation.id },
      data: {
        status: "approved",
        decidedAmount: 1500,
        resolvedAt: new Date(),
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { status: "refunded" },
    });

    const resolvedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(resolvedOrder.status).toBe("refunded");
  });
});
