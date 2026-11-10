import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Quick ping to database
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "Closer Agent Platform",
      paypalMode: process.env.PAYPAL_MODE || "mock",
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: "error", error: error.message || "Database connection error" },
      { status: 500 }
    );
  }
}
