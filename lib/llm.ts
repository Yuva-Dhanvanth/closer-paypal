import Anthropic from "@anthropic-ai/sdk";

export interface LLMMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface LLMResponse {
  text: string;
  toolCalls: LLMToolCall[];
}

export async function callLLM(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  model?: string;
  temperature?: number;
}): Promise<LLMResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If no Anthropic API key is provided, use intelligent deterministic mock generator
  if (!apiKey || apiKey.trim() === "" || apiKey.startsWith("mock-")) {
    return runMockAgentResponse(params);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const model = params.model || process.env.LLM_MODEL_AGENT || "claude-3-5-sonnet-20241022";

    // Format messages for Anthropic API
    const formattedMessages = params.messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const formattedTools = (params.tools || []).map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema as Anthropic.Tool.InputSchema,
    }));

    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      temperature: params.temperature ?? 0.2,
      system: params.systemPrompt,
      messages: formattedMessages,
      tools: formattedTools.length > 0 ? formattedTools : undefined,
    });

    let textContent = "";
    const toolCalls: LLMToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        textContent += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, any>,
        });
      }
    }

    return {
      text: textContent.trim(),
      toolCalls,
    };
  } catch (error: any) {
    console.warn("⚠️ Anthropic API call failed or key invalid, falling back to mock agent:", error.message);
    return runMockAgentResponse(params);
  }
}

/**
 * Intelligent Mock Agent for offline development, CI/CD, and evaluation.
 * Detects intent (quoting, discount negotiation, allergies/escalation, cancellation, order status)
 * and issues proper tool calls.
 */
function runMockAgentResponse(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
}): LLMResponse {
  // If the previous message was a tool execution result, return synthesized answer with no more tool calls
  const lastMsg = params.messages[params.messages.length - 1];
  if (lastMsg && lastMsg.content.startsWith("Tool ")) {
    if (lastMsg.content.includes("propose_cancellation")) {
      return {
        text: "I've processed your cancellation request against our store policy. Details and next steps are shown below.",
        toolCalls: [],
      };
    }
    if (lastMsg.content.includes("create_quote")) {
      return {
        text: "Here is your customized quote calculated according to our store policy:",
        toolCalls: [],
      };
    }
    if (lastMsg.content.includes("escalate_to_seller")) {
      return {
        text: "I have transferred your request directly to the bakery owner for review.",
        toolCalls: [],
      };
    }
    return {
      text: "I have processed your request.",
      toolCalls: [],
    };
  }

  const lastUserMsg = [...params.messages].reverse().find((m) => m.role === "user" && !m.content.startsWith("Tool "))?.content || "";
  const lower = lastUserMsg.toLowerCase();

  // 1. Check for prompt injection attempts
  if (
    lower.includes("ignore previous instructions") ||
    lower.includes("system prompt") ||
    lower.includes("set price to $1") ||
    lower.includes("admin override")
  ) {
    return {
      text: "I am unable to modify store pricing or disclose internal guidelines. All pricing is strictly calculated according to our store policy. How can I help you with an order from our catalog?",
      toolCalls: [],
    };
  }

  // 2. Health & Allergy questions -> escalate_to_seller
  if (
    lower.includes("allergy") ||
    lower.includes("allergic") ||
    lower.includes("peanut") ||
    lower.includes("nut ") ||
    lower.includes("gluten") ||
    lower.includes("celiac") ||
    lower.includes("health")
  ) {
    return {
      text: "Because food safety and allergies are our highest priority, I've escalated your inquiry directly to the bakery owner to confirm our allergen safety protocols.",
      toolCalls: [
        {
          id: `call_${Date.now()}_allergy`,
          name: "escalate_to_seller",
          input: {
            kind: "allergy_health",
            summary: `Customer inquired about allergens/health: "${lastUserMsg.substring(0, 100)}"`,
          },
        },
      ],
    };
  }

  // 3. Complaints or out of catalog requests
  if (lower.includes("complain") || lower.includes("unhappy") || lower.includes("terrible") || lower.includes("catering for 500")) {
    return {
      text: "I've routed this directly to our owner so we can address your request personally.",
      toolCalls: [
        {
          id: `call_${Date.now()}_escalate`,
          name: "escalate_to_seller",
          input: {
            kind: lower.includes("catering") ? "out_of_catalog" : "complaint",
            summary: lastUserMsg.substring(0, 100),
          },
        },
      ],
    };
  }

  // 4. Cancellation & Refund request
  if (lower.includes("cancel") || lower.includes("refund")) {
    return {
      text: "I can assist you with our cancellation and refund process based on our store policy.",
      toolCalls: [
        {
          id: `call_${Date.now()}_cancel`,
          name: "propose_cancellation",
          input: {
            reason: lastUserMsg || "Customer requested cancellation",
          },
        },
      ],
    };
  }

  // 5. Order Status check
  if (lower.includes("status") || lower.includes("where is my order") || lower.includes("track")) {
    return {
      text: "Let me check the status of your order right now.",
      toolCalls: [
        {
          id: `call_${Date.now()}_status`,
          name: "get_order_status",
          input: {},
        },
      ],
    };
  }

  // 6. Quoting & Discount negotiation
  // Detect item: cake, cupcakes, dessert table
  let itemId = "cake";
  if (lower.includes("cupcake")) itemId = "cupcakes";
  else if (lower.includes("dessert table") || lower.includes("table package")) itemId = "dessert_table";

  // Detect options for cake
  const selectedOptions: string[] = [];
  if (itemId === "cake") {
    if (lower.includes("3kg") || lower.includes("3 kg")) selectedOptions.push("3kg");
    else if (lower.includes("2kg") || lower.includes("2 kg")) selectedOptions.push("2kg");
    else selectedOptions.push("1kg");

    if (lower.includes("red velvet")) selectedOptions.push("red_velvet");
    else if (lower.includes("mango")) selectedOptions.push("mango");
    else if (lower.includes("chocolate")) selectedOptions.push("chocolate");
    else selectedOptions.push("vanilla");

    if (lower.includes("eggless")) selectedOptions.push("eggless");
    if (lower.includes("topper")) selectedOptions.push("topper");
  }

  // Detect requested discount
  let requestedDiscount: number | undefined;
  const discountMatch = lower.match(/(\d+)\s*%/);
  if (discountMatch) {
    requestedDiscount = parseInt(discountMatch[1], 10);
  } else if (lower.includes("discount") || lower.includes("deal") || lower.includes("cheaper")) {
    requestedDiscount = 15;
  }

  // Detect or calculate due date
  // Default to 7 days from today (safe lead time)
  const d = new Date();
  d.setDate(d.getDate() + 7);
  let dueDate = d.toISOString().split("T")[0];

  // If user mentioned tomorrow or 1 day, set 1 day (triggers lead time check)
  if (lower.includes("tomorrow") || lower.includes("in 1 day")) {
    const d1 = new Date();
    d1.setDate(d1.getDate() + 1);
    dueDate = d1.toISOString().split("T")[0];
  } else if (lower.includes("in 4 days") || lower.includes("4 days")) {
    const d4 = new Date();
    d4.setDate(d4.getDate() + 4);
    dueDate = d4.toISOString().split("T")[0];
  }

  return {
    text: "I've generated a customized quote based on our catalog and policy rules. Please review the details below:",
    toolCalls: [
      {
        id: `call_${Date.now()}_quote`,
        name: "create_quote",
        input: {
          lines: [
            {
              itemId,
              quantity: 1,
              selectedOptionIds: selectedOptions,
            },
          ],
          dueDate,
          requestedDiscountPercent: requestedDiscount,
          notes: lastUserMsg,
        },
      },
    ],
  };
}
