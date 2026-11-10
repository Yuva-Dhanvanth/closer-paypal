"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle, XCircle, RotateCcw, Loader2 } from "lucide-react";

interface EscalationQueueProps {
  escalations: any[];
  onRefresh: () => void;
}

export function EscalationQueue({ escalations, onRefresh }: EscalationQueueProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [customRefunds, setCustomRefunds] = useState<Record<string, string>>({});

  const handleDecision = async (
    escalationId: string,
    status: "approved" | "denied",
    orderId?: string
  ) => {
    setLoadingId(escalationId);
    try {
      const customAmountStr = customRefunds[escalationId];
      let decidedAmountCents: number | undefined;

      if (status === "approved" && customAmountStr) {
        decidedAmountCents = Math.round(parseFloat(customAmountStr) * 100);
      }

      const res = await fetch(`/api/admin/escalations/${escalationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          decidedAmountCents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to update escalation.");
      } else {
        alert(
          status === "approved"
            ? `✅ Exception Approved! PayPal refund of $${((decidedAmountCents || 0) / 100).toFixed(2)} processed.`
            : "❌ Escalation marked Denied."
        );
        onRefresh();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoadingId(null);
    }
  };

  const openEscalations = escalations.filter((e) => e.status === "open");

  if (openEscalations.length === 0) {
    return (
      <div className="p-6 bg-white rounded-xl border border-dashed border-gray-300 text-center text-gray-500">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
        <p className="text-sm font-semibold text-gray-700">All clear! No open escalations.</p>
        <p className="text-xs text-gray-400">Exceptions like late cancellations or dietary inquiries appear here for human approval.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {openEscalations.map((esc) => {
        const isLoading = loadingId === esc.id;
        const paidDollars = esc.order?.paidCents ? (esc.order.paidCents / 100).toFixed(2) : "0.00";
        const currentInputValue = customRefunds[esc.id] ?? paidDollars;

        return (
          <div
            key={esc.id}
            className="p-4 bg-white rounded-xl border border-amber-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold rounded uppercase">
                  {esc.kind}
                </span>
                <span className="text-xs font-mono text-gray-400">#{esc.id.substring(0, 8)}</span>
                {esc.orderId && (
                  <span className="text-xs font-semibold text-gray-700">
                    Order #{esc.orderId.substring(0, 8)} (Paid: ${paidDollars})
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-900">{esc.summary}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 shrink-0">
              {esc.order?.paidCents > 0 && (
                <div className="flex items-center space-x-1 bg-gray-50 border border-gray-300 rounded-lg px-2 py-1">
                  <span className="text-xs text-gray-500 font-semibold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={paidDollars}
                    value={currentInputValue}
                    onChange={(e) =>
                      setCustomRefunds({ ...customRefunds, [esc.id]: e.target.value })
                    }
                    className="w-16 text-xs font-bold text-gray-800 bg-transparent outline-none"
                  />
                </div>
              )}

              <button
                onClick={() => handleDecision(esc.id, "approved", esc.orderId)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Approve Refund</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleDecision(esc.id, "denied", esc.orderId)}
                disabled={isLoading}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 text-gray-500 inline mr-1" />
                <span>Deny</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
