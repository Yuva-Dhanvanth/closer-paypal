"use client";

import React from "react";
import { CreditCard, Calendar, ArrowRight } from "lucide-react";

interface BalanceDueCardProps {
  card: {
    orderId: string;
    balanceCents: number;
    dueDate: string;
    payUrl: string;
  };
}

export function BalanceDueCard({ card }: BalanceDueCardProps) {
  return (
    <div className="my-3 bg-white rounded-2xl border border-blue-200 shadow-md overflow-hidden max-w-lg w-full">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <CreditCard className="w-5 h-5 text-blue-200" />
          <span className="font-bold text-sm tracking-wide">
            Remaining Balance Due
          </span>
        </div>
        <span className="text-xs bg-blue-500/40 text-blue-100 px-2.5 py-0.5 rounded-full font-mono">
          Order #{card.orderId.substring(0, 8)}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex justify-between items-baseline border-b border-gray-100 pb-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider block">Balance to Pay</span>
            <span className="text-2xl font-black text-blue-700">
              ${(card.balanceCents / 100).toFixed(2)} USD
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Due Date</span>
            <span className="text-xs font-bold text-gray-800 flex items-center space-x-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>{card.dueDate}</span>
            </span>
          </div>
        </div>

        <div className="pt-2">
          <a
            href={card.payUrl}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition"
          >
            <span>Pay Remaining Balance (${(card.balanceCents / 100).toFixed(2)})</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
