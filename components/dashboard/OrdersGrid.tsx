"use client";

import React, { useMemo, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { MessageSquare, RotateCcw, Send, ExternalLink, Loader2 } from "lucide-react";

interface OrdersGridProps {
  orders: any[];
  sellerSlug: string;
  onRefresh: () => void;
}

export function OrdersGrid({ orders, sellerSlug, onRefresh }: OrdersGridProps) {
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleRequestBalance = async (orderId: string) => {
    setActionLoadingId(`balance_${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/request-balance`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to request balance");
      } else {
        alert("✅ Balance payment link generated and posted to customer chat!");
        onRefresh();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDirectRefund = async (orderId: string, paidDollars: string) => {
    if (!confirm(`Are you sure you want to refund $${paidDollars} to this buyer via PayPal?`)) {
      return;
    }
    setActionLoadingId(`refund_${orderId}`);
    try {
      const res = await fetch(`/api/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Merchant initiated refund from dashboard" }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to issue refund");
      } else {
        alert(`✅ Refund successfully settled via PayPal! (Refund ID: ${data.refundId})`);
        onRefresh();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columnDefs = useMemo<ColDef[]>(() => {
    return [
      {
        field: "shortId",
        headerName: "Order",
        width: 110,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="font-mono text-xs font-bold text-gray-900">{p.value}</span>
        ),
      },
      {
        field: "customerName",
        headerName: "Customer",
        flex: 1.2,
        minWidth: 160,
        cellRenderer: (p: ICellRendererParams) => (
          <div>
            <div className="font-semibold text-xs text-gray-800">{p.value}</div>
            <div className="text-[11px] text-gray-400 truncate">{p.data.customerEmail}</div>
          </div>
        ),
      },
      {
        field: "dueDate",
        headerName: "Due Date",
        width: 120,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="text-xs font-medium text-gray-700">{p.value}</span>
        ),
      },
      {
        field: "totalDollars",
        headerName: "Total",
        width: 100,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="text-xs font-bold text-gray-900">${p.value}</span>
        ),
      },
      {
        field: "paidDollars",
        headerName: "Paid",
        width: 100,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="text-xs font-semibold text-emerald-600">${p.value}</span>
        ),
      },
      {
        field: "balanceDollars",
        headerName: "Balance",
        width: 100,
        cellRenderer: (p: ICellRendererParams) => (
          <span className={`text-xs font-bold ${parseFloat(p.value) > 0 ? "text-amber-600" : "text-gray-400"}`}>
            ${p.value}
          </span>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 150,
        cellRenderer: (p: ICellRendererParams) => {
          const s = p.value;
          let badgeClass = "bg-gray-100 text-gray-800";
          let label = s;

          if (s === "deposit_pending") {
            badgeClass = "bg-amber-100 text-amber-800 border border-amber-200";
            label = "Deposit Pending";
          } else if (s === "deposit_paid") {
            badgeClass = "bg-blue-100 text-blue-800 border border-blue-200";
            label = "Deposit Paid (30%)";
          } else if (s === "balance_requested") {
            badgeClass = "bg-purple-100 text-purple-800 border border-purple-200";
            label = "Balance Requested";
          } else if (s === "paid_in_full") {
            badgeClass = "bg-emerald-100 text-emerald-800 border border-emerald-200";
            label = "Paid in Full";
          } else if (s === "refunded") {
            badgeClass = "bg-rose-100 text-rose-800 border border-rose-200";
            label = "Refunded (PayPal)";
          }

          return (
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badgeClass}`}>
              {label}
            </span>
          );
        },
      },
      {
        field: "nextAction",
        headerName: "Next Action",
        flex: 1.2,
        minWidth: 150,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="text-xs text-gray-600 italic">{p.value}</span>
        ),
      },
      {
        headerName: "Actions",
        width: 200,
        cellRenderer: (p: ICellRendererParams) => {
          const order = p.data;
          const isDepositPaid = order.status === "deposit_paid";
          const canRefund = parseFloat(order.paidDollars) > 0 && order.status !== "refunded";
          const isLoadingBalance = actionLoadingId === `balance_${order.id}`;
          const isLoadingRefund = actionLoadingId === `refund_${order.id}`;

          return (
            <div className="flex items-center space-x-1 py-1">
              {/* Request Balance Button */}
              {isDepositPaid && (
                <button
                  onClick={() => handleRequestBalance(order.id)}
                  disabled={isLoadingBalance}
                  title="Generate balance pay link and send to buyer chat"
                  className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-medium rounded flex items-center space-x-1 shadow-sm transition disabled:opacity-50"
                >
                  {isLoadingBalance ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-2.5 h-2.5" />
                      <span>Request Bal</span>
                    </>
                  )}
                </button>
              )}

              {/* Chat Button */}
              <a
                href={`/s/${sellerSlug}?conversationId=${order.conversationId}`}
                target="_blank"
                rel="noreferrer"
                title="Open customer conversation"
                className="p-1 text-gray-600 hover:text-amber-600 hover:bg-amber-50 rounded transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </a>

              {/* Refund Button */}
              {canRefund && (
                <button
                  onClick={() => handleDirectRefund(order.id, order.paidDollars)}
                  disabled={isLoadingRefund}
                  title="Issue PayPal refund"
                  className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition disabled:opacity-50"
                >
                  {isLoadingRefund ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [sellerSlug, actionLoadingId, onRefresh]);

  const defaultColDef = useMemo<ColDef>(() => {
    return {
      sortable: true,
      filter: true,
      resizable: true,
    };
  }, []);

  return (
    <div className="w-full h-80 rounded-xl overflow-hidden border border-gray-200 shadow-sm ag-theme-quartz">
      <AgGridReact
        rowData={orders}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        pagination={true}
        paginationPageSize={10}
        rowHeight={48}
        headerHeight={40}
        animateRows={true}
      />
    </div>
  );
}
