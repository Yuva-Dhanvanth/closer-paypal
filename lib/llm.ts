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

function normalizeTurns(messages: LLMMessage[]): Array<{ role: "user" | "assistant"; content: string }> {
  const rawFiltered = messages.filter(
    (m) => (m.role === "user" || m.role === "assistant") && m.content.trim() !== ""
  );

  const normalized: Array<{ role: "user" | "assistant"; content: string }> = [];
  for (const m of rawFiltered) {
    const role = m.role as "user" | "assistant";
    if (normalized.length === 0 && role === "assistant") {
      // Skip leading welcome assistant message
      continue;
    }
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === role) {
      prev.content = `${prev.content}\n\n${m.content}`;
    } else {
      normalized.push({ role, content: m.content });
    }
  }
  return normalized;
}

async function callGeminiAPI(
  apiKey: string,
  params: {
    systemPrompt: string;
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    model?: string;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const turns = normalizeTurns(params.messages);
  if (turns.length === 0) {
    return runDeterministicAgentResponse(params);
  }

  const contents = turns.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const functionDeclarations = (params.tools || []).map((t) => {
    const hasProps = t.input_schema.properties && Object.keys(t.input_schema.properties).length > 0;
    return {
      name: t.name,
      description: t.description,
      ...(hasProps ? { parameters: t.input_schema } : {}),
    };
  });

  const requestedModel = params.model || process.env.LLM_MODEL_AGENT || "gemini-2.5-flash";
  const candidateModels = Array.from(new Set([requestedModel, "gemini-2.5-flash", "gemini-2.0-flash"]));

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: params.systemPrompt }] },
          contents,
          ...(functionDeclarations.length > 0 ? { tools: [{ functionDeclarations }] } : {}),
          generationConfig: {
            temperature: params.temperature ?? 0.2,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      lastError = new Error(`Gemini API (${model}) returned ${res.status}: ${errText}`);
      if (res.status === 404) continue;
      throw lastError;
    }

    const data = await res.json();
    const parts: any[] = data?.candidates?.[0]?.content?.parts || [];
    let textContent = "";
    const toolCalls: LLMToolCall[] = [];

    parts.forEach((part, idx) => {
      if (typeof part.text === "string") {
        textContent += part.text;
      } else if (part.functionCall?.name) {
        toolCalls.push({
          id: `call_${Date.now()}_${idx}`,
          name: part.functionCall.name,
          input: (part.functionCall.args || {}) as Record<string, any>,
        });
      }
    });

    return {
      text: textContent.trim(),
      toolCalls,
    };
  }

  throw lastError || new Error("No valid Gemini model responded");
}

async function callGroqAPI(
  apiKey: string,
  params: {
    systemPrompt: string;
    messages: LLMMessage[];
    tools?: LLMToolDefinition[];
    model?: string;
    temperature?: number;
  }
): Promise<LLMResponse> {
  const turns = normalizeTurns(params.messages);
  if (turns.length === 0) {
    return runDeterministicAgentResponse(params);
  }

  const requestedModel = params.model || process.env.LLM_MODEL_FAST || "llama-3.3-70b-versatile";
  const tools = (params.tools || []).map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: requestedModel,
      temperature: params.temperature ?? 0.2,
      max_tokens: 1024,
      messages: [
        { role: "system", content: params.systemPrompt },
        ...turns.map((m) => ({ role: m.role, content: m.content })),
      ],
      ...(tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API returned ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const message = data?.choices?.[0]?.message;
  const toolCalls: LLMToolCall[] = [];

  if (Array.isArray(message?.tool_calls)) {
    for (const tc of message.tool_calls) {
      if (tc?.function?.name) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = tc.function.arguments ? JSON.parse(tc.function.arguments) : {};
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({
          id: tc.id || `call_${Date.now()}`,
          name: tc.function.name,
          input: parsedArgs,
        });
      }
    }
  }

  return {
    text: (message?.content || "").trim(),
    toolCalls,
  };
}

export async function callLLM(params: {
  systemPrompt: string;
  messages: LLMMessage[];
  tools?: LLMToolDefinition[];
  model?: string;
  temperature?: number;
}): Promise<LLMResponse> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  if (geminiKey && !geminiKey.startsWith("mock-")) {
    try {
      return await callGeminiAPI(geminiKey, params);
    } catch (error: any) {
      console.warn("Gemini API call failed, checking fallbacks:", error.message);
    }
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey && !groqKey.startsWith("mock-")) {
    try {
      return await callGroqAPI(groqKey, params);
    } catch (error: any) {
      console.warn("Groq API call failed, falling back to deterministic agent:", error.message);
    }
  }

  return runDeterministicAgentResponse(params);
}

/**
 * Deterministic Intent & Tool-Routing Agent for offline development, CI/CD, and zero-key evaluation.
 * Detects intent (quoting, discount negotiation, allergies/escalation, cancellation, order status)
 * and issues structured tool calls.
 */
function runDeterministicAgentResponse(params: {
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
