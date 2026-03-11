# SeedhaPe
### *seedha paisa. zero cut.*

**Product Requirements Document**
Version 1.0 | March 2026 | Confidential

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [System Architecture](#4-system-architecture)
5. [Product Components](#5-product-components)
6. [Technical Constraints & Decisions](#6-technical-constraints--decisions)
7. [Go-To-Market Strategy](#7-go-to-market-strategy)
8. [Build Sequence (Claude Code Roadmap)](#8-build-sequence-claude-code-roadmap)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Success Metrics](#10-success-metrics)

---

## 1. Executive Summary

SeedhaPe is a UPI payment middleware for Indian digital merchants that enables automated payment verification and order fulfillment without requiring a traditional payment gateway. Merchants save 2-3% on every transaction — money that currently goes to Razorpay, Cashfree, or PayU — while retaining the simplicity and ubiquity of UPI.

The system works by deploying a lightweight Android app on the merchant's phone that listens for UPI payment notifications in real time. When a payment is received matching a pending order, SeedhaPe automatically fulfills the order and fires a webhook to the merchant's system. If automated verification fails, a manual fallback ensures no transaction is permanently lost.

> **Core Value Proposition:** Zero gateway fees. Zero KYC overhead. Zero code required to get started. Just UPI — direct to your bank account, automatically verified.

### Key Metrics Targets (12 Months)

| Metric | Target |
|---|---|
| Active Merchants | 500+ merchants on platform |
| Monthly Transactions | 50,000+ verified payments |
| Avg Transaction Value | ₹200 – ₹2,000 |
| Verification Success Rate | >92% automated (no manual needed) |
| Merchant Churn | <5% monthly |
| Revenue Model | ₹299–₹999/month subscription tiers |

---

## 2. Problem Statement

### Who We're Building For

Solo developers, indie hackers, digital creators, and small online businesses in India who sell digital products — courses, SaaS tools, templates, ebooks, memberships — and need a way to accept UPI payments on their websites without the friction of traditional payment gateways.

### The Pain Today

- Razorpay, Cashfree, PayU charge 2-3% per transaction plus GST on top
- Payment gateway onboarding requires business registration, GST number, bank statements, website review — often weeks of back and forth
- Many solo builders and early-stage products don't qualify or get rejected
- International payment processors (Stripe, Paddle) don't natively support UPI
- Manual UPI collection (screenshot-based) doesn't scale and creates customer friction

> **The Gap:** There is no lightweight, code-optional, zero-KYC payment verification layer for UPI in India. SeedhaPe fills exactly this gap — using the merchant's own UPI account and phone as the verification infrastructure.

### Why Now

- India has 500M+ active UPI users — it is the default payment method
- BharatPe, PhonePe for Business, and GPay for Business have normalized merchant UPI setups
- Android's `NotificationListenerService` is mature and stable
- Small digital businesses are growing rapidly but remain underserved by fintech

---

## 3. Solution Overview

### How SeedhaPe Works

1. Merchant signs up on seedhape.in and installs the Android app on their phone
2. Merchant links their UPI ID (any personal or business UPI) to their SeedhaPe account
3. Merchant integrates SeedhaPe into their website using a JS snippet, React component, or REST API
4. When a customer checks out, SeedhaPe generates a dynamic QR code with order ID embedded in the UPI transaction note (`tn`) field
5. Customer scans QR and pays via any UPI app
6. SeedhaPe Android app on merchant's phone detects the incoming payment notification
7. App parses amount, UTR, and order ID from notification — matches to pending order within timer window
8. If matched: webhook fires to merchant backend, customer gets access automatically
9. If not matched: order enters dispute state, customer uploads payment screenshot, merchant manually approves via dashboard

### Order State Machine

| State | Description | User Facing |
|---|---|---|
| `CREATED` | QR generated, timer started (10 min window) | "Scan to pay" screen shown |
| `PENDING` | Payment initiated by customer | "Verifying payment..." shown |
| `VERIFIED` | Notification matched, webhook fired | Access granted automatically |
| `DISPUTED` | Match failed — offline/collision/timeout | Screenshot upload prompt shown |
| `RESOLVED` | Merchant manually approved in dashboard | Access granted, merchant notified |
| `EXPIRED` | Timer elapsed, no payment detected | "Order expired" shown, retry option |
| `REJECTED` | Merchant rejected disputed claim | Customer notified, directed to merchant |

### Liability Model

SeedhaPe is a notification middleware, not a payment processor. Money flows directly from customer's UPI app to merchant's bank account. SeedhaPe never touches, holds, or routes funds. In disputed transactions, SeedhaPe provides the evidence trail (order logs, screenshot OCR, timestamps) but dispute resolution is entirely between merchant and customer.

---

## 4. System Architecture

### Components

| Component | Role |
|---|---|
| **seedhape.in** (Next.js) | Marketing site, merchant onboarding, documentation hub, hosted payment pages |
| **Merchant Dashboard** (Next.js) | Transaction management, dispute resolution, analytics, API key management |
| **Android App** (React Native) | NotificationListenerService, heartbeat, payment matching engine, mobile dashboard |
| **Backend API** (Node.js) | Order management, webhook delivery, merchant auth, notification parsing orchestration |
| **Database** (PostgreSQL) | Orders, merchants, transactions, disputes, audit logs |
| **Queue** (Redis/BullMQ) | Webhook retry queue, notification processing queue, heartbeat tracking |
| **SeedhaPe JS SDK** | Drop-in payment button, QR generator, status poller for web integration |
| **SeedhaPe React Component** | Pre-built `PaymentButton` and `PaymentModal` components for React apps |

---

### Android App Architecture

#### NotificationListenerService

Runs as a persistent foreground service. Monitors notifications from:

- `com.phonepe.app` — PhonePe
- `net.one97.paytm` — Paytm
- `com.google.android.apps.nbu.paisa.user` — Google Pay
- `in.org.npci.upiapp` — BHIM
- `com.bharatpe.merchant` — BharatPe
- `com.amazon.mShop.android.shopping` — Amazon Pay

#### Notification Parser

Extracts from notification text using per-app regex patterns:

- Amount (₹ value)
- UTR number (12-digit unique transaction reference)
- Order note / transaction reference (`tn` field)
- Sender name (secondary matching signal)
- Timestamp

#### Heartbeat System

App sends a lightweight ping to backend every **60 seconds**. If backend sees no heartbeat for **90 seconds**, it automatically sets merchant status to `OFFLINE` and disables their payment page. When app reconnects, status flips back to `ONLINE`. This ensures customers never reach a payment screen when the verification system is unavailable.

#### Background Persistence (Android)

Android's aggressive battery optimization on Indian OEM phones (Xiaomi, Realme, Samsung, OnePlus) kills background services. SeedhaPe handles this via:

- Foreground service with persistent notification (cannot be killed)
- Onboarding flow guides merchant through disabling battery optimization for SeedhaPe
- Wake lock during active payment windows
- Auto-restart on boot via `BOOT_COMPLETED` receiver

---

### Payment Matching Logic

#### Primary Match — Automated (target: 92%+ of transactions)

1. Extract `order_id` from notification's transaction note field (`tn` parameter)
2. Look up pending order by `order_id`
3. Verify amount matches exactly
4. Verify timestamp is within order's expiry window
5. If all match → mark `VERIFIED`, fire webhook

#### Secondary Match — Fallback (when `tn` field absent)

1. Match by amount + merchant UPI ID + timestamp window
2. If single unambiguous match found → mark `VERIFIED`
3. If multiple matches (collision) → route all to `DISPUTED`
4. Merchant resolves via dashboard

#### Collision Prevention

To reduce same-amount collisions: each order QR includes a unique `tn` field. Merchants are encouraged to use amount-randomization (e.g., ₹499 → ₹499.01, ₹499.02) for concurrent orders. SeedhaPe SDK can auto-randomize amount by ±2 paise.

---

### Screenshot OCR Fallback

When an order enters `DISPUTED` state, the customer is prompted to upload a screenshot of their payment confirmation. SeedhaPe:

- Extracts UTR number using server-side OCR (Google Vision API or Claude Vision)
- Logs extracted UTR against the disputed order as evidence
- Pushes to merchant dashboard for manual review
- Merchant can approve or reject with one tap
- Customer notified of outcome via email/SMS

---

## 5. Product Components

### 5.1 seedhape.in — Marketing & Onboarding Site

#### Pages

| Route | Purpose |
|---|---|
| `/` | Landing page: value prop, pricing, testimonials, CTA |
| `/docs` | Integration documentation hub |
| `/docs/quickstart` | 5-minute integration guide |
| `/docs/sdk/js` | JS SDK reference |
| `/docs/sdk/react` | React component reference |
| `/docs/api` | REST API reference |
| `/docs/webhooks` | Webhook payload reference |
| `/pricing` | Plan comparison |
| `/dashboard` | Merchant dashboard (authenticated) |
| `/pay/:order_id` | Hosted payment page |

#### Hosted Payment Page (`/pay/:order_id`)

Zero-integration option. Merchant creates order via API, shares the `/pay/:order_id` link with customer. SeedhaPe hosts the entire payment experience including QR display, status polling, and confirmation screen. Equivalent to Razorpay payment links — but with zero fees.

---

### 5.2 Merchant Dashboard

#### Transactions Tab
- Real-time feed of incoming payments
- Status badges: `VERIFIED` (green), `DISPUTED` (amber), `EXPIRED` (gray), `REJECTED` (red)
- Search and filter by date, amount, status, order ID
- Export to CSV
- Full transaction detail: order metadata, notification raw text, UTR, screenshot if uploaded

#### Disputes Tab
- Queue of all orders in `DISPUTED` state
- Screenshot viewer with extracted OCR data
- One-tap Approve / Reject with optional note
- Approved orders fire webhook retroactively to merchant backend

#### Analytics Tab
- Total verified payments (daily/weekly/monthly)
- Automated vs manual resolution rate
- Average verification time
- Top payment apps used by customers
- **Revenue saved vs gateway fees** (₹ amount displayed prominently)

#### Settings Tab
- UPI ID management (link/change)
- Webhook URL configuration and test
- API key generation and rotation
- Payment page customization (logo, brand color, success message)
- Notification app selection (which UPI apps to monitor)
- Order timer configuration (default 10 min, adjustable 5–30 min)

---

### 5.3 React Native Android App

#### Screens
- **Onboarding** — account link, notification access grant, battery optimization guide
- **Home** — live status indicator (ONLINE/OFFLINE), today's payment count, last verified transaction
- **Transactions** — mobile-optimized transaction feed
- **Disputes** — dispute resolution queue, screenshot viewer, approve/reject
- **Settings** — UPI ID, webhook URL, app preferences

#### Status Indicator

Prominent green/red status pill on home screen. Green = notification listener active, heartbeat sending, merchant page ONLINE. Red = listener not running or heartbeat missed. Tap to diagnose and fix. This is the most critical UX element — merchants need to know at a glance if their payment system is alive.

---

### 5.4 JS SDK

**Installation**

```html
<!-- Option 1: Script tag -->
<script src="https://cdn.seedhape.in/sdk.js"></script>
```

```bash
# Option 2: npm
npm install @seedhape/sdk
```

**Usage**

```javascript
SeedhaPe.init({ apiKey: 'sp_live_xxxx' });

const order = await SeedhaPe.createOrder({
  amount: 499,
  currency: 'INR',
  orderId: 'YOUR_ORDER_ID',
  customerEmail: 'customer@example.com',
  description: 'HiredAF Pro - 1 month'
});

SeedhaPe.showPayment(order, {
  onSuccess: (data) => {
    // data.utr, data.orderId, data.verifiedAt
    grantAccess();
  },
  onDisputed: (data) => {
    showMessage('Payment received - verifying manually');
  },
  onExpired: () => {
    showMessage('Payment window expired. Please try again.');
  }
});
```

---

### 5.5 React Component

```jsx
import { SeedhaPeButton } from '@seedhape/react';

<SeedhaPeButton
  apiKey="sp_live_xxxx"
  amount={499}
  orderId={orderId}
  description="HiredAF Pro"
  onSuccess={(data) => grantAccess(data.orderId)}
  onDisputed={() => showPendingMessage()}
  theme={{ primaryColor: '#1A6B3C' }}
/>
```

---

### 5.6 REST API

**Create Order**

```http
POST https://api.seedhape.in/v1/orders
Authorization: Bearer sp_live_xxxx
Content-Type: application/json

{
  "amount": 499,
  "currency": "INR",
  "order_id": "YOUR_INTERNAL_ORDER_ID",
  "description": "HiredAF Pro - 1 month",
  "customer_email": "customer@example.com",
  "expires_in": 600
}
```

```json
// Response
{
  "id": "sp_ord_xxxx",
  "qr_url": "https://api.seedhape.in/qr/sp_ord_xxxx",
  "upi_uri": "upi://pay?pa=merchant@okicici&am=499&tn=sp_ord_xxxx",
  "payment_url": "https://seedhape.in/pay/sp_ord_xxxx",
  "expires_at": "2026-03-11T10:30:00Z",
  "status": "created"
}
```

**Webhook Payload**

```http
POST your-webhook-url
X-SeedhaPe-Signature: sha256=xxxx
Content-Type: application/json
```

```json
{
  "event": "payment.verified",
  "order_id": "YOUR_INTERNAL_ORDER_ID",
  "seedhape_order_id": "sp_ord_xxxx",
  "amount": 499,
  "utr": "412345678901",
  "verified_at": "2026-03-11T10:22:45Z",
  "verification_method": "automatic",
  "customer_email": "customer@example.com"
}
```

---

## 6. Technical Constraints & Decisions

| Constraint | Detail |
|---|---|
| **Notification listener** | Only catches live notifications. Historical notifications on phone-restart are not recoverable. Mitigated by heartbeat-based offline detection. |
| **`tn` field reliability** | Not all UPI apps include transaction note in notification text. Must be tested empirically per app before launch. Secondary matching handles gaps. |
| **Android OEM killing** | Xiaomi, Realme, OnePlus aggressively kill background services. Foreground service + onboarding guide is the mitigation. Merchants must whitelist the app. |
| **Fraud surface** | Fake notifications possible on rooted devices. Mitigated by UTR logging, screenshot OCR, and manual review for disputes. |
| **Regulatory position** | SeedhaPe is notification middleware, not a payment aggregator. Money never touches SeedhaPe. No RBI license required at current scope. Re-evaluate if volume exceeds ₹10Cr/month or escrow features are added. |
| **Platform** | Android only. iOS does not support `NotificationListenerService` equivalent. Merchant must have an Android device — not a constraint for the target market. |

---

## 7. Go-To-Market Strategy

### Target Merchant Personas

#### Primary: The Solo Digital Builder
Indie hackers, solo SaaS founders, developers selling tools or templates. Technical enough to integrate an API. Deeply cost-conscious. Already frustrated with Razorpay's KYC. This is the early adopter segment.

#### Secondary: The Digital Creator
Course creators, coaches, writers selling memberships. Non-technical but willing to install an app and paste a script tag. Attracted by fee savings on recurring revenue.

#### Tertiary: The Freelancer
Designers, copywriters, developers who invoice clients. Use SeedhaPe to accept project payments without the overhead of a business account or gateway.

### Launch Sequence

1. **Private beta** — 20 merchants from personal network, dogfood on own products (HiredAF, Lokham, Rasphia)
2. **Build-in-public** — Twitter/X thread documenting the build, the problem, and early results
3. **Product Hunt launch** — "The UPI payment gateway with zero fees"
4. **Developer communities** — Indie Hackers India, r/developersIndia, Twitter/X IndieHackers
5. **Content** — "How I replaced Razorpay with ₹0/month" blog post for organic search traffic

### Pricing

| Plan | Price | Transactions | Features |
|---|---|---|---|
| **Free** | ₹0/mo | 50/month | SeedhaPe branding, email support |
| **Starter** | ₹299/mo | 500/month | Custom payment page, webhooks, basic analytics |
| **Growth** | ₹699/mo | Unlimited | Advanced analytics, multi-UPI ID, team access |
| **Pro** | ₹999/mo | Unlimited | White-label page, dedicated support, SLA |

> **The pitch:** A merchant doing ₹1,00,000/month in UPI sales pays ₹2,000–3,000 to Razorpay. SeedhaPe costs ₹699. The math is obvious.

---

## 8. Build Sequence (Claude Code Roadmap)

### Phase 1 — Proof of Concept (Week 1–2)
- [ ] Android: `NotificationListenerService` capturing PhonePe + GPay notifications
- [ ] Android: Parse amount, UTR, note field — log to console
- [ ] **Test `tn` field visibility across all major UPI apps on real device**
- [ ] Basic Express backend: `POST /notification` endpoint
- [ ] Validate the core loop works before building anything else

### Phase 2 — Core Infrastructure (Week 3–4)
- [ ] PostgreSQL schema: merchants, orders, transactions, disputes
- [ ] Order creation API with QR generation (`qrcode` library)
- [ ] Notification → order matching engine
- [ ] Heartbeat system (Android → backend → merchant status)
- [ ] Webhook delivery with retry queue (BullMQ)

### Phase 3 — Merchant App (Week 5–6)
- [ ] React Native app with foreground service
- [ ] Onboarding flow: account link, notification permission, battery optimization guide
- [ ] Home screen: live status, recent transactions
- [ ] Disputes screen: screenshot upload, approve/reject

### Phase 4 — Web Platform (Week 7–8)
- [ ] Next.js: seedhape.in landing page
- [ ] Next.js: merchant dashboard (transactions, disputes, analytics, settings)
- [ ] Hosted payment page (`/pay/:order_id`)
- [ ] JS SDK and React component
- [ ] API key management

### Phase 5 — Polish & Launch (Week 9–10)
- [ ] Documentation site
- [ ] Screenshot OCR pipeline (Google Vision / Claude Vision)
- [ ] Pricing and subscription billing
- [ ] Private beta with 20 merchants
- [ ] Bug fixes, edge cases, OEM-specific foreground service tuning

### Tech Stack

| Layer | Technology |
|---|---|
| Android App | React Native + Kotlin module for `NotificationListenerService` |
| Web Frontend | Next.js 14, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, PostgreSQL, Redis, BullMQ |
| Auth | Clerk or NextAuth |
| QR Generation | `qrcode` npm library (server-side) |
| OCR | Google Vision API (screenshot fallback) |
| Hosting | Railway or Render (backend), Vercel (frontend) |
| SMS/Email | Twilio / Resend |
| Monitoring | Sentry, Uptime Robot |

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| UPI app updates break notification format | Maintain parser test suite. Community reporting. Secondary matching always available as fallback. |
| Merchant keeps phone offline | Heartbeat system disables payment page automatically. Merchant's incentive (lost sales) drives compliance. |
| Google Play policy change on `NotificationListenerService` | Position as merchant tool (same category as AlertPay, UPI Announcer). Monitor Play policy. Sideload APK as fallback distribution. |
| Fraud via fake notifications | UTR logging, screenshot OCR, manual review for high-value disputes. Merchant bears responsibility for delivery. |
| Low `tn` field reliability on certain UPI apps | Test empirically in Phase 1. Secondary matching as fallback. Amount randomization (±2 paise) reduces collision probability. |
| Regulatory scrutiny at scale | SeedhaPe never holds funds. Clear ToS on dispute independence. Legal review before crossing ₹10Cr monthly facilitated volume. |

---

## 10. Success Metrics

### North Star
**Gross Transaction Volume (GTV)** facilitated through SeedhaPe per month.

### Leading Indicators

| Metric | Target |
|---|---|
| Automated verification rate | >92% of transactions verified without merchant intervention |
| Time to first payment | Merchant accepts first UPI payment within 15 minutes of signup |
| Heartbeat uptime | >95% of merchants' apps online during business hours |
| Dispute resolution time | <4 hours median from dispute to merchant decision |
| Webhook delivery rate | >99.5% successful delivery within 30 seconds of verification |

### Business Metrics

| Metric | Target |
|---|---|
| MRR | ₹1,50,000 by month 6 (500 merchants × ₹300 avg) |
| Net Revenue Retention | >110% (merchants grow sales, upgrade plans) |
| CAC | <₹500 (community-driven, build-in-public GTM) |
| Payback Period | <3 months |

---

*SeedhaPe — Confidential | seedhape.in | v1.0 March 2026*
