# SeedhaPe Integration Guide

Everything you need to accept UPI payments on your web app — from first API call to a verified transaction. Pick the integration style that fits your stack.

---

## Table of Contents

1. [How it works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [Option 1 — Pure REST API](#option-1--pure-rest-api)
4. [Option 2 — JavaScript SDK](#option-2--javascript-sdk)
5. [Option 3 — React (`@seedhape/react`)](#option-3--react-seedhapereact)
   - [SeedhaPeProvider](#seedhapeprovider)
   - [PaymentButton](#paymentbutton-simplest-integration)
   - [PaymentModal](#paymentmodal-manual-control)
   - [usePayment hook](#usepayment-hook-fully-custom-ui)
6. [Receiving Webhooks](#receiving-webhooks)
7. [Order Statuses](#order-statuses)
8. [Payment Matching & Sender Name](#payment-matching--sender-name)
9. [Disputes](#disputes)
10. [Go-Live Checklist](#go-live-checklist)

---

## How it works

```
Your backend  ──POST /v1/orders──▶  SeedhaPe API  ─────────────────┐
     ◀── { id, upiUri, qrCode } ──                                  │ stores order
                                                                     ▼
Customer ──scans QR / taps UPI link──▶  UPI App (PhonePe, GPay…)
                                               │ sends notification
                                               ▼
                                     Merchant's Android phone
                                     (SeedhaPe app is running)
                                               │ POST /internal/notifications
                                               ▼
Your backend  ◀──POST order.verified──  SeedhaPe API  (matches + fires webhook)
```

The merchant's Android phone is the key: it listens for UPI payment notifications, parses the UTR and amount, and forwards them to the SeedhaPe backend which matches them to pending orders and fires your webhook.

**The Android app must be running and online for payments to be verified.** Check merchant status on your dashboard home page before going live.

---

## Prerequisites

1. **SeedhaPe account** — [sign up free](https://seedhape.com/sign-up), no credit card needed.
2. **UPI ID configured** — Dashboard → Settings → set your UPI ID (e.g. `merchant@ybl`). This is where money arrives.
3. **API key generated** — Dashboard → Settings → API Keys → New Key. Copy immediately — shown only once. Store as `SEEDHAPE_API_KEY` on your server.
4. **Webhook URL + secret** — Dashboard → Settings → Webhook URL. Generate a random secret (min 16 chars) and store as `SEEDHAPE_WEBHOOK_SECRET`.
5. **Android app installed** — the SeedhaPe merchant app must be running on the phone that receives UPI notifications. Enter your API key, grant notification access, and disable battery optimization for the app.

---

## Option 1 — Pure REST API

Use this if you want no SDK dependency, or you're integrating from any language (Python, Go, Ruby, etc.).

### Create an order

```bash
curl -X POST "https://seedhape.onrender.com/v1/orders" \
  -H "Authorization: Bearer sp_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 49900,
    "description": "Pro plan subscription",
    "externalOrderId": "your-internal-id-123",
    "expectedSenderName": "Rahul Sharma",
    "expiresInMinutes": 15,
    "metadata": { "userId": "usr_abc", "planKey": "PRO" }
  }'
```

**Response `201`:**

```json
{
  "id": "sp_ord_ab12cd34ef56",
  "amount": 49900,
  "originalAmount": 49900,
  "currency": "INR",
  "description": "Pro plan subscription",
  "status": "CREATED",
  "upiUri": "upi://pay?pa=merchant@ybl&pn=My+Store&am=499.00&tn=sp_ord_ab12cd34ef56&cu=INR",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-03-15T12:34:56.000Z",
  "createdAt": "2026-03-15T12:19:56.000Z"
}
```

**Key fields:**
- `upiUri` — deep-link to open UPI apps on mobile. Use as an `<a href>` button.
- `qrCode` — base64 PNG data URL. Use directly as `<img src={order.qrCode} />`.
- `id` — embed in your checkout URL, e.g. `https://yourdomain.com/pay/sp_ord_ab12cd34ef56`, or redirect to `https://yourdomain.com/pay/{id}` for the hosted payment page.

### Show the payment UI

Two options after creating the order:

**A) Redirect to the hosted payment page** (no frontend work):

```
https://yourdomain.com/pay/sp_ord_ab12cd34ef56
```

The page is included in the web app. It polls for payment status and handles the full flow including QR display, deep link, countdown, and dispute upload.

**B) Build your own UI** using the QR code and UPI URI from the order response, then poll status:

```bash
# Poll from your server
curl "https://seedhape.onrender.com/v1/orders/sp_ord_ab12cd34ef56/status" \
  -H "Authorization: Bearer sp_live_YOUR_KEY"
```

```json
{
  "id": "sp_ord_ab12cd34ef56",
  "status": "VERIFIED",
  "amount": 49900,
  "verifiedAt": "2026-03-15T12:22:11.000Z"
}
```

### Set sender name (from the browser, no auth required)

If you don't know the customer's name at order creation time, collect it in your frontend and store it:

```javascript
await fetch(`https://seedhape.onrender.com/v1/pay/${orderId}/expectation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ expectedSenderName: 'Rahul Sharma' }),
});
```

### Request body parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | integer | **Yes** | Paise. ₹1 = 100 paise. ₹499 = `49900`. |
| `description` | string | No | Shown on payment page. Max 100 chars. |
| `externalOrderId` | string | No | Your order ID for deduplication. Echoed in webhooks. |
| `expectedSenderName` | string | No | Payer's name as shown in their UPI app. **Strongly recommended** — see [Payment Matching](#payment-matching--sender-name). |
| `customerEmail` | string | No | Stored and echoed in webhooks. |
| `customerPhone` | string | No | Stored and echoed in webhooks. |
| `expiresInMinutes` | integer | No | Default 30. Range 5–1440. |
| `metadata` | object | No | Any JSON. Echoed verbatim in all webhook payloads. |

### Python example

```python
import requests

SEEDHAPE_API_KEY = "sp_live_..."

def create_order(amount_paise: int, description: str, external_id: str) -> dict:
    res = requests.post(
        "https://seedhape.onrender.com/v1/orders",
        headers={
            "Authorization": f"Bearer {SEEDHAPE_API_KEY}",
            "Content-Type": "application/json",
        },
        json={
            "amount": amount_paise,
            "description": description,
            "externalOrderId": external_id,
            "expiresInMinutes": 15,
        },
    )
    res.raise_for_status()
    return res.json()

order = create_order(49900, "Pro subscription", "order-123")
print(order["id"])       # sp_ord_ab12cd34ef56
print(order["upiUri"])   # upi://pay?...
```

---

## Option 2 — JavaScript SDK

Install once, use on both server and browser.

```bash
npm install @seedhape/sdk
# or: pnpm add @seedhape/sdk
```

### Server: create an order

The `SeedhaPe` class requires an API key for `createOrder` and `getOrderStatus`. **Never use your API key in browser code.**

A clean pattern is to wrap the SDK in a small server-only utility module:

```typescript
// lib/seedhape.ts  (server only — Node.js / Edge / Bun)
import { SeedhaPe } from '@seedhape/sdk';

function getClient(): SeedhaPe {
  if (!process.env.SEEDHAPE_API_KEY) throw new Error('SEEDHAPE_API_KEY is not set');
  return new SeedhaPe({
    apiKey: process.env.SEEDHAPE_API_KEY,
    baseUrl: process.env.SEEDHAPE_BASE_URL, // optional — for self-hosted deployments
  });
}

export interface CreateOrderParams {
  amount: number;              // in paise (₹499 = 49900)
  description?: string;
  externalOrderId?: string;
  expectedSenderName?: string;
  customerEmail?: string;
  customerPhone?: string;
  expiresInMinutes?: number;
  metadata?: Record<string, unknown>;
}

export async function createOrder(params: CreateOrderParams) {
  return getClient().createOrder(params);
}

export async function getOrderStatus(orderId: string) {
  return getClient().getOrderStatus(orderId);
}
```

Then call it from your route handlers or server actions:

```typescript
import { createOrder } from '@/lib/seedhape';

const order = await createOrder({
  amount: 49900,
  description: 'Pro subscription',
  externalOrderId: `ord_${userId}_${Date.now()}`,
  expectedSenderName: 'Rahul Sharma',
  expiresInMinutes: 15,
  metadata: { userId, planKey: 'PRO' },
});
```

### Server: poll status

```typescript
import { getOrderStatus } from '@/lib/seedhape';

const status = await getOrderStatus('sp_ord_ab12cd34ef56');
// { orderId, status, amount, verifiedAt? }
// status: 'CREATED' | 'PENDING' | 'VERIFIED' | 'DISPUTED' | 'RESOLVED' | 'EXPIRED' | 'REJECTED'
```

### Browser: payment modal

`showPayment` only calls public `/v1/pay/*` endpoints. No API key is ever sent from the browser.

```typescript
// checkout.ts  (client bundle)
import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({}); // no apiKey on the client

// orderId comes from your server (via API route, server action, etc.)
const result = await sp.showPayment({
  orderId: 'sp_ord_ab12cd34ef56',
  onSuccess: (result) => {
    // result: { orderId, status, amount }
    // The order.verified webhook has already fired on your server
    console.log('Verified!', result.amount / 100);
    window.location.href = '/dashboard?upgraded=true';
  },
  onExpired: (orderId) => {
    console.log('Expired:', orderId);
  },
  onClose: () => {
    console.log('User dismissed the modal');
  },
});
```

> `showPayment` returns a Promise that resolves when payment is verified/resolved, or rejects when the user closes the modal.

**What the modal does automatically:**
1. Loads the order from `/v1/pay/:orderId`
2. Shows a name input step (pre-filled if `expectedSenderName` was set at order creation). The customer confirms their UPI-registered name.
3. After name confirmation, calls `POST /v1/pay/:orderId/expectation` to store it
4. Shows the QR code + "Open UPI App" deep-link button + countdown timer
5. Polls `/v1/pay/:orderId` every 3 seconds
6. On VERIFIED/RESOLVED: shows success animation, fires `onSuccess`, closes automatically after 2.5 s
7. On EXPIRED/DISPUTED: shows a screenshot upload UI for dispute submission

### Full Node.js + browser example (Express + vanilla JS frontend)

```typescript
// server.ts
import express from 'express';
import { SeedhaPe } from '@seedhape/sdk';

const app = express();
const sp = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });

app.use(express.json());

// Server-side: create order
app.post('/api/checkout', async (req, res) => {
  const { amount, description } = req.body;
  try {
    const order = await sp.createOrder({ amount, description });
    res.json({ orderId: order.id });
  } catch (err) {
    res.status(500).json({ error: 'Order creation failed' });
  }
});

app.listen(3000);
```

```html
<!-- checkout.html -->
<button id="pay-btn">Pay ₹499</button>

<script type="module">
  import { SeedhaPe } from 'https://cdn.seedhape.com/sdk/latest/index.global.js';

  const sp = new SeedhaPe.SeedhaPe({});

  document.getElementById('pay-btn').addEventListener('click', async () => {
    // 1. Create order on your server
    const { orderId } = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 49900, description: 'Pro plan' }),
    }).then(r => r.json());

    // 2. Show payment modal in browser
    await sp.showPayment({
      orderId,
      onSuccess: (r) => alert('Paid! ₹' + r.amount / 100),
      onExpired:  (id) => alert('Expired: ' + id),
    });
  });
</script>
```

---

## Option 3 — React (`@seedhape/react`)

```bash
npm install @seedhape/react @seedhape/sdk
```

The React package exports three integration levels:

| Component / Hook | Use when |
|------------------|----------|
| `<PaymentButton>` | One-liner checkout — creates order and opens modal on click |
| `<PaymentModal>` | You create the order, you control when to show the modal |
| `usePayment` | Building a fully custom payment UI |

All three require `SeedhaPeProvider` to be present in the tree.

---

### SeedhaPeProvider

Wrap your app (or just the checkout subtree) once. The provider takes an `onCreateOrder` callback that **you implement on the server** — this is the only place your API key lives.

#### Next.js App Router (server actions — recommended)

```tsx
// app/layout.tsx
import { SeedhaPeProvider } from '@seedhape/react';
import { SeedhaPe } from '@seedhape/sdk';

async function createOrder(
  opts: Parameters<InstanceType<typeof SeedhaPe>['createOrder']>[0],
) {
  'use server';
  const client = new SeedhaPe({
    apiKey:  process.env.SEEDHAPE_API_KEY!,
    baseUrl: process.env.SEEDHAPE_BASE_URL,
  });
  return client.createOrder(opts);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SeedhaPeProvider onCreateOrder={createOrder}>
          {children}
        </SeedhaPeProvider>
      </body>
    </html>
  );
}
```

#### Next.js Pages Router (API route)

```tsx
// pages/_app.tsx
import type { AppProps } from 'next/app';
import { SeedhaPeProvider } from '@seedhape/react';
import type { CreateOrderOptions } from '@seedhape/sdk';

async function createOrder(opts: CreateOrderOptions) {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Order creation failed');
  return res.json();
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SeedhaPeProvider onCreateOrder={createOrder}>
      <Component {...pageProps} />
    </SeedhaPeProvider>
  );
}
```

```typescript
// pages/api/create-order.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const order = await sp.createOrder(req.body);
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Order creation failed' });
  }
}
```

#### Vite / Create React App (separate backend)

When your React app is a pure SPA with a separate backend (Express, FastAPI, etc.), `onCreateOrder` is a fetch call to your own API endpoint. The API key lives exclusively on that backend.

```tsx
// src/main.tsx  (or App.tsx)
import { SeedhaPeProvider } from '@seedhape/react';
import type { CreateOrderOptions } from '@seedhape/sdk';

async function createOrder(opts: CreateOrderOptions) {
  const res = await fetch('/api/create-order', {   // your backend
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Order creation failed');
  return res.json();
}

export default function App() {
  return (
    <SeedhaPeProvider onCreateOrder={createOrder}>
      <Router />
    </SeedhaPeProvider>
  );
}
```

```typescript
// backend: Express route (Node.js)
// lib/seedhape.ts (server only)
import { SeedhaPe } from '@seedhape/sdk';

function getClient() {
  if (!process.env.SEEDHAPE_API_KEY) throw new Error('SEEDHAPE_API_KEY is not set');
  return new SeedhaPe({
    apiKey:  process.env.SEEDHAPE_API_KEY,
    baseUrl: process.env.SEEDHAPE_BASE_URL,
  });
}

// routes/create-order.ts
app.post('/api/create-order', express.json(), async (req, res) => {
  try {
    const order = await getClient().createOrder(req.body);
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Order creation failed' });
  }
});
```

```python
# backend: FastAPI / Flask (Python)
from seedhape import SeedhaPe   # or call the REST API directly with requests

sp = SeedhaPe(api_key=os.environ["SEEDHAPE_API_KEY"])

@app.post("/api/create-order")
async def create_order(body: dict):
    return sp.create_order(**body)
```

> The pattern is always the same regardless of framework: `onCreateOrder` calls **your** backend endpoint, your backend calls SeedhaPe with the secret key, and only the resulting `OrderData` is returned to the browser.

#### Remix

```tsx
// app/root.tsx
import { SeedhaPeProvider } from '@seedhape/react';
import type { CreateOrderOptions } from '@seedhape/sdk';

async function createOrder(opts: CreateOrderOptions) {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Order creation failed');
  return res.json();
}

export default function App() {
  return (
    <html>
      <body>
        <SeedhaPeProvider onCreateOrder={createOrder}>
          <Outlet />
        </SeedhaPeProvider>
      </body>
    </html>
  );
}
```

```typescript
// app/routes/api.create-order.ts
import { json } from '@remix-run/node';
import { SeedhaPe } from '@seedhape/sdk';

function getClient() {
  if (!process.env.SEEDHAPE_API_KEY) throw new Error('SEEDHAPE_API_KEY is not set');
  return new SeedhaPe({
    apiKey:  process.env.SEEDHAPE_API_KEY,
    baseUrl: process.env.SEEDHAPE_BASE_URL,
  });
}

export async function action({ request }: { request: Request }) {
  const opts = await request.json();
  const order = await getClient().createOrder(opts);
  return json(order);
}
```

**Provider props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onCreateOrder` | `(opts: CreateOrderOptions) => Promise<OrderData>` | **Yes** | Server-side function. Must call the SeedhaPe API with your secret key. |
| `baseUrl` | `string` | No | Override API base URL. Default: `https://seedhape.onrender.com`. |

---

### PaymentButton — simplest integration

A single component that creates the order and opens the payment modal in one click. No state management needed on your side.

```tsx
// components/CheckoutPage.tsx
import { PaymentButton } from '@seedhape/react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();

  return (
    <div>
      <h1>Pro Plan — ₹499/month</h1>
      <PaymentButton
        amount={49900}
        description="Pro subscription"
        expectedSenderName="Rahul Sharma"   // from your logged-in user profile
        customerEmail="rahul@example.com"
        metadata={{ planKey: 'PRO', userId: 'usr_abc' }}
        onSuccess={(result) => {
          // result: { orderId, status, amount }
          console.log('Payment verified:', result.orderId);
          router.push('/dashboard?upgraded=true');
        }}
        onExpired={(orderId) => {
          console.log('Order expired:', orderId);
        }}
      >
        Pay ₹499 →
      </PaymentButton>
    </div>
  );
}
```

**Styling:** By default, the button is green (`#16a34a`). Pass a `className` prop to take full control:

```tsx
// Default green button — no className needed
<PaymentButton amount={49900}>Pay ₹499</PaymentButton>

// Use your own design system — all default styles removed
<PaymentButton amount={49900} className="btn btn-primary btn-lg">
  Pay ₹499
</PaymentButton>
```

**All props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `number` | **Yes** | Paise. ₹1 = 100 paise. |
| `description` | `string` | No | Order description. |
| `expectedSenderName` | `string` | No | Payer's UPI name. Strongly recommended. |
| `customerEmail` | `string` | No | Stored on the order. |
| `customerPhone` | `string` | No | Stored on the order. |
| `metadata` | `Record<string, unknown>` | No | Echoed in webhook payloads. |
| `onSuccess` | `(result: PaymentResult) => void` | No | Called on verification. |
| `onExpired` | `(orderId: string) => void` | No | Called on expiry. |
| `className` | `string` | No | When set, replaces all default styles. |
| `children` | `ReactNode` | No | Button label. Default: `"Pay Now"`. |

---

### PaymentModal — manual control

Use this when you create the order yourself (e.g. after a multi-step checkout form) and need explicit control over when the modal opens.

```tsx
// components/CustomCheckout.tsx
'use client';

import { useState } from 'react';
import { PaymentModal } from '@seedhape/react';
import { useSeedhaPeContext } from '@seedhape/react';
import type { PaymentResult } from '@seedhape/sdk';

export default function CustomCheckout() {
  const { onCreateOrder } = useSeedhaPeContext();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const order = await onCreateOrder({
        amount: 49900,
        description: 'Pro subscription',
        expectedSenderName: 'Rahul Sharma',
        metadata: { planKey: 'PRO' },
      });
      setOrderId(order.id);
    } catch (err) {
      setError('Could not create order. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleSuccess(result: PaymentResult) {
    setOrderId(null);
    console.log('Verified! Amount:', result.amount / 100);
    window.location.href = '/dashboard';
  }

  return (
    <>
      {error && <p className="text-red-600">{error}</p>}

      <button onClick={handlePay} disabled={loading}>
        {loading ? 'Creating order…' : 'Proceed to payment'}
      </button>

      {orderId && (
        <PaymentModal
          orderId={orderId}
          open={true}
          onClose={() => setOrderId(null)}
          onSuccess={handleSuccess}
          onExpired={(id) => {
            setOrderId(null);
            console.log('Expired:', id);
          }}
        />
      )}
    </>
  );
}
```

**Props:**

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | **Yes** | SeedhaPe order ID. |
| `open` | `boolean` | **Yes** | Whether the modal is visible. |
| `onClose` | `() => void` | **Yes** | Called when user dismisses the modal (backdrop, close button, Escape). |
| `onSuccess` | `(result: PaymentResult) => void` | No | Called on verification — modal auto-closes after 2.5 s. |
| `onExpired` | `(orderId: string) => void` | No | Called when order expires. |

**Modal flow:**
1. Loads order data from `GET /v1/pay/:orderId`
2. Shows name gate — customer confirms their UPI-registered name (pre-filled if set at creation)
3. Shows QR code + countdown timer + "Open UPI App" deep link
4. Polls every 3 seconds — timer turns amber at 5 min, red at 1 min
5. On VERIFIED: success animation → `onSuccess` → auto-close after 2.5 s
6. On EXPIRED/DISPUTED: dispute screenshot upload UI

---

### usePayment hook — fully custom UI

For cases where you need the payment state machine but want to build your own UI — embedded in a sidebar, multi-step wizard, native app bridge, etc.

```tsx
// components/EmbeddedCheckout.tsx
'use client';

import { usePayment } from '@seedhape/react';

export default function EmbeddedCheckout({ userEmail }: { userEmail: string }) {
  const { state, createPayment, onSuccess, onExpired, reset } = usePayment();

  async function start() {
    await createPayment({
      amount: 49900,
      description: 'Pro subscription',
      expectedSenderName: 'Rahul Sharma',
      customerEmail: userEmail,
      metadata: { planKey: 'PRO' },
    });
  }

  // idle — show pay button
  if (state.phase === 'idle') {
    return <button onClick={start}>Pay ₹499</button>;
  }

  // creating — order is being created server-side
  if (state.phase === 'creating') {
    return <p>Creating order…</p>;
  }

  // pending — show QR and wait
  if (state.phase === 'pending') {
    return (
      <div className="payment-ui">
        <img
          src={state.order.qrCode}
          alt="Scan to pay"
          width={200}
          height={200}
        />
        <a href={state.order.upiUri} className="upi-btn">
          Open UPI App
        </a>
        <p>Waiting for payment…</p>
        <p className="expires">
          Expires: {new Date(state.order.expiresAt).toLocaleTimeString()}
        </p>
        {/* You are responsible for polling status and calling onSuccess/onExpired */}
      </div>
    );
  }

  // verified — payment confirmed
  if (state.phase === 'verified') {
    return (
      <div className="success">
        <p>Payment confirmed! ₹{state.result.amount / 100}</p>
        <a href="/dashboard">Go to dashboard →</a>
      </div>
    );
  }

  // expired
  if (state.phase === 'expired') {
    return (
      <div>
        <p>Order expired.</p>
        <button onClick={reset}>Try again</button>
      </div>
    );
  }

  // error
  if (state.phase === 'error') {
    return (
      <div>
        <p>Error: {state.error}</p>
        <button onClick={reset}>Try again</button>
      </div>
    );
  }
}
```

> **Note:** In `pending` phase, `usePayment` does not poll automatically — you receive the order data and are responsible for polling `GET /v1/orders/:id/status` (via your server) and calling `onSuccess` or `onExpired` yourself. Use `PaymentModal` if you want built-in polling.

**State machine:**

```
idle ──createPayment()──▶ creating ──order created──▶ pending
                               └── error ──▶ error

pending ──onSuccess()──▶ verified
pending ──onExpired()──▶ expired

verified / expired / error ──reset()──▶ idle
```

**State shape:**

```typescript
type PaymentState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'pending';  order: OrderData }      // order.qrCode, order.upiUri, order.expiresAt
  | { phase: 'verified'; result: PaymentResult } // result.orderId, result.amount, result.status
  | { phase: 'expired';  orderId: string }
  | { phase: 'error';    error: string }
```

---

## Receiving Webhooks

SeedhaPe POSTs events to your webhook URL when order status changes. Your endpoint must return `2xx` within 10 seconds.

### Webhook payload

```json
{
  "event": "order.verified",
  "timestamp": "2026-03-15T11:11:11.000Z",
  "data": {
    "orderId": "sp_ord_ab12cd34ef56",
    "externalOrderId": "your-internal-id-123",
    "amount": 49900,
    "originalAmount": 49900,
    "currency": "INR",
    "status": "VERIFIED",
    "utr": "426111234567",
    "senderName": "Rahul Sharma",
    "upiApp": "Google Pay",
    "verifiedAt": "2026-03-15T11:11:09.000Z",
    "metadata": { "userId": "usr_abc", "planKey": "PRO" }
  }
}
```

**Events:** `order.verified` · `order.expired` · `order.disputed` · `order.resolved`

### Verify the signature

Every webhook includes `X-SeedhaPe-Signature: sha256=<hex>`. **Always verify it** before trusting the payload.

#### Next.js App Router

```typescript
// app/api/webhooks/seedhape/route.ts
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.SEEDHAPE_WEBHOOK_SECRET!;

function verify(rawBody: string, signature: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-seedhape-signature') ?? '';
  const rawBody   = await req.text();

  if (!verify(rawBody, signature)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { event, data } = JSON.parse(rawBody);

  switch (event) {
    case 'order.verified':
      await db.orders.update({
        where: { seedhapeId: data.orderId },
        data:  { status: 'PAID', paidAt: data.verifiedAt },
      });
      await fulfillOrder(data.externalOrderId, data.metadata);
      break;

    case 'order.expired':
      await db.orders.update({
        where: { seedhapeId: data.orderId },
        data:  { status: 'EXPIRED' },
      });
      break;

    case 'order.disputed':
      // Do NOT fulfill yet. Notify your team.
      await notifyTeam('Payment needs review', data.orderId);
      break;

    case 'order.resolved':
      if (data.status === 'RESOLVED') {
        await fulfillOrder(data.externalOrderId, data.metadata);
      } else {
        // data.status === 'REJECTED'
        await notifyCustomer(data.externalOrderId, 'dispute-rejected');
      }
      break;
  }

  return NextResponse.json({ received: true });
}
```

#### Express

```typescript
// routes/webhooks.ts
import express from 'express';
import crypto  from 'node:crypto';

const router = express.Router();

// Use express.raw() for this route — NOT express.json()
// You need the raw body buffer for HMAC verification
router.post('/webhooks/seedhape', express.raw({ type: 'application/json' }), (req, res) => {
  const sig      = req.headers['x-seedhape-signature'] as string;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.SEEDHAPE_WEBHOOK_SECRET!)
    .update(req.body)           // req.body is a Buffer here
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = JSON.parse(req.body.toString());

  // Handle events — respond quickly, process async
  if (event === 'order.verified') {
    setImmediate(() => fulfillOrder(data.externalOrderId));
  }

  res.sendStatus(200);
});
```

#### Python (Flask)

```python
import hmac, hashlib
from flask import Flask, request, jsonify

app = Flask(__name__)
WEBHOOK_SECRET = os.environ["SEEDHAPE_WEBHOOK_SECRET"]

def verify(raw_body: bytes, signature: str) -> bool:
    if not signature.startswith("sha256="):
        return False
    expected = "sha256=" + hmac.new(
        WEBHOOK_SECRET.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route("/webhooks/seedhape", methods=["POST"])
def handle_webhook():
    sig     = request.headers.get("x-seedhape-signature", "")
    payload = request.get_data()  # raw bytes

    if not verify(payload, sig):
        return "Unauthorized", 401

    event = request.json["event"]
    data  = request.json["data"]

    if event == "order.verified":
        fulfill_order(data["externalOrderId"])

    return jsonify({"received": True})
```

### Retry policy

| Attempt | Delay after previous failure |
|---------|------------------------------|
| 1 | Immediate |
| 2 | 5 seconds |
| 3 | 25 seconds |
| 4 | 2 minutes |
| 5 | 10 minutes |

After 5 failures the delivery is marked permanently failed. Deliveries are visible in Dashboard → Settings → Webhook Logs.

---

## Order Statuses

| Status | Terminal | Trigger |
|--------|----------|---------|
| `CREATED` | No | Order just created |
| `PENDING` | No | Customer opened the payment page |
| `VERIFIED` | **Yes** | Payment auto-matched → **trigger fulfillment here** |
| `DISPUTED` | No | Payment received but match failed — needs review |
| `RESOLVED` | **Yes** | Merchant approved the dispute → **trigger fulfillment here** |
| `EXPIRED` | **Yes** | TTL elapsed without payment |
| `REJECTED` | **Yes** | Merchant rejected the dispute |

Always fulfill on both `VERIFIED` and `RESOLVED` events.

---

## Payment Matching & Sender Name

SeedhaPe embeds the order ID in the UPI `tn` (transaction note) field:

```
upi://pay?pa=merchant@ybl&am=499.00&tn=sp_ord_ab12cd34ef56&cu=INR
```

When the customer pays, their UPI app includes this note in the payment notification. The matching engine reads it to identify the exact order.

**Fallback matching** (when `tn` is unavailable — rare, happens with some Paytm flows): matches by `expectedSenderName` + amount + 15-minute window.

**Why `expectedSenderName` matters:**

1. **Collision resolver** — if two customers pay the same amount in the same window, only the one whose name matches gets verified automatically. Without a name, all colliding orders go to `DISPUTED`.

2. **Fraud guard** — even when the order ID is present in `tn`, if a name was set and the actual sender doesn't match, the order is flagged as `DISPUTED`. This prevents someone else paying the same amount to steal a verified order.

**Supply the name at order creation when you can** (e.g. logged-in user):

```typescript
const order = await sp.createOrder({
  amount: 49900,
  expectedSenderName: user.upiName, // from your user profile
});
```

**Let the modal collect it when you can't** (anonymous customers):

```typescript
// Don't pass expectedSenderName — the modal shows a name gate step
const order = await sp.createOrder({ amount: 49900 });
// The SDK modal / React PaymentModal will ask the customer before showing the QR
```

---

## Disputes

A dispute means a UPI notification arrived but auto-matching failed — usually because:
- The `tn` field was missing AND no sender name was set
- Two orders had the same amount at the same time with no sender name
- The sender name didn't match the expected name

**What happens:**
1. Order moves to `DISPUTED`
2. `order.disputed` webhook fires to your server
3. The payment modal shows a screenshot upload UI so the customer can submit evidence
4. You review in the **Disputes** tab of the Android app or dashboard
5. You approve (`RESOLVED`) or reject (`REJECTED`)
6. `order.resolved` webhook fires with `data.status = 'RESOLVED'` or `'REJECTED'`

**In your webhook handler, do not fulfill on `order.disputed` — wait for `order.resolved`:**

```typescript
case 'order.disputed':
  // Notify your team to review — do NOT fulfill yet
  await notifyTeam('Payment under review', data.orderId);
  break;

case 'order.resolved':
  if (data.status === 'RESOLVED') {
    await fulfillOrder(data.externalOrderId, data.metadata);
  } else {
    // REJECTED — notify customer
    await notifyCustomer(data.externalOrderId, 'payment-rejected');
  }
  break;
```

**To minimize disputes:** always pass `expectedSenderName` and keep the Android app online. Consider using `expiresInMinutes: 10–15` for high-volume stores to reduce the time window for collisions.

---

## Go-Live Checklist

Before switching to production keys (`sp_live_...`):

- [ ] Android app is installed, signed in, and shows **ONLINE** on your dashboard
- [ ] Battery optimization is disabled for the SeedhaPe app on the merchant device
- [ ] `SEEDHAPE_API_KEY` is set as a server-only environment variable (not in `.env.local` committed to git)
- [ ] `SEEDHAPE_WEBHOOK_SECRET` is set and matches what's in your dashboard settings
- [ ] Webhook signature verification is implemented and tested
- [ ] Both `order.verified` and `order.resolved` events fulfill the order (don't miss disputed-then-resolved payments)
- [ ] `expectedSenderName` is passed whenever the customer is known
- [ ] Test the full flow end-to-end: create order → pay → webhook received → order fulfilled
- [ ] Your webhook endpoint returns `200` within 10 seconds (do heavy work async)
- [ ] `externalOrderId` is set so you can cross-reference SeedhaPe orders in your own database

---

## Further reading

- [REST API Reference](https://seedhape.com/docs/api) — full endpoint docs with request/response schemas
- [`@seedhape/sdk` README](../../packages/sdk/README.md) — SDK class reference
- [`@seedhape/react` README](../../packages/react/README.md) — React props reference
- [Deployment Guide](./DEPLOYMENT_RENDER_VERCEL.md) — deploying to Render + Vercel
