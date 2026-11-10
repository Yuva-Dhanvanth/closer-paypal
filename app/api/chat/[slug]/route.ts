import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAgentConversation } from "@/lib/agent/run";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    let conversationId = searchParams.get("conversationId");

    const seller = await prisma.seller.findUnique({
      where: { slug },
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          quotes: { orderBy: { createdAt: "desc" }, take: 1 },
          orders: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          sellerId: seller.id,
          status: "active",
        },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          quotes: true,
          orders: true,
        },
      });

      // Insert welcome message from assistant
      const welcome = `Hi there! Welcome to ${seller.name}. 🎂 I'm your ordering assistant. Tell me what event or treats you're planning, and what date you need them by!`;
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          role: "assistant",
          content: JSON.stringify({
            text: welcome,
            uiCards: [],
          }),
        },
      });

      // Refetch with welcome message
      conversation = await prisma.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          quotes: { orderBy: { createdAt: "desc" }, take: 1 },
          orders: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      });
    }

    return NextResponse.json({
      seller: {
        id: seller.id,
        name: seller.name,
        slug: seller.slug,
        tagline: seller.tagline,
        catalog: JSON.parse(seller.catalog),
        demoClockOffsetDays: seller.demoClockOffsetDays,
      },
      conversation,
    });
  } catch (error: any) {
    console.error("GET /api/chat/[slug] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { conversationId, message } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const output = await runAgentConversation({
      sellerSlug: slug,
      conversationId,
      userMessage: message,
    });

    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        quotes: { orderBy: { createdAt: "desc" }, take: 1 },
        orders: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return NextResponse.json({
      success: true,
      output,
      conversation: updatedConversation,
    });
  } catch (error: any) {
    console.error("POST /api/chat/[slug] error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
