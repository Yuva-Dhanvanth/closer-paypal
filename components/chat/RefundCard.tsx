"use client";

import React, { useState } from "react";
import { AlertTriangle, RotateCcw, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

interface RefundCardProps {
  card: {
    orderId: string;
    proposal: {
      paidAmountCents: number;
      refundPercent: number;
      refundAmountCents: number;
      daysUntilDue: number;
      tier: "100%" | "50%" | "0%";
      policyRule: string;
      requiresEscalation: boolean;
      notes: string;
    };
  };
}

export function RefundCard({ card }: RefundCardProps) {
  const [loading, setLoading] = useState(false);
  const [refunded, setRefunded] = useState(false);
  const [refundId, setRefundId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { orderId, proposal } = card;

  const handleConfirmRefund = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundAmountCents: proposal.refundAmountCents,
          reason: "Customer confirmed policy refund",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process refund.");
      }

      setRefunded(true);
      setRefundId(data.refundId);
    } catch (err: any) {
      setError(err.message || "Failed to process refund. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="my-3 bg-white rounded-2xl border border-rose-200 shadow-md overflow-hidden max-w-lg w-full">
      <div className="bg-gradient-to-r from-rose-500 to-red-600 p-4 text-white flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <RotateCcw className="w-5 h-5 text-rose-100" />
          <span className="font-bold text-sm tracking-wide">
            Cancellation & Refund Proposal
          </span>
        </div>
        <span className="text-xs bg-rose-700/60 text-white px-2.5 py-0.5 rounded-full font-bold">
          Tier: {proposal.tier}
        </span>
      </div>

      <div className="p-4 space-y-3">
        <div className="bg-rose-50 border border-rose-200/60 rounded-xl p-3 text-xs text-rose-900">
          <p className="font-semibold">{proposal.policyRule}</p>
          <p className="text-rose-700 mt-1">{proposal.notes}</p>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
          <span className="text-gray-600">Total Paid on Order</span>
          <span className="font-medium text-gray-900">
            ${(proposal.paidAmountCents / 100).toFixed(2)} USD
          </span>
        </div>

        <div className="flex justify-between items-center py-2 border-b border-gray-100 text-sm">
          <span className="font-semibold text-gray-800">Refund Amount ({proposal.refundPercent}%)</span>
          <span className="font-bold text-lg text-rose-600">
            ${(proposal.refundAmountCents / 100).toFixed(2)} USD
          </span>
        </div>

        {error && (
          <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs">
            {error}
          </div>
        )}

        {refunded ? (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Refund Processed via PayPal!</p>
              <p className="text-emerald-700 font-mono text-[11px] mt-0.5">
                Refund ID: {refundId}
              </p>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <button
              onClick={handleConfirmRefund}
              disabled={loading || proposal.refundAmountCents <= 0}
              className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing PayPal Refund...</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>Confirm Cancel & Refund ${(proposal.refundAmountCents / 100).toFixed(2)}</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center space-x-1.5 text-[11px] text-gray-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
          <span>Processed directly through PayPal Captures & Refunds API</span>
        </div>
      </div>
    </div>
  );
}
