import Link from 'next/link';
import { ExternalLink, ArrowRight, CheckCircle } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── Code snippets ─────────────────────────────────────────────────────────────

const snippets = {
  curlCreateOrder: `curl -X POST "https://api.seedhape.com/v1/orders" \\
  -H "Authorization: Bearer sp_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49900,
    "description": "Pro plan subscription",
    "externalOrderId": "your_order_123",
    "expectedSenderName": "Rahul Sharma",
    "expiresInMinutes": 15
  }'`,

  curlResponse: `{
  "id": "sp_ord_ab12cd34ef56",
  "amount": 49900,
  "originalAmount": 49900,
  "currency": "INR",
  "description": "Pro plan subscription",
  "status": "PENDING",
  "upiUri": "upi://pay?pa=merchant@ybl&pn=My+Store&am=499.00&tn=sp_ord_ab12cd34ef56&cu=INR",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEU...",
  "expiresAt": "2026-03-15T12:34:56.000Z",
  "createdAt": "2026-03-15T12:19:56.000Z"
}`,

  curlStatus: `curl "https://api.seedhape.com/v1/orders/sp_ord_ab12cd34ef56/status" \\
  -H "Authorization: Bearer sp_live_YOUR_KEY"`,

  sdkInstall: `npm install @seedhape/sdk
# or
pnpm add @seedhape/sdk
yarn add @seedhape/sdk`,

  sdkInit: `// server-side only — never expose API keys in the browser
import { SeedhaPe } from '@seedhape/sdk';

const seedhape = new SeedhaPe({
  apiKey: process.env.SEEDHAPE_API_KEY!, // sp_live_...
  // baseUrl: 'https://api.seedhape.com',  // default, override if self-hosting
});`,

  sdkCreateOrder: `const order = await seedhape.createOrder({
  amount: 49900,               // required — amount in paise (₹499 = 49900)
  description: 'Pro plan',     // shown to the payer
  externalOrderId: 'ord_123',  // your own order ID for deduplication
  expectedSenderName: 'Rahul Sharma', // ⭐ strongly recommended — see Payment Matching
  customerEmail: 'rahul@example.com',
  customerPhone: '+919876543210',
  expiresInMinutes: 15,        // default: 30 minutes
  metadata: { userId: 'usr_abc', planKey: 'PRO' }, // any JSON, echoed in webhooks
});

console.log(order.id);      // "sp_ord_ab12cd34ef56"
console.log(order.upiUri);  // deep-link for UPI apps
console.log(order.qrCode);  // base64 PNG data URL`,

  sdkRedirectHosted: `// Option A — redirect to seedhape-hosted payment page (easiest)
// Works for any framework (Next.js, Express, etc.)
const checkoutUrl = \`https://yourdomain.com/pay/\${order.id}\`;
return redirect(checkoutUrl);`,

  sdkBrowserModal: `// Option B — browser SDK modal (single-page apps)
// order.id was created on your server (see Step 2 above) and passed to the client.
// showPayment only calls public /v1/pay/* endpoints — no API key is ever sent.
import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({}); // no apiKey needed for showPayment

const result = await sp.showPayment({
  orderId: order.id,
  onSuccess: (result) => {
    console.log('Verified!', result.orderId, result.amount);
    // Webhook has already fired — just update your UI
  },
  onExpired: (orderId) => console.log('Expired:', orderId),
  onClose: () => console.log('User closed modal'),
});`,

  sdkGetStatus: `// Poll status from your backend (server-side)
const status = await seedhape.getOrderStatus('sp_ord_ab12cd34ef56');
// { orderId, status, amount, verifiedAt? }

// OrderStatus values:
// CREATED | PENDING | VERIFIED | DISPUTED | RESOLVED | EXPIRED | REJECTED`,

  reactInstall: `npm install @seedhape/react @seedhape/sdk`,

  reactProviderSetup: `// app/layout.tsx  or  _app.tsx
import { SeedhaPeProvider } from '@seedhape/react';
import { SeedhaPe } from '@seedhape/sdk';

// This runs on the SERVER — your secret key never reaches the browser.
async function createOrder(opts) {
  'use server';
  const client = new SeedhaPe({ apiKey: process.env.SEEDHAPE_SECRET_KEY! });
  return client.createOrder(opts);
}

export default function Layout({ children }) {
  return (
    <SeedhaPeProvider onCreateOrder={createOrder}>
      {children}
    </SeedhaPeProvider>
  );
}`,

  reactPaymentButton: `import { PaymentButton } from '@seedhape/react';

export default function CheckoutPage() {
  return (
    <PaymentButton
      amount={49900}                        // paise
      description="Pro subscription"
      expectedSenderName="Rahul Sharma"     // ⭐ recommended
      customerEmail="rahul@example.com"
      metadata={{ planKey: 'PRO' }}
      onSuccess={(result) => {
        console.log('Payment verified!', result);
        router.push('/dashboard?upgraded=true');
      }}
      onExpired={(orderId) => {
        console.log('Payment expired:', orderId);
      }}
      className="my-custom-btn-class"       // optional — disables default styles
    >
      Pay ₹499 →
    </PaymentButton>
  );
}`,

  reactPaymentModal: `import { useState } from 'react';
import { PaymentModal } from '@seedhape/react';

export default function CustomCheckout({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(true);

  return (
    <PaymentModal
      orderId={orderId}
      open={open}
      onClose={() => setOpen(false)}
      onSuccess={(result) => {
        setOpen(false);
        // result.status is "VERIFIED" or "RESOLVED"
        console.log('Amount verified:', result.amount);
      }}
      onExpired={(id) => {
        setOpen(false);
        console.warn('Order expired:', id);
      }}
    />
  );
}`,

  nextjsFullExample: `// app/api/checkout/route.ts  — server-side order creation
import { SeedhaPe } from '@seedhape/sdk';
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const sp = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { amount, description } = await req.json();

  const order = await sp.createOrder({
    amount,
    description,
    externalOrderId: \`\${userId}_\${Date.now()}\`,
    metadata: { userId },
  });

  // Return order ID — client renders /pay/:orderId or opens modal
  return NextResponse.json({ orderId: order.id });
}`,

  webhookHandler: `// app/api/webhooks/seedhape/route.ts  (Next.js App Router)
import crypto from 'node:crypto';

const WEBHOOK_SECRET = process.env.SEEDHAPE_WEBHOOK_SECRET!;

function verify(rawBody: string, signature: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected),
  );
}

export async function POST(req: Request) {
  const signature = req.headers.get('x-seedhape-signature') ?? '';
  const rawBody = await req.text();

  if (!verify(rawBody, signature)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  switch (payload.event) {
    case 'order.verified':
      await db.orders.update({
        where: { seedhapeOrderId: payload.data.orderId },
        data: { status: 'PAID', paidAt: payload.data.verifiedAt },
      });
      await fulfillOrder(payload.data.orderId);
      break;

    case 'order.expired':
      await db.orders.update({
        where: { seedhapeOrderId: payload.data.orderId },
        data: { status: 'EXPIRED' },
      });
      break;

    case 'order.disputed':
      await notifyMerchant('Payment needs manual review', payload.data.orderId);
      break;

    case 'order.resolved':
      await db.orders.update({
        where: { seedhapeOrderId: payload.data.orderId },
        data: { status: payload.data.status === 'RESOLVED' ? 'PAID' : 'REJECTED' },
      });
      break;
  }

  return new Response('OK', { status: 200 });
}`,

  webhookExpressHandler: `// Express / Hono / Fastify — same pattern, different syntax
import express from 'express';
import crypto from 'node:crypto';

const app = express();
app.use('/webhooks/seedhape', express.raw({ type: 'application/json' }));

app.post('/webhooks/seedhape', (req, res) => {
  const sig = req.headers['x-seedhape-signature'] as string;
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.SEEDHAPE_WEBHOOK_SECRET!)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body.toString());
  // ... handle event
  res.sendStatus(200); // respond quickly, process async
});`,

  disputeFlow: `// When order.status === 'EXPIRED' or 'DISPUTED', the modal automatically
// shows a screenshot upload UI — no extra code needed on your end.
//
// The customer:
//  1. Sees "Link Expired" or "Under Review" in the modal
//  2. Uploads a screenshot of their UPI payment confirmation
//  3. Clicks "Submit Dispute"
//
// You receive an order.disputed webhook:
{
  "event": "order.disputed",
  "data": { "orderId": "sp_ord_ab12cd34ef56", "status": "DISPUTED" }
}
//
// After you review and resolve in the Android app or dashboard:
// → Approve  → order.resolved fires, status = "RESOLVED"
// → Reject   → order.resolved fires, status = "REJECTED"`,

  disputeWebhookHandler: `case 'order.disputed':
  // Customer uploaded a screenshot — order needs manual review
  // Notify yourself (email, Slack, etc.) to check the Disputes tab
  await notifyTeam('Payment under review', payload.data.orderId);
  // Do NOT fulfill the order yet — wait for order.resolved
  break;

case 'order.resolved':
  if (payload.data.status === 'RESOLVED') {
    // You approved the dispute — fulfill the order
    await fulfillOrder(payload.data.orderId);
  } else {
    // You rejected it — inform the customer
    await markOrderRejected(payload.data.orderId);
  }
  break;`,

  curlSetExpectation: `# POST /v1/pay/:orderId/expectation
# Public endpoint — no API key required
# Call this after creating the order, before the customer pays

curl -X POST "https://api.seedhape.com/v1/pay/sp_ord_ab12cd34ef56/expectation" \\
  -H "Content-Type: application/json" \\
  -d '{ "expectedSenderName": "Rahul Sharma" }'

# Response
{ "ok": true }`,

  fetchSetExpectation: `// If building a custom payment UI without the SDK/React package,
// call this endpoint after showing the name input to your customer.

const res = await fetch(\`https://api.seedhape.com/v1/pay/\${orderId}/expectation\`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ expectedSenderName: customerName }),
});

if (!res.ok) throw new Error('Failed to set sender name');`,

  curlUploadScreenshot: `# POST /v1/pay/:orderId/screenshot
# Public endpoint — no API key required
# Accepted when order status is PENDING, DISPUTED, or EXPIRED

curl -X POST "https://api.seedhape.com/v1/pay/sp_ord_ab12cd34ef56/screenshot" \\
  -F "screenshot=@/path/to/payment-screenshot.jpg"

# Response
{
  "ok": true,
  "message": "Screenshot submitted for review",
  "screenshotUrl": "https://public.blob.vercel-storage.com/screenshots/sp_ord_ab12cd34ef56-..."
}`,

  fetchUploadScreenshot: `// Custom dispute UI — handle file input and upload directly
async function submitDispute(orderId: string, file: File) {
  const form = new FormData();
  form.append('screenshot', file);          // field name must be "screenshot"

  const res = await fetch(\`https://api.seedhape.com/v1/pay/\${orderId}/screenshot\`, {
    method: 'POST',
    body: form,
    // Do NOT set Content-Type manually — browser sets multipart boundary automatically
  });

  if (!res.ok) throw new Error('Upload failed');
  const { screenshotUrl } = await res.json();
  return screenshotUrl; // public URL of the uploaded image
}`,

  nameGateExplainer: `// The matching engine uses expectedSenderName in TWO ways:
//
// 1. COLLISION RESOLVER — if multiple orders have the same amount in the 15-min
//    window, only the one whose expectedSenderName matches the notification
//    sender gets VERIFIED. Without a name, all colliding orders → DISPUTED.
//
// 2. FRAUD GUARD — even when matched via order ID in the transaction note,
//    if expectedSenderName is set and the actual sender doesn't match →
//    order is flagged as DISPUTED. Prevents someone else paying the same
//    amount to steal a verified order.
//
// Option A — merchant supplies name at order creation (recommended)
// The modal skips the name gate entirely.
const order = await seedhape.createOrder({
  amount: 49900,
  expectedSenderName: 'Rahul Sharma', // from your logged-in user profile
});

// Option B — customer enters name in the modal (no name known at creation)
// Don't pass expectedSenderName — the modal shows a name input step first,
// then calls POST /v1/pay/:orderId/expectation before showing the QR code.
const order = await seedhape.createOrder({
  amount: 49900,
  // no expectedSenderName → modal collects it from the customer
});`,

  webhookPayload: `// order.verified — payment confirmed
{
  "event": "order.verified",
  "timestamp": "2026-03-15T11:11:11.000Z",
  "data": {
    "orderId": "sp_ord_ab12cd34ef56",
    "externalOrderId": "your_order_123",
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
}`,
};

// ─── UI helpers ────────────────────────────────────────────────────────────────

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 my-5 text-[13px]">
      {title && (
        <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <span className="ml-2 text-xs text-gray-400 font-mono">{title}</span>
        </div>
      )}
      <pre className="p-5 overflow-x-auto bg-[#0d1117] leading-relaxed">
        <code className="text-gray-300 font-mono">{code}</code>
      </pre>
    </div>
  );
}

function Callout({ type, children }: { type: 'tip' | 'warning' | 'important'; children: ReactNode }) {
  const cfg = {
    tip: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '💡', label: 'Tip', text: 'text-emerald-900' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', label: 'Warning', text: 'text-amber-900' },
    important: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '📌', label: 'Important', text: 'text-blue-900' },
  }[type];
  return (
    <div className={`flex gap-3 px-4 py-3.5 rounded-xl border ${cfg.bg} ${cfg.border} my-5`}>
      <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
      <p className={`text-sm leading-relaxed ${cfg.text}`}>
        <strong>{cfg.label}:</strong>{' '}{children}
      </p>
    </div>
  );
}

function Badge({ children, variant = 'brand' }: { children: ReactNode; variant?: 'brand' | 'gray' | 'amber' }) {
  const cls = {
    brand: 'bg-brand-50 text-brand-700 border-brand-100',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  }[variant];
  return (
    <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-md border font-mono ${cls}`}>
      {children}
    </span>
  );
}

function SectionAnchor({ id, n, title, subtitle }: { id: string; n: string; title: string; subtitle?: string }) {
  return (
    <div id={id} className="scroll-mt-24 mb-8 pt-4">
      <div className="flex items-center gap-3 mb-1">
        <span className="text-[11px] font-extrabold tracking-widest text-brand-500 uppercase">{n}</span>
      </div>
      <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <p className="mt-2 text-gray-500 leading-relaxed max-w-2xl">{subtitle}</p>}
    </div>
  );
}

function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3 id={id} className="text-lg font-bold text-gray-900 mt-8 mb-3 scroll-mt-24 tracking-tight">
      {children}
    </h3>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-gray-600 leading-relaxed mb-4">{children}</p>;
}

function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-2 mb-5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[15px] text-gray-600">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
          <span className="leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function OL({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3 mb-5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span className="text-[15px] text-gray-600 leading-relaxed pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function Divider() {
  return <hr className="my-12 border-gray-100" />;
}

function Prop({
  name, type, required, children,
}: { name: string; type: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <code className="text-[13px] font-mono font-semibold text-slate-800">{name}</code>
        <code className="text-[12px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">{type}</code>
        {required && (
          <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">
            required
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{children}</p>
    </div>
  );
}

// ─── TOC ───────────────────────────────────────────────────────────────────────

const tocItems = [
  { href: '#quickstart', label: '⚡ Quickstart', sub: false },
  { href: '#account-setup', label: '1. Account Setup', sub: false },
  { href: '#android-app', label: '2. Android App', sub: false },
  { href: '#api-reference', label: '3. REST API', sub: false },
  { href: '#sdk', label: '4. JavaScript SDK', sub: false },
  { href: '#sdk-create', label: 'Create order', sub: true },
  { href: '#sdk-modal', label: 'Payment modal', sub: true },
  { href: '#react', label: '5. React Package', sub: false },
  { href: '#react-provider', label: 'SeedhaPeProvider', sub: true },
  { href: '#react-button', label: 'PaymentButton', sub: true },
  { href: '#react-modal', label: 'PaymentModal', sub: true },
  { href: '#nextjs', label: '6. Next.js Guide', sub: false },
  { href: '#webhooks', label: '7. Webhooks', sub: false },
  { href: '#webhook-events', label: 'Events reference', sub: true },
  { href: '#webhook-verify', label: 'Signature verification', sub: true },
  { href: '#disputes', label: '8. Disputes & Name Input', sub: false },
  { href: '#disputes-name', label: 'Name gate', sub: true },
  { href: '#disputes-flow', label: 'Dispute flow', sub: true },
  { href: '#disputes-webhooks', label: 'Webhook handling', sub: true },
  { href: '#payment-matching', label: '9. Payment Matching', sub: false },
  { href: '#go-live', label: '10. Go-Live Checklist', sub: false },
  { href: '#troubleshooting', label: '11. Troubleshooting', sub: false },
  { href: '/docs/api', label: '→ Full API Reference', sub: false },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function MerchantDocsPage() {
  return (
    <div className="bg-white h-screen flex flex-col overflow-hidden">
      {/* Page hero */}
      <div className="shrink-0 border-b border-gray-100 bg-gradient-to-br from-white to-brand-50/30 pt-24 pb-10 px-6">
        <div className="max-w-5xl mx-auto">
          <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Documentation</span>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-gray-900">
            Merchant Integration Guide
          </h1>
          <p className="mt-3 text-gray-500 text-lg max-w-2xl leading-relaxed">
            Everything you need to accept UPI payments on your webapp — from account creation
            to your first verified payment in under 10 minutes.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="#quickstart"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Start here <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/dashboard/settings"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
            >
              Dashboard Settings <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Two-column layout — fills remaining viewport, both columns scroll independently */}
      <div className="flex-1 overflow-hidden max-w-5xl mx-auto w-full px-4 sm:px-6 flex gap-10 lg:gap-16">

        {/* TOC sidebar — independently scrollable */}
        <aside className="hidden lg:flex flex-col w-52 shrink-0 overflow-y-auto py-10 scrollbar-thin">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-2">On this page</p>
          <nav className="space-y-0.5">
            {tocItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`block text-sm py-1.5 rounded-lg transition-colors hover:text-brand-700 ${
                  item.sub
                    ? 'pl-5 text-gray-400 hover:text-gray-700 text-[13px]'
                    : 'px-2 font-medium text-gray-600 hover:bg-brand-50'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main content — independently scrollable */}
        <div className="flex-1 min-w-0 overflow-y-auto py-10">

          {/* ── QUICKSTART ───────────────────────────────────────────────────── */}
          <div id="quickstart" className="scroll-mt-24 mb-3">
            <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-6 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">⚡</span>
                <h2 className="text-xl font-extrabold text-gray-900">5-Minute Quickstart</h2>
              </div>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                Follow these steps to go from zero to a live verified payment on your webapp.
              </p>
              <div className="space-y-3">
                {[
                  <>
                    <strong>Create an account</strong> at{' '}
                    <Link href="/sign-up" className="text-brand-600 underline underline-offset-2">
                      seedhape.com/sign-up
                    </Link>
                    {' '}— it's free, no credit card needed.
                  </>,
                  <>
                    <strong>Set your UPI ID</strong> in Dashboard → Settings → Business Profile.
                    This is where customer payments will land.
                  </>,
                  <>
                    <strong>Generate an API key</strong> in Settings → API Keys → New Key.
                    Copy it immediately — it won't be shown again.
                  </>,
                  <>
                    <strong>Install the SeedhaPe Android app</strong> on the phone where your UPI
                    notifications arrive. Enter your API key, grant notification access.
                  </>,
                  <>
                    <strong>Create an order</strong> from your backend using the API or SDK. Get back
                    a <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">upiUri</code> and QR code.
                  </>,
                  <>
                    <strong>Show the payment UI</strong> to your customer using our hosted page,
                    SDK modal, or React components.
                  </>,
                  <>
                    <strong>Receive the webhook</strong> at your endpoint — SeedhaPe fires{' '}
                    <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">order.verified</code>{' '}
                    within 5 seconds of payment. Fulfill the order.
                  </>,
                ].map((step, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Divider />

          {/* ── ACCOUNT SETUP ─────────────────────────────────────────────── */}
          <SectionAnchor id="account-setup" n="Section 1" title="Account Setup"
            subtitle="Configure your merchant profile and generate API credentials." />

          <H3>Create your account</H3>
          <OL items={[
            <>Visit <Link href="/sign-up" className="text-brand-600 underline underline-offset-2">seedhape.com/sign-up</Link> and create a free account.</>,
            <>After sign-in, open <strong>Dashboard → Settings</strong>.</>,
            <>Fill in your <strong>Business Name</strong> — this appears on the hosted payment page.</>,
            <>Set your <strong>UPI ID</strong> (e.g. <Badge>merchant@ybl</Badge> or <Badge>9876543210@paytm</Badge>). Customer payments land directly here.</>,
            <>Click <strong>Save Changes</strong>.</>,
          ]} />

          <Callout type="important">
            Your UPI ID must match the one registered with your bank. Payments go directly to this UPI ID
            — SeedhaPe never touches the money.
          </Callout>

          <H3 id="api-keys">Generate an API Key</H3>
          <OL items={[
            <>In Settings, scroll to <strong>API Keys</strong> and click <strong>New Key</strong>.</>,
            <>A key is generated in the format <Badge>sp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</Badge>.</>,
            <>Copy it immediately — it is shown <strong>only once</strong>.</>,
            <>Store it in your server environment as <Badge>SEEDHAPE_API_KEY</Badge>. Never commit it to source control.</>,
          ]} />

          <Callout type="warning">
            API keys are unrecoverable after creation. If lost, delete the key from the dashboard
            and generate a new one. Your old key will immediately stop working.
          </Callout>

          <H3>Set up your Webhook URL</H3>
          <P>SeedhaPe posts payment events to your webhook endpoint. Configure it now even if your endpoint isn't live yet — you can test it from the dashboard.</P>
          <OL items={[
            <>In Settings, enter your <strong>Webhook URL</strong> (e.g. <Badge>https://api.yoursite.com/webhooks/seedhape</Badge>).</>,
            <>Create a random <strong>Webhook Secret</strong> (min 16 chars) and enter it in the field.</>,
            <>Store the same secret in your server environment as <Badge>SEEDHAPE_WEBHOOK_SECRET</Badge>.</>,
            <>Click <strong>Test</strong> to verify your endpoint receives the test event.</>,
          ]} />

          <Divider />

          {/* ── ANDROID APP ───────────────────────────────────────────────── */}
          <SectionAnchor id="android-app" n="Section 2" title="Android App Setup"
            subtitle="The Android app is the brain of SeedhaPe — it listens to UPI notifications and triggers payment verification." />

          <Callout type="important">
            The Android app is <strong>required</strong> for payment verification to work. It must run
            on the phone that receives UPI payment notifications — typically the merchant's business phone.
          </Callout>

          <H3>Installation & Setup</H3>
          <OL items={[
            <>Download and install the SeedhaPe merchant app on your Android device.</>,
            <>Open the app and enter your API key (<Badge>sp_live_...</Badge>) when prompted.</>,
            <>Tap <strong>Connect</strong>. The app verifies your key and registers the device.</>,
            <>When the system prompts for <strong>Notification Access</strong>, tap Allow — this is required for the app to read UPI notifications.</>,
            <>Allow the app's own <strong>persistent notification</strong> — Android uses it to keep the background service alive.</>,
            <>In your phone's Battery settings, set the SeedhaPe app to <strong>Unrestricted</strong> (or turn off battery optimization for it). This prevents Android from killing the service.</>,
          ]} />

          <H3>Keeping the device online</H3>
          <P>
            The app sends a heartbeat to SeedhaPe every ~50 seconds. If the heartbeat stops for too long,
            your merchant account is marked <Badge variant="amber">OFFLINE</Badge>. While offline:
          </P>
          <UL items={[
            <>New order creation is blocked — customers will see an error.</>,
            <>Existing pending orders will not be verified until you come back online.</>,
            <><strong>Ensure the phone has a stable internet connection</strong> (WiFi or mobile data).</>,
            <>Do not force-stop the app or revoke notification permission.</>,
          ]} />

          <Callout type="tip">
            Check merchant online status in real-time on your Dashboard home page. A green dot means
            your device is connected and heartbeating normally.
          </Callout>

          <Divider />

          {/* ── REST API ──────────────────────────────────────────────────── */}
          <SectionAnchor id="api-reference" n="Section 3" title="REST API Reference"
            subtitle="Call the API directly from any language using plain HTTP." />

          <H3>Authentication</H3>
          <P>
            All API requests use Bearer token authentication. Include your API key in every request:
          </P>
          <CodeBlock title="Authorization header" code={`Authorization: Bearer sp_live_YOUR_KEY`} />

          <H3 id="create-order-api">POST /v1/orders — Create an order</H3>
          <P>Creates a new payment order and returns a UPI URI and QR code.</P>

          <CodeBlock title="curl" code={snippets.curlCreateOrder} />

          <H3>Request body parameters</H3>
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 divide-y divide-gray-100">
            <Prop name="amount" type="number" required>
              Amount in <strong>paise</strong> (1 rupee = 100 paise). ₹499 = <code>49900</code>.
            </Prop>
            <Prop name="description" type="string">
              Short description shown on the payment page and in UPI apps. Max 100 chars.
            </Prop>
            <Prop name="externalOrderId" type="string">
              Your own order ID for deduplication. Returned in webhooks as <code>externalOrderId</code>.
              Use this to link SeedhaPe orders to your database rows.
            </Prop>
            <Prop name="expectedSenderName" type="string">
              The payer's name <em>exactly</em> as it appears in their UPI app (e.g. "Rahul Sharma").
              <strong> Strongly recommended</strong> — used as fallback matching when the UPI transaction note
              doesn't contain the order ID. Significantly reduces disputes.
            </Prop>
            <Prop name="customerEmail" type="string">
              Customer email — stored on the order, echoed in webhooks, not shown to payer.
            </Prop>
            <Prop name="customerPhone" type="string">
              Customer phone number. Same as email — stored and echoed only.
            </Prop>
            <Prop name="expiresInMinutes" type="number">
              Order TTL in minutes. Default: <code>30</code>. After expiry, the order moves to
              <Badge variant="gray">EXPIRED</Badge> and the webhook fires.
            </Prop>
            <Prop name="metadata" type="Record&lt;string, unknown&gt;">
              Arbitrary JSON. Echoed verbatim in all webhook payloads. Use this to store
              your internal order ID, user ID, plan key, etc.
            </Prop>
          </div>

          <H3>Response</H3>
          <CodeBlock title="200 OK" code={snippets.curlResponse} />

          <H3>GET /v1/orders/:id/status — Poll order status</H3>
          <CodeBlock title="curl" code={snippets.curlStatus} />
          <P>Returns <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">{"{ orderId, status, amount, verifiedAt? }"}</code>. Poll this from your server if you need status without a webhook.</P>

          <H3>Order statuses</H3>
          <div className="grid grid-cols-2 gap-2 my-4">
            {[
              { status: 'CREATED', desc: 'Order created, awaiting payment' },
              { status: 'PENDING', desc: 'Payment page opened by customer' },
              { status: 'VERIFIED', desc: 'Payment confirmed ✓' },
              { status: 'DISPUTED', desc: 'Ambiguous match — needs review' },
              { status: 'RESOLVED', desc: 'Dispute resolved by merchant' },
              { status: 'EXPIRED', desc: 'TTL elapsed without payment' },
              { status: 'REJECTED', desc: 'Dispute rejected by merchant' },
            ].map(({ status, desc }) => (
              <div key={status} className="flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                <Badge variant={status === 'VERIFIED' || status === 'RESOLVED' ? 'brand' : status === 'DISPUTED' ? 'amber' : 'gray'}>
                  {status}
                </Badge>
                <span className="text-xs text-gray-500 leading-tight mt-0.5">{desc}</span>
              </div>
            ))}
          </div>

          <Divider />

          {/* ── SDK ───────────────────────────────────────────────────────── */}
          <SectionAnchor id="sdk" n="Section 4" title="JavaScript SDK (@seedhape/sdk)"
            subtitle="Type-safe wrapper around the REST API. Works in Node.js, Deno, Bun, and modern browsers." />

          <H3>Installation</H3>
          <CodeBlock code={snippets.sdkInstall} />

          <H3>Initialization</H3>
          <CodeBlock title="lib/seedhape.ts" code={snippets.sdkInit} />

          <Callout type="warning">
            Keep your API key on the <strong>server side only</strong>. Never expose
            <Badge>sp_live_</Badge> keys in client-side bundles. Use environment variables.
          </Callout>

          <H3 id="sdk-create">Create an order</H3>
          <CodeBlock title="server — create-order.ts" code={snippets.sdkCreateOrder} />

          <H3>Show the payment UI</H3>
          <P>Once you have an order ID, you have two options for showing the payment UI:</P>

          <H3 id="sdk-modal">Option A — Hosted payment page (recommended)</H3>
          <P>Redirect your customer to the built-in payment page. Zero frontend work.</P>
          <CodeBlock title="server" code={snippets.sdkRedirectHosted} />

          <H3>Option B — Browser SDK modal</H3>
          <P>Render an in-page modal without a redirect. Best for SPAs and native-feeling checkouts.</P>
          <CodeBlock title="client — checkout.ts" code={snippets.sdkBrowserModal} />

          <Callout type="tip">
            With the browser modal (Option B), pass a client-safe public key or proxy the order creation
            through your backend API route. Never ship <Badge>sp_live_</Badge> keys to the browser.
          </Callout>

          <H3>Poll order status</H3>
          <CodeBlock title="server" code={snippets.sdkGetStatus} />

          <Divider />

          {/* ── REACT ─────────────────────────────────────────────────────── */}
          <SectionAnchor id="react" n="Section 5" title="React Package (@seedhape/react)"
            subtitle="Drop-in components and hooks for React and Next.js apps. Zero-config checkout in one component." />

          <H3>Installation</H3>
          <CodeBlock code={snippets.reactInstall} />

          <H3 id="react-provider">SeedhaPeProvider</H3>
          <P>
            Wrap your app (or just the checkout subtree) with the provider. Pass an{' '}
            <code>onCreateOrder</code> callback that calls your server — your secret API key
            stays on the server and is never bundled into client-side JavaScript.
          </P>
          <CodeBlock title="app/layout.tsx" code={snippets.reactProviderSetup} />

          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 divide-y divide-gray-100">
            <Prop name="onCreateOrder" type="(opts: CreateOrderOptions) => Promise<OrderData>" required>
              Called when a payment is initiated. Implement this as a Next.js server action or a
              fetch to your own backend endpoint. Your SeedhaPe API key must only live here —
              never in client-side code.
            </Prop>
          </div>

          <H3 id="react-button">PaymentButton</H3>
          <P>
            The simplest integration — a button that creates an order and opens the payment modal
            in one click. No manual order creation needed.
          </P>
          <CodeBlock title="components/checkout.tsx" code={snippets.reactPaymentButton} />

          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 divide-y divide-gray-100">
            <Prop name="amount" type="number" required>Amount in paise (₹1 = 100 paise).</Prop>
            <Prop name="description" type="string">Order description shown on payment page.</Prop>
            <Prop name="expectedSenderName" type="string">
              Payer's UPI-registered name. <strong>Strongly recommended</strong> — improves matching accuracy.
            </Prop>
            <Prop name="customerEmail" type="string">Customer email, stored on the order.</Prop>
            <Prop name="customerPhone" type="string">Customer phone number.</Prop>
            <Prop name="metadata" type="Record&lt;string, unknown&gt;">
              Arbitrary data echoed in webhook payloads.
            </Prop>
            <Prop name="onSuccess" type="(result: PaymentResult) => void">
              Called when payment is verified. <code>result.status</code> is <Badge>VERIFIED</Badge> or{' '}
              <Badge>RESOLVED</Badge>. The webhook has already fired at this point.
            </Prop>
            <Prop name="onExpired" type="(orderId: string) => void">
              Called when the order expires without payment.
            </Prop>
            <Prop name="className" type="string">
              Custom CSS class. When provided, default button styles are removed entirely.
            </Prop>
            <Prop name="children" type="ReactNode">
              Button label. Defaults to "Pay Now".
            </Prop>
          </div>

          <H3 id="react-modal">PaymentModal (manual control)</H3>
          <P>
            Use <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">PaymentModal</code> directly
            when you need to create the order yourself (e.g. server-side) and control when the modal opens.
          </P>
          <CodeBlock title="components/custom-checkout.tsx" code={snippets.reactPaymentModal} />

          <Callout type="tip">
            The modal has a built-in 2-step flow: Step 1 collects the payer's name (if not already set),
            Step 2 shows the QR code. If you pass <code>expectedSenderName</code> when creating the order,
            Step 1 is skipped automatically.
          </Callout>

          <Divider />

          {/* ── NEXT.JS GUIDE ─────────────────────────────────────────────── */}
          <SectionAnchor id="nextjs" n="Section 6" title="Next.js Integration Guide"
            subtitle="Complete server-side order creation + client modal pattern for Next.js App Router." />

          <P>
            The recommended pattern for Next.js: create orders in a Server Action or API Route,
            return the <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">orderId</code> to the
            client, then open the modal or redirect to the hosted page.
          </P>

          <CodeBlock title="app/api/checkout/route.ts" code={snippets.nextjsFullExample} />

          <Callout type="tip">
            The client component calls <code>/api/checkout</code>, gets back the <code>orderId</code>,
            then renders <code>{'<PaymentModal orderId={orderId} open />'}</code>. The API key never
            leaves the server.
          </Callout>

          <Divider />

          {/* ── WEBHOOKS ──────────────────────────────────────────────────── */}
          <SectionAnchor id="webhooks" n="Section 7" title="Webhook Setup"
            subtitle="SeedhaPe notifies your backend of every payment event via signed HTTP POST requests." />

          <H3 id="webhook-events">Events reference</H3>
          <div className="border border-gray-100 rounded-xl overflow-hidden mb-6 divide-y divide-gray-100">
            {[
              { event: 'order.verified', desc: 'Payment confirmed by the matching engine. Fulfill the order.', color: 'brand' },
              { event: 'order.expired', desc: 'Order TTL elapsed without a matching payment.', color: 'gray' },
              { event: 'order.disputed', desc: 'Ambiguous match — multiple orders share the same amount. Merchant must review.', color: 'amber' },
              { event: 'order.resolved', desc: 'Merchant resolved a dispute. Check data.status to know if approved or rejected.', color: 'gray' },
            ].map(({ event, desc, color }) => (
              <div key={event} className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 px-3">
                <Badge variant={color as 'brand' | 'gray' | 'amber'}>{event}</Badge>
                <span className="text-sm text-gray-500">{desc}</span>
              </div>
            ))}
          </div>

          <H3>Sample payload — order.verified</H3>
          <CodeBlock title="POST https://yoursite.com/webhooks/seedhape" code={snippets.webhookPayload} />

          <H3 id="webhook-verify">Signature verification</H3>
          <P>
            Every webhook includes an{' '}
            <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs">X-SeedhaPe-Signature</code>{' '}
            header containing <code>sha256=&lt;hex&gt;</code>. Always verify this before processing.
          </P>

          <H3>Next.js App Router handler</H3>
          <CodeBlock title="app/api/webhooks/seedhape/route.ts" code={snippets.webhookHandler} />

          <H3>Express / Hono / Fastify</H3>
          <CodeBlock title="routes/webhooks.ts" code={snippets.webhookExpressHandler} />

          <H3>Webhook best practices</H3>
          <UL items={[
            <>Always verify the HMAC signature before processing any payload.</>,
            <>Return <code>200 OK</code> immediately and process asynchronously (queue the job). SeedhaPe retries on non-2xx.</>,
            <>Make your handler <strong>idempotent</strong> — you may receive the same event more than once on retries.</>,
            <>Use <code>data.externalOrderId</code> to map webhook events to your own orders.</>,
            <>SeedhaPe retries failed deliveries 5 times with exponential backoff (max ~5 minutes total).</>,
            <>Monitor the Webhook Retry Log in your dashboard for failures.</>,
          ]} />

          <Divider />

          {/* ── DISPUTES & NAME INPUT ─────────────────────────────────────── */}
          <SectionAnchor
            id="disputes"
            n="Section 8"
            title="Disputes & Name Input"
            subtitle="What happens when a payment can't be automatically matched — and how customers can raise disputes directly from the payment modal."
          />

          <H3 id="disputes-name">Name gate — the core of payment matching</H3>
          <P>
            <code>expectedSenderName</code> is not just a helpful hint — it is actively used by the
            matching engine in two ways:
          </P>
          <UL items={[
            <><strong>Collision resolver:</strong> if two orders share the same amount in the 15-minute
            window, the engine picks the one whose <code>expectedSenderName</code> matches the
            sender from the UPI notification. Without a name, both orders are flagged as <Badge variant="amber">DISPUTED</Badge>.</>,
            <><strong>Fraud guard:</strong> even when an order is matched via its ID in the UPI
            transaction note, the engine still checks the sender name. If it doesn&apos;t match,
            the order is flagged as <Badge variant="amber">DISPUTED</Badge> — preventing someone
            else from paying the same amount to steal a verified order.</>,
          ]} />
          <P>
            There are two ways to provide the sender name:
          </P>
          <CodeBlock title="name-gate-options.ts" code={snippets.nameGateExplainer} />
          <Callout type="tip">
            If you have the customer&apos;s name in your session (e.g. from Clerk or your own auth),
            always pass <code>expectedSenderName</code> at order creation — the modal skips the name
            step entirely and goes straight to the QR code.
          </Callout>
          <P>
            When <code>expectedSenderName</code> is not provided at creation, both the React{' '}
            <code>PaymentModal</code> and the vanilla JS SDK modal automatically show a name input
            step before the QR code. The customer enters their name exactly as shown in their UPI
            app, and the modal calls the expectation endpoint before proceeding. If you are building
            a <strong>custom UI</strong>, call it directly:
          </P>
          <CodeBlock title="curl — set sender name" code={snippets.curlSetExpectation} />
          <CodeBlock title="fetch — custom UI" code={snippets.fetchSetExpectation} />
          <div className="border border-gray-100 rounded-xl p-4 my-5 bg-gray-50 text-sm">
            <p className="font-semibold text-gray-700 mb-2">Endpoint reference</p>
            <div className="flex flex-wrap gap-2 items-center mb-1">
              <Badge variant="brand">POST</Badge>
              <code className="text-[13px] text-slate-700">/v1/pay/:orderId/expectation</code>
              <Badge variant="gray">public</Badge>
            </div>
            <p className="text-gray-500 text-[13px]">Body: <code>{`{ "expectedSenderName": "string" }`}</code></p>
            <p className="text-gray-500 text-[13px] mt-1">Accepts when status is <code>CREATED</code>, <code>PENDING</code>, or <code>DISPUTED</code>.</p>
          </div>

          <H3 id="disputes-flow">Dispute flow</H3>
          <P>
            A dispute occurs when a payment is made but SeedhaPe cannot automatically match it —
            either because the order expired before the notification arrived, or because the
            notification didn&apos;t contain enough information to match.
          </P>
          <UL items={[
            <>Order expires (window passes) → status becomes <Badge variant="amber">EXPIRED</Badge></>,
            <>Notification arrives but can&apos;t be matched → status becomes <Badge variant="amber">DISPUTED</Badge></>,
            <>Customer sees &quot;Link Expired&quot; or &quot;Under Review&quot; in the modal</>,
            <>Customer uploads a screenshot of their UPI payment confirmation</>,
            <>Order status → <Badge variant="amber">DISPUTED</Badge>, <code>order.disputed</code> webhook fires</>,
            <>You review the screenshot in the Disputes tab (dashboard or Android app)</>,
            <>Approve → status → <Badge>RESOLVED</Badge>, <code>order.resolved</code> fires</>,
            <>Reject → status → <Badge variant="gray">REJECTED</Badge>, <code>order.resolved</code> fires</>,
          ]} />
          <Callout type="important">
            Screenshot upload is built into both the React <code>PaymentModal</code> and the vanilla
            JS SDK modal — no extra code needed on your end. The dispute is raised by the customer
            directly from the payment modal. If you are building a custom UI, call the screenshot
            endpoint directly:
          </Callout>
          <CodeBlock title="curl — upload dispute screenshot" code={snippets.curlUploadScreenshot} />
          <CodeBlock title="fetch — custom dispute UI" code={snippets.fetchUploadScreenshot} />
          <div className="border border-gray-100 rounded-xl p-4 my-5 bg-gray-50 text-sm">
            <p className="font-semibold text-gray-700 mb-2">Endpoint reference</p>
            <div className="flex flex-wrap gap-2 items-center mb-1">
              <Badge variant="brand">POST</Badge>
              <code className="text-[13px] text-slate-700">/v1/pay/:orderId/screenshot</code>
              <Badge variant="gray">public</Badge>
            </div>
            <p className="text-gray-500 text-[13px]">Body: <code>multipart/form-data</code> — field name <code>screenshot</code>, image file.</p>
            <p className="text-gray-500 text-[13px] mt-1">Accepts when status is <code>PENDING</code>, <code>DISPUTED</code>, or <code>EXPIRED</code>.</p>
            <p className="text-gray-500 text-[13px] mt-1">Returns: <code>{`{ ok, message, screenshotUrl }`}</code></p>
          </div>
          <CodeBlock title="dispute-flow-overview.ts" code={snippets.disputeFlow} />

          <H3 id="disputes-webhooks">Handling dispute webhooks</H3>
          <P>
            Add these cases to your existing webhook handler:
          </P>
          <CodeBlock title="webhook-handler.ts" code={snippets.disputeWebhookHandler} />
          <Callout type="warning">
            Never fulfill an order on <code>order.disputed</code> — wait for <code>order.resolved</code>{' '}
            with <code>status: &quot;RESOLVED&quot;</code> before delivering goods or unlocking features.
          </Callout>

          <Divider />

          {/* ── PAYMENT MATCHING ──────────────────────────────────────────── */}
          <SectionAnchor id="payment-matching" n="Section 9" title="How Payment Matching Works"
            subtitle="Understanding the matching engine helps you maximise auto-verification rates and minimise disputes." />

          <H3>Primary matching — transaction note</H3>
          <P>
            When a customer pays, their UPI app fills the transaction note (<code>tn</code> field)
            with the order ID (<Badge>sp_ord_...</Badge>). SeedhaPe reads this from the Android
            notification and matches it to the order directly. This is the most reliable path and
            requires no configuration.
          </P>

          <H3>Fallback matching — amount + sender name</H3>
          <P>
            Some UPI apps don't preserve the transaction note, or customers use a different app
            than expected. In this case SeedhaPe falls back to:
          </P>
          <OL items={[
            <>Find all pending orders for this merchant with the same amount created within the last 15 minutes.</>,
            <>If exactly one order matches the amount AND the sender name partially matches <code>expectedSenderName</code>, verify it.</>,
            <>If exactly one order matches amount alone (no name conflict), verify it.</>,
            <>If multiple orders match and names don't disambiguate → mark all as <Badge variant="amber">DISPUTED</Badge>.</>,
          ]} />

          <Callout type="important">
            Always pass <code>expectedSenderName</code> when you know the payer's name (e.g. from your user
            profile). This is the single most effective way to prevent disputes. The name is matched
            partially (token overlap), so "Rahul" matches "Rahul Kumar Sharma".
          </Callout>

          <H3>Handling disputes</H3>
          <UL items={[
            <>Disputed orders appear in your <strong>Dashboard → Disputes</strong> tab and in the mobile app.</>,
            <>Tap the order → <strong>Approve</strong> (if you confirm the payment arrived) or <strong>Reject</strong>.</>,
            <>Approving moves the order to <Badge>RESOLVED</Badge> and fires the <code>order.resolved</code> webhook.</>,
            <>You can add a resolution note (e.g. UTR from bank statement) for your records.</>,
          ]} />

          <Divider />

          {/* ── GO-LIVE ───────────────────────────────────────────────────── */}
          <SectionAnchor id="go-live" n="Section 10" title="Production Go-Live Checklist"
            subtitle="Before you launch to real customers, verify each item below." />

          <div className="space-y-2.5 mb-6">
            {[
              { label: 'Use live API keys', detail: 'Keys starting with sp_live_ only. Never use test keys in production.' },
              { label: 'UPI ID is correct', detail: 'Double-check the UPI ID in Settings — wrong ID means payments go to the wrong account.' },
              { label: 'Android app is running', detail: 'Confirm the dashboard shows your device as ONLINE with a recent heartbeat.' },
              { label: 'Battery optimization disabled', detail: 'Set SeedhaPe to Unrestricted in Android battery settings.' },
              { label: 'Webhook URL is HTTPS', detail: 'SeedhaPe only delivers to HTTPS endpoints in production.' },
              { label: 'Webhook signature verified', detail: 'Your handler must validate X-SeedhaPe-Signature before processing.' },
              { label: 'Idempotent webhook handler', detail: 'Handle duplicate events gracefully — network retries can cause repeats.' },
              { label: 'expectedSenderName set', detail: 'Pass payer name on createOrder wherever possible to minimise disputes.' },
              { label: 'Webhook test succeeds', detail: 'Use the Test button in Settings → Webhook URL to confirm delivery.' },
              { label: 'Dispute monitoring', detail: 'Set up alerts for new disputes — they need merchant action within 24 hours.' },
              { label: 'Secrets in environment variables', detail: 'SEEDHAPE_API_KEY and SEEDHAPE_WEBHOOK_SECRET must never be in source code.' },
            ].map(({ label, detail }) => (
              <div key={label} className="flex gap-3 items-start bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                <CheckCircle className="h-4 w-4 text-brand-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{detail}</p>
                </div>
              </div>
            ))}
          </div>

          <Divider />

          {/* ── TROUBLESHOOTING ───────────────────────────────────────────── */}
          <SectionAnchor id="troubleshooting" n="Section 11" title="Troubleshooting"
            subtitle="Common issues and how to resolve them." />

          <div className="space-y-4">
            {[
              {
                q: 'Order creation fails with "Merchant offline"',
                a: 'Your Android device hasn\'t sent a heartbeat recently. Open the SeedhaPe app, check the connection status. Ensure notification permission is granted and battery optimization is disabled.',
              },
              {
                q: 'Payment was made but order stays PENDING',
                a: 'The notification wasn\'t captured. Check: (1) The payer used a supported UPI app. (2) Your phone received a payment notification — check your notification shade. (3) Notification listener permission is still active (Android sometimes resets it after updates).',
              },
              {
                q: 'Order became DISPUTED instead of VERIFIED',
                a: 'The matching engine found multiple orders with the same amount. Prevent this by: (1) Always passing expectedSenderName. (2) Using distinct amounts (even ₹1 difference). (3) Keeping order expiry short so stale orders don\'t pollute the window.',
              },
              {
                q: 'Webhook not received',
                a: 'Check: (1) Your URL is reachable from the internet (test with the dashboard Test button). (2) Your endpoint returns HTTP 200. (3) Check the Webhook Retry Log in your dashboard for error details. (4) Ensure your server isn\'t rejecting requests without a body parser.',
              },
              {
                q: 'Webhook signature verification failing',
                a: 'Read the raw request body as a string before parsing JSON. If you use express.json() middleware, the body is already parsed — use express.raw() for the webhook route instead. The HMAC is computed over the raw bytes.',
              },
              {
                q: 'API returns 401 Unauthorized',
                a: 'Check that you\'re passing the correct API key in the Authorization: Bearer header. Keys are environment-specific — ensure you\'re not using a test key against the production API.',
              },
              {
                q: 'QR code is not scanning',
                a: 'The qrCode field is a base64-encoded PNG data URL. Render it in an <img> tag directly: <img src={order.qrCode} />. Make sure you\'re not double-encoding it.',
              },
            ].map(({ q, a }) => (
              <div key={q} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{q}</p>
                </div>
                <div className="px-5 py-3.5">
                  <p className="text-sm text-gray-600 leading-relaxed">{a}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Related pages */}
          <div className="mt-12">
            <Link
              href="/docs/api"
              className="group rounded-2xl border border-gray-200 hover:border-brand-200 bg-white hover:bg-brand-50/30 p-5 transition-all block"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-brand-600 block mb-1">Reference</span>
              <p className="font-bold text-gray-900 group-hover:text-brand-700 transition-colors">Full API Reference →</p>
              <p className="text-sm text-gray-500 mt-1">HTTP API docs with request/response schemas for all endpoints.</p>
            </Link>
          </div>

          {/* Footer CTA */}
          <div className="mt-6 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-7 text-center">
            <h3 className="text-lg font-extrabold text-gray-900 mb-2">Ready to go live?</h3>
            <p className="text-gray-500 text-sm mb-5">
              Create your account and accept your first UPI payment in under 10 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Create free account <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-5 py-2.5 rounded-lg transition-colors"
              >
                View pricing <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
