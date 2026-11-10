"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import {
  DollarSign,
  TrendingUp,
  Clock,
  ShieldAlert,
  ShoppingBag,
  ExternalLink,
  RefreshCw,
  Layers,
  AlertTriangle,
  Globe,
  Sparkles,
} from "lucide-react";
import { OrdersGrid } from "./OrdersGrid";
import { AgentActivityLog } from "./AgentActivityLog";
import { EscalationQueue } from "./EscalationQueue";
import { DemoControls } from "./DemoControls";
import { PaymentsWebhooksLog } from "./PaymentsWebhooksLog";
import { DashboardPasscodeGate } from "./DashboardPasscodeGate";

interface DashboardClientProps {
  sellerSlug: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function DashboardClient({ sellerSlug }: DashboardClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "agent_log" | "escalations" | "payments">("orders");

  useEffect(() => {
    // Check cookie
    const hasPasscode = document.cookie
      .split("; ")
      .some((row) => row.startsWith("closer_dashboard_passcode="));
    setIsAuthenticated(hasPasscode);
  }, []);

  const { data, error, mutate, isLoading } = useSWR(
    isAuthenticated ? `/api/dashboard/${sellerSlug}` : null,
    fetcher,
    { refreshInterval: 2500 }
  );

  if (isAuthenticated === false) {
    return <DashboardPasscodeGate onSuccess={() => setIsAuthenticated(true)} />;
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-600" />
          <span>Loading Closer Seller Dashboard...</span>
        </div>
      </div>
    );
  }

  const { seller, metrics, orders, escalations, agentEvents, payments, webhooks } = data;
  const openEscalationCount = escalations?.filter((e: any) => e.status === "open").length || 0;

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 pb-12">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🍰</span>
              <div>
                <h1 className="font-extrabold text-base text-gray-900 flex items-center space-x-2">
                  <span>{seller.name}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-mono">
                    /{seller.slug}
                  </span>
                </h1>
                <p className="text-xs text-gray-500">Closer AI Sales &amp; Collections Command Center</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <a
                href={`/s/${sellerSlug}`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-1.5 transition"
              >
                <span>Open Storefront Chat</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Demo Controls Fast-Forward Clock Bar */}
        <DemoControls
          sellerSlug={sellerSlug}
          offsetDays={seller.demoClockOffsetDays}
          simulatedToday={seller.simulatedToday}
          onRefresh={() => mutate()}
        />

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Net Revenue */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Net Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-gray-900">
              ${(metrics.netRevenueCents / 100).toFixed(2)}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">Captured via PayPal</span>
          </div>

          {/* Deposits Held */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Deposits Held</span>
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-blue-700">
              ${(metrics.depositsHeldCents / 100).toFixed(2)}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">30% upfront policy</span>
          </div>

          {/* Outstanding Balance */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Balance Due</span>
              <TrendingUp className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-700">
              ${(metrics.balanceOutstandingCents / 100).toFixed(2)}
            </p>
            <span className="text-[11px] text-amber-600 font-medium">Due on delivery date</span>
          </div>

          {/* Chat-to-Order Conversion */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Conversion</span>
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-2xl font-black text-purple-700">
              {metrics.conversionRate}%
            </p>
            <span className="text-[11px] text-gray-400 font-medium">
              {metrics.totalOrders} orders / {metrics.totalConversations} chats
            </span>
          </div>

          {/* Hours Saved */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs col-span-2 md:col-span-1">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-1">
              <span>Hours Saved</span>
              <Clock className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-700">
              {metrics.estimatedHoursSaved}h
            </p>
            <span className="text-[11px] text-gray-400 font-medium">Zero midnight DM chasing</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-2 border-b border-gray-200 pb-2">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === "orders"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>Orders (AG Grid)</span>
            <span className="bg-gray-100 text-gray-700 px-1.5 py-0.2 rounded-full text-[10px]">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("agent_log")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === "agent_log"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            <span>Agent Guardrail Audit Trail</span>
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full text-[10px]">
              Live
            </span>
          </button>

          <button
            onClick={() => setActiveTab("escalations")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === "escalations"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Exception Queue</span>
            {openEscalationCount > 0 && (
              <span className="bg-red-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-bold">
                {openEscalationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("payments")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              activeTab === "payments"
                ? "bg-white text-gray-900 shadow-sm border border-gray-200"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>PayPal &amp; Webhooks</span>
            <span className="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full text-[10px]">
              {webhooks.length}
            </span>
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === "orders" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-gray-900">Orders Management</h2>
                <p className="text-xs text-gray-500">
                  Powered by AG Grid React. Real-time updates every 2.5s.
                </p>
              </div>
            </div>
            <OrdersGrid orders={orders} sellerSlug={sellerSlug} onRefresh={() => mutate()} />
          </div>
        )}

        {activeTab === "agent_log" && (
          <div className="space-y-4">
            <AgentActivityLog events={agentEvents} />
          </div>
        )}

        {activeTab === "escalations" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-900">Exception &amp; Escalation Queue</h2>
              <p className="text-xs text-gray-500">
                Review and approve custom refunds or customer exceptions. Approval triggers the PayPal Refunds API directly.
              </p>
            </div>
            <EscalationQueue escalations={escalations} onRefresh={() => mutate()} />
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-4">
            <PaymentsWebhooksLog payments={payments} webhooks={webhooks} />
          </div>
        )}
      </main>
    </div>
  );
}
