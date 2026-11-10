"use client";

import React from "react";
import { AlertCircle, UserCheck, ShieldAlert } from "lucide-react";

interface EscalationCardProps {
  card: {
    type: string;
    escalationId?: string;
    kind?: string;
    summary?: string;
    orderId?: string;
    proposal?: any;
  };
}

export function EscalationCard({ card }: EscalationCardProps) {
  const isLateCancellation = card.type === "cancellation_escalated";

  return (
    <div className="my-3 bg-white rounded-2xl border border-amber-200 shadow-md overflow-hidden max-w-lg w-full">
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-amber-100" />
          <span className="font-bold text-sm tracking-wide">
            {isLateCancellation ? "Late Cancellation · Escalated to Owner" : "Inquiry Escalated to Seller"}
          </span>
        </div>
        <span className="text-xs bg-amber-700/60 text-white px-2.5 py-0.5 rounded-full font-semibold">
          Review Required
        </span>
      </div>

      <div className="p-4 space-y-3 text-xs text-gray-700">
        {isLateCancellation ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1.5">
            <p className="font-bold text-amber-900">
              Standard 0% Refund Policy Triggered (&lt; 3 Days to Delivery)
            </p>
            <p className="text-amber-800">
              Because your order delivery is scheduled in {card.proposal?.daysUntilDue} day(s), ingredients and custom baking schedules have already been committed.
            </p>
            <p className="text-amber-900 font-medium">
              We have forwarded an exception request directly to the bakery owner. If an exception is approved, your PayPal account will be credited automatically.
            </p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
            <div className="flex items-center space-x-1.5 font-bold text-amber-900">
              <UserCheck className="w-4 h-4 text-amber-700" />
              <span>Personal Attention Required</span>
            </div>
            <p className="text-amber-800 font-medium">Category: {card.kind || "Special Request"}</p>
            <p className="text-gray-600 italic mt-0.5">&quot;{card.summary}&quot;</p>
          </div>
        )}

        <div className="flex items-center space-x-2 text-gray-500 pt-1 border-t border-gray-100">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>The owner monitors live dashboard alerts and will respond shortly.</span>
        </div>
      </div>
    </div>
  );
}
