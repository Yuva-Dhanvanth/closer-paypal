# Closer: 2-Minute 30-Second Video Demo Script

**Setup**: Open two browser windows side by side:
- **Left Window**: Customer Storefront (`http://localhost:3000/s/sugar-and-spice`)
- **Right Window**: Seller AG Grid Dashboard (`http://localhost:3000/dashboard/sugar-and-spice`)

---

### [0:00 - 0:15] The Hook & The Problem
**Voiceover**:
"Small makers—custom cake bakers, tailors, tutors, designers—conduct almost all their business in DMs. But answering questions at midnight, pricing options by hand, and chasing unpaid balances burns hours and loses sales. Meet Closer: the autonomous AI sales and collections agent that turns chats into paid PayPal orders."

**Visual**:
Camera focuses on split screen showing the clean boutique storefront on the left and the AG Grid control center on the right.

---

### [0:15 - 0:50] The Consultative Quote & Rule Guardrails
**Action**:
On the left window, click or type:  
*"I'd like to order a 2kg Belgian chocolate cake for next Saturday and can I get a 15% discount?"*

**Voiceover**:
"On the left, a customer chats with the bakery agent. The customer asks for a 2kg chocolate cake with a 15% discount. Watch how Closer responds: the agent doesn't guess prices or make promises. It invokes our deterministic rules engine. The engine calculates the options, verifies the lead time, but caps the discount at 5% because the subtotal is under $150. A rich, itemized quote card appears with the exact breakdown and a 30% deposit calculation."

---

### [0:50 - 1:15] Instant PayPal Deposit Checkout
**Action**:
Click **"Accept & Pay Deposit ($25.46)"**. Enter name: `Jane Doe`, email: `jane@example.com`. Click **"Pay Deposit"**.  
Browser redirects to PayPal sandbox approval screen (or mock sandbox approval). Click **"Complete Purchase & Approve"**.  
Chat instantly displays the verified green **PayPal Receipt Card**.

**Voiceover**:
"Jane clicks 'Accept & Pay Deposit', inputs her details, and is redirected to PayPal Orders v2. She approves the transaction. The server captures the payment idempotently, stores the capture ID, marks the order booked, and drops a receipt card right into the chat. Look at the right window: within seconds, AG Grid populates Jane's new order row live."

---

### [1:15 - 1:30] The Trust Story: Agent Audit Trail
**Action**:
On the right window (Dashboard), click the **"Agent Guardrail Audit Trail"** tab. Point mouse to the high-contrast yellow badge.

**Voiceover**:
"Here is the screen that gives merchants and judges total peace of mind: our Agent Guardrail Audit Trail. It logs every single tool call and rule enforcement. Look at this line: *'Guardrail: Discount requested 15% capped at 5% by policy'*. Our core principle: **The AI proposes, the rules decide, a human clicks.** The LLM never sets a price and never moves money on its own."

---

### [1:30 - 1:55] Time Travel & Automated Balance Chase
**Action**:
In the top control bar of the dashboard, click **"+5 Days"**. Then click **"Run Follow-ups"**.  
Look at the left window (Chat): A balance reminder card appears with a direct PayPal link!  
Click the balance pay link, approve on PayPal, and observe the dashboard update to **"Paid in Full"**.

**Voiceover**:
"Five days before delivery, balance collections start. Using our demo fast-forward clock, we advance 5 days and trigger our follow-up agent. Closer detects the outstanding balance, generates a fresh PayPal payment link, and sends a friendly reminder into Jane's chat. Jane clicks to pay her remaining balance, and the order transitions cleanly to 'Paid in Full'."

---

### [1:55 - 2:15] Tiered Cancellation & Seller Exception Queue
**Action**:
Back in chat, type: *"I need to cancel my order"*.  
Show the refund card for policy tiers. Then demonstrate a late cancellation: an escalation notice appears and lands directly in the right window's **"Exception Queue"**.  
On the dashboard, click **"Approve Refund ($25.46)"**.  
Show the chat confirming the refund credited via PayPal Refunds API!

**Voiceover**:
"What about cancellations? Closer's engine automatically enforces tiered policies: 100% refund for 7+ days, 50% for 3 to 7 days, and 0% for under 3 days. When a late cancellation occurs, it routes to the seller's exception queue. The owner reviews the circumstances, clicks 'Approve Refund', and Closer triggers the PayPal Refunds API directly against the original capture."

---

### [2:15 - 2:30] Stack & Roadmap
**Voiceover**:
"Closer is built on Next.js 15, PayPal Orders v2, Refunds, and Webhooks, Anthropic Claude, AG Grid, and Render. Next up: Model Context Protocol endpoints so autonomous personal agents can buy from Closer stores directly. Closer turns chats into paid orders—safely, reliably, and autonomously."
