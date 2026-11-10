import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPayPalClient } from "@/lib/paypal";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    let body: any;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const eventId = body.id;
    const eventType = body.event_type;

    if (!eventId || !eventType) {
      return NextResponse.json({ error: "Missing event id or event_type" }, { status: 400 });
    }

    // 1. Check for duplicate event (idempotency)
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (existing) {
      console.log(`ℹ️ Duplicate webhook event ${eventId} (${eventType}) ignored.`);
      return NextResponse.json({ status: "ALREADY_PROCESSED" }, { status: 200 });
    }

    // 2. Verify webhook signature
    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((val, key) => {
      headers[key.toLowerCase()] = val;
    });

    const client = getPayPalClient();
    const verification = await client.verifyWebhook({
      headers,
      body,
    });

    if (!verification.verified) {
      console.error(`❌ Webhook signature verification failed for ${eventId}: ${verification.status}`);
      return NextResponse.json(
        { error: "Webhook signature verification failed", status: verification.status },
        { status: 401 }
      );
    }

    // 3. Record verified webhook event in database
    await prisma.webhookEvent.create({
      data: {
        id: eventId,
        type: eventType,
        verified: true,
        payload: rawBody,
      },
    });

    console.log(`✅ Webhook verified & recorded: ${eventId} (${eventType})`);

    // 4. Process event types
    switch (eventType) {
      case "PAYMENT.CAPTURE.COMPLETED": {
        const capture = body.resource;
        const customId = capture.custom_id; // our paymentId
        const captureId = capture.id;

        if (customId) {
          const payment = await prisma.payment.findUnique({
            where: { id: customId },
            include: { order: true },
          });

          if (payment && payment.status !== "completed") {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "completed",
                paypalCaptureId: captureId,
              },
            });

            const newPaid = payment.order.paidCents + payment.amountCents;
            const isFull = newPaid >= payment.order.totalCents;
            await prisma.order.update({
              where: { id: payment.order.id },
              data: {
                paidCents: newPaid,
                status: isFull ? "paid_in_full" : "deposit_paid",
              },
            });

            await prisma.agentEvent.create({
              data: {
                sellerId: payment.sellerId,
                orderId: payment.order.id,
                type: "payment_captured",
                summary: `Webhook confirmed capture: $${(payment.amountCents / 100).toFixed(2)} (${captureId})`,
                payload: JSON.stringify({ webhookEventId: eventId }),
              },
            });
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.REFUNDED": {
        const refund = body.resource;
        const refundId = refund.id;
        const captureId = refund.links?.find((l: any) => l.rel === "up")?.href?.split("/").pop();

        if (captureId) {
          const payment = await prisma.payment.findFirst({
            where: { paypalCaptureId: captureId },
            include: { order: true },
          });

          if (payment && payment.order.status !== "refunded") {
            await prisma.order.update({
              where: { id: payment.order.id },
              data: { status: "refunded" },
            });

            await prisma.agentEvent.create({
              data: {
                sellerId: payment.sellerId,
                orderId: payment.order.id,
                type: "refund_issued",
                summary: `Webhook confirmed refund: ${refundId}`,
                payload: JSON.stringify({ webhookEventId: eventId }),
              },
            });
          }
        }
        break;
      }

      case "PAYMENT.CAPTURE.DENIED": {
        const capture = body.resource;
        const customId = capture.custom_id;

        if (customId) {
          const payment = await prisma.payment.findUnique({
            where: { id: customId },
            include: { order: true },
          });

          if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: { status: "failed" },
            });

            await prisma.message.create({
              data: {
                conversationId: payment.order.conversationId,
                role: "assistant",
                content: JSON.stringify({
                  text: "Notice: Your recent payment attempt was declined by PayPal. Please check your funding source or click your payment link to retry.",
                  uiCards: [],
                }),
              },
            });
          }
        }
        break;
      }

      case "CHECKOUT.ORDER.APPROVED": {
        console.log(`Webhook received CHECKOUT.ORDER.APPROVED for order ${body.resource?.id}`);
        break;
      }
    }

    return NextResponse.json({ success: true, eventId });
  } catch (error: any) {
    console.error("Error processing PayPal webhook:", error);
    return NextResponse.json(
      { error: error.message || "Webhook processing failed" },
      { status: 500 }
    );
  }
}
