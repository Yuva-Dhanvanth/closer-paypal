"use client";

import React, { useState } from "react";
import { FastForward, RotateCcw, Clock, Bell, Trash2, Loader2 } from "lucide-react";

interface DemoControlsProps {
  sellerSlug: string;
  offsetDays: number;
  simulatedToday: string;
  onRefresh: () => void;
}

export function DemoControls({
  sellerSlug,
  offsetDays,
  simulatedToday,
  onRefresh,
}: DemoControlsProps) {
  const [loading, setLoading] = useState(false);

  const handleAdjustClock = async (days: number, reset: boolean = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: sellerSlug,
          addDays: days,
          reset,
        }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (e) {
      console.error("Clock adjustment failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRunFollowups = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cron/followups", {
        method: "POST",
      });
      const data = await res.json();
      alert(`Follow-up agent completed: ${data.message || "Processed active orders"}`);
      onRefresh();
    } catch (e: any) {
      alert("Follow-up run failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetDemo = async () => {
    if (!confirm("Are you sure you want to reset all orders, payments, and messages to initial state?")) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/reset-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminSecret: "closer-admin-secret-2026" }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ Demo environment reset successfully!");
        onRefresh();
      } else {
        alert("Reset failed: " + (data.error || "Unknown error"));
      }
    } catch (e: any) {
      alert("Reset error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4 border border-slate-800">
      {/* Clock Display */}
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold text-gray-400">Simulated Today:</span>
            <span className="text-sm font-black text-amber-400 font-mono">{simulatedToday}</span>
            {offsetDays !== 0 && (
              <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.2 rounded font-bold">
                +{offsetDays}d
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            Rules, lead times, rush fees &amp; refund tiers evaluate this clock.
          </p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleAdjustClock(1)}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition disabled:opacity-50"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+1 Day</span>
        </button>

        <button
          onClick={() => handleAdjustClock(5)}
          disabled={loading}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition disabled:opacity-50"
        >
          <FastForward className="w-3.5 h-3.5" />
          <span>+5 Days</span>
        </button>

        {offsetDays !== 0 && (
          <button
            onClick={() => handleAdjustClock(0, true)}
            disabled={loading}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-400 text-xs font-semibold rounded-lg border border-slate-700 flex items-center space-x-1 transition disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Clock</span>
          </button>
        )}

        <div className="h-4 w-px bg-slate-700 mx-1 hidden sm:block" />

        <button
          onClick={handleRunFollowups}
          disabled={loading}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow flex items-center space-x-1.5 transition disabled:opacity-50"
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Run Follow-ups</span>
        </button>

        <button
          onClick={handleResetDemo}
          disabled={loading}
          className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/60 text-xs font-medium rounded-lg flex items-center space-x-1 transition disabled:opacity-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Reset Demo</span>
        </button>
      </div>
    </div>
  );
}
