# Closer Project Progress

## Status Overview
- Current Milestone: M3 (Dashboard, AG Grid, Webhooks & Escalations)
- PAYPAL_MODE: mock (ready for sandbox toggle)
- Test Coverage: 22/22 tests passing (Deterministic engine + PayPal client + Agent & Guardrails)

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
- [x] **M2: Conversational Agent & Customer Checkout Flow**
  - [x] Agent system prompt & tool definitions with Zod
  - [x] Agent run loop with audit logging of guardrails
  - [x] Customer chat UI (`/s/[slug]`) with quick prompts & structured cards
  - [x] Dynamic quote card with "Accept and pay deposit"
  - [x] Deposit checkout flow (`/pay/[paymentId]`) with PayPal redirect
  - [x] Mock approval UI (`/mock-paypal/[orderId]`)
  - [x] Return handler with idempotent capture & chat confirmation
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
