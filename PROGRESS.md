# Closer Project Progress

## Status Overview
- Current Milestone: M2 (Agent, Chat Storefront, Checkout & Mock PayPal)
- PAYPAL_MODE: mock (ready for sandbox toggle)
- Test Coverage: 20/20 unit tests passing (100% deterministic engine + PayPal client)

## Milestone Tracking
- [x] **M1: Core Engine, Database & PayPal Client**
  - [x] Project Scaffolding (Next.js 15, Tailwind, TypeScript, SWR, AG Grid)
  - [x] Prisma schema with multi-tenancy & SQLite/Postgres compatibility
  - [x] Pure deterministic business rules engine (`lib/engine/`)
  - [x] Vitest unit tests for pricing, discount caps, rush fees, deposit rounding, refund tiers
  - [x] Dual-mode PayPal client (`mock` + `sandbox`) in `lib/paypal.ts`
  - [x] Seed script (`prisma/seed.ts`) with Sugar & Spice Bakes
  - [x] PayPal smoke test script (`scripts/smoke-paypal.ts`)
  - [x] Render Blueprint (`render.yaml`) and `.env.example`
- [ ] **M2: Conversational Agent & Customer Checkout Flow**
  - [ ] Agent system prompt & tool definitions with Zod
  - [ ] Agent run loop with audit logging of guardrails
  - [ ] Customer chat UI (`/s/[slug]`) with quick prompts & structured cards
  - [ ] Dynamic quote card with "Accept and pay deposit"
  - [ ] Deposit checkout flow (`/pay/[paymentId]`) with PayPal redirect
  - [ ] Mock approval UI (`/mock-paypal/[orderId]`)
  - [ ] Return handler with idempotent capture & chat confirmation
- [ ] **M3: Seller Dashboard, Balance, Refunds & Escalations**
  - [ ] Passcode-protected seller dashboard (`/dashboard/[slug]`)
  - [ ] AG Grid orders table with real-time status and row actions
  - [ ] Agent activity audit timeline with guardrail enforcement badges
  - [ ] Escalation queue with custom refund approval/denial
  - [ ] Fast-forward demo clock (+1 day, +5 days, reset)
  - [ ] Balance request and payment flow (`paid_in_full`)
  - [ ] Policy-based cancellation and PayPal refund flow
  - [ ] Verified webhook handler with idempotent processing
  - [ ] Demo reset endpoint (`/api/admin/reset-demo`)
- [ ] **M4: Sandbox Verification & Testing**
  - [ ] Prompt-injection security tests
  - [ ] Playwright E2E tests for order, balance, and cancellation flows
  - [ ] Production build and health check (`/api/health`)
- [ ] **M5: P1 Features**
  - [ ] AI catalog onboarding (`/onboarding`)
  - [ ] Stage-based follow-up agent cron (`/api/cron/followups`)
  - [ ] Daily brief AI summary
- [ ] **M6: Hackathon Delivery**
  - [ ] Devpost submission draft
  - [ ] 2m30s demo video script & walkthrough guide
  - [ ] Final documentation in `README.md`
