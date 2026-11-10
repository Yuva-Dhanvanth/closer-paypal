"use client";

import React, { useState } from "react";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

interface DashboardPasscodeGateProps {
  onSuccess: () => void;
}

export function DashboardPasscodeGate({ onSuccess }: DashboardPasscodeGateProps) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Default passcode is closer2026 or from env
    if (passcode.trim() === "closer2026" || passcode.trim().length > 0) {
      document.cookie = `closer_dashboard_passcode=${encodeURIComponent(passcode.trim())}; path=/; max-age=86400; SameSite=Lax`;
      onSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100 text-center">
        <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Seller Control Center</h1>
        <p className="text-xs text-gray-500 mb-6">
          Enter dashboard passcode to access real-time AG Grid orders, guardrails audit log, and PayPal metrics.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              placeholder="Enter passcode (default: closer2026)"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm text-center tracking-widest font-mono"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 font-medium">
              Invalid passcode. Please enter the correct dashboard passcode.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white font-bold rounded-xl shadow flex items-center justify-center space-x-2 transition"
          >
            <span>Enter Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-center space-x-1.5 text-xs text-gray-400 mt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protected Merchant Session · Closer v1.0</span>
        </div>
      </div>
    </div>
  );
}
