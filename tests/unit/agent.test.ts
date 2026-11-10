import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "../../lib/db";
import { runAgentConversation } from "../../lib/agent/run";
import { seedDemoSeller } from "../../prisma/seed";

describe("Agent Conversation & Guardrail Audit Trail", () => {
  let seller: any;

  beforeEach(async () => {
    seller = await seedDemoSeller();
  });

  it("creates a conversation, receives quote with capped discount and logs guardrail event", async () => {
    // 1. Create a fresh conversation
    const conversation = await prisma.conversation.create({
      data: {
        sellerId: seller.id,
        status: "active",
      },
    });

    // 2. User asks for a 2kg chocolate cake with 15% discount
    const output = await runAgentConversation({
      sellerSlug: seller.slug,
      conversationId: conversation.id,
      userMessage: "I want to order a 2kg chocolate cake for next Saturday and I want a 15% discount",
    });

    expect(output.uiCards.length).toBeGreaterThan(0);
    const quoteCard = output.uiCards.find((c: any) => c.type === "quote");
    expect(quoteCard).toBeDefined();

    // Verify discount was capped by rules (2kg cake = $45 + $35 = $80 -> capped at 5%)
    expect(quoteCard.pricing.discount.grantedPercent).toBe(5);
    expect(quoteCard.pricing.discount.isCapped).toBe(true);

    // Verify AgentEvent guardrail audit log
    const guardrailEvents = await prisma.agentEvent.findMany({
      where: {
        conversationId: conversation.id,
        type: "guardrail",
      },
    });

    expect(guardrailEvents.length).toBeGreaterThan(0);
    const cappedEvent = guardrailEvents.find((e) => e.summary.includes("capped at 5%"));
    expect(cappedEvent).toBeDefined();
  });

  it("escalates allergy inquiries immediately without quoting", async () => {
    const conversation = await prisma.conversation.create({
      data: {
        sellerId: seller.id,
        status: "active",
      },
    });

    const output = await runAgentConversation({
      sellerSlug: seller.slug,
      conversationId: conversation.id,
      userMessage: "My child has a severe peanut allergy. Can you guarantee the cake has zero traces of nuts?",
    });

    const escalationCard = output.uiCards.find((c: any) => c.type === "escalation_notice");
    expect(escalationCard).toBeDefined();

    // Verify escalation in DB
    const escalations = await prisma.escalation.findMany({
      where: { conversationId: conversation.id },
    });
    expect(escalations.length).toBe(1);
    expect(escalations[0].kind).toBe("allergy_health");
  });
});
