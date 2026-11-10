import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayPalClient } from "@/lib/paypal";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token"); // PayPal Order ID

    if (!token) {
      return NextResponse.json({ error: "Missing PayPal token" }, { status: 400 });
    }

    // Find payment record matching paypalOrderId
    const payment = await prisma.payment.findFirst({
      where: { paypalOrderId: token },
      include: {
        order: {
          include: {
            seller: true,
            conversation: true,
          },
        },
      },
    });

    if (!payment) {
      console.error(`No payment record found for PayPal order ID ${token}`);
      return NextResponse.redirect(new URL("/?error=payment_not_found", req.url));
    }

    const { order } = payment;
    const { seller } = order;

    // Execute capture via PayPal client
    const client = getPayPalClient();
    const captureResult = await client.captureOrder(token);

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "completed",
        paypalCaptureId: captureResult.captureId,
        raw: JSON.stringify(captureResult.raw),
      },
    });

    // Update order status and amount paid
    const newPaidCents = order.paidCents + payment.amountCents;
    const isPaidInFull = newPaidCents >= order.totalCents;
    const newOrderStatus = isPaidInFull ? "paid_in_full" : "deposit_paid";

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paidCents: newPaidCents,
        status: newOrderStatus,
      },
    });

    // Log Agent Event
    const isDeposit = payment.type === "deposit";
    await prisma.agentEvent.create({
      data: {
        sellerId: seller.id,
        conversationId: order.conversationId,
        orderId: order.id,
        type: "payment_captured",
        summary: `Captured ${payment.type} payment: $${(payment.amountCents / 100).toFixed(2)} (Capture ID: ${captureResult.captureId}). Order status: ${newOrderStatus}`,
        payload: JSON.stringify({
          paymentId: payment.id,
          captureId: captureResult.captureId,
          paypalOrderId: token,
          newPaidCents,
          totalCents: order.totalCents,
        }),
      },
    });

    // Post confirmation message and receipt card to chat
    const receiptCard = {
      type: "payment_receipt",
      paymentId: payment.id,
      orderId: order.id,
      typeLabel: isDeposit ? "Deposit Paid" : "Balance Paid in Full",
      amountPaidCents: payment.amountCents,
      totalOrderCents: order.totalCents,
      remainingBalanceCents: Math.max(0, order.totalCents - newPaidCents),
      dueDate: order.dueDate,
      paypalCaptureId: captureResult.captureId,
      paypalOrderId: token,
    };

    const confirmText = isDeposit
      ? `🎉 Thank you, ${order.customerName}! Your deposit of $${(payment.amountCents / 100).toFixed(2)} has been successfully received via PayPal. Your order is officially booked for ${order.dueDate}!`
      : `🎉 Thank you! Your final balance of $${(payment.amountCents / 100).toFixed(2)} has been received in full via PayPal. Your order is completely paid!`;

    await prisma.message.create({
      data: {
        conversationId: order.conversationId,
        role: "assistant",
        content: JSON.stringify({
          text: confirmText,
          uiCards: [receiptCard],
        }),
      },
    });

    // Redirect user back to store chat
    const redirectUrl = new URL(
      `/s/${seller.slug}?conversationId=${order.conversationId}&paymentSuccess=true&captureId=${captureResult.captureId}`,
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error("Error in /api/paypal/return:", error);
    return NextResponse.redirect(new URL("/?error=capture_failed", req.url));
  }
}
