import { addDays, formatISODate, getDaysDifference, getSimulatedNow } from "./clock";
import { evaluateDiscount, DiscountResult } from "./discount";

export interface CatalogOption {
  id: string;
  name: string;
  deltaCents: number;
}

export interface CatalogOptionGroup {
  id: string;
  name: string;
  required?: boolean;
  options: CatalogOption[];
}

export interface CatalogItem {
  id: string;
  name: string;
  description?: string;
  basePriceCents: number;
  leadTimeDays: number;
  optionGroups?: CatalogOptionGroup[];
}

export interface SellerCatalog {
  items: CatalogItem[];
}

export interface QuoteLineInput {
  itemId: string;
  quantity: number;
  selectedOptionIds?: string[]; // e.g. ["2kg", "red_velvet", "eggless"]
}

export interface PricedQuoteLine {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  selectedOptions: {
    id: string;
    name: string;
    deltaCents: number;
  }[];
}

export interface PriceQuoteInput {
  catalog: SellerCatalog;
  lines: QuoteLineInput[];
  dueDate: string; // YYYY-MM-DD
  requestedDiscountPercent?: number | null;
  notes?: string;
  offsetDays?: number;
}

export interface PriceQuoteSuccess {
  success: true;
  lines: PricedQuoteLine[];
  subtotalCents: number;
  discount: DiscountResult;
  rushFeeCents: number;
  rushFeeReason?: string;
  totalCents: number;
  depositCents: number;
  balanceCents: number;
  dueDate: string;
  daysUntilDue: number;
  notes?: string;
}

export interface PriceQuoteError {
  success: false;
  code: "MINIMUM_ORDER_NOT_MET" | "LEAD_TIME_VIOLATION" | "INVALID_ITEM" | "INVALID_DATE";
  error: string;
  earliestPossibleDate?: string;
  requiredLeadTimeDays?: number;
  minimumRequiredCents?: number;
}

export type PriceQuoteResult = PriceQuoteSuccess | PriceQuoteError;

export const DEFAULT_SUGAR_AND_SPICE_CATALOG: SellerCatalog = {
  items: [
    {
      id: "cake",
      name: "Custom Celebration Cake",
      description: "Artisan celebration cake handcrafted with premium ingredients.",
      basePriceCents: 4500, // 1 kg base: $45.00
      leadTimeDays: 3,
      optionGroups: [
        {
          id: "size",
          name: "Size",
          required: true,
          options: [
            { id: "1kg", name: "1 kg (Serves 6-8)", deltaCents: 0 },
            { id: "2kg", name: "2 kg (Serves 12-16)", deltaCents: 3500 },
            { id: "3kg", name: "3 kg (Serves 20-25)", deltaCents: 6500 },
          ],
        },
        {
          id: "flavor",
          name: "Flavor",
          required: true,
          options: [
            { id: "vanilla", name: "Classic Madagascar Vanilla", deltaCents: 0 },
            { id: "chocolate", name: "Belgian Dark Chocolate", deltaCents: 0 },
            { id: "red_velvet", name: "Velveteen Red Velvet", deltaCents: 800 },
            { id: "mango", name: "Alphonso Mango Passion", deltaCents: 1000 },
          ],
        },
        {
          id: "dietary",
          name: "Dietary",
          options: [
            { id: "eggless", name: "Eggless Preparation", deltaCents: 500 },
          ],
        },
        {
          id: "topper",
          name: "Custom Topper",
          options: [
            { id: "topper", name: "Personalized Message Topper", deltaCents: 600 },
          ],
        },
      ],
    },
    {
      id: "cupcakes",
      name: "Cupcake Box (12)",
      description: "Dozen assorted gourmet cupcakes with signature frosting.",
      basePriceCents: 2800,
      leadTimeDays: 2,
    },
    {
      id: "dessert_table",
      name: "Dessert Table Package",
      description: "Full dessert spread with display styling for parties & weddings.",
      basePriceCents: 22000,
      leadTimeDays: 7,
    },
  ],
};

const MINIMUM_ORDER_CENTS = 2500; // $25.00

export function priceQuote(input: PriceQuoteInput): PriceQuoteResult {
  const { catalog, lines, dueDate, requestedDiscountPercent, notes, offsetDays = 0 } = input;
  const now = getSimulatedNow(offsetDays);

  if (!dueDate || isNaN(new Date(dueDate).getTime())) {
    return {
      success: false,
      code: "INVALID_DATE",
      error: "Due date must be a valid date in YYYY-MM-DD format.",
    };
  }

  const daysUntilDue = getDaysDifference(dueDate, now);
  if (daysUntilDue < 0) {
    return {
      success: false,
      code: "INVALID_DATE",
      error: `Due date ${dueDate} is in the past relative to simulated today (${formatISODate(now)}).`,
      earliestPossibleDate: formatISODate(addDays(now, 2)),
    };
  }

  if (!lines || lines.length === 0) {
    return {
      success: false,
      code: "MINIMUM_ORDER_NOT_MET",
      error: "At least one item must be added to the quote.",
      minimumRequiredCents: MINIMUM_ORDER_CENTS,
    };
  }

  let subtotalCents = 0;
  let maxLeadTimeDays = 0;
  const pricedLines: PricedQuoteLine[] = [];

  for (const line of lines) {
    const item = catalog.items.find((i) => i.id === line.itemId);
    if (!item) {
      return {
        success: false,
        code: "INVALID_ITEM",
        error: `Item with ID '${line.itemId}' not found in catalog.`,
      };
    }

    if (item.leadTimeDays > maxLeadTimeDays) {
      maxLeadTimeDays = item.leadTimeDays;
    }

    let unitPrice = item.basePriceCents;
    const selectedOptions: PricedQuoteLine["selectedOptions"] = [];

    if (line.selectedOptionIds && line.selectedOptionIds.length > 0 && item.optionGroups) {
      for (const optId of line.selectedOptionIds) {
        let found = false;
        for (const group of item.optionGroups) {
          const opt = group.options.find((o) => o.id === optId);
          if (opt) {
            unitPrice += opt.deltaCents;
            selectedOptions.push({
              id: opt.id,
              name: opt.name,
              deltaCents: opt.deltaCents,
            });
            found = true;
            break;
          }
        }
      }
    }

    const qty = Math.max(1, line.quantity || 1);
    const lineTotal = unitPrice * qty;
    subtotalCents += lineTotal;

    pricedLines.push({
      itemId: item.id,
      itemName: item.name,
      quantity: qty,
      unitPriceCents: unitPrice,
      totalCents: lineTotal,
      selectedOptions,
    });
  }

  // Lead time validation
  if (daysUntilDue < maxLeadTimeDays) {
    const earliestDate = formatISODate(addDays(now, maxLeadTimeDays));
    return {
      success: false,
      code: "LEAD_TIME_VIOLATION",
      error: `Due date ${dueDate} does not meet the minimum required lead time of ${maxLeadTimeDays} days for the selected items.`,
      requiredLeadTimeDays: maxLeadTimeDays,
      earliestPossibleDate: earliestDate,
    };
  }

  // Minimum order validation
  if (subtotalCents < MINIMUM_ORDER_CENTS) {
    return {
      success: false,
      code: "MINIMUM_ORDER_NOT_MET",
      error: `Subtotal of $${(subtotalCents / 100).toFixed(2)} is below the minimum order requirement of $${(MINIMUM_ORDER_CENTS / 100).toFixed(2)}.`,
      minimumRequiredCents: MINIMUM_ORDER_CENTS,
    };
  }

  // Rush fee: 20% of subtotal if due date is within 5 days
  let rushFeeCents = 0;
  let rushFeeReason: string | undefined;
  if (daysUntilDue <= 5) {
    rushFeeCents = Math.round(subtotalCents * 0.2);
    rushFeeReason = `20% rush fee applied ($${(rushFeeCents / 100).toFixed(2)}) as delivery is within 5 days (${daysUntilDue} days away).`;
  }

  // Discount evaluation
  const discount = evaluateDiscount(subtotalCents, requestedDiscountPercent);

  // Total
  const totalCents = subtotalCents - discount.discountAmount + rushFeeCents;

  // Deposit: 30% rounded up to next cent
  const depositCents = Math.ceil(totalCents * 0.3);
  const balanceCents = totalCents - depositCents;

  return {
    success: true,
    lines: pricedLines,
    subtotalCents,
    discount,
    rushFeeCents,
    rushFeeReason,
    totalCents,
    depositCents,
    balanceCents,
    dueDate,
    daysUntilDue,
    notes,
  };
}
