"use client";

import React, { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { Send, Sparkles, Loader2, Store, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import { QuoteCard } from "./QuoteCard";
import { ReceiptCard } from "./ReceiptCard";
import { RefundCard } from "./RefundCard";
import { EscalationCard } from "./EscalationCard";
import { BalanceDueCard } from "./BalanceDueCard";

interface ChatContainerProps {
  sellerSlug: string;
  initialConversationId?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatContainer({ sellerSlug, initialConversationId }: ChatContainerProps) {
  const [conversationId, setConversationId] = useState<string | undefined>(
    initialConversationId
  );
  const [inputMessage, setInputMessage] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll conversation state every 2.5 seconds
  const apiUrl = conversationId
    ? `/api/chat/${sellerSlug}?conversationId=${conversationId}`
    : `/api/chat/${sellerSlug}`;

  const { data, mutate } = useSWR(apiUrl, fetcher, {
    refreshInterval: 2500,
  });

  useEffect(() => {
    if (data?.conversation?.id && !conversationId) {
      setConversationId(data.conversation.id);
    }
  }, [data, conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.conversation?.messages, sending]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sending) return;

    setInputMessage("");
    setSending(true);

    try {
      const activeConvoId = conversationId || data?.conversation?.id;
      const res = await fetch(`/api/chat/${sellerSlug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConvoId,
          message: text,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      await mutate();
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const seller = data?.seller;
  const messages = data?.conversation?.messages || [];

  const suggestedPrompts = [
    { label: "🎂 2kg Chocolate Cake for next week", text: "I'd like to order a 2kg Belgian chocolate cake for next Saturday" },
    { label: "💸 Ask for 15% discount", text: "Can I get a 15% discount on this order?" },
    { label: "⚡ Cupcake box in 2 days", text: "Can I get a Cupcake Box (12) in 2 days?" },
    { label: "⚠️ Nut allergy question", text: "Does your chocolate cake contain tree nuts or peanut traces?" },
    { label: "❌ Request cancellation & refund", text: "I need to cancel my order and get a refund" },
  ];

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white shadow-2xl border-x border-gray-200">
      {/* Store Header */}
      <header className="bg-gradient-to-r from-amber-700 via-orange-600 to-rose-700 p-4 text-white shadow-md z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-xl shadow-inner border border-white/20">
              🍰
            </div>
            <div>
              <h1 className="font-extrabold text-base md:text-lg flex items-center space-x-2">
                <span>{seller?.name || "Sugar & Spice Bakes"}</span>
                <span className="text-[10px] bg-emerald-400 text-emerald-950 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Verified Seller
                </span>
              </h1>
              <p className="text-amber-100 text-xs truncate max-w-xs md:max-w-md">
                {seller?.tagline || "Artisan Custom Celebration Cakes"}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <a
              href={`/dashboard/${sellerSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center space-x-1 text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition font-medium text-white"
            >
              <span>Seller Dashboard</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Suggested Prompts Pill Bar */}
      <div className="bg-amber-50/60 border-b border-amber-100 px-3 py-2 flex items-center space-x-2 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-amber-900 shrink-0 uppercase tracking-wider">
          Suggested:
        </span>
        {suggestedPrompts.map((p, idx) => (
          <button
            key={idx}
            disabled={sending}
            onClick={() => handleSendMessage(p.text)}
            className="text-xs shrink-0 bg-white hover:bg-amber-100/70 text-amber-950 border border-amber-200 px-3 py-1 rounded-full font-medium transition shadow-sm hover:shadow"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
        {messages.map((msg: any) => {
          let contentText = "";
          let uiCards: any[] = [];

          try {
            const parsed = JSON.parse(msg.content);
            contentText = parsed.text || (typeof parsed === "string" ? parsed : "");
            uiCards = parsed.uiCards || [];
          } catch {
            contentText = msg.content;
          }

          const isUser = msg.role === "user";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-gradient-to-r from-amber-600 to-rose-600 text-white rounded-br-xs font-medium"
                    : "bg-white text-gray-800 border border-gray-200/80 rounded-bl-xs"
                }`}
              >
                {!isUser && (
                  <div className="flex items-center space-x-1.5 text-xs text-amber-700 font-semibold mb-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{seller?.name} Assistant</span>
                  </div>
                )}
                <p className="whitespace-pre-wrap">{contentText}</p>
              </div>

              {/* Render Structured UI Cards if attached */}
              {uiCards.map((card: any, idx: number) => {
                if (card.type === "quote") {
                  return <QuoteCard key={idx} card={card} />;
                }
                if (card.type === "payment_receipt") {
                  return <ReceiptCard key={idx} card={card} />;
                }
                if (card.type === "refund_proposal") {
                  return <RefundCard key={idx} card={card} />;
                }
                if (card.type === "balance_due_card") {
                  return <BalanceDueCard key={idx} card={card} />;
                }
                if (
                  card.type === "escalation_notice" ||
                  card.type === "cancellation_escalated"
                ) {
                  return <EscalationCard key={idx} card={card} />;
                }
                return null;
              })}
            </div>
          );
        })}

        {sending && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 bg-white border border-gray-200 px-3 py-2 rounded-xl w-fit animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
            <span>AI sales agent checking catalog & store rules...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <footer className="p-3 bg-white border-t border-gray-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message (e.g. 'I want a 2kg cake for Saturday with 15% off')..."
            disabled={sending}
            className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition"
          />
          <button
            type="submit"
            disabled={sending || !inputMessage.trim()}
            className="p-3 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white rounded-xl shadow-md transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 px-1">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Deterministic engine computes every number · PayPal Orders v2</span>
          </span>
          <span className="font-mono">Demo Mode</span>
        </div>
      </footer>
    </div>
  );
}
