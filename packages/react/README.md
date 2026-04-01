# @seedhape/react

React components and hooks for [SeedhaPe](https://seedhape.com) — zero-fee UPI payment verification for Indian merchants.

```
npm install @seedhape/react @seedhape/sdk
pnpm add @seedhape/react @seedhape/sdk
```

**Peer requirements:** React ≥ 18. Works with Next.js 14/15 App Router and Pages Router.

---

## Overview

This package provides three levels of integration:

| Export | Use when |
|--------|----------|
| `<PaymentButton>` | You want a single drop-in button — handles order creation and modal entirely |
| `<PaymentModal>` | You create the order yourself and want explicit control over when the modal opens |
| `usePayment` | You're building a fully custom payment UI and need the state machine |

All components share configuration through `SeedhaPeProvider`.

---

## Setup: SeedhaPeProvider

Wrap your app (or just the checkout subtree) once. The provider takes an `onCreateOrder` function that **you** implement — this keeps your API key on the server and out of client bundles.

### Next.js App Router (server actions)

```tsx
// app/layout.tsx
import { SeedhaPeProvider } from '@seedhape/react';
import { SeedhaPe } from '@seedhape/sdk';

async function createOrder(opts: CreateOrderOptions): Promise<OrderData> {
  'use server';
  const sp = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });
  return sp.createOrder(opts);
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SeedhaPeProvider onCreateOrder={createOrder}>
          {children}
        </SeedhaPeProvider>
      </body>
    </html>
  );
}
```

### Next.js Pages Router (API route)

```tsx
// pages/_app.tsx
import { SeedhaPeProvider } from '@seedhape/react';

async function createOrder(opts) {
  const res = await fetch('/api/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  });
  if (!res.ok) throw new Error('Order creation failed');
  return res.json();
}

export default function App({ Component, pageProps }) {
  return (
    <SeedhaPeProvider onCreateOrder={createOrder}>
      <Component {...pageProps} />
    </SeedhaPeProvider>
  );
}
```

```typescript
// pages/api/create-order.ts
import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const order = await sp.createOrder(req.body);
  res.json(order);
}
```

### Provider props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onCreateOrder` | `(opts: CreateOrderOptions) => Promise<OrderData>` | **Yes** | Called whenever a payment is initiated. Implement this on the server — your API key must never reach the browser. |
| `baseUrl` | `string` | No | Override the API base URL. Default: `https://seedhape.onrender.com`. |

---

## `<PaymentButton>`

The simplest integration. One component creates the order and opens the payment modal on click.

```tsx
import { PaymentButton } from '@seedhape/react';

function CheckoutPage() {
  return (
    <PaymentButton
      amount={49900}                         // paise — ₹499
      description="Pro subscription"
      expectedSenderName="Rahul Sharma"      // strongly recommended
      customerEmail="rahul@example.com"
      metadata={{ planKey: 'PRO', userId: 'usr_abc' }}
      onSuccess={(result) => {
        console.log('Payment verified!', result.orderId);
        router.push('/dashboard?upgraded=true');
      }}
      onExpired={(orderId) => {
        console.log('Order expired:', orderId);
      }}
    >
      Pay ₹499 →
    </PaymentButton>
  );
}
```

### PaymentButton props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `amount` | `number` | **Yes** | Amount in paise. ₹1 = 100 paise. |
| `description` | `string` | No | Order description, shown on the payment page. |
| `expectedSenderName` | `string` | No | Payer's UPI-registered name. **Strongly recommended** — improves auto-matching and reduces disputes. |
| `customerEmail` | `string` | No | Stored on the order and echoed in webhooks. |
| `customerPhone` | `string` | No | Stored on the order and echoed in webhooks. |
| `metadata` | `Record<string, unknown>` | No | Arbitrary JSON echoed verbatim in all webhook payloads. |
| `onSuccess` | `(result: PaymentResult) => void` | No | Called when payment is confirmed (`VERIFIED` or `RESOLVED`). |
| `onExpired` | `(orderId: string) => void` | No | Called when the order expires. |
| `className` | `string` | No | Custom CSS class. When provided, **all default styles are removed** — style the button entirely yourself. |
| `children` | `ReactNode` | No | Button label. Default: `"Pay Now"`. |

**Default styling** (applied when `className` is omitted): green background (#16a34a), white text, rounded corners, 12px padding. Override with `className` to use your own design system.

---

## `<PaymentModal>`

For when you create the order yourself and want to control exactly when the modal opens and closes.

```tsx
import { useState } from 'react';
import { PaymentModal } from '@seedhape/react';
import { useSeedhaPeContext } from '@seedhape/react';

function CustomCheckout() {
  const { onCreateOrder } = useSeedhaPeContext();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);
    try {
      const order = await onCreateOrder({ amount: 49900, description: 'Pro plan' });
      setOrderId(order.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button onClick={handlePay} disabled={loading}>
        {loading ? 'Creating order…' : 'Proceed to payment'}
      </button>

      {orderId && (
        <PaymentModal
          orderId={orderId}
          open={true}
          onClose={() => setOrderId(null)}
          onSuccess={(result) => {
            setOrderId(null);
            console.log('Paid! Amount:', result.amount / 100);
          }}
          onExpired={(id) => {
            setOrderId(null);
            console.warn('Expired:', id);
          }}
        />
      )}
    </>
  );
}
```

### PaymentModal props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `orderId` | `string` | **Yes** | SeedhaPe order ID from your server. |
| `open` | `boolean` | **Yes** | Whether the modal is visible. Set to `false` to hide without destroying state. |
| `onClose` | `() => void` | **Yes** | Called when the user dismisses the modal (backdrop click, Escape key, or close button). |
| `onSuccess` | `(result: PaymentResult) => void` | No | Called when payment is confirmed. The modal auto-closes after 2.5 s. |
| `onExpired` | `(orderId: string) => void` | No | Called after the dispute upload UI is shown and the order is confirmed expired. |

**Modal behaviour:**
- If `expectedSenderName` was **not** set when the order was created, the modal shows a name input step first, then stores it on the order before showing the QR code.
- Polls order status every 3 seconds.
- Countdown timer turns amber at 5 minutes remaining, red at 1 minute.
- On expiry or dispute, shows a screenshot upload UI so the customer can submit evidence.
- Adds a `beforeunload` warning while payment is in progress.

---

## `usePayment` hook

Full access to the payment state machine. Use this when you need to build a completely custom UI — embedded in a drawer, split across steps, etc.

```tsx
import { usePayment } from '@seedhape/react';

function PaymentFlow() {
  const { state, createPayment, onSuccess, onExpired, reset } = usePayment();

  async function start() {
    await createPayment({
      amount: 49900,
      description: 'Pro subscription',
      expectedSenderName: 'Rahul Sharma',
    });
  }

  if (state.phase === 'idle') {
    return <button onClick={start}>Pay ₹499</button>;
  }

  if (state.phase === 'creating') {
    return <Spinner />;
  }

  if (state.phase === 'pending') {
    return (
      <div>
        <img src={state.order.qrCode} alt="Scan to pay" />
        <a href={state.order.upiUri}>Open UPI App</a>
        <p>Waiting for payment…</p>
      </div>
    );
  }

  if (state.phase === 'verified') {
    return <p>Payment confirmed! ₹{state.result.amount / 100}</p>;
  }

  if (state.phase === 'expired') {
    return (
      <>
        <p>Order expired</p>
        <button onClick={reset}>Try again</button>
      </>
    );
  }

  if (state.phase === 'error') {
    return (
      <>
        <p>Error: {state.error}</p>
        <button onClick={reset}>Try again</button>
      </>
    );
  }
}
```

### State machine

```typescript
type PaymentState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'pending';  order: OrderData }
  | { phase: 'verified'; result: PaymentResult }
  | { phase: 'expired';  orderId: string }
  | { phase: 'error';    error: string }
```

### Hook return value

| Key | Type | Description |
|-----|------|-------------|
| `state` | `PaymentState` | Current phase + phase-specific data |
| `createPayment` | `(opts: CreateOrderOptions) => Promise<OrderData>` | Transition `idle → creating → pending`. Calls `onCreateOrder` from context. |
| `onSuccess` | `(result: PaymentResult) => void` | Manually transition to `verified`. Use when you're polling status yourself. |
| `onExpired` | `(orderId: string) => void` | Manually transition to `expired`. |
| `reset` | `() => void` | Return to `idle` from any state. |

---

## TypeScript types

Exported from `@seedhape/react`:

```typescript
import type { PaymentButtonProps, PaymentModalProps } from '@seedhape/react';
```

Core types (`OrderData`, `OrderStatus`, `PaymentResult`, `CreateOrderOptions`) are re-exported from `@seedhape/sdk`.

---

## Notes on key security

The provider's `onCreateOrder` is the **only place** your SeedhaPe API key should appear. It must run on the server. Never pass `apiKey` to a component or include it in a client bundle.

```
❌ const sp = new SeedhaPe({ apiKey: 'sp_live_...' })  // in a React component
✓  'use server'  /  API route  /  Express handler
```

---

## License

Proprietary. All rights reserved.
