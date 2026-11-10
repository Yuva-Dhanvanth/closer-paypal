# Closer: Devpost Hackathon Submission Draft

### Tagline
The AI sales agent that turns chats into paid orders.

---

### Inspiration
Bespoke creators and solo entrepreneurs—custom bakers, tailors, photographers, tutors, and freelance designers—conduct their entire business through direct messages. But answering inquiries at midnight, calculating custom quotes on scrap paper, and chasing unpaid balances by hand drains hours and loses up to 30% of sales. Existing conversational AI tools are either untrusted chatbots that risk hallucinating discounts, or disconnected assistants that cannot process real payments. We built **Closer** to solve this: an autonomous sales and collections agent that guides buyers from initial questions through deterministic quotes, secure PayPal deposits, balance follow-ups, and policy-governed refunds.

---

### What It Does
1. **Consultative Quoting & Negotiation**: A customer chats with the seller's storefront agent to customize their order; the agent consults a deterministic rules engine to price line options, enforce lead times, apply rush fees, and cap discounts inside merchant policies.
2. **Instant PayPal Deposit Checkout**: The customer reviews an itemized quote card and clicks "Accept and Pay Deposit", seamlessly completing a 30% upfront reservation through PayPal Orders v2.
3. **Automated Balance Collections**: As delivery approaches, an autonomous follow-up agent dispatches stage-based reminders with fresh PayPal payment links, moving orders from `deposit_paid` to `paid_in_full`.
4. **Policy-Governed Refunds & Seller Exceptions**: Cancellations automatically trigger tiered refunds through the PayPal Refunds API (100% $\ge$ 7 days, 50% for 3–7 days), while late cancellations route to a human dashboard queue where merchant approval executes the refund instantly.

---

### How We Built It
We structured Closer around a foundational design principle: **"The AI proposes, the rules decide, a human clicks."**

- **PayPal Integration**: Implemented a resilient, lightweight TypeScript client for **PayPal Orders v2** (`create` with unique request idempotency and `capture`), the **PayPal Refunds API**, and signature-verified **Webhooks** (`POST /v1/notifications/verify-webhook-signature`). We designed a fresh-order-per-click architecture so payment links never break due to approval expirations, paired with an offline mock simulator for local development and automated testing.
- **Deterministic Rules Engine (`lib/engine/`)**: Pure, unit-tested TypeScript functions that govern all math—base pricing, options deltas, $25 minimum order threshold, lead time validation, 20% rush fees, tiered discount caps, and deposit rounding up to the next cent.
- **Agent Intelligence**: Powered by **Anthropic Claude** via structured tool calling (`create_quote`, `get_order_status`, `propose_cancellation`, `escalate_to_seller`) with an intelligent fallback mode that runs seamlessly even prior to key configuration.
- **Seller Control Center with AG Grid**: Built with **AG Grid React**, providing high-performance order sorting, filtering, and real-time status management alongside an **Agent Guardrail Audit Trail** that proves every price and discount was strictly capped by policy.
- **Full Stack Infrastructure**: Next.js 15 App Router, TypeScript, Tailwind CSS, Prisma ORM, and Render Blueprint deployment (`render.yaml`). During API integration, we leveraged APIMatic's Context Plugin to verify schema contracts against current PayPal endpoints.

---

### Challenges We Overcame
1. **Keeping the LLM Completely Away from Money**: Large Language Models are prone to social engineering and prompt injection. We established a strict boundary: the LLM never generates numbers or executes transfers. All financial figures originate from pure deterministic functions and are persisted in the database before rendering structured UI cards.
2. **Idempotent Payment Captures & Webhook Deduplication**: Handling double-clicks, concurrent approvals, and unordered webhooks required strict idempotency keys (`PayPal-Request-Id`, custom invoice IDs, and unique event ingestion records) ensuring payments and refunds cannot be captured twice.
3. **Time-Travel Demo Synchronization**: Demonstrating an entire weeks-long order lifecycle (quoting, deposit, balance reminder, cancellation tier shift) within a 2-minute video was solved by engineering a simulated demo clock offset into the business rules engine.

---

### Accomplishments We're Proud Of
- A completely functioning, zero-hallucination commercial agent that bridges conversational AI directly to PayPal checkout.
- Achieving a 100% pass rate across 28 unit, integration, and security injection tests.
- Highlighting the trust story through the AG Grid dashboard, showing judges exactly how rule guardrails intervene (e.g., *"Customer asked for 15% off, rules capped it at 5%"*).
- Building an AI Onboarding feature where merchants can paste an unstructured menu or Instagram bio and launch a customized store in under 15 seconds.

---

### What We Learned
Deterministic engines paired with tool-calling models represent the true future of Agentic Commerce. Customers love the conversational flexibility of chat, while merchants demand mathematical certainty and audited rules before any transaction is initiated.

---

### What's Next (Roadmap)
- **Agent-to-Agent Commerce (MCP / REST)**: Expose Model Context Protocol endpoints so autonomous personal buyer agents can shop Closer stores programmatically.
- **Multi-Tenant PayPal Commerce Platform**: Per-seller PayPal Partner onboarding with split fees and platform marketplace payouts.
- **Omnichannel Expansion**: Direct integration with WhatsApp Business and Instagram Direct Messages.
- **PayPal Invoicing API**: Automated corporate PDF invoicing alongside interactive quote cards.

---

### Built With
- **PayPal APIs**: Orders v2, Captures, Refunds API, Webhooks
- **Framework & Language**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data & ORM**: Prisma ORM, SQLite / Neon Postgres
- **Dashboard & UI**: AG Grid React, Lucide Icons, SWR
- **AI & Tools**: Anthropic Claude SDK, APIMatic Context Plugin
- **Deployment**: Render Web Service Blueprint

---

### Try It Out
- **Live Demo URL**: https://closer-agent.onrender.com (or local `http://localhost:3000`)
- **Customer Storefront**: `/s/sugar-and-spice`
- **Seller Dashboard**: `/dashboard/sugar-and-spice` (Passcode: `closer2026`)
- **PayPal Sandbox Buyer Account**:
  - Email: `buyer-sandbox@closer.dev` (or your PayPal Sandbox Personal account)
- **Cold-Start Note**: If visiting on a Render free tier instance, please allow 30–40 seconds for the initial cold start.
