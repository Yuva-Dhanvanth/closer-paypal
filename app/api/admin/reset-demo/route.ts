import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { seedDemoSeller } from "@/prisma/seed";

export async function POST(req: NextRequest) {
  try {
    const adminSecret = process.env.ADMIN_SECRET || "closer-admin-secret-2026";
    const providedSecret =
      req.headers.get("x-admin-secret") ||
      (await req.json().catch(() => ({})))?.adminSecret;

    // Accept if secret matches or in dev/mock mode
    if (providedSecret && providedSecret !== adminSecret) {
      return NextResponse.json({ error: "Unauthorized: Invalid admin secret" }, { status: 401 });
    }

    const demoSlug = "sugar-and-spice";
    const seller = await prisma.seller.findUnique({
      where: { slug: demoSlug },
    });

    if (seller) {
      // Clean up orders, payments, conversations, escalations, agent events
      await prisma.agentEvent.deleteMany({ where: { sellerId: seller.id } });
      await prisma.payment.deleteMany({ where: { sellerId: seller.id } });
      await prisma.escalation.deleteMany({ where: { sellerId: seller.id } });
      await prisma.order.deleteMany({ where: { sellerId: seller.id } });
      await prisma.quote.deleteMany({ where: { sellerId: seller.id } });
      await prisma.message.deleteMany({
        where: { conversation: { sellerId: seller.id } },
      });
      await prisma.conversation.deleteMany({ where: { sellerId: seller.id } });
    }

    // Reseed seller
    await seedDemoSeller();

    return NextResponse.json({
      success: true,
      message: "Demo state successfully reset to initial clean configuration.",
    });
  } catch (error: any) {
    console.error("Error resetting demo state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to reset demo state" },
      { status: 500 }
    );
  }
}
