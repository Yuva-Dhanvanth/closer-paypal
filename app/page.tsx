import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  CreditCard,
  MessageSquare,
  ArrowRight,
  RotateCcw,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-amber-500 selection:text-white">
      {/* Hero Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🍰</span>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-white flex items-center space-x-1">
                <span>Closer</span>
                <span className="text-amber-400">.</span>
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/dashboard/sugar-and-spice"
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white transition"
            >
              Seller Dashboard
            </Link>
            <Link
              href="/s/sugar-and-spice"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition flex items-center space-x-1"
            >
              <span>Try Live Demo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PayPal AI Hackathon 2026 Submission</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight sm:leading-none">
          The AI Sales &amp; Collections Agent that Turns Chats into{" "}
          <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 bg-clip-text text-transparent">
            Paid Orders
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          For custom cakes, tailoring, tutoring, photography, and bespoke makers taking orders in DMs.
          The AI negotiates inside your rules, collects deposits via PayPal, chases balances, and handles policy refunds.
        </p>

        {/* Philosophy Callout Box */}
        <div className="mt-8 max-w-2xl mx-auto bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-sm text-slate-300 flex items-center space-x-3 text-left">
          <ShieldCheck className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <span className="font-bold text-white block">The Trust Story:</span>
            <span>&ldquo;The AI proposes, the rules decide, a human clicks.&rdquo; The model never calculates a price or moves money autonomously.</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/s/sugar-and-spice"
            className="px-6 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-bold text-sm rounded-xl shadow-xl shadow-amber-500/25 transition flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Open Customer Chat Storefront</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            href="/dashboard/sugar-and-spice"
            className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold text-sm rounded-xl transition flex items-center space-x-2"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Open Seller AG Grid Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-800">
        <h2 className="text-center font-bold text-2xl text-white mb-12">
          End-to-End Autonomous Commerce Lifecycle
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              1
            </div>
            <h3 className="font-bold text-lg text-white">Rule-Enforced Negotiation</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Customer asks for 15% off. The deterministic pricing engine inspects order volume and caps the discount at 5% or 10% with full audit explanation.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              2
            </div>
            <h3 className="font-bold text-lg text-white">PayPal Orders v2 Checkout</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Customer accepts the quote card and pays a 30% deposit via PayPal sandbox checkout. Fresh order generation ensures links never expire.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-800/50 border border-slate-700/80 rounded-2xl p-6 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              3
            </div>
            <h3 className="font-bold text-lg text-white">Tiered Refunds &amp; Exceptions</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              100% refund for 7+ days, 50% for 3-7 days, and 0% for &lt;3 days with seller exception queue. Approvals trigger the PayPal Refunds API directly.
            </p>
          </div>
        </div>
      </section>

      {/* Split-Screen Demo Instructions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center bg-slate-800/30 rounded-3xl border border-slate-800 my-8">
        <h3 className="text-xl font-bold text-white mb-2">How to Run the Split-Screen Demo</h3>
        <p className="text-sm text-slate-400 max-w-xl mx-auto mb-6">
          Open two browser windows side by side: <br />
          <code className="text-amber-400 font-mono">/s/sugar-and-spice</code> on the left and{" "}
          <code className="text-amber-400 font-mono">/dashboard/sugar-and-spice</code> on the right.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/s/sugar-and-spice"
            target="_blank"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl"
          >
            Launch Left Window (Customer Chat)
          </Link>
          <Link
            href="/dashboard/sugar-and-spice"
            target="_blank"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl"
          >
            Launch Right Window (Dashboard)
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 text-center text-xs text-slate-500">
        Closer · Built for PayPal AI Hackathon 2026 · Powered by PayPal Orders v2, AG Grid, Render &amp; Anthropic Claude
      </footer>
    </div>
  );
}
