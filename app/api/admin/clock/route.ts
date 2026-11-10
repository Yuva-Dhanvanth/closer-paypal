import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatISODate, getSimulatedNow } from "@/lib/engine/clock";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { slug = "sugar-and-spice", addDays = 0, reset = false } = body;

    const seller = await prisma.seller.findUnique({
      where: { slug },
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    const newOffset = reset ? 0 : seller.demoClockOffsetDays + addDays;

    await prisma.seller.update({
      where: { id: seller.id },
      data: { demoClockOffsetDays: newOffset },
    });

    const simulatedNow = getSimulatedNow(newOffset);
    const simulatedToday = formatISODate(simulatedNow);

    await prisma.agentEvent.create({
      data: {
        sellerId: seller.id,
        type: "tool_call",
        summary: `Time travel: Demo clock ${reset ? "reset to today" : `fast-forwarded +${addDays} days`}. Current simulated date: ${simulatedToday}`,
        payload: JSON.stringify({ offsetDays: newOffset, simulatedToday }),
      },
    });

    return NextResponse.json({
      success: true,
      offsetDays: newOffset,
      simulatedToday,
    });
  } catch (error: any) {
    console.error("Error updating demo clock:", error);
    return NextResponse.json(
      { error: error.message || "Failed to adjust demo clock" },
      { status: 500 }
    );
  }
}
