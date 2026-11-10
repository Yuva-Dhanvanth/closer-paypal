"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Calendar, Receipt } from "lucide-react";

interface ReceiptCardProps {
  card: {
    paymentId: string;
    orderId: string;
    typeLabel: string;
    amountPaidCents: number;
    totalOrderCents: number;
    remainingBalanceCents: number;
    dueDate: string;
    paypalCaptureId?: string;
    paypalOrderId?: string;
  };
}

export function ReceiptCard({ card }: ReceiptCardProps) {
  return (
    <div className="my-3 bg-white rounded-2xl border border-emerald-200 shadow-md overflow-hidden max-w-lg w-full">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span className="font-bold text-sm tracking-wide">
            {card.typeLabel} · Verified PayPal Capture
          </span>
        </div>
        <span className="text-xs bg-emerald-500/40 text-emerald-100 px-2.5 py-0.5 rounded-full font-mono">
          #{card.orderId.substring(0, 8)}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-baseline border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Amount Paid</span>
            <span className="text-2xl font-black text-emerald-700">
              ${(card.amountPaidCents / 100).toFixed(2)} USD
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Remaining Balance</span>
            <span className="text-sm font-bold text-gray-800">
              ${(card.remainingBalanceCents / 100).toFixed(2)} USD
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 bg-gray-50 p-3 rounded-xl">
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">Delivery / Due Date</span>
            <span className="font-medium text-gray-800 flex items-center space-x-1 mt-0.5">
              <Calendar className="w-3 h-3 text-emerald-600" />
              <span>{card.dueDate}</span>
            </span>
          </div>
          <div>
            <span className="text-gray-400 block text-[10px] uppercase font-semibold">PayPal Capture ID</span>
            <span className="font-mono text-gray-700 truncate block mt-0.5" title={card.paypalCaptureId}>
              {card.paypalCaptureId || "N/A"}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-700 pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Payment settled securely via PayPal Orders v2 API.</span>
        </div>
      </div>
    </div>
  );
}
