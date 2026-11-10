/**
 * Deterministic Discount Engine
 *
 * Rules:
 * - Subtotal >= $150.00 (15000 cents): allows up to 10%
 * - Subtotal >= $60.00 (6000 cents): allows up to 5%
 * - Subtotal < $60.00: 0% discount allowed
 * - Never exceeds the maximum allowable tier
 */

export interface DiscountResult {
  requestedPercent: number;
  grantedPercent: number;
  maxAllowedPercent: number;
  discountAmount: number; // in cents
  reason: string;
  isCapped: boolean;
}

export function evaluateDiscount(
  subtotalCents: number,
  requestedPercent?: number | null
): DiscountResult {
  const requested = Math.max(0, Math.min(100, requestedPercent ?? 0));

  let maxAllowed = 0;
  if (subtotalCents >= 15000) {
    maxAllowed = 10;
  } else if (subtotalCents >= 6000) {
    maxAllowed = 5;
  } else {
    maxAllowed = 0;
  }

  if (requested === 0) {
    return {
      requestedPercent: 0,
      grantedPercent: 0,
      maxAllowedPercent: maxAllowed,
      discountAmount: 0,
      reason: "No discount requested.",
      isCapped: false,
    };
  }

  const isCapped = requested > maxAllowed;
  const granted = Math.min(requested, maxAllowed);
  const discountAmount = Math.round((subtotalCents * granted) / 100);

  let reason = "";
  if (isCapped) {
    if (maxAllowed === 0) {
      reason = `Requested ${requested}%, but policy requires an order of at least $60.00 for a 5% discount, or $150.00 for a 10% discount. No discount applied.`;
    } else if (maxAllowed === 5) {
      reason = `Requested ${requested}%, but policy caps orders under $150.00 at 5% discount (orders over $150.00 unlock 10%). Capped at 5%.`;
    } else {
      reason = `Requested ${requested}%, but our maximum allowable store policy discount is capped at 10%. Capped at 10%.`;
    }
  } else {
    reason = `Granted requested ${granted}% discount.`;
  }

  return {
    requestedPercent: requested,
    grantedPercent: granted,
    maxAllowedPercent: maxAllowed,
    discountAmount,
    reason,
    isCapped,
  };
}
