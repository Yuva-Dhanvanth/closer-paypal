import { getDaysDifference, getSimulatedNow } from "./clock";

/**
 * Deterministic Refund Engine
 *
 * Rules:
 * - 7 or more days before due: 100% refund
 * - 3 to 7 days before due: 50% refund
 * - Under 3 days: 0% refund and escalate to seller
 */

export interface RefundProposal {
  paidAmountCents: number;
  refundPercent: number;
  refundAmountCents: number;
  daysUntilDue: number;
  tier: "100%" | "50%" | "0%";
  policyRule: string;
  requiresEscalation: boolean;
  notes: string;
}

export function evaluateRefund(
  paidAmountCents: number,
  dueDate: string | Date,
  offsetDays: number = 0
): RefundProposal {
  const now = getSimulatedNow(offsetDays);
  const daysUntilDue = getDaysDifference(dueDate, now);

  if (paidAmountCents <= 0) {
    return {
      paidAmountCents: 0,
      refundPercent: 0,
      refundAmountCents: 0,
      daysUntilDue,
      tier: "0%",
      policyRule: "No payment on file to refund.",
      requiresEscalation: false,
      notes: "Total paid is 0.",
    };
  }

  if (daysUntilDue >= 7) {
    return {
      paidAmountCents,
      refundPercent: 100,
      refundAmountCents: paidAmountCents,
      daysUntilDue,
      tier: "100%",
      policyRule: "Full 100% refund for cancellations requested 7 or more days before due date.",
      requiresEscalation: false,
      notes: `Cancellation is ${daysUntilDue} days ahead of due date. Eligible for full refund.`,
    };
  }

  if (daysUntilDue >= 3) {
    const refundAmountCents = Math.round((paidAmountCents * 50) / 100);
    return {
      paidAmountCents,
      refundPercent: 50,
      refundAmountCents,
      daysUntilDue,
      tier: "50%",
      policyRule: "50% refund for cancellations requested between 3 and 7 days before due date.",
      requiresEscalation: false,
      notes: `Cancellation is ${daysUntilDue} days ahead of due date. Eligible for 50% refund.`,
    };
  }

  // Under 3 days
  return {
    paidAmountCents,
    refundPercent: 0,
    refundAmountCents: 0,
    daysUntilDue,
    tier: "0%",
    policyRule: "0% automated refund for cancellations within 3 days of due date. Requires seller escalation.",
    requiresEscalation: true,
    notes: `Due date is in ${daysUntilDue} day(s). Ingredients and scheduling already allocated. Seller exception approval required.`,
  };
}
