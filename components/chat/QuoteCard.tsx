"use client";

import React, { useState } from "react";
import { Calendar, ShieldAlert, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import { AcceptModal } from "./AcceptModal";

interface QuoteCardProps {
  card: {
    quoteId: string;
    pricing: {
      lines: Array<{
        itemId: string;
        itemName: string;
        quantity: number;
        unitPriceCents: number;
        totalCents: number;
        selectedOptions?: Array<{ id: string; name: string; deltaCents: number }>;
      }>;
      subtotalCents: number;
      discount?: {
        grantedPercent: number;
        discountAmount: number;
        reason: string;
        isCapped: boolean;
        requestedPercent?: number;
      };
      rushFeeCents?: number;
      rushFeeReason?: string;
      totalCents: number;
      depositCents: number;
      balanceCents: number;
      dueDate: string;
      notes?: string;
    };
  };
}

export function QuoteCard({ card }: QuoteCardProps) {
  const [showModal, setShowModal] = useState(false);
  const { quoteId, pricing } = card;

  const handleAccepted = (redirectUrl: string) => {
    window.location.href = redirectUrl;
  };

  return (
    <div className="my-3 bg-white rounded-2xl border border-amber-200/80 shadow-md overflow-hidden max-w-lg w-full transition-all hover:shadow-lg">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <span className="p-1.5 bg-amber-500 text-white rounded-lg shadow-sm">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Official Price Quote</h4>
            <p className="text-xs text-amber-800 font-mono">#{quoteId.substring(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs font-medium text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full">
          <Calendar className="w-3.5 h-3.5" />
          <span>Due: {pricing.dueDate}</span>
        </div>
      </div>

      {/* Itemized Lines */}
      <div className="p-4 space-y-3">
        <div className="divide-y divide-gray-100">
          {pricing.lines.map((line, idx) => (
            <div key={idx} className="py-2 flex justify-between items-start text-sm">
              <div className="space-y-0.5 pr-2">
                <span className="font-semibold text-gray-800">
                  {line.quantity}x {line.itemName}
                </span>
                {line.selectedOptions && line.selectedOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {line.selectedOptions.map((opt) => (
                      <span
                        key={opt.id}
                        className="inline-block text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium"
                      >
                        {opt.name} {opt.deltaCents > 0 && `(+$${(opt.deltaCents / 100).toFixed(2)})`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <span className="font-medium text-gray-900 whitespace-nowrap">
                ${(line.totalCents / 100).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Breakdown */}
        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-medium text-gray-800">${(pricing.subtotalCents / 100).toFixed(2)}</span>
          </div>

          {/* Discount if present */}
          {pricing.discount && pricing.discount.grantedPercent > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium bg-emerald-50/70 p-1.5 rounded-lg">
              <div className="flex items-center space-x-1">
                <span>Discount ({pricing.discount.grantedPercent}%)</span>
                {pricing.discount.isCapped && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-900 px-1 rounded font-bold">
                    Policy Capped
                  </span>
                )}
              </div>
              <span>-${(pricing.discount.discountAmount / 100).toFixed(2)}</span>
            </div>
          )}

          {/* Discount explanation if requested discount was capped */}
          {pricing.discount?.isCapped && (
            <p className="text-[11px] text-amber-800 italic bg-amber-50 p-1.5 rounded">
              💡 {pricing.discount.reason}
            </p>
          )}

          {/* Rush fee if applicable */}
          {pricing.rushFeeCents && pricing.rushFeeCents > 0 ? (
            <div className="flex justify-between text-amber-700 font-medium bg-amber-50/80 p-1.5 rounded-lg">
              <span>Rush Fee (20% &lt;5 days)</span>
              <span>+${(pricing.rushFeeCents / 100).toFixed(2)}</span>
            </div>
          ) : null}

          {/* Total */}
          <div className="flex justify-between text-sm font-bold text-gray-900 pt-2 border-t border-gray-200">
            <span>Total Price</span>
            <span>${(pricing.totalCents / 100).toFixed(2)}</span>
          </div>

          {/* Deposit & Balance Splits */}
          <div className="bg-amber-500/10 rounded-xl p-3 mt-3 border border-amber-500/20">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs font-semibold text-amber-950 uppercase tracking-wider block">
                  Deposit Due Now (30%)
                </span>
                <span className="text-lg font-black text-amber-900">
                  ${(pricing.depositCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-gray-500 block">Balance Due on Date</span>
                <span className="text-xs font-semibold text-gray-700">
                  ${(pricing.balanceCents / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-3 px-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg flex items-center justify-center space-x-2 transition active:scale-[0.99]"
          >
            <span>Accept & Pay Deposit (${(pricing.depositCents / 100).toFixed(2)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <AcceptModal
          quoteId={quoteId}
          depositAmountCents={pricing.depositCents}
          totalAmountCents={pricing.totalCents}
          onClose={() => setShowModal(false)}
          onSuccess={handleAccepted}
        />
      )}
    </div>
  );
}
