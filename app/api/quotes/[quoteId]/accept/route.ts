import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const AcceptQuoteSchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  customerEmail: z.string().email("Valid email is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ quoteId: string }> }
) {
  try {
    const { quoteId } = await params;
    const body = await req.json();
    const parsed = AcceptQuoteSchema.parse(body);

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { conversation: true },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check if an order already exists for this quote
    let order = await prisma.order.findFirst({
      where: { quoteId: quote.id },
      include: { payments: true },
    });

    let payment = null;

    if (!order) {
      order = await prisma.order.create({
        data: {
          sellerId: quote.sellerId,
          conversationId: quote.conversationId,
          quoteId: quote.id,
          customerName: parsed.customerName,
          customerEmail: parsed.customerEmail,
          status: "deposit_pending",
          dueDate: quote.dueDate,
          totalCents: quote.totalCents,
          paidCents: 0,
        },
        include: { payments: true },
      });

      // Update conversation customer details
      await prisma.conversation.update({
        where: { id: quote.conversationId },
        data: {
          customerName: parsed.customerName,
          customerEmail: parsed.customerEmail,
        },
      });

      // Mark quote accepted
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: "accepted" },
      });

      // Create deposit payment record
      payment = await prisma.payment.create({
        data: {
          sellerId: quote.sellerId,
          orderId: order.id,
          type: "deposit",
          amountCents: quote.depositCents,
          status: "pending",
          attempt: 1,
        },
      });

      await prisma.agentEvent.create({
        data: {
          sellerId: quote.sellerId,
          conversationId: quote.conversationId,
          orderId: order.id,
          type: "payment_created",
          summary: `Quote accepted by ${parsed.customerName}. Created deposit payment #$${payment.id.substring(0, 8)} for $${(payment.amountCents / 100).toFixed(2)}`,
          payload: JSON.stringify({ orderId: order.id, paymentId: payment.id, quoteId: quote.id }),
        },
      });
    } else {
      // Find or create pending payment attempt
      payment = await prisma.payment.findFirst({
        where: { orderId: order.id, type: "deposit", status: "pending" },
      });

      if (!payment) {
        const lastAttempt = await prisma.payment.count({
          where: { orderId: order.id, type: "deposit" },
        });

        payment = await prisma.payment.create({
          data: {
            sellerId: quote.sellerId,
            orderId: order.id,
            type: "deposit",
            amountCents: quote.depositCents,
            status: "pending",
            attempt: lastAttempt + 1,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      paymentId: payment.id,
      redirectUrl: `/pay/${payment.id}`,
    });
  } catch (error: any) {
    console.error("POST /api/quotes/[quoteId]/accept error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to accept quote" },
      { status: 400 }
    );
  }
}
