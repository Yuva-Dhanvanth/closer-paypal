import { PrismaClient } from "@prisma/client";
import { DEFAULT_SUGAR_AND_SPICE_CATALOG } from "../lib/engine/pricing";

const prisma = new PrismaClient();

export async function seedDemoSeller() {
  console.log("🌱 Seeding demo seller: Sugar & Spice Bakes...");

  const demoSlug = "sugar-and-spice";

  const policies = {
    minimumOrderCents: 2500, // $25.00
    depositPercent: 30, // 30% rounded up
    rushFeeThresholdDays: 5,
    rushFeePercent: 20, // 20%
    discounts: [
      { minSubtotalCents: 15000, maxPercent: 10 },
      { minSubtotalCents: 6000, maxPercent: 5 },
    ],
    refundTiers: [
      { minDaysBeforeDue: 7, percent: 100 },
      { minDaysBeforeDue: 3, percent: 50 },
      { minDaysBeforeDue: 0, percent: 0, requiresEscalation: true },
    ],
    escalationReasons: [
      "allergy_health",
      "out_of_catalog",
      "complaint",
      "double_reject",
      "refund_exception",
    ],
  };

  const seller = await prisma.seller.upsert({
    where: { slug: demoSlug },
    update: {
      name: "Sugar & Spice Bakes",
      tagline: "Custom artisan celebration cakes and dessert tables crafted for your special moments",
      tone: "Warm, artisanal, enthusiastic, and helpful. You speak like a boutique bakery owner who cares deeply about making each event unforgettable.",
      catalog: JSON.stringify(DEFAULT_SUGAR_AND_SPICE_CATALOG),
      policies: JSON.stringify(policies),
      demoClockOffsetDays: 0,
    },
    create: {
      slug: demoSlug,
      name: "Sugar & Spice Bakes",
      tagline: "Custom artisan celebration cakes and dessert tables crafted for your special moments",
      tone: "Warm, artisanal, enthusiastic, and helpful. You speak like a boutique bakery owner who cares deeply about making each event unforgettable.",
      catalog: JSON.stringify(DEFAULT_SUGAR_AND_SPICE_CATALOG),
      policies: JSON.stringify(policies),
      demoClockOffsetDays: 0,
    },
  });

  console.log(`✅ Seeded seller: ${seller.name} (${seller.slug}, id: ${seller.id})`);
  return seller;
}

async function main() {
  try {
    await seedDemoSeller();
  } catch (e) {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module || process.argv[1]?.endsWith("seed.ts")) {
  main();
}
