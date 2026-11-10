import { z } from "zod";
import { prisma } from "../db";
import { priceQuote, SellerCatalog } from "../engine/pricing";
import { evaluateRefund } from "../engine/refund";
import { LLMToolDefinition } from "../llm";

// 1. Tool Input Schemas
export const CreateQuoteInputSchema = z.object({
  lines: z.array(
    z.object({
      itemId: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      selectedOptionIds: z.array(z.string()).optional(),
    })
  ),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  requestedDiscountPercent: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
});

export const ProposeCancellationInputSchema = z.object({
  reason: z.string().min(1),
});

export const EscalateToSellerInputSchema = z.object({
  kind: z.enum([
    "allergy_health",
    "out_of_catalog",
    "complaint",
    "refund_exception",
    "double_reject",
  ]),
  summary: z.string().min(3),
});

export const GetOrderStatusInputSchema = z.object({});

// Anthropic JSON Tool Definitions
export const AGENT_TOOLS: LLMToolDefinition[] = [
  {
    name: "create_quote",
    description:
      "Calculates a deterministic price quote with verified discounts, rush fees, and deposit requirements. Never quote prices manually without calling this tool.",
    input_schema: {
      type: "object",
      properties: {
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: {
              itemId: { type: "string", description: "Catalog item ID (e.g. 'cake', 'cupcakes', 'dessert_table')" },
              quantity: { type: "number", description: "Number of units" },
              selectedOptionIds: {
                type: "array",
                items: { type: "string" },
                description: "Selected options such as size ('1kg', '2kg', '3kg'), flavor ('vanilla', 'red_velvet'), 'eggless', 'topper'",
              },
            },
            required: ["itemId", "quantity"],
          },
        },
        dueDate: {
          type: "string",
          description: "Required delivery/pickup date in YYYY-MM-DD format",
        },
        requestedDiscountPercent: {
          type: "number",
          description: "Optional customer requested discount percentage (0 to 100)",
        },
        notes: {
          type: "string",
          description: "Optional customer requirements or custom message topper text",
        },
      },
      required: ["lines", "dueDate"],
    },
  },
  {
    name: "get_order_status",
    description: "Retrieves current order details, payment status, balance due, and delivery date for this customer.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "propose_cancellation",
    description:
      "Evaluates a customer cancellation and calculates allowable refund percentage based strictly on days remaining before delivery.",
    input_schema: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Reason provided by customer for requesting cancellation",
        },
      },
      required: ["reason"],
    },
  },
  {
    name: "escalate_to_seller",
    description:
      "Transfers the conversation to the human seller for exceptions, dietary/allergy safety checks, out-of-catalog items, or complaints.",
    input_schema: {
      type: "object",
      properties: {
        kind: {
          type: "string",
          enum: ["allergy_health", "out_of_catalog", "complaint", "refund_exception", "double_reject"],
          description: "The category of escalation",
        },
        summary: {
          type: "string",
          description: "Concise summary of customer's request and why escalation is required",
        },
      },
      required: ["kind", "summary"],
    },
  },
];

export interface ToolExecutionContext {
  sellerId: string;
  conversationId: string;
  catalog: SellerCatalog;
  offsetDays?: number;
}

export async function executeToolCall(
  toolName: string,
  rawInput: Record<string, any>,
  ctx: ToolExecutionContext
): Promise<{ result: any; uiCard?: any }> {
  const { sellerId, conversationId, catalog, offsetDays = 0 } = ctx;

  switch (toolName) {
    case "create_quote": {
      const parsed = CreateQuoteInputSchema.parse(rawInput);
      const pricing = priceQuote({
        catalog,
        lines: parsed.lines,
        dueDate: parsed.dueDate,
        requestedDiscountPercent: parsed.requestedDiscountPercent,
        notes: parsed.notes,
        offsetDays,
      });

      if (!pricing.success) {
        // Log rejected tool call
        await prisma.agentEvent.create({
          data: {
            sellerId,
            conversationId,
            type: "guardrail",
            summary: `Quote rejected: ${pricing.error}`,
            payload: JSON.stringify({ code: pricing.code, input: parsed }),
          },
        });
        return { result: pricing };
      }

      // If discount was requested, log guardrail audit event
      if (parsed.requestedDiscountPercent && parsed.requestedDiscountPercent > 0) {
        await prisma.agentEvent.create({
          data: {
            sellerId,
            conversationId,
            type: "guardrail",
            summary: pricing.discount.isCapped
              ? `Guardrail: Discount requested ${parsed.requestedDiscountPercent}% capped at ${pricing.discount.grantedPercent}% by policy`
              : `Guardrail: Discount ${pricing.discount.grantedPercent}% granted within policy limits`,
            payload: JSON.stringify(pricing.discount),
          },
        });
      }

      // Persist quote to database
      const quote = await prisma.quote.create({
        data: {
          sellerId,
          conversationId,
          lines: JSON.stringify(pricing.lines),
          subtotalCents: pricing.subtotalCents,
          discountPercent: pricing.discount.grantedPercent,
          discountCents: pricing.discount.discountAmount,
          rushFeeCents: pricing.rushFeeCents,
          totalCents: pricing.totalCents,
          depositCents: pricing.depositCents,
          balanceCents: pricing.balanceCents,
          dueDate: pricing.dueDate,
          notes: pricing.notes,
          status: "draft",
        },
      });

      // Log tool call event
      await prisma.agentEvent.create({
        data: {
          sellerId,
          conversationId,
          type: "tool_call",
          summary: `Created quote #${quote.id.substring(0, 8)}: Total $${(pricing.totalCents / 100).toFixed(2)}, Deposit $${(pricing.depositCents / 100).toFixed(2)}`,
          payload: JSON.stringify({ quoteId: quote.id, pricing }),
        },
      });

      return {
        result: {
          quoteId: quote.id,
          ...pricing,
        },
        uiCard: {
          type: "quote",
          quoteId: quote.id,
          pricing,
        },
      };
    }

    case "get_order_status": {
      GetOrderStatusInputSchema.parse(rawInput);
      const order = await prisma.order.findFirst({
        where: { conversationId, sellerId },
        orderBy: { createdAt: "desc" },
        include: { payments: true },
      });

      if (!order) {
        return {
          result: {
            found: false,
            message: "No active order on file for this conversation.",
          },
        };
      }

      return {
        result: {
          found: true,
          orderId: order.id,
          status: order.status,
          dueDate: order.dueDate,
          totalCents: order.totalCents,
          paidCents: order.paidCents,
          balanceCents: order.totalCents - order.paidCents,
        },
      };
    }

    case "propose_cancellation": {
      const parsed = ProposeCancellationInputSchema.parse(rawInput);
      const order = await prisma.order.findFirst({
        where: { conversationId, sellerId },
        orderBy: { createdAt: "desc" },
      });

      if (!order) {
        return {
          result: {
            error: "Cannot process cancellation: no active order exists for this conversation.",
          },
        };
      }

      const proposal = evaluateRefund(order.paidCents, order.dueDate, offsetDays);

      if (proposal.requiresEscalation) {
        // Automatically create escalation when under 3 days
        const escalation = await prisma.escalation.create({
          data: {
            sellerId,
            conversationId,
            orderId: order.id,
            kind: "refund_exception",
            summary: `Late cancellation (${proposal.daysUntilDue} days to due date). Reason: ${parsed.reason}`,
            status: "open",
          },
        });

        await prisma.agentEvent.create({
          data: {
            sellerId,
            conversationId,
            orderId: order.id,
            type: "escalation",
            summary: `Late cancellation escalated to owner: order #${order.id.substring(0, 8)}`,
            payload: JSON.stringify({ escalationId: escalation.id, proposal }),
          },
        });

        return {
          result: {
            orderId: order.id,
            proposal,
            escalated: true,
            escalationId: escalation.id,
            message: "Cancellation request received within 3 days of delivery. Standard refund is 0%, but your request has been escalated to the bakery owner for review.",
          },
          uiCard: {
            type: "cancellation_escalated",
            orderId: order.id,
            proposal,
          },
        };
      }

      return {
        result: {
          orderId: order.id,
          proposal,
          escalated: false,
        },
        uiCard: {
          type: "refund_proposal",
          orderId: order.id,
          proposal,
        },
      };
    }

    case "escalate_to_seller": {
      const parsed = EscalateToSellerInputSchema.parse(rawInput);
      const order = await prisma.order.findFirst({
        where: { conversationId, sellerId },
        orderBy: { createdAt: "desc" },
      });

      const escalation = await prisma.escalation.create({
        data: {
          sellerId,
          conversationId,
          orderId: order?.id,
          kind: parsed.kind,
          summary: parsed.summary,
          status: "open",
        },
      });

      await prisma.agentEvent.create({
        data: {
          sellerId,
          conversationId,
          orderId: order?.id,
          type: "escalation",
          summary: `Escalated to seller (${parsed.kind}): ${parsed.summary}`,
          payload: JSON.stringify({ escalationId: escalation.id, input: parsed }),
        },
      });

      return {
        result: {
          escalationId: escalation.id,
          status: "open",
          message: "Transferred inquiry to the seller. The seller will reply shortly.",
        },
        uiCard: {
          type: "escalation_notice",
          escalationId: escalation.id,
          kind: parsed.kind,
          summary: parsed.summary,
        },
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
