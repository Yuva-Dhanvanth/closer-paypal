"use client";

import React, { useState } from "react";
import { X, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

interface AcceptModalProps {
  quoteId: string;
  depositAmountCents: number;
  totalAmountCents: number;
  onClose: () => void;
  onSuccess: (redirectUrl: string) => void;
}

export function AcceptModal({
  quoteId,
  depositAmountCents,
  totalAmountCents,
  onClose,
  onSuccess,
}: AcceptModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Please fill out both name and email.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/quotes/${quoteId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          customerEmail: email.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to confirm quote.");
      }

      onSuccess(data.redirectUrl);
    } catch (err: any) {
      setError(err.message || "Failed to accept quote. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-amber-600 to-rose-600 p-5 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-lg">Confirm & Reserve Order</h3>
            <p className="text-amber-100 text-xs mt-0.5">
              Secure deposit via PayPal Sandbox
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-amber-50 border border-amber-200/70 rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-800 font-medium">Deposit Due Now</p>
              <p className="text-xl font-bold text-amber-900">
                ${(depositAmountCents / 100).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-amber-700">Total Order</p>
              <p className="text-sm font-semibold text-amber-900">
                ${(totalAmountCents / 100).toFixed(2)}
              </p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Your Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email Address (For Booking Receipt)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. jane@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm transition"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to PayPal...</span>
                </>
              ) : (
                <>
                  <span>Pay Deposit ${(depositAmountCents / 100).toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Orders v2 · Rules Enforced · 100% Policy Protected</span>
          </div>
        </form>
      </div>
    </div>
  );
}
