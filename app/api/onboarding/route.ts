import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { callLLM } from "@/lib/llm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawText, sellerName, slug, tone, publish = false } = body;

    if (!rawText && !sellerName) {
      return NextResponse.json(
        { error: "Please provide a price list or store name." },
        { status: 400 }
      );
    }

    // Extraction prompt
    const prompt = `You are an expert commerce onboarding assistant.
Convert this raw merchant menu/text into a clean JSON catalog and policy configuration for Closer.
Merchant text:
"${rawText}"

Output valid JSON matching this exact structure (no markdown, no extra commentary):
{
  "name": "Extracted or inferred business name",
  "slug": "url-friendly-slug",
  "tagline": "Short compelling tagline",
  "tone": "Warm, professional, helpful",
  "catalog": {
    "items": [
      {
        "id": "item_id",
        "name": "Item Name",
        "description": "Short description",
        "basePriceCents": 4500,
        "leadTimeDays": 3,
        "optionGroups": [
          {
            "id": "size",
            "name": "Size",
            "required": true,
            "options": [
              { "id": "standard", "name": "Standard", "deltaCents": 0 },
              { "id": "large", "name": "Large", "deltaCents": 2000 }
            ]
          }
        ]
      }
    ]
  },
  "policies": {
    "minimumOrderCents": 2500,
    "depositPercent": 30,
    "rushFeeThresholdDays": 5,
    "rushFeePercent": 20,
    "discounts": [
      { "minSubtotalCents": 15000, "maxPercent": 10 },
      { "minSubtotalCents": 6000, "maxPercent": 5 }
    ],
    "refundTiers": [
      { "minDaysBeforeDue": 7, "percent": 100 },
      { "minDaysBeforeDue": 3, "percent": 50 },
      { "minDaysBeforeDue": 0, "percent": 0, "requiresEscalation": true }
    ]
  }
}`;

    let parsedConfig: any;

    try {
      const llmRes = await callLLM({
        systemPrompt: "You are a JSON-only configuration generator. Return pure JSON only.",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      // Parse JSON
      const jsonStart = llmRes.text.indexOf("{");
      const jsonEnd = llmRes.text.lastIndexOf("}");
      if (jsonStart !== -1 && jsonEnd !== -1) {
        parsedConfig = JSON.parse(llmRes.text.substring(jsonStart, jsonEnd + 1));
      } else {
        throw new Error("No JSON found in model output");
      }
    } catch {
      // Clean fallback if parsing failed or mock
      const generatedSlug = (sellerName || "custom-seller")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");

      parsedConfig = {
        name: sellerName || "Artisan Custom Studio",
        slug: slug || generatedSlug,
        tagline: "Custom bespoke creations handcrafted for you",
        tone: tone || "Warm, attentive, and artisanal",
        catalog: {
          items: [
            {
              id: "signature_creation",
              name: "Custom Bespoke Order",
              description: "Tailored to your exact specifications.",
              basePriceCents: 5000,
              leadTimeDays: 3,
            },
            {
              id: "express_package",
              name: "Express Package",
              description: "Ready with quick turnaround.",
              basePriceCents: 3500,
              leadTimeDays: 2,
            },
          ],
        },
        policies: {
          minimumOrderCents: 2500,
          depositPercent: 30,
          rushFeeThresholdDays: 5,
          rushFeePercent: 20,
          discounts: [
            { minSubtotalCents: 15000, maxPercent: 10 },
            { minSubtotalCents: 6000, maxPercent: 5 },
          ],
          refundTiers: [
            { minDaysBeforeDue: 7, percent: 100 },
            { minDaysBeforeDue: 3, percent: 50 },
            { minDaysBeforeDue: 0, percent: 0, requiresEscalation: true },
          ],
        },
      };
    }

    if (publish) {
      const targetSlug = slug || parsedConfig.slug || "new-store";
      const seller = await prisma.seller.upsert({
        where: { slug: targetSlug },
        update: {
          name: parsedConfig.name,
          tagline: parsedConfig.tagline,
          tone: parsedConfig.tone,
          catalog: JSON.stringify(parsedConfig.catalog),
          policies: JSON.stringify(parsedConfig.policies),
        },
        create: {
          slug: targetSlug,
          name: parsedConfig.name,
          tagline: parsedConfig.tagline,
          tone: parsedConfig.tone,
          catalog: JSON.stringify(parsedConfig.catalog),
          policies: JSON.stringify(parsedConfig.policies),
        },
      });

      return NextResponse.json({
        success: true,
        published: true,
        storeUrl: `/s/${seller.slug}`,
        dashboardUrl: `/dashboard/${seller.slug}`,
        seller,
      });
    }

    return NextResponse.json({
      success: true,
      config: parsedConfig,
    });
  } catch (error: any) {
    console.error("Error in POST /api/onboarding:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process onboarding" },
      { status: 500 }
    );
  }
}
