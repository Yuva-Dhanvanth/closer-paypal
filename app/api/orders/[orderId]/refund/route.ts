import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayPalClient } from "@/lib/paypal";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const body = await req.json();
    const { refundAmountCents, reason, escalationId } = body;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        seller: true,
        payments: {
          where: { status: "completed" },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.paidCents <= 0 || order.payments.length === 0) {
      return NextResponse.json(
        { error: "No completed payments found to refund for this order." },
        { status: 400 }
      );
    }

    // Amount to refund: default to full paid cents if not specified
    const amountToRefund = refundAmountCents !== undefined ? refundAmountCents : order.paidCents;

    if (amountToRefund <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than zero." },
        { status: 400 }
      );
    }

    // Get the most recent capture ID
    const capturePayment = order.payments.find((p) => p.paypalCaptureId);
    if (!capturePayment?.paypalCaptureId) {
      return NextResponse.json(
        { error: "No PayPal capture ID found on payment record." },
        { status: 400 }
      );
    }

    // Execute refund via PayPal client
    const client = getPayPalClient();
    const refundResult = await client.refundCapture({
      captureId: capturePayment.paypalCaptureId,
      amountCents: amountToRefund,
      invoiceId: `REF-${order.id}-${Date.now()}`,
      noteToPayer: reason || "Refund processed under store policy.",
    });

    // Create refund payment record
    const refundPayment = await prisma.payment.create({
      data: {
        sellerId: order.sellerId,
        orderId: order.id,
        type: "refund",
        amountCents: amountToRefund,
        status: "completed",
        paypalCaptureId: capturePayment.paypalCaptureId,
        paypalRefundId: refundResult.refundId,
        raw: JSON.stringify(refundResult.raw),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
      },
    });

    // If linked to an escalation, mark it approved
    if (escalationId) {
      await prisma.escalation.update({
        where: { id: escalationId },
        data: {
          status: "approved",
          decidedAmount: amountToRefund,
          resolvedAt: new Date(),
        },
      });
    }

    // Log Agent Event
    await prisma.agentEvent.create({
      data: {
        sellerId: order.sellerId,
        conversationId: order.conversationId,
        orderId: order.id,
        type: "refund_issued",
        summary: `Refund of $${(amountToRefund / 100).toFixed(2)} issued to customer via PayPal Refund #${refundResult.refundId} (Capture: ${capturePayment.paypalCaptureId})`,
        payload: JSON.stringify({
          refundId: refundResult.refundId,
          captureId: capturePayment.paypalCaptureId,
          amountCents: amountToRefund,
        }),
      },
    });

    // Post notification in customer chat
    await prisma.message.create({
      data: {
        conversationId: order.conversationId,
        role: "assistant",
        content: JSON.stringify({
          text: `Your cancellation has been processed. A refund of $${(amountToRefund / 100).toFixed(2)} has been credited to your PayPal account (Refund Ref: ${refundResult.refundId}).`,
          uiCards: [],
        }),
      },
    });

    return NextResponse.json({
      success: true,
      refundId: refundResult.refundId,
      amountRefundedCents: amountToRefund,
      paymentId: refundPayment.id,
    });
  } catch (error: any) {
    console.error("Error in POST /api/orders/[orderId]/refund:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process refund" },
      { status: 500 }
    );
  }
}
