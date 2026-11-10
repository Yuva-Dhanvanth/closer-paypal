import { prisma } from "../db";
import { callLLM, LLMMessage } from "../llm";
import { buildSystemPrompt } from "./prompt";
import { AGENT_TOOLS, executeToolCall } from "./tools";

export interface AgentRunParams {
  sellerSlug: string;
  conversationId: string;
  userMessage?: string;
}

export interface AgentRunOutput {
  text: string;
  uiCards: any[];
}

export async function runAgentConversation(params: {
  sellerSlug: string;
  conversationId: string;
  userMessage?: string;
}): Promise<AgentRunOutput> {
  const { sellerSlug, conversationId, userMessage } = params;

  // 1. Fetch seller
  const seller = await prisma.seller.findUnique({
    where: { slug: sellerSlug },
  });

  if (!seller) {
    throw new Error(`Seller '${sellerSlug}' not found.`);
  }

  // 2. Fetch conversation
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        take: 40,
      },
    },
  });

  if (!conversation) {
    throw new Error(`Conversation '${conversationId}' not found.`);
  }

  // 3. Save incoming user message if provided
  if (userMessage && userMessage.trim()) {
    await prisma.message.create({
      data: {
        conversationId,
        role: "user",
        content: JSON.stringify({ text: userMessage.trim() }),
      },
    });
  }

  // 4. Fetch updated context (current quote and active order)
  const currentQuote = await prisma.quote.findFirst({
    where: { conversationId, sellerId: seller.id },
    orderBy: { createdAt: "desc" },
  });

  const activeOrder = await prisma.order.findFirst({
    where: { conversationId, sellerId: seller.id },
    orderBy: { createdAt: "desc" },
  });

  const currentQuoteSummary = currentQuote
    ? `Quote #${currentQuote.id.substring(0, 8)}: Subtotal $${(currentQuote.subtotalCents / 100).toFixed(2)}, Discount: ${currentQuote.discountPercent}%, Rush: $${(currentQuote.rushFeeCents / 100).toFixed(2)}, Total: $${(currentQuote.totalCents / 100).toFixed(2)}, Deposit: $${(currentQuote.depositCents / 100).toFixed(2)}, Due: ${currentQuote.dueDate}, Status: ${currentQuote.status}`
    : undefined;

  const orderStatusSummary = activeOrder
    ? `Order #${activeOrder.id.substring(0, 8)}: Status '${activeOrder.status}', Total $${(activeOrder.totalCents / 100).toFixed(2)}, Paid $${(activeOrder.paidCents / 100).toFixed(2)}, Balance $${((activeOrder.totalCents - activeOrder.paidCents) / 100).toFixed(2)}, Due: ${activeOrder.dueDate}`
    : undefined;

  // 5. Build system prompt
  const systemPrompt = buildSystemPrompt({
    sellerName: seller.name,
    tone: seller.tone,
    catalogJson: seller.catalog,
    policiesJson: seller.policies,
    offsetDays: seller.demoClockOffsetDays,
    currentQuoteSummary,
    orderStatusSummary,
  });

  // 6. Format message history for LLM
  const historyMessages: LLMMessage[] = [];
  const allMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
  });

  for (const msg of allMessages) {
    try {
      const parsed = JSON.parse(msg.content);
      const text = parsed.text || (typeof parsed === "string" ? parsed : "");
      if (text) {
        historyMessages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: text,
        });
      }
    } catch {
      historyMessages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: msg.content,
      });
    }
  }

  // 7. Run LLM turn (with tool execution loop up to 6 times)
  let loopCount = 0;
  const maxLoops = 6;
  const collectedUiCards: any[] = [];
  let assistantFinalText = "";

  const catalog = JSON.parse(seller.catalog);

  while (loopCount < maxLoops) {
    loopCount++;

    const response = await callLLM({
      systemPrompt,
      messages: historyMessages,
      tools: AGENT_TOOLS,
      temperature: 0.2,
    });

    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const toolCall of response.toolCalls) {
        const { result, uiCard } = await executeToolCall(
          toolCall.name,
          toolCall.input,
          {
            sellerId: seller.id,
            conversationId,
            catalog,
            offsetDays: seller.demoClockOffsetDays,
          }
        );

        if (uiCard) {
          collectedUiCards.push(uiCard);
        }

        // Add tool result to context for subsequent model reasoning
        historyMessages.push({
          role: "assistant",
          content: `Executed tool ${toolCall.name} with input: ${JSON.stringify(toolCall.input)}`,
        });
        historyMessages.push({
          role: "user",
          content: `Tool ${toolCall.name} returned: ${JSON.stringify(result)}`,
        });
      }

      if (response.text) {
        assistantFinalText = response.text;
      }
    } else {
      assistantFinalText = response.text;
      break;
    }
  }

  // Fallback text if empty
  if (!assistantFinalText && collectedUiCards.length > 0) {
    assistantFinalText = "Here are the details from our store policy and catalog:";
  } else if (!assistantFinalText) {
    assistantFinalText = "How can I help you customize your order today?";
  }

  // 8. Persist assistant response to DB
  await prisma.message.create({
    data: {
      conversationId,
      role: "assistant",
      content: JSON.stringify({
        text: assistantFinalText,
        uiCards: collectedUiCards,
      }),
    },
  });

  return {
    text: assistantFinalText,
    uiCards: collectedUiCards,
  };
}
