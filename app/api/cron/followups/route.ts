import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getDaysDifference, getSimulatedNow } from "@/lib/engine/clock";

export async function POST(req: NextRequest) {
  try {
    const adminSecret = process.env.ADMIN_SECRET || "closer-admin-secret-2026";
    const authHeader = req.headers.get("x-admin-secret");

    // Allow in dev or if secret matches
    if (authHeader && authHeader !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all active orders with an outstanding balance
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["deposit_paid", "balance_requested"] },
      },
      include: {
        seller: true,
        conversation: true,
      },
    });

    const results = [];

    for (const order of orders) {
      const balanceCents = order.totalCents - order.paidCents;
      if (balanceCents <= 0) continue;

      const now = getSimulatedNow(order.seller.demoClockOffsetDays);
      const daysUntilDue = getDaysDifference(order.dueDate, now);

      let stage = "";
      let reminderMessage = "";

      if (daysUntilDue > 5 && daysUntilDue <= 7) {
        stage = "7_days_heads_up";
        reminderMessage = `Hi ${order.customerName}! Friendly heads-up: your order is 1 week away (${order.dueDate}). The remaining balance of $${(balanceCents / 100).toFixed(2)} will be due soon.`;
      } else if (daysUntilDue > 1 && daysUntilDue <= 3) {
        stage = "3_days_friendly";
        reminderMessage = `Hi ${order.customerName}! We're preparing ingredients for your upcoming order on ${order.dueDate}. Please settle the remaining balance of $${(balanceCents / 100).toFixed(2)} when convenient.`;
      } else if (daysUntilDue === 0) {
        stage = "0_days_due_today";
        reminderMessage = `Hi ${order.customerName}! Your order is scheduled for delivery today! The remaining balance of $${(balanceCents / 100).toFixed(2)} is due now.`;
      } else if (daysUntilDue === -2) {
        stage = "plus_2_days_firm";
        reminderMessage = `Urgent Reminder: The balance of $${(balanceCents / 100).toFixed(2)} for your order is now 2 days overdue. Please complete payment promptly.`;
      } else if (daysUntilDue <= -5) {
        stage = "plus_5_days_escalate";
        // Create escalation for seller
        await prisma.escalation.create({
          data: {
            sellerId: order.sellerId,
            conversationId: order.conversationId,
            orderId: order.id,
            kind: "complaint",
            summary: `Order #${order.id.substring(0, 8)} balance of $${(balanceCents / 100).toFixed(2)} is 5+ days overdue. Requires merchant collection action.`,
            status: "open",
          },
        });
        reminderMessage = `Notice: This balance of $${(balanceCents / 100).toFixed(2)} is significantly overdue and has been escalated to management.`;
      }

      if (stage) {
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

        const appUrl = process.env.APP_URL || "http://localhost:3000";
        const payLink = `${appUrl}/pay/${payment.id}`;

        // Post into conversation
        await prisma.message.create({
          data: {
            conversationId: order.conversationId,
            role: "assistant",
            content: JSON.stringify({
              text: `${reminderMessage} Click to pay: ${payLink}`,
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

        // Log agent event
        await prisma.agentEvent.create({
          data: {
            sellerId: order.sellerId,
            conversationId: order.conversationId,
            orderId: order.id,
            type: "followup",
            summary: `Follow-up stage '${stage}' sent to ${order.customerName} (Days to due: ${daysUntilDue})`,
            payload: JSON.stringify({ stage, balanceCents, paymentId: payment.id }),
          },
        });

        results.push({ orderId: order.id, stage, customer: order.customerName });
      }
    }

    return NextResponse.json({
      success: true,
      processedCount: results.length,
      results,
      message: `Follow-up evaluation complete. Sent ${results.length} stage reminder(s).`,
    });
  } catch (error: any) {
    console.error("Error in /api/cron/followups:", error);
    return NextResponse.json(
      { error: error.message || "Cron followups failed" },
      { status: 500 }
    );
  }
}
