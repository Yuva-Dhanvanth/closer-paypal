"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, Globe, CreditCard } from "lucide-react";

interface PaymentsWebhooksLogProps {
  payments: any[];
  webhooks: any[];
}

export function PaymentsWebhooksLog({ payments, webhooks }: PaymentsWebhooksLogProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Payments Log */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm">PayPal Ledger &amp; Captures</h3>
          </div>
          <span className="text-xs text-gray-400 font-mono">Orders v2</span>
        </div>

        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {payments.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              No completed payments yet. Pay a deposit in the storefront to record a capture!
            </div>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[10px] ${
                      p.type === "refund"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-emerald-100 text-emerald-800"
                    }`}>
                      {p.type}
                    </span>
                    <span className="font-mono text-gray-700">#{p.id.substring(0, 8)}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {p.paypalCaptureId && <span>Cap: {p.paypalCaptureId}</span>}
                    {p.paypalRefundId && <span>Ref: {p.paypalRefundId}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-black text-sm ${p.type === "refund" ? "text-rose-600" : "text-emerald-600"}`}>
                    {p.type === "refund" ? "-" : "+"}${(p.amountCents / 100).toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-gray-400">
                    {new Date(p.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Webhooks Log */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="bg-gradient-to-r from-gray-900 to-slate-800 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm">Verified Webhook Ingestion</h3>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Signature Verified</span>
          </span>
        </div>

        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {webhooks.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-xs">
              No webhook events ingested yet. Webhooks verify signature and reconcile captures/refunds automatically.
            </div>
          ) : (
            webhooks.map((w) => (
              <div key={w.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[10px] bg-blue-100 text-blue-800">
                      {w.type}
                    </span>
                    <span className="font-mono text-gray-600 truncate max-w-[150px]">{w.id}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SUCCESS (Idempotent)</span>
                  </span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {new Date(w.processedAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
