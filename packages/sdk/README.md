# @seedhape/sdk

JavaScript / TypeScript SDK for [SeedhaPe](https://seedhape.com) — zero-fee UPI payment verification middleware for Indian merchants.

```
npm install @seedhape/sdk
pnpm add @seedhape/sdk
yarn add @seedhape/sdk
```

---

## Overview

SeedhaPe lets you accept UPI payments directly into your bank account — no Razorpay, no Cashfree, no 2–3% per-transaction cut. This SDK is a thin, fully-typed wrapper around the REST API that also bundles a browser payment modal for client-side checkout flows.

**Key split:**
- `createOrder` / `getOrderStatus` — **server-side only**. Require an API key.
- `showPayment` — **browser only**. Renders an in-page payment modal. Calls only public endpoints; no API key needed in the browser.

---

## Quick start

### 1. Server — create an order

```typescript
// lib/seedhape.ts  (Node.js / Edge / Bun — server only)
import { SeedhaPe } from '@seedhape/sdk';

function getClient(): SeedhaPe {
  if (!process.env.SEEDHAPE_API_KEY) throw new Error('SEEDHAPE_API_KEY is not set');
  return new SeedhaPe({
    apiKey:  process.env.SEEDHAPE_API_KEY,
    baseUrl: process.env.SEEDHAPE_BASE_URL, // optional — for self-hosted deployments
  });
}

export async function createOrder(params: Parameters<SeedhaPe['createOrder']>[0]) {
  return getClient().createOrder(params);
}

export async function getOrderStatus(orderId: string) {
  return getClient().getOrderStatus(orderId);
}
```

Then call your helper from any route handler or server action:

```typescript
import { createOrder } from '@/lib/seedhape';

const order = await createOrder({
  amount: 49900,                          // ₹499 in paise
  description: 'Pro subscription',
  externalOrderId: 'your-internal-id',
  expectedSenderName: 'Rahul Sharma',     // strongly recommended — see Matching
  expiresInMinutes: 15,
  metadata: { userId: 'usr_abc', planKey: 'PRO' },
});

console.log(order.id);       // "sp_ord_k3x9mq7y2p"
console.log(order.upiUri);   // "upi://pay?pa=merchant@ybl&am=499.00&tn=sp_ord_..."
console.log(order.qrCode);   // "data:image/png;base64,..."
```

### 2. Client — show the payment modal

Pass the order ID from your server to the browser. `showPayment` only calls public `/v1/pay/*` endpoints — never expose your API key in the browser.

```typescript
// checkout.ts  (browser bundle)
import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({}); // no apiKey on the client

const result = await sp.showPayment({
  orderId: order.id,          // from your server
  onSuccess: (result) => {
    // Webhook has already fired server-side — just update the UI
    console.log('Verified!', result.orderId, result.amount / 100);
  },
  onExpired: (orderId) => console.log('Order expired:', orderId),
  onClose: () => console.log('Modal closed'),
});
```

The modal handles everything: name gate (optional), QR code display, UPI deep-link button, live polling every 3 seconds, countdown timer, and dispute screenshot upload if needed.

### 3. Poll status from your backend (optional)

```typescript
const status = await sp.getOrderStatus('sp_ord_k3x9mq7y2p');
// { orderId, status, amount, verifiedAt? }
```

---

## API Reference

### `new SeedhaPe(config)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | Your `sp_live_...` or `sp_test_...` key. Required for `createOrder` and `getOrderStatus`. |
| `baseUrl` | `string` | `https://api.seedhape.com` | Override for self-hosted deployments. |

---

### `createOrder(options): Promise<OrderData>`

**Server-side only.** Creates a new UPI payment order.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `amount` | `number` | **Yes** | Amount in paise. ₹1 = 100 paise. ₹499 = `49900`. |
| `description` | `string` | No | Shown on the payment page. Max 100 chars. |
| `externalOrderId` | `string` | No | Your own order ID for deduplication. Echoed in all webhook payloads. |
| `expectedSenderName` | `string` | No | Payer's name exactly as it appears in their UPI app. **Strongly recommended** — see [Payment Matching](#payment-matching). |
| `customerEmail` | `string` | No | Stored on the order, echoed in webhooks. |
| `customerPhone` | `string` | No | Stored on the order, echoed in webhooks. |
| `expiresInMinutes` | `number` | No | Order TTL. Default: `30`. Range: 5–1440. |
| `metadata` | `Record<string, unknown>` | No | Arbitrary JSON. Stored and echoed verbatim in all webhook payloads. |

**Returns `OrderData`:**

```typescript
{
  id: string;               // "sp_ord_k3x9mq7y2p"
  amount: number;           // final amount in paise (may differ by ±1–3 paise)
  originalAmount: number;   // the amount you requested
  currency: string;         // "INR"
  description: string | null;
  status: OrderStatus;      // "CREATED"
  upiUri: string;           // deep-link for UPI apps
  qrCode: string;           // base64 PNG data URL — use as <img src={order.qrCode} />
  expiresAt: string;        // ISO 8601
  createdAt: string;        // ISO 8601
  expectedSenderName: string | null;
}
```

> **Amount randomization**: SeedhaPe adds ±1–3 paise to each order to prevent collision when two customers pay the same amount simultaneously. `amount` is what the customer actually pays; `originalAmount` is what you requested. Always charge your customer `originalAmount`. Both values are included in webhook payloads.

---

### `getOrderStatus(orderId): Promise<PaymentResult>`

**Server-side only.** Lightweight poll — prefer this over fetching the full order when checking from your backend.

```typescript
const status = await sp.getOrderStatus('sp_ord_k3x9mq7y2p');
// {
//   orderId: string;
//   status: OrderStatus;
//   amount: number;
//   verifiedAt?: string;  // ISO 8601, present when status is VERIFIED or RESOLVED
// }
```

---

### `showPayment(options): Promise<PaymentResult>`

**Browser only.** Mounts a full-screen payment modal overlay. Polls `/v1/orders/:id/status` every 3 seconds and resolves when the order reaches a terminal state.

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `orderId` | `string` | **Yes** | The SeedhaPe order ID from your server. |
| `onSuccess` | `(result: PaymentResult) => void` | No | Fired when status becomes `VERIFIED` or `RESOLVED`. |
| `onExpired` | `(orderId: string) => void` | No | Fired when the order expires. The modal shows a dispute upload UI before calling this. |
| `onClose` | `() => void` | No | Fired when the user manually dismisses the modal. |
| `containerEl` | `HTMLElement` | No | Mount the modal into a specific element instead of `document.body`. |
| `theme.primaryColor` | `string` | No | CSS color for buttons and accents. Default: `#16a34a`. |
| `theme.borderRadius` | `string` | No | CSS border-radius for the modal card. Default: `16px`. |

**Modal flow:**
1. If `expectedSenderName` was not set at order creation, the modal shows a name input step first, then calls `POST /v1/pay/:orderId/expectation`.
2. Shows QR code + countdown timer + "Open UPI App" deep-link button.
3. Polls every 3 seconds. Timer turns amber at 5 min remaining, red at 1 min.
4. On verification: shows success state and auto-closes after 2.5 seconds.
5. On expiry/dispute: shows screenshot upload UI — customer can submit evidence for manual review.

---

## Order Statuses

| Status | Terminal? | Meaning |
|--------|-----------|---------|
| `CREATED` | No | Order created, customer hasn't opened the payment page yet |
| `PENDING` | No | Customer opened payment page, payment not yet received |
| `VERIFIED` | **Yes** | Payment confirmed — trigger fulfillment |
| `DISPUTED` | No | Payment received but auto-match failed — needs manual review |
| `RESOLVED` | **Yes** | Dispute approved by merchant — treat same as VERIFIED |
| `EXPIRED` | **Yes** | Order TTL elapsed without payment |
| `REJECTED` | **Yes** | Dispute rejected by merchant |

---

## Payment Matching

SeedhaPe embeds the order ID in the UPI transaction note (`tn`) field:

```
upi://pay?pa=merchant@ybl&am=499.00&tn=sp_ord_k3x9mq7y2p&cu=INR
```

When the customer pays, their UPI app includes this note in the payment notification. SeedhaPe's matching engine reads it to identify the exact order.

**Fallback matching** (when the `tn` field is unavailable — rare, but happens with some Paytm flows): matches by `expectedSenderName` + amount + 15-minute time window. Without a sender name, colliding orders at the same amount all go to `DISPUTED`.

**Recommendation:** always pass `expectedSenderName` when you know the customer (e.g. they're logged in). If the customer is anonymous, the browser modal will ask for their name before showing the QR code.

---

## Webhook events

You don't need the SDK to handle webhooks — they're raw HTTP POST requests from SeedhaPe to your server. But here's the payload shape for reference:

```json
{
  "event": "order.verified",
  "timestamp": "2026-03-15T11:11:11.000Z",
  "data": {
    "orderId": "sp_ord_k3x9mq7y2p",
    "externalOrderId": "your-internal-id",
    "amount": 49902,
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

Events: `order.verified` · `order.expired` · `order.disputed` · `order.resolved`

Verify the `X-SeedhaPe-Signature` header on every incoming webhook:

```typescript
import crypto from 'node:crypto';

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

---

## TypeScript types

All types are exported from the package root:

```typescript
import type {
  SeedhaPeConfig,
  CreateOrderOptions,
  OrderData,
  OrderStatus,
  PaymentResult,
  ShowPaymentOptions,
} from '@seedhape/sdk';
```

---

## CDN / vanilla JS

```html
<script src="https://cdn.seedhape.com/sdk/latest/index.global.js"></script>
<script>
  const sp = new SeedhaPe.SeedhaPe({});

  // Order creation must happen server-side — fetch your order ID first
  fetch('/api/create-order', { method: 'POST', body: JSON.stringify({ amount: 49900 }) })
    .then(r => r.json())
    .then(({ orderId }) => sp.showPayment({
      orderId,
      onSuccess: (r) => alert('Paid! ₹' + r.amount / 100),
    }));
</script>
```

---

## License

Proprietary. All rights reserved.
