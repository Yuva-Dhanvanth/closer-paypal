import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { seller: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const balanceCents = order.totalCents - order.paidCents;
    if (balanceCents <= 0) {
      return NextResponse.json(
        { error: "Order is already paid in full." },
        { status: 400 }
      );
    }

    // Create a new balance payment record
    const payment = await prisma.payment.create({
      data: {
        sellerId: order.sellerId,
        orderId: order.id,
        type: "balance",
        amountCents: balanceCents,
        status: "pending",
        attempt: 1,
      },
    });

    // Update order status to balance_requested
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "balance_requested" },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const payLink = `${appUrl}/pay/${payment.id}`;

    // Post balance request message to customer's chat
    await prisma.message.create({
      data: {
        conversationId: order.conversationId,
        role: "assistant",
        content: JSON.stringify({
          text: `Hi ${order.customerName}! Your order is scheduled for delivery on ${order.dueDate}. The remaining balance of $${(balanceCents / 100).toFixed(2)} is now due. Please click here to settle the balance with PayPal: ${payLink}`,
          uiCards: [
            {
              type: "balance_due_card",
              orderId: order.id,
              balanceCents,
              dueDate: order.dueDate,
              payUrl: `/pay/${payment.id}`,
            },
          ],
        }),
      },
    });

    // Log Agent Event
    await prisma.agentEvent.create({
      data: {
        sellerId: order.sellerId,
        conversationId: order.conversationId,
        orderId: order.id,
        type: "followup",
        summary: `Balance payment request issued for $${(balanceCents / 100).toFixed(2)} on Order #${order.id.substring(0, 8)}`,
        payload: JSON.stringify({ paymentId: payment.id, balanceCents }),
      },
    });

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      payUrl: `/pay/${payment.id}`,
    });
  } catch (error: any) {
    console.error("Error in POST /api/orders/[orderId]/request-balance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to request balance" },
      { status: 500 }
    );
  }
}
