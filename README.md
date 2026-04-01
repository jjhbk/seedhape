# SeedhaPe

**UPI payment middleware for Indian digital merchants — zero gateway fees.**

SeedhaPe lets you accept UPI payments directly into your bank account. An Android app listens for UPI payment notifications, matches them to pending orders, and fires webhooks to your backend — all without routing money through Razorpay, Cashfree, or PayU. No 2–3% per-transaction cut.

```
Customer pays via UPI → Android app captures notification → Backend matches order → Webhook fires to your server
```

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Monorepo Structure](#monorepo-structure)
3. [Prerequisites](#prerequisites)
4. [Local Development Setup](#local-development-setup)
5. [Environment Variables](#environment-variables)
6. [Database Setup](#database-setup)
7. [Running the Services](#running-the-services)
8. [API Reference](#api-reference)
9. [JavaScript SDK](#javascript-sdk)
10. [React Components](#react-components)
11. [Android App Setup](#android-app-setup)
12. [Webhooks](#webhooks)
13. [Order Lifecycle](#order-lifecycle)
14. [Matching Engine](#matching-engine)
15. [Dashboard](#dashboard)
16. [Architecture Decisions](#architecture-decisions)
17. [Troubleshooting](#troubleshooting)
18. [Deployment (Render + Vercel)](#deployment-render--vercel)

---

## How It Works

```
┌─────────────┐    POST /v1/orders    ┌──────────────────┐
│  Your store │ ──────────────────── ▶│  SeedhaPe API    │
│  backend    │ ◀─────────────────── │  (Express + PG)  │
│             │   { id, upiUri, qr }  └──────────────────┘
└─────────────┘                               │ stores order
                                              ▼
┌─────────────┐    scans QR           ┌──────────────────┐
│  Customer   │ ─────────────────────▶│  Customer's      │
│             │                       │  UPI App         │
│             │ ◀───────────────────  │  (PhonePe etc.)  │
└─────────────┘    payment done        └──────────────────┘
                                               │ sends notification
                                               ▼
                                     ┌──────────────────┐
                                     │  Merchant's      │
                                     │  Android Phone   │
                                     │  (SeedhaPe app)  │
                                     └──────────────────┘
                                               │ POST /internal/notifications
                                               ▼
┌─────────────┐   POST (webhook)      ┌──────────────────┐
│  Your store │ ◀─────────────────── │  SeedhaPe API    │
│  backend    │  { event: verified }  │  matches + fires │
└─────────────┘                       └──────────────────┘
```

**Key insight**: The `tn` (transaction note) field in a UPI URI carries the order ID. When a customer pays `upi://pay?pa=merchant@ybl&am=500&tn=sp_ord_abc123`, the UPI app includes `sp_ord_abc123` in the payment notification. SeedhaPe reads this to match the payment to the exact order.

---

## Deployment (Render + Vercel)

Detailed production deployment runbook:
- `DEPLOYMENT_RENDER_VERCEL.md`

It covers:
- API deployment on Render (Postgres, Redis, build/start, env)
- Web deployment on Vercel (project config, env)
- Clerk webhook wiring
- SeedhaPe billing webhook wiring
- Post-deploy E2E verification checklist

---

## Monorepo Structure

```
seedhape/
├── apps/
│   ├── api/                    # Express REST API (Node.js 20+)
│   │   ├── src/
│   │   │   ├── db/             # Drizzle ORM — schema + migrations
│   │   │   ├── routes/         # Express routers
│   │   │   ├── services/       # matching.ts, orders.ts, webhooks.ts
│   │   │   ├── queues/         # BullMQ workers (webhooks, expiry, notifications)
│   │   │   ├── middleware/     # auth.ts, error-handler.ts
│   │   │   └── lib/            # logger.ts, redis.ts
│   │   └── drizzle.config.ts
│   │
│   ├── web/                    # Next.js 15 (App Router)
│   │   └── src/app/
│   │       ├── (marketing)/    # Landing page, pricing
│   │       ├── (dashboard)/    # Merchant dashboard (Clerk-protected)
│   │       └── (payment)/      # Hosted payment page /pay/[orderId]
│   │
│   └── mobileapp/              # React Native 0.84
│       ├── src/
│       │   ├── screens/        # HomeScreen, TransactionsScreen, etc.
│       │   └── services/       # api.ts, notification-bridge.ts
│       └── android/
│           └── .../com/seedhape/notification/
│               ├── NotificationListenerModule.kt   # RN bridge
│               ├── SeedhaPeNotificationService.kt  # Android service
│               └── NotificationParser.kt           # Per-app regex parsers
│
├── packages/
│   ├── shared/                 # @seedhape/shared — types, Zod schemas, utils
│   ├── sdk/                    # @seedhape/sdk — JS drop-in integration
│   └── react/                  # @seedhape/react — React components + hooks
│
└── tooling/                    # Shared ESLint, TypeScript, Prettier configs
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 20 | Runtime |
| pnpm | ≥ 9 | Package manager |
| Docker | any | Postgres + Redis |
| Android Studio | latest | Mobile development |
| A real Android device | Android 8+ | Testing notification capture |

Install pnpm if you don't have it:
```bash
npm install -g pnpm@9
```

---

## Local Development Setup

### 1. Clone and install

```bash
git clone <your-repo-url> seedhape
cd seedhape
pnpm install
```

### 2. Copy environment file

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```

Edit both files with your values (see [Environment Variables](#environment-variables)).

### 3. Start infrastructure

```bash
docker compose up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432`
- **Redis 7** on `localhost:6379`

Verify they're running:
```bash
docker compose ps
```

### 4. Set up the database

```bash
# Generate migration files from Drizzle schema
pnpm db:generate

# Run migrations against the local database
pnpm db:migrate
```

### 5. Start development servers

In separate terminals:

```bash
# Terminal 1 — API server (port 3001)
pnpm --filter @seedhape/api dev

# Terminal 2 — Web app (port 3000)
pnpm --filter @seedhape/web dev
```

Or run everything together:
```bash
pnpm dev
```

---

## Environment Variables

### `apps/api/.env`

```env
# Database (matches docker-compose defaults)
DATABASE_URL=postgresql://seedhape:seedhape_dev_password@localhost:5432/seedhape

# Redis (matches docker-compose defaults)
REDIS_URL=redis://:seedhape_redis_password@localhost:6379

# Clerk — get from https://dashboard.clerk.com
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...

# Server
API_PORT=3001
NODE_ENV=development
```

### `apps/web/.env.local`

```env
# Clerk (same project as API)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# API URL
NEXT_PUBLIC_API_URL=http://localhost:3001
API_BASE_URL=http://localhost:3001
```

### `apps/mobileapp/.env`

```env
SEEDHAPE_API_URL=http://10.0.2.2:3001   # Android emulator → localhost
CLERK_PUBLISHABLE_KEY=pk_test_...
```

> **Note**: On a real Android device replace `10.0.2.2` with your machine's LAN IP (e.g. `192.168.1.100`).

---

## Database Setup

SeedhaPe uses **Drizzle ORM** with PostgreSQL. The schema lives in `apps/api/src/db/schema/`.

### Tables

| Table | Purpose |
|-------|---------|
| `merchants` | Merchant accounts linked to Clerk users |
| `orders` | Payment orders with UPI URI and status |
| `transactions` | Matched UPI payments (UTR, amount, sender) |
| `disputes` | Orders flagged for manual review |
| `webhook_deliveries` | Webhook attempt log with retry state |
| `api_keys` | Hashed API keys per merchant/environment |
| `device_tokens` | Registered Android devices per merchant |

### Useful commands

```bash
# Inspect schema changes and generate migration SQL
pnpm db:generate

# Apply pending migrations
pnpm db:migrate

# Open Drizzle Studio (visual DB browser)
pnpm --filter @seedhape/api db:studio

```

---

## Running the Services

### API (`apps/api`)

```bash
pnpm --filter @seedhape/api dev      # development (hot reload via tsx)
pnpm --filter @seedhape/api build    # compile TypeScript
pnpm --filter @seedhape/api start    # run compiled output
```

The API starts on `http://localhost:3001` and automatically launches four BullMQ workers:
- **Webhook worker** — delivers signed webhooks with exponential backoff
- **Order expiry worker** — flips `CREATED`/`PENDING` orders to `EXPIRED` at their deadline
- **Notification worker** — processes parsed UPI notifications from the Android app
- **Heartbeat monitor** — marks merchants `OFFLINE` when their app goes silent for >90s

### Web (`apps/web`)

```bash
pnpm --filter @seedhape/web dev      # Next.js dev server (port 3000)
pnpm --filter @seedhape/web build    # production build
```

Routes:
- `/` — Marketing landing page
- `/sign-in`, `/sign-up` — Clerk auth pages
- `/dashboard` — Merchant overview
- `/dashboard/transactions` — Payment history
- `/dashboard/settings` — UPI ID, webhook config, API keys
- `/pay/[orderId]` — Hosted payment page (public, shareable)

### Packages (SDK/React)

```bash
pnpm --filter @seedhape/shared build
pnpm --filter @seedhape/sdk build
pnpm --filter @seedhape/react build

# Watch mode during development
pnpm --filter @seedhape/sdk dev
```

---

## API Reference

All endpoints are versioned under `/v1`. Amounts are always in **paise** (₹1 = 100 paise).

### Authentication

Include your API key as a Bearer token:
```
Authorization: Bearer sp_live_xxxxxxxxxxxxxxxx
```

- Keys starting with `sp_live_` are production keys
- Keys starting with `sp_test_` are test keys
- Generate keys from the dashboard → Settings → API Keys

---

### Create Order

```
POST /v1/orders
Authorization: Bearer sp_live_...
Content-Type: application/json
```

**Request body:**

```json
{
  "amount": 49900,
  "externalOrderId": "your-internal-order-123",
  "description": "Order #1234 — Premium Plan",
  "customerEmail": "customer@example.com",
  "customerPhone": "9876543210",
  "expiresInMinutes": 30,
  "randomizeAmount": true,
  "metadata": {
    "userId": "usr_abc",
    "plan": "premium"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | integer | **Yes** | Amount in paise (₹499 = 49900) |
| `externalOrderId` | string | No | Your own order ID for cross-referencing |
| `description` | string | No | Shown on payment page (max 255 chars) |
| `customerEmail` | string | No | Customer email |
| `customerPhone` | string | No | 10-digit Indian mobile number |
| `expiresInMinutes` | integer | No | Default: 30. Range: 5–1440 |
| `randomizeAmount` | boolean | No | Default: true. Adds ±1–3 paise to disambiguate concurrent orders |
| `metadata` | object | No | Any key-value pairs you want back in webhooks |

**Response `201`:**

```json
{
  "id": "sp_ord_k3x9mq7y2p",
  "externalOrderId": "your-internal-order-123",
  "amount": 49902,
  "originalAmount": 49900,
  "currency": "INR",
  "description": "Order #1234 — Premium Plan",
  "status": "CREATED",
  "upiUri": "upi://pay?pa=merchant@ybl&pn=My+Store&am=499.02&tn=sp_ord_k3x9mq7y2p&cu=INR",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2025-03-11T18:30:00.000Z",
  "createdAt": "2025-03-11T18:00:00.000Z"
}
```

> `amount` may differ from `originalAmount` by ±1–3 paise if `randomizeAmount` is true. The customer sees and pays the `amount`. Your webhook always includes both values. Charge your customer `originalAmount`.

---

### Get Order

```
GET /v1/orders/:id
Authorization: Bearer sp_live_...
```

Returns the full order object (same shape as create response).

---

### Poll Order Status

```
GET /v1/orders/:id/status
Authorization: Bearer sp_live_...
```

**Response:**

```json
{
  "id": "sp_ord_k3x9mq7y2p",
  "status": "VERIFIED",
  "amount": 49902,
  "verifiedAt": "2025-03-11T18:05:23.000Z"
}
```

**Order statuses:**

| Status | Meaning |
|--------|---------|
| `CREATED` | Order created, not yet shown to customer |
| `PENDING` | Customer has opened payment page |
| `VERIFIED` | Payment confirmed via UPI notification |
| `DISPUTED` | Payment received but amount or order unclear — needs review |
| `RESOLVED` | Dispute resolved as valid payment |
| `EXPIRED` | Order expired before payment |
| `REJECTED` | Dispute resolved as invalid |

---

### Hosted Payment Page

No API key needed. Share this URL with your customer:

```
GET /v1/pay/:orderId
```

This endpoint returns JSON for rendering the payment page (`apps/web/src/app/(payment)/pay/[orderId]`).

Direct public URL (from the web app):
```
https://your-domain.com/pay/sp_ord_k3x9mq7y2p
```

---

### Merchant Profile

```
GET  /v1/merchant/profile           # Get profile
PUT  /v1/merchant/profile           # Update UPI ID, webhook URL, etc.
GET  /v1/merchant/transactions      # Paginated transaction list
GET  /v1/merchant/analytics         # Aggregate stats
POST /v1/merchant/api-keys          # Generate new API key
DELETE /v1/merchant/api-keys/:id    # Revoke API key
POST /v1/merchant/webhook/test      # Fire a test webhook
```

Dashboard routes use **Clerk session tokens**, not API keys.

---

## JavaScript SDK

### Installation

```bash
npm install @seedhape/sdk
# or
pnpm add @seedhape/sdk
```

### Basic usage

```typescript
import { SeedhaPe } from '@seedhape/sdk';

const seedhape = new SeedhaPe({
  apiKey: 'sp_live_xxxxxxxxxxxxxxxx',
  baseUrl: 'https://seedhape.onrender.com', // optional, defaults to production
});

// Create an order
const order = await seedhape.createOrder({
  amount: 49900,           // ₹499.00 in paise
  description: 'Premium Plan',
  externalOrderId: 'order-123',
});

console.log(order.id);      // sp_ord_k3x9mq7y2p
console.log(order.upiUri);  // upi://pay?pa=...
console.log(order.qrCode);  // data:image/png;base64,...

// Poll for status
const status = await seedhape.getOrderStatus(order.id);
console.log(status.status); // CREATED | VERIFIED | EXPIRED ...
```

### Show payment modal (browser)

```typescript
const result = await seedhape.showPayment({
  orderId: order.id,
  onSuccess: (result) => {
    console.log('Payment verified!', result.verifiedAt);
  },
  onExpired: (orderId) => {
    console.log('Order expired:', orderId);
  },
  onClose: () => {
    console.log('User dismissed');
  },
});
```

This renders a full-screen overlay with a QR code, an "Open UPI App" deep link, and polls every 3 seconds until the payment is verified or expires.

### CDN / vanilla JS

```html
<script src="https://cdn.seedhape.com/sdk/latest/index.global.js"></script>
<script>
  const seedhape = new SeedhaPe.SeedhaPe({ apiKey: 'sp_live_...' });

  seedhape.createOrder({ amount: 49900 }).then((order) => {
    return seedhape.showPayment({
      orderId: order.id,
      onSuccess: (r) => alert('Paid! ₹' + r.amount / 100),
    });
  });
</script>
```

---

## React Components

### Installation

```bash
npm install @seedhape/react @seedhape/sdk
```

### Provider setup

Wrap your app (or the relevant subtree) with `SeedhaPeProvider`:

```tsx
import { SeedhaPeProvider } from '@seedhape/react';

export default function App() {
  return (
    <SeedhaPeProvider apiKey="sp_live_xxxxxxxxxxxxxxxx">
      <YourApp />
    </SeedhaPeProvider>
  );
}
```

### `<PaymentButton>`

The simplest integration. Creates an order and opens the payment modal when clicked:

```tsx
import { PaymentButton } from '@seedhape/react';

function CheckoutPage() {
  return (
    <PaymentButton
      amount={49900}
      description="Premium Plan"
      customerEmail="user@example.com"
      onSuccess={(result) => {
        console.log('Paid:', result.orderId, result.amount);
        // Redirect to success page, unlock content, etc.
      }}
      onExpired={(orderId) => {
        console.log('Expired:', orderId);
      }}
      className="my-pay-button"   // optional, falls back to default green style
    >
      Pay ₹499
    </PaymentButton>
  );
}
```

### `<PaymentModal>`

For manual control (you create the order, you show the modal):

```tsx
import { useState } from 'react';
import { useSeedhaPe } from '@seedhape/react';
import { PaymentModal } from '@seedhape/react';

function CustomCheckout() {
  const client = useSeedhaPe();
  const [orderId, setOrderId] = useState<string | null>(null);

  async function handlePay() {
    const order = await client.createOrder({ amount: 49900 });
    setOrderId(order.id);
  }

  return (
    <>
      <button onClick={handlePay}>Proceed to Payment</button>

      {orderId && (
        <PaymentModal
          orderId={orderId}
          open={true}
          onClose={() => setOrderId(null)}
          onSuccess={(result) => {
            setOrderId(null);
            alert('Payment successful!');
          }}
        />
      )}
    </>
  );
}
```

### `usePayment` hook

Full state machine for custom UI:

```tsx
import { usePayment } from '@seedhape/react';

function CustomPaymentFlow() {
  const { state, createPayment, onSuccess, onExpired, reset } = usePayment();

  async function start() {
    await createPayment({
      amount: 49900,
      description: 'Pro subscription',
    });
  }

  return (
    <div>
      {state.phase === 'idle' && (
        <button onClick={start}>Pay ₹499</button>
      )}

      {state.phase === 'creating' && <p>Creating order...</p>}

      {state.phase === 'pending' && (
        <div>
          <img src={state.order.qrCode} alt="Scan to pay" />
          <a href={state.order.upiUri}>Open UPI App</a>
          <p>Waiting for payment...</p>
        </div>
      )}

      {state.phase === 'verified' && (
        <p>Payment confirmed! ₹{state.result.amount / 100}</p>
      )}

      {state.phase === 'error' && (
        <>
          <p>Error: {state.error}</p>
          <button onClick={reset}>Try again</button>
        </>
      )}
    </div>
  );
}
```

---

## Android App Setup

The Android app is a React Native application with a Kotlin native module that captures UPI payment notifications.

### Why a real device?

UPI payment notifications only appear on devices with real UPI apps installed (PhonePe, GPay, Paytm, etc.). Emulators cannot receive live UPI notifications.

### Setup steps

**1. Build the Android app**

```bash
cd apps/mobileapp
pnpm android        # builds and installs on connected device/emulator
```

**2. Grant notification access**

On first launch, the app prompts for notification access. Tap the banner to open Android's notification listener settings and enable SeedhaPe.

Manual path: **Settings → Apps → Special app access → Notification access → SeedhaPe**

**3. Battery optimization (critical on Chinese OEMs)**

Android OEMs aggressively kill background services. For reliable notification capture:

| OEM | Setting path |
|-----|-------------|
| Xiaomi/MIUI | Settings → Battery → Battery saver → SeedhaPe → No restrictions |
| Realme/ColorOS | Settings → Battery → Background power consumption → SeedhaPe |
| Samsung One UI | Settings → Battery → Background usage limits → Never sleeping apps |
| OnePlus OxygenOS | Settings → Battery → Battery optimization → SeedhaPe → Don't optimize |
| Stock Android | Settings → Apps → SeedhaPe → Battery → Unrestricted |

**4. Sign in**

Sign in with your merchant account (same email as your dashboard). The app automatically:
- Registers the device with the API (`POST /internal/device/register`)
- Starts the notification listener service
- Sends a heartbeat every 60 seconds

**5. Verify it's working**

The dashboard shows your merchant status as **ONLINE** (green) when the app is running and connected. If it turns **OFFLINE**, the heartbeat stopped — check battery optimization settings.

### Supported UPI apps

| App | Package | Status |
|-----|---------|--------|npx react-native@latest init MyApp
| PhonePe | `com.phonepe.app` | Supported |
| Google Pay | `com.google.android.apps.nbu.paisa.user` | Supported |
| Paytm | `net.one97.paytm` | Supported |
| BHIM UPI | `in.org.npci.upiapp` | Supported |
| Amazon Pay | `in.amazon.mShop.android.shopping` | Supported |
| WhatsApp Pay | `com.whatsapp` | Supported |
| CRED | `com.dreamplug.androidapp` | Supported |

> If a customer pays via a different app, SeedhaPe falls back to the secondary matching strategy (amount + time window). See [Matching Engine](#matching-engine).

---

## Webhooks

SeedhaPe POSTs a JSON payload to your configured webhook URL when order status changes.

### Events

| Event | Triggered when |
|-------|---------------|
| `order.verified` | Payment confirmed by UPI notification |
| `order.expired` | Order expired before payment |
| `order.disputed` | Payment received but ambiguous (amount mismatch or collision) |
| `order.resolved` | Dispute resolved by merchant |

### Payload shape

```json
{
  "event": "order.verified",
  "timestamp": "2025-03-11T18:05:23.000Z",
  "data": {
    "orderId": "sp_ord_k3x9mq7y2p",
    "externalOrderId": "your-internal-order-123",
    "amount": 49902,
    "originalAmount": 49900,
    "currency": "INR",
    "status": "VERIFIED",
    "utr": "423012345678",
    "senderName": "Rahul Kumar",
    "upiApp": "PhonePe",
    "verifiedAt": "2025-03-11T18:05:23.000Z",
    "metadata": {
      "userId": "usr_abc",
      "plan": "premium"
    }
  }
}
```

### Signature verification

Every webhook request includes an HMAC-SHA256 signature in the header:

```
X-SeedhaPe-Signature: sha256=<hex>
```

**Verify in Node.js:**

```typescript
import crypto from 'node:crypto';
import type { Request } from 'express';

function verifyWebhook(req: Request, webhookSecret: string): boolean {
  const signature = req.headers['x-seedhape-signature'] as string;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', webhookSecret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

// In your Express route:
app.post('/webhooks/seedhape', express.json(), (req, res) => {
  if (!verifyWebhook(req, process.env.SEEDHAPE_WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, data } = req.body;

  if (event === 'order.verified') {
    await fulfillOrder(data.externalOrderId);
  }

  res.json({ received: true });
});
```

**Verify in Python:**

```python
import hmac, hashlib

def verify_webhook(body: bytes, signature: str, secret: str) -> bool:
    expected = 'sha256=' + hmac.new(
        secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

### Retry policy

If your endpoint returns a non-2xx response or times out (10s), SeedhaPe retries with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | Immediate |
| 2 | 5 seconds |
| 3 | 25 seconds |
| 4 | 2 minutes |
| 5 | 10 minutes |

After 5 failed attempts the delivery is marked permanently failed. You can see all attempts in **Dashboard → Settings → Webhook Logs** (coming in Phase 4).

---

## Order Lifecycle

```
CREATED ──── customer opens payment page ──── PENDING
   │                                              │
   │                              UPI notification received
   │                                              │
   │                          ┌──── amount matches? ────┐
   │                          │                         │
   │                        Yes                         No
   │                          │                         │
   │                       VERIFIED               DISPUTED
   │                          │                         │
   │              webhook: order.verified    merchant reviews
   │                                                    │
   └─── timer fires ─── EXPIRED              RESOLVED or REJECTED
                          │
              webhook: order.expired
```

**Expiry**: At order creation, a BullMQ delayed job is scheduled for `expiresAt`. Only orders in `CREATED` or `PENDING` state can expire — `VERIFIED` orders are unaffected.

---

## Matching Engine

The matching engine lives in `apps/api/src/services/matching.ts`.

### Strategy 1: `tn` field (primary)

UPI payments include a "transaction note" field. When SeedhaPe creates a UPI URI:

```
upi://pay?pa=merchant@ybl&am=499.02&tn=sp_ord_k3x9mq7y2p&cu=INR
```

The `tn=sp_ord_k3x9mq7y2p` is sent back in the payment notification. The engine extracts this, finds the order, verifies:

1. Order belongs to this merchant
2. Order is not in a terminal state
3. Order has not expired
4. `notification.amount === order.amount`

If all pass → `VERIFIED`.

### Strategy 2: Amount + time window (fallback)

When the UPI app doesn't include the `tn` field (rare, but happens with some Paytm flows):

1. Search for `PENDING` orders for this merchant with exactly `notification.amount`
2. Filter to orders created within the last 5 minutes
3. **One match** → `VERIFIED`
4. **Multiple matches** → all flagged `DISPUTED` (amount collision)
5. **Zero matches** → notification logged but not matched

### Amount randomization

To reduce collisions, SeedhaPe adds ±1–3 paise to each order's amount:
- `₹499.00` → might become `₹499.02` for order A, `₹499.01` for order B
- This means two simultaneous ₹499 orders get distinct amounts
- You always charge the customer `originalAmount` (₹499.00); the delta is cosmetic

### UTR deduplication

Every processed notification checks if its UTR (UPI Transaction Reference) has been seen before for this merchant. Duplicate notifications (e.g. app sending the same event twice) are silently dropped.

---

## Dashboard

Sign in at `http://localhost:3000` with your Clerk account.

> **First time?** After signing up, you'll need to configure your UPI ID in **Settings** before orders can be created.

### Overview

- Merchant status badge (ONLINE/OFFLINE)
- Stats: total orders, verified, disputed, verification rate
- Alerts if UPI ID is not set or the Android app is offline

### Transactions

Paginated table showing all orders with:
- Order ID, amount, status badge
- UTR (UPI reference number)
- UPI app used (PhonePe, GPay, etc.)
- Creation date

### Settings

- **UPI ID** — The VPA where money arrives (e.g. `yourname@ybl`)
- **Webhook URL** — Your endpoint to receive payment events
- **Test webhook** — Fires a sample payload to verify your endpoint is working
- **API Keys** — Generate `sp_live_` or `sp_test_` keys; plaintext shown only once

---

## Architecture Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Monorepo | Turborepo + pnpm | 5 tightly coupled packages sharing types/schemas |
| Auth | Clerk | Pre-built UI, JWT sessions, React Native SDK |
| ORM | Drizzle | Type-safe, close to SQL, good for the matching queries |
| API style | REST | Consumed by JS SDK, React component, Android app — REST is universal |
| Validation | Zod | Shared schemas across all packages |
| Queues | BullMQ + Redis | Reliable job delivery, delayed jobs for order expiry |
| Payment polling | Short-poll (3s) | Simpler than WebSockets, works through CDNs, adequate at scale |
| Amounts | Paise (integer) | Avoids all floating-point issues |

---

## Troubleshooting

### Merchant status stays OFFLINE

The Android app's heartbeat is not reaching the API.

1. Check the app is running (not killed by Android)
2. Confirm the device can reach `API_URL` — try opening it in the phone's browser
3. On Xiaomi/Realme/Samsung, check battery optimization (see [Android App Setup](#android-app-setup))
4. Check API logs: `pnpm --filter @seedhape/api dev` — look for `POST /internal/heartbeat`

### Orders never get verified

1. Confirm merchant status is **ONLINE** — if OFFLINE, notifications aren't being received
2. Check the Android app has notification access: **Settings → Special app access → Notification access**
3. Make a test payment and watch the API logs for `POST /internal/notifications`
4. Verify the UPI app you're using is in the supported list

### Amount mismatch (order goes DISPUTED)

This usually means `randomizeAmount` shifted the amount but the notification parser captured the pre-randomization amount, or the customer paid a different amount.

Inspect the dispute in the dashboard to see the raw notification body and what amount was received.

### QR code not scanning

The UPI URI format is strict. Ensure your merchant UPI ID is set correctly — no spaces, correct format (`name@bankhandle`). Test the URI at `upi://pay?pa=yourname@ybl&am=1&tn=test&cu=INR`.

### `pnpm install` fails

```bash
# Clear pnpm cache and reinstall
pnpm store prune
rm -rf node_modules
pnpm install
```

### Database connection refused

Ensure Docker is running and the containers are healthy:

```bash
docker compose ps
docker compose logs postgres
```

If the container is unhealthy, try:

```bash
docker compose down -v
docker compose up -d
```

---

## Contributing

This is a private project. Please follow the existing code style (Prettier + ESLint configs in `tooling/`).

```bash
pnpm format          # auto-format all files
pnpm lint            # lint all packages
pnpm typecheck       # type check all packages
```

---

## License

Proprietary. All rights reserved.
