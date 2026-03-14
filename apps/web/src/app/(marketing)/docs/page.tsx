import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';

const createOrderCurl = `curl -X POST "https://api.your-seedhape-domain.com/v1/orders" \\
  -H "Authorization: Bearer sp_live_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49900,
    "description": "Pro plan",
    "externalOrderId": "order_1234",
    "randomizeAmount": false
  }'`;

const createOrderResponse = `{
  "id": "sp_ord_ab12cd34",
  "amount": 49900,
  "originalAmount": 49900,
  "status": "PENDING",
  "upiUri": "upi://pay?pa=merchant@ybl&pn=My+Store&am=499.00&tn=sp_ord_ab12cd34&cu=INR",
  "qrCode": "data:image/png;base64,...",
  "expiresAt": "2026-03-14T12:34:56.000Z"
}`;

const webhookNodeVerify = `import crypto from 'node:crypto';

function verifySeedhapeSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
}`;

const webhookPayloadSample = `{
  "event": "order.verified",
  "timestamp": "2026-03-14T11:11:11.000Z",
  "data": {
    "orderId": "sp_ord_ab12cd34",
    "externalOrderId": "order_1234",
    "amount": 49900,
    "originalAmount": 49900,
    "currency": "INR",
    "status": "VERIFIED",
    "utr": null,
    "senderName": "Rahul Sharma",
    "upiApp": "Google Pay",
    "verifiedAt": "2026-03-14T11:11:11.000Z",
    "metadata": null
  }
}`;

const sdkInstall = `npm install @seedhape/sdk`;

const sdkUsage = `import { SeedhaPe } from '@seedhape/sdk';

const seedhape = new SeedhaPe({
  apiKey: process.env.SEEDHAPE_API_KEY!, // sp_live_...
  baseUrl: 'https://api.your-seedhape-domain.com', // optional override
});

// 1) Create order
const order = await seedhape.createOrder({
  amount: 49900, // paise
  description: 'Pro subscription',
  externalOrderId: 'order_1234',
  randomizeAmount: false,
});

// 2) Poll status from backend
const status = await seedhape.getOrderStatus(order.id);
console.log(status.status); // PENDING | VERIFIED | EXPIRED | ...`;

const sdkBrowserModal = `// Browser-only helper (uses /v1/pay/:orderId under the hood)
await seedhape.showPayment({
  orderId: order.id,
  onSuccess: (result) => console.log('Verified', result),
  onExpired: (orderId) => console.log('Expired', orderId),
});`;

const reactInstall = `npm install @seedhape/react @seedhape/sdk`;

const reactProviderUsage = `import { SeedhaPeProvider, PaymentButton } from '@seedhape/react';

export default function Checkout() {
  return (
    <SeedhaPeProvider
      apiKey={process.env.NEXT_PUBLIC_SEEDHAPE_KEY!}
      baseUrl="https://api.your-seedhape-domain.com"
    >
      <PaymentButton
        amount={49900}
        description="Pro subscription"
        onSuccess={(result) => console.log('Verified', result)}
      >
        Pay ₹499
      </PaymentButton>
    </SeedhaPeProvider>
  );
}`;

const reactUsePaymentUsage = `import { usePayment } from '@seedhape/react';

function CustomCheckout() {
  const { state, createPayment } = usePayment();

  async function start() {
    const order = await createPayment({ amount: 49900, description: 'Plan A' });
    // render your own modal/QR using order.upiUri, order.qrCode
  }

  return <button onClick={start}>Pay</button>;
}`;

export default function MerchantDocsPage() {
  return (
    <div className="min-h-screen bg-slate-50/50">
      <header className="sticky top-0 z-20 border-b border-emerald-100/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <SeedhaPeLogo />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <section className="mb-8 rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-7">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Merchant Docs</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            seedhape Merchant Onboarding & Integration Guide
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            This guide covers everything a merchant needs to accept payments through seedhape:
            account setup, mobile device connection, API integration, webhook setup, and production launch.
          </p>
        </section>

        <article className="prose prose-slate max-w-none prose-headings:scroll-mt-20 prose-code:text-emerald-800">
          <h2 id="overview">1. System Overview</h2>
          <p>
            seedhape is a UPI verification middleware. Your customer pays via UPI; the merchant&apos;s Android
            device captures payment notifications; seedhape matches payment to order and fires webhooks to your backend.
          </p>
          <ul>
            <li>Your backend creates orders via API key.</li>
            <li>Customer pays using UPI URI/QR.</li>
            <li>Merchant phone stays online via heartbeat.</li>
            <li>seedhape sends webhook events like <code>order.verified</code> and <code>order.disputed</code>.</li>
          </ul>

          <h2 id="merchant-setup">2. Merchant Account Setup</h2>
          <ol>
            <li>Sign up and log in to the dashboard.</li>
            <li>Go to <strong>Dashboard → Settings</strong>.</li>
            <li>Set <strong>Business Name</strong> and <strong>UPI ID</strong> (example: <code>merchant@ybl</code>).</li>
            <li>Generate API key from <strong>API Keys → New Key</strong> and store securely.</li>
          </ol>
          <p>
            API keys start with <code>sp_live_</code> or <code>sp_test_</code> and are shown only once.
          </p>

          <h2 id="mobile-setup">3. Merchant Mobile App Setup (Required)</h2>
          <ol>
            <li>Install the seedhape mobile app on merchant Android device.</li>
            <li>Paste generated API key in app onboarding.</li>
            <li>Grant notification listener access when prompted.</li>
            <li>Allow app notifications (required for persistent background sync notification).</li>
            <li>Set battery mode to unrestricted for reliability.</li>
          </ol>
          <p>
            The app runs a background service and heartbeat. If heartbeat stops, merchant goes offline and payment flow is blocked.
          </p>

          <h2 id="create-order">4. Create Orders from Your Backend</h2>
          <p>
            Create orders server-side using your seedhape API key:
          </p>
          <pre><code>{createOrderCurl}</code></pre>
          <p>Typical response:</p>
          <pre><code>{createOrderResponse}</code></pre>
          <p>
            You should render either:
          </p>
          <ul>
            <li>the returned <code>upiUri</code> as a deep-link and QR, or</li>
            <li>the hosted page <code>/pay/&lt;orderId&gt;</code>.</li>
          </ul>

          <h2 id="payment-page">5. Payment Page Integration</h2>
          <p>
            Hosted checkout URL pattern:
          </p>
          <pre><code>https://your-seedhape-web-domain.com/pay/sp_ord_ab12cd34</code></pre>
          <p>
            Use this page if you want seedhape-hosted UX for QR and status polling.
          </p>

          <h2 id="sdk">6. JavaScript SDK Integration (<code>@seedhape/sdk</code>)</h2>
          <p>
            Use the SDK if you want a simple server-side client for order creation/status plus an optional browser modal helper.
          </p>
          <p>Install:</p>
          <pre><code>{sdkInstall}</code></pre>
          <p>Basic usage:</p>
          <pre><code>{sdkUsage}</code></pre>
          <p>Optional browser modal flow:</p>
          <pre><code>{sdkBrowserModal}</code></pre>
          <ul>
            <li><strong>Backend recommended:</strong> keep API keys on server, not in browser.</li>
            <li>
              <strong>Base URL:</strong> SDK defaults to <code>https://api.seedhape.com</code>, override with your deployment URL.
            </li>
          </ul>

          <h2 id="react-package">7. React Package Integration (<code>@seedhape/react</code>)</h2>
          <p>
            Use the React package for drop-in checkout components with less boilerplate.
          </p>
          <p>Install:</p>
          <pre><code>{reactInstall}</code></pre>
          <p>Provider + PaymentButton:</p>
          <pre><code>{reactProviderUsage}</code></pre>
          <p>Advanced custom flow with hook:</p>
          <pre><code>{reactUsePaymentUsage}</code></pre>
          <ul>
            <li><code>SeedhaPeProvider</code> wraps your checkout tree and creates SDK client instance.</li>
            <li><code>PaymentButton</code> creates order and opens modal automatically.</li>
            <li><code>usePayment</code> gives stateful primitives for custom UI.</li>
          </ul>

          <p>
            If you need to point React components to a custom API domain at runtime, set global
            <code>__SEEDHAPE_API_URL__</code> before the bundle loads (used by <code>PaymentModal</code>).
          </p>

          <h2 id="webhooks">8. Webhook Setup</h2>
          <p>
            If you are using seedhape itself as the first merchant for subscription collection, set:
          </p>
          <pre><code>{`Webhook URL: https://api.your-seedhape-domain.com/v1/billing/webhooks/seedhape`}</code></pre>
          <p>
            And set the same secret value in both places:
          </p>
          <ul>
            <li>Dashboard → Settings → Business Profile → Webhook Secret</li>
            <li><code>apps/api/.env</code> → <code>SEEDHAPE_WEBHOOK_SECRET</code></li>
          </ul>
          <ol>
            <li>Create a POST endpoint in your backend (example: <code>/webhooks/seedhape</code>).</li>
            <li>Set that URL in dashboard settings as <strong>Webhook URL</strong>.</li>
            <li>Use dashboard <strong>Test</strong> button to verify delivery.</li>
          </ol>

          <h3 id="events">Webhook events</h3>
          <ul>
            <li><code>order.verified</code></li>
            <li><code>order.expired</code></li>
            <li><code>order.disputed</code></li>
            <li><code>order.resolved</code></li>
          </ul>

          <h3 id="signature">Signature verification</h3>
          <p>
            Each webhook includes:
          </p>
          <ul>
            <li><code>X-SeedhaPe-Signature: sha256=&lt;hex&gt;</code></li>
            <li><code>X-SeedhaPe-Attempt</code> (retry attempt count)</li>
          </ul>
          <pre><code>{webhookNodeVerify}</code></pre>

          <p>Sample payload:</p>
          <pre><code>{webhookPayloadSample}</code></pre>

          <h2 id="backend-contract">9. Recommended Backend Contract</h2>
          <ul>
            <li>Keep your internal order state keyed by <code>orderId</code>.</li>
            <li>Treat webhooks as source of truth for payment state transitions.</li>
            <li>Process idempotently: ignore already-processed webhook events.</li>
            <li>Return 2xx quickly after enqueueing internal processing.</li>
          </ul>

          <h2 id="disputes">10. Disputes and Edge Cases</h2>
          <ul>
            <li>If notification matching is ambiguous, order may become <code>DISPUTED</code>.</li>
            <li>Merchants resolve disputes from dashboard/mobile.</li>
            <li>Dispute screenshots can be uploaded from payment page flow.</li>
          </ul>

          <h2 id="offline-guard">11. Offline Safety Guard</h2>
          <p>
            seedhape enforces merchant availability:
          </p>
          <ul>
            <li>Merchant device sends heartbeat every ~50s.</li>
            <li>No heartbeat for stale window marks merchant <code>OFFLINE</code>.</li>
            <li>When offline, order creation and pay endpoints are blocked.</li>
          </ul>

          <h2 id="go-live">12. Production Go-Live Checklist</h2>
          <ol>
            <li>Use production API keys (<code>sp_live_</code>).</li>
            <li>Run API and workers with persistent Postgres + Redis.</li>
            <li>Enable HTTPS everywhere (API, webhooks, checkout).</li>
            <li>Set webhook URL and verify signature handling in production.</li>
            <li>Monitor webhook failures and retry backlog.</li>
            <li>Set alerting for offline merchants and heartbeat gaps.</li>
            <li>Apply strict secret management and key rotation policy.</li>
          </ol>

          <h3>Self-billing flow (seedhape as merchant)</h3>
          <ol>
            <li>Set pricing page billing API key: <code>SEEDHAPE_BILLING_API_KEY</code>.</li>
            <li>Set webhook URL to <code>/v1/billing/webhooks/seedhape</code> on your API domain in merchant profile.</li>
            <li>Set matching webhook secret in profile and env (<code>SEEDHAPE_WEBHOOK_SECRET</code>).</li>
            <li>Customer pays for a plan from pricing page.</li>
            <li>Webhook <code>order.verified</code> triggers internal plan activation for that merchant.</li>
          </ol>

          <h2 id="troubleshooting">13. Troubleshooting</h2>
          <ul>
            <li><strong>Invalid API key:</strong> Regenerate from dashboard and ensure correct environment.</li>
            <li><strong>No webhook received:</strong> Check URL reachability and return 2xx from handler.</li>
            <li><strong>Merchant offline:</strong> Verify mobile app background service and notification permission.</li>
            <li><strong>Order not verifying:</strong> Confirm amount and timing, and inspect dispute queue.</li>
          </ul>

          <p>
            Need implementation help? Start with the examples above and test webhook delivery from dashboard first.
          </p>
        </article>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-bold text-slate-900">Quick links</h3>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/dashboard/settings" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Dashboard Settings
              <ExternalLink className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Pricing
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
