import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayPalClient } from "@/lib/paypal";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, decidedAmountCents } = body;

    const escalation = await prisma.escalation.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            payments: {
              where: { status: "completed" },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!escalation) {
      return NextResponse.json({ error: "Escalation not found" }, { status: 404 });
    }

    // If seller approves a refund exception and there is an order with payment:
    if (status === "approved" && escalation.order && escalation.order.paidCents > 0) {
      const amountToRefund =
        decidedAmountCents !== undefined ? decidedAmountCents : escalation.order.paidCents;

      const capturePayment = escalation.order.payments.find((p) => p.paypalCaptureId);
      if (capturePayment?.paypalCaptureId) {
        const client = getPayPalClient();
        const refundResult = await client.refundCapture({
          captureId: capturePayment.paypalCaptureId,
          amountCents: amountToRefund,
          invoiceId: `EXC-REF-${escalation.order.id}-${Date.now()}`,
          noteToPayer: "Owner exception approved: Refund issued via PayPal.",
        });

        // Record refund payment
        await prisma.payment.create({
          data: {
            sellerId: escalation.sellerId,
            orderId: escalation.order.id,
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
          where: { id: escalation.order.id },
          data: { status: "refunded" },
        });

        // Update escalation
        await prisma.escalation.update({
          where: { id },
          data: {
            status: "approved",
            decidedAmount: amountToRefund,
            resolvedAt: new Date(),
          },
        });

        // Log agent event
        await prisma.agentEvent.create({
          data: {
            sellerId: escalation.sellerId,
            conversationId: escalation.conversationId,
            orderId: escalation.order.id,
            type: "refund_issued",
            summary: `Owner approved exception: Issued PayPal refund of $${(amountToRefund / 100).toFixed(2)} (Refund ID: ${refundResult.refundId})`,
            payload: JSON.stringify({ refundId: refundResult.refundId, escalationId: id }),
          },
        });

        // Post chat notice
        await prisma.message.create({
          data: {
            conversationId: escalation.conversationId,
            role: "assistant",
            content: JSON.stringify({
              text: `Great news! The bakery owner personally reviewed your request and approved a full exception refund of $${(amountToRefund / 100).toFixed(2)}. The funds have been refunded to your PayPal account.`,
              uiCards: [],
            }),
          },
        });

        return NextResponse.json({
          success: true,
          status: "approved",
          refundId: refundResult.refundId,
          amountCents: amountToRefund,
        });
      }
    }

    // Default status update (e.g. denied or non-monetary inquiry)
    const updated = await prisma.escalation.update({
      where: { id },
      data: {
        status: status || "denied",
        resolvedAt: new Date(),
      },
    });

    await prisma.agentEvent.create({
      data: {
        sellerId: escalation.sellerId,
        conversationId: escalation.conversationId,
        orderId: escalation.orderId,
        type: "escalation",
        summary: `Seller decided escalation #${id.substring(0, 8)}: Status '${status}'`,
        payload: JSON.stringify({ escalationId: id, status }),
      },
    });

    return NextResponse.json({ success: true, escalation: updated });
  } catch (error: any) {
    console.error("Error in PATCH /api/admin/escalations/[id]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update escalation" },
      { status: 500 }
    );
  }
}
