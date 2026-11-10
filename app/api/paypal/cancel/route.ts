import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    let sellerSlug = "sugar-and-spice";
    let conversationId: string | null = null;

    if (token) {
      const payment = await prisma.payment.findFirst({
        where: { paypalOrderId: token },
        include: {
          order: {
            include: { seller: true },
          },
        },
      });

      if (payment) {
        sellerSlug = payment.order.seller.slug;
        conversationId = payment.order.conversationId;

        // Post a friendly message in chat
        await prisma.message.create({
          data: {
            conversationId: payment.order.conversationId,
            role: "assistant",
            content: JSON.stringify({
              text: "No worries at all! Your custom quote and order reservation are saved. Whenever you're ready, you can click the payment link to complete your deposit.",
              uiCards: [],
            }),
          },
        });
      }
    }

    const redirectUrl = new URL(
      `/s/${sellerSlug}${conversationId ? `?conversationId=${conversationId}&paymentCancelled=true` : ""}`,
      req.url
    );
    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("Error in /api/paypal/cancel:", error);
    return NextResponse.redirect(new URL("/", req.url));
  }
}
