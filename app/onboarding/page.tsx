"use client";

import React, { useState } from "react";
import { Sparkles, ArrowRight, Store, CheckCircle, Loader2, Edit3 } from "lucide-react";
import Link from "next/link";

export default function OnboardingPage() {
  const [rawText, setRawText] = useState(
    "Velvet & Bloom Florals\nBespoke bridal bouquets from $120. Table centerpieces $65 each (min 3 days notice). Luxury arch installation $450 (7 days notice). 10% discount on orders over $200."
  );
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [extractedConfig, setExtractedConfig] = useState<any>(null);
  const [publishedStoreUrl, setPublishedStoreUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    setPublishedStoreUrl(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json();
      if (res.ok && data.config) {
        setExtractedConfig(data.config);
      } else {
        alert(data.error || "Failed to extract catalog.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!extractedConfig) return;
    setPublishing(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText,
          sellerName: extractedConfig.name,
          slug: extractedConfig.slug,
          tone: extractedConfig.tone,
          publish: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.published) {
        setPublishedStoreUrl(data.storeUrl);
      } else {
        alert(data.error || "Failed to publish store.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <Link href="/" className="text-xs text-amber-400 hover:underline mb-2 inline-block">
            ← Back to Home
          </Link>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black">AI Merchant Onboarding</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Paste your messy price list, Instagram bio, or menu text. Our agent instantly extracts a structured catalog, lead times, and guardrail policies.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-4 shadow-xl">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
            Paste Your Unstructured Pricing / Menu:
          </label>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
          />

          <button
            onClick={handleGenerate}
            disabled={loading || !rawText.trim()}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Structured Catalog with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Structured Store Catalog</span>
              </>
            )}
          </button>
        </div>

        {/* Extracted Preview */}
        {extractedConfig && (
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 space-y-6 shadow-xl animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{extractedConfig.name}</h2>
                <p className="text-xs text-amber-400 font-mono">Store Slug: /s/{extractedConfig.slug}</p>
                <p className="text-xs text-slate-400 mt-0.5">{extractedConfig.tagline}</p>
              </div>
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-lg flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Ready to Publish</span>
              </span>
            </div>

            {/* Catalog Items */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Extracted Catalog Items:
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {extractedConfig.catalog?.items?.map((item: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/80 border border-slate-700/80 p-3 rounded-xl space-y-1">
                    <div className="flex justify-between font-bold text-sm text-white">
                      <span>{item.name}</span>
                      <span className="text-amber-400">${(item.basePriceCents / 100).toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-slate-400">{item.description}</p>
                    <div className="text-[11px] text-slate-500">
                      Lead Time: <span className="text-slate-300 font-semibold">{item.leadTimeDays} days</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Note on Settlement */}
            <div className="p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs text-blue-300">
              ℹ️ In hackathon sandbox mode, payments settle to the demo merchant PayPal sandbox account.
            </div>

            {publishedStoreUrl ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-3 text-center">
                <p className="text-sm font-bold text-emerald-400">
                  🎉 Store Published Successfully!
                </p>
                <div className="flex justify-center space-x-3">
                  <a
                    href={publishedStoreUrl}
                    target="_blank"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow"
                  >
                    Open Live Storefront Chat
                  </a>
                  <a
                    href={`/dashboard/${extractedConfig.slug}`}
                    target="_blank"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
                  >
                    Open Seller Dashboard
                  </a>
                </div>
              </div>
            ) : (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publishing Store...</span>
                  </>
                ) : (
                  <>
                    <Store className="w-4 h-4" />
                    <span>Publish Store to /s/{extractedConfig.slug}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
