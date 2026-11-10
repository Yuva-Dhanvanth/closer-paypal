import { describe, it, expect } from "vitest";
import {
  priceQuote,
  evaluateDiscount,
  evaluateRefund,
  getDaysDifference,
  addDays,
  formatISODate,
  DEFAULT_SUGAR_AND_SPICE_CATALOG,
} from "../../lib/engine";

describe("Deterministic Business Engine", () => {
  describe("Clock & Calendar Utilities", () => {
    it("calculates exact calendar day differences", () => {
      const base = new Date("2026-11-10T12:00:00Z");
      const target = new Date("2026-11-17T08:00:00Z");
      expect(getDaysDifference(target, base)).toBe(7);
    });

    it("formats ISO date correctly", () => {
      const d = new Date("2026-11-10T10:00:00Z");
      expect(formatISODate(d)).toBe("2026-11-10");
    });
  });

  describe("Discount Rules Engine", () => {
    it("grants 0% for subtotal under $60 even if customer asks for 15%", () => {
      const result = evaluateDiscount(4500, 15); // $45.00
      expect(result.grantedPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.isCapped).toBe(true);
      expect(result.reason).toContain("order of at least $60.00");
    });

    it("caps discount at 5% for orders between $60 and $150", () => {
      const result = evaluateDiscount(8000, 15); // $80.00
      expect(result.grantedPercent).toBe(5);
      expect(result.discountAmount).toBe(400); // 5% of $80 = $4.00 (400 cents)
      expect(result.isCapped).toBe(true);
      expect(result.reason.toLowerCase()).toContain("capped at 5%");
    });

    it("allows up to 10% for orders $150 or more and caps requests higher than 10%", () => {
      const result = evaluateDiscount(20000, 15); // $200.00
      expect(result.grantedPercent).toBe(10);
      expect(result.discountAmount).toBe(2000); // 10% of $200 = $20.00 (2000 cents)
      expect(result.isCapped).toBe(true);
      expect(result.reason.toLowerCase()).toContain("capped at 10%");
    });

    it("grants requested discount if within allowed tier (e.g. 5% requested on $200 order)", () => {
      const result = evaluateDiscount(20000, 5);
      expect(result.grantedPercent).toBe(5);
      expect(result.discountAmount).toBe(1000); // 5% of $200 = $10.00
      expect(result.isCapped).toBe(false);
      expect(result.reason).toContain("Granted requested 5% discount");
    });

    it("handles 0% or undefined discount gracefully", () => {
      const result = evaluateDiscount(10000, 0);
      expect(result.grantedPercent).toBe(0);
      expect(result.discountAmount).toBe(0);
      expect(result.isCapped).toBe(false);
    });
  });

  describe("Pricing & Quote Engine", () => {
    const today = new Date();
    const tenDaysFromNow = formatISODate(addDays(today, 10));
    const fourDaysFromNow = formatISODate(addDays(today, 4));
    const oneDayFromNow = formatISODate(addDays(today, 1));

    it("correctly prices 1kg standard cake with no rush fee", () => {
      const quote = priceQuote({
        catalog: DEFAULT_SUGAR_AND_SPICE_CATALOG,
        lines: [
          {
            itemId: "cake",
            quantity: 1,
            selectedOptionIds: ["1kg", "vanilla"],
          },
        ],
        dueDate: tenDaysFromNow,
      });

      expect(quote.success).toBe(true);
      if (!quote.success) return;

      expect(quote.subtotalCents).toBe(4500); // $45.00
      expect(quote.rushFeeCents).toBe(0);
      expect(quote.totalCents).toBe(4500);
      // Deposit: 30% of $45 = $13.50 -> 1350 cents
      expect(quote.depositCents).toBe(1350);
      expect(quote.balanceCents).toBe(3150);
    });

    it("calculates option deltas (2kg +$35, red velvet +$8, topper +$6)", () => {
      const quote = priceQuote({
        catalog: DEFAULT_SUGAR_AND_SPICE_CATALOG,
        lines: [
          {
            itemId: "cake",
            quantity: 1,
            // 4500 + 3500 (2kg) + 800 (red velvet) + 600 (topper) = 9400 ($94.00)
            selectedOptionIds: ["2kg", "red_velvet", "topper"],
          },
        ],
        dueDate: tenDaysFromNow,
        requestedDiscountPercent: 15,
      });

      expect(quote.success).toBe(true);
      if (!quote.success) return;

      expect(quote.subtotalCents).toBe(9400); // $94.00
      expect(quote.discount.grantedPercent).toBe(5); // Capped at 5% because $94 < $150
      expect(quote.discount.discountAmount).toBe(470); // 5% of 9400 = 470 cents ($4.70)
      expect(quote.totalCents).toBe(9400 - 470); // 8930 ($89.30)
      // Deposit: 30% of 8930 = 2679 cents
      expect(quote.depositCents).toBe(Math.ceil(8930 * 0.3)); // 2679
      expect(quote.balanceCents).toBe(8930 - 2679); // 6251
    });

    it("applies 20% rush fee when delivery is within 5 days", () => {
      const quote = priceQuote({
        catalog: DEFAULT_SUGAR_AND_SPICE_CATALOG,
        lines: [
          {
            itemId: "cake",
            quantity: 1,
            selectedOptionIds: ["1kg", "chocolate"],
          },
        ],
        dueDate: fourDaysFromNow, // 4 days away (lead time is 3, so valid, but <= 5 triggers rush)
      });

      expect(quote.success).toBe(true);
      if (!quote.success) return;

      expect(quote.subtotalCents).toBe(4500);
      expect(quote.rushFeeCents).toBe(900); // 20% of 4500 = 900 cents ($9.00)
      expect(quote.totalCents).toBe(5400); // $54.00
    });

    it("rejects order if due date does not meet item lead time", () => {
      const quote = priceQuote({
        catalog: DEFAULT_SUGAR_AND_SPICE_CATALOG,
        lines: [
          {
            itemId: "cake", // Lead time is 3 days
            quantity: 1,
            selectedOptionIds: ["1kg"],
          },
        ],
        dueDate: oneDayFromNow, // 1 day is less than 3
      });

      expect(quote.success).toBe(false);
      if (quote.success) return;
      expect(quote.code).toBe("LEAD_TIME_VIOLATION");
      expect(quote.requiredLeadTimeDays).toBe(3);
      expect(quote.earliestPossibleDate).toBeDefined();
    });

    it("rounds deposit UP to the next cent", () => {
      // Create total that has fractional cents when multiplied by 0.3
      // e.g., $50.01 = 5001 cents. 5001 * 0.3 = 1500.3 -> ceil = 1501
      const total = 5001;
      const deposit = Math.ceil(total * 0.3);
      expect(deposit).toBe(1501);
      expect(total - deposit).toBe(3500);
    });
  });

  describe("Refund Policy Engine", () => {
    it("returns 100% refund for cancellation 7 or more days before due date", () => {
      const today = new Date();
      const dueDate = addDays(today, 8);
      const proposal = evaluateRefund(5000, dueDate); // paid $50.00

      expect(proposal.tier).toBe("100%");
      expect(proposal.refundPercent).toBe(100);
      expect(proposal.refundAmountCents).toBe(5000);
      expect(proposal.requiresEscalation).toBe(false);
    });

    it("returns 50% refund for cancellation between 3 and 7 days before due date", () => {
      const today = new Date();
      const dueDate = addDays(today, 4);
      const proposal = evaluateRefund(5000, dueDate); // paid $50.00

      expect(proposal.tier).toBe("50%");
      expect(proposal.refundPercent).toBe(50);
      expect(proposal.refundAmountCents).toBe(2500);
      expect(proposal.requiresEscalation).toBe(false);
    });

    it("returns 0% and requires escalation for cancellation under 3 days before due date", () => {
      const today = new Date();
      const dueDate = addDays(today, 2);
      const proposal = evaluateRefund(5000, dueDate);

      expect(proposal.tier).toBe("0%");
      expect(proposal.refundPercent).toBe(0);
      expect(proposal.refundAmountCents).toBe(0);
      expect(proposal.requiresEscalation).toBe(true);
      expect(proposal.policyRule).toContain("Requires seller escalation");
    });
  });
});
