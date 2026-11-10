import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatISODate, getSimulatedNow } from "@/lib/engine/clock";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const seller = await prisma.seller.findUnique({
      where: { slug },
      include: {
        orders: {
          orderBy: { createdAt: "desc" },
          include: {
            payments: true,
          },
        },
        agentEvents: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const simulatedNow = getSimulatedNow(seller.demoClockOffsetDays);
    const simulatedToday = formatISODate(simulatedNow);

    // Compute Financial Metrics
    const completedPayments = await prisma.payment.findMany({
      where: { sellerId: seller.id, status: "completed" },
    });

    let totalCollectedCents = 0;
    let totalRefundedCents = 0;
    let depositsHeldCents = 0;

    for (const p of completedPayments) {
      if (p.type === "refund") {
        totalRefundedCents += p.amountCents;
      } else {
        totalCollectedCents += p.amountCents;
        if (p.type === "deposit") {
          depositsHeldCents += p.amountCents;
        }
      }
    }

    const netRevenueCents = totalCollectedCents - totalRefundedCents;

    let balanceOutstandingCents = 0;
    for (const ord of seller.orders) {
      if (ord.status === "deposit_paid" || ord.status === "balance_requested") {
        balanceOutstandingCents += Math.max(0, ord.totalCents - ord.paidCents);
      }
    }

    const totalConversations = await prisma.conversation.count({
      where: { sellerId: seller.id },
    });

    const totalOrders = seller.orders.length;
    const conversionRate = totalConversations > 0 ? Math.round((totalOrders / totalConversations) * 100) : 0;
    const estimatedHoursSaved = (totalOrders * 1.5).toFixed(1);

    // Fetch escalations
    const escalations = await prisma.escalation.findMany({
      where: { sellerId: seller.id },
      orderBy: { createdAt: "desc" },
      include: { order: true },
    });

    // Fetch webhook events
    const webhooks = await prisma.webhookEvent.findMany({
      orderBy: { processedAt: "desc" },
      take: 30,
    });

    // Format orders for AG Grid
    const formattedOrders = seller.orders.map((o) => {
      const balance = Math.max(0, o.totalCents - o.paidCents);
      let nextAction = "None";
      if (o.status === "deposit_pending") nextAction = "Awaiting Buyer Deposit";
      else if (o.status === "deposit_paid") nextAction = "Request Balance on Due Date";
      else if (o.status === "balance_requested") nextAction = "Awaiting Buyer Balance";
      else if (o.status === "paid_in_full") nextAction = "Ready for Fulfillment";
      else if (o.status === "refunded") nextAction = "Refund Settled";

      return {
        id: o.id,
        shortId: `#${o.id.substring(0, 8)}`,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        dueDate: o.dueDate,
        totalDollars: (o.totalCents / 100).toFixed(2),
        paidDollars: (o.paidCents / 100).toFixed(2),
        balanceDollars: (balance / 100).toFixed(2),
        status: o.status,
        nextAction,
        conversationId: o.conversationId,
        createdAt: o.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      seller: {
        id: seller.id,
        name: seller.name,
        slug: seller.slug,
        tagline: seller.tagline,
        demoClockOffsetDays: seller.demoClockOffsetDays,
        simulatedToday,
      },
      metrics: {
        netRevenueCents,
        depositsHeldCents,
        balanceOutstandingCents,
        totalOrders,
        totalConversations,
        conversionRate,
        estimatedHoursSaved,
      },
      orders: formattedOrders,
      escalations,
      agentEvents: seller.agentEvents,
      payments: completedPayments,
      webhooks,
    });
  } catch (error: any) {
    console.error("Error in GET /api/dashboard/[slug]:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load dashboard data" },
      { status: 500 }
    );
  }
}
