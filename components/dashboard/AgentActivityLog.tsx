"use client";

import React, { useState } from "react";
import { ShieldAlert, Terminal, CheckCircle2, RotateCcw, AlertTriangle, Bell, Clock, ChevronDown, ChevronRight } from "lucide-react";

interface AgentActivityLogProps {
  events: any[];
}

export function AgentActivityLog({ events }: AgentActivityLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getBadge = (type: string) => {
    switch (type) {
      case "guardrail":
        return {
          icon: ShieldAlert,
          bg: "bg-amber-100 text-amber-900 border-amber-300",
          label: "GUARDRAIL ENFORCED",
        };
      case "payment_captured":
        return {
          icon: CheckCircle2,
          bg: "bg-emerald-100 text-emerald-900 border-emerald-300",
          label: "PAYPAL CAPTURE",
        };
      case "refund_issued":
        return {
          icon: RotateCcw,
          bg: "bg-rose-100 text-rose-900 border-rose-300",
          label: "PAYPAL REFUND",
        };
      case "escalation":
        return {
          icon: AlertTriangle,
          bg: "bg-red-100 text-red-900 border-red-300",
          label: "ESCALATION",
        };
      case "followup":
        return {
          icon: Bell,
          bg: "bg-purple-100 text-purple-900 border-purple-300",
          label: "FOLLOW-UP AGENT",
        };
      case "tool_call":
      default:
        return {
          icon: Terminal,
          bg: "bg-blue-100 text-blue-900 border-blue-300",
          label: "AGENT TOOL",
        };
    }
  };

  if (!events || events.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm font-medium">No agent activity logged yet.</p>
        <p className="text-xs">Start chatting with the agent in the storefront to view real-time rule evaluations!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="bg-gradient-to-r from-gray-900 to-slate-800 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <h3 className="font-bold text-sm tracking-wide">Live Agent Decision & Guardrail Audit Trail</h3>
        </div>
        <span className="text-xs text-gray-400 font-mono">
          &quot;The AI Proposes, The Rules Decide&quot;
        </span>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {events.map((evt) => {
          const badge = getBadge(evt.type);
          const IconComponent = badge.icon;
          const isExpanded = expandedId === evt.id;
          const timeStr = new Date(evt.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          return (
            <div key={evt.id} className="p-3 hover:bg-slate-50/80 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2.5">
                  <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold border ${badge.bg} shrink-0 mt-0.5`}>
                    <IconComponent className="w-3 h-3" />
                    <span>{badge.label}</span>
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-900 leading-snug">
                      {evt.summary}
                    </p>
                    <div className="flex items-center space-x-3 text-[11px] text-gray-400 mt-1">
                      <span>{timeStr}</span>
                      {evt.conversationId && (
                        <span>Convo: #{evt.conversationId.substring(0, 6)}</span>
                      )}
                      {evt.orderId && <span>Order: #{evt.orderId.substring(0, 6)}</span>}
                    </div>
                  </div>
                </div>

                {evt.payload && (
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : evt.id)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                    title="Toggle JSON details"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>

              {isExpanded && evt.payload && (
                <div className="mt-2.5 p-2 bg-slate-900 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto shadow-inner">
                  <pre>{JSON.stringify(JSON.parse(evt.payload), null, 2)}</pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
