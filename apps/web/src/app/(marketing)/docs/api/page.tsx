import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── UI helpers ────────────────────────────────────────────────────────────────

function CodeBlock({ title, code }: { title?: string; code: string }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-800 my-4 text-[13px]">
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
    <div className={`flex gap-3 px-4 py-3.5 rounded-xl border ${cfg.bg} ${cfg.border} my-4`}>
      <span className="text-base shrink-0 mt-0.5">{cfg.icon}</span>
      <p className={`text-sm leading-relaxed ${cfg.text}`}>
        <strong>{cfg.label}:</strong>{' '}{children}
      </p>
    </div>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT' }) {
  const cls = {
    GET: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    POST: 'bg-blue-100 text-blue-700 border-blue-200',
    PATCH: 'bg-amber-100 text-amber-700 border-amber-200',
    DELETE: 'bg-red-100 text-red-700 border-red-200',
    PUT: 'bg-purple-100 text-purple-700 border-purple-200',
  }[method];
  return (
    <span className={`inline-flex items-center font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${cls}`}>
      {method}
    </span>
  );
}

function StatusBadge({ code }: { code: number }) {
  const cls =
    code >= 500 ? 'bg-red-100 text-red-700'
    : code >= 400 ? 'bg-amber-100 text-amber-700'
    : 'bg-emerald-100 text-emerald-700';
  return (
    <span className={`inline-flex items-center font-mono text-xs font-bold px-2 py-0.5 rounded ${cls}`}>
      {code}
    </span>
  );
}

function Param({
  name, type, required, children, location,
}: { name: string; type: string; required?: boolean; children: ReactNode; location?: 'path' | 'body' | 'query' }) {
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
        {location && (
          <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">
            {location}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 leading-relaxed">{children}</p>
    </div>
  );
}

function EndpointCard({
  id,
  method,
  path,
  summary,
  auth,
  description,
  children,
}: {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  summary: string;
  auth?: boolean;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 rounded-2xl border border-gray-200 overflow-hidden mb-6">
      {/* Header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
        <MethodBadge method={method} />
        <code className="text-sm font-mono font-semibold text-gray-900 flex-1">{path}</code>
        {auth && (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            🔑 Auth required
          </span>
        )}
      </div>
      {/* Body */}
      <div className="px-5 py-4">
        <h3 className="text-base font-bold text-gray-900 mb-1">{summary}</h3>
        {description && <p className="text-sm text-gray-500 leading-relaxed mb-4">{description}</p>}
        {children}
      </div>
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

function ResponseRow({ code, description }: { code: number; description: string }) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <StatusBadge code={code} />
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

// ─── TOC ───────────────────────────────────────────────────────────────────────

const tocItems = [
  { href: '#authentication', label: 'Authentication', sub: false },
  { href: '#errors', label: 'Errors', sub: false },
  { href: '#create-order', label: 'POST /v1/orders', sub: false },
  { href: '#get-order', label: 'GET /v1/orders/:id', sub: false },
  { href: '#get-order-status', label: 'GET /v1/orders/:id/status', sub: false },
  { href: '#get-public-order', label: 'GET /v1/pay/:id', sub: false },
  { href: '#set-expectation', label: 'POST /v1/pay/:id/expectation', sub: false },
  { href: '#upload-screenshot', label: 'POST /v1/pay/:id/screenshot', sub: false },
  { href: '#get-qr', label: 'GET /v1/pay/qr/:id', sub: false },
  { href: '#schemas', label: 'Schemas', sub: false },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ApiReferencePage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Hero */}
      <div className="border-b border-gray-100 bg-gradient-to-br from-white to-brand-50/30 pt-24 pb-8 px-6">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Docs
          </Link>
          <span className="block text-xs font-bold tracking-widest text-brand-600 uppercase mb-2">REST API</span>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">API Reference</h1>
          <p className="mt-2 text-gray-500 leading-relaxed max-w-2xl">
            Complete reference for the SeedhaPe HTTP API. Base URL:{' '}
            <code className="text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded text-sm font-mono">https://api.seedhape.com</code>
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              href="/openapi.json"
              download="seedhape-openapi.json"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> Download openapi.json
            </a>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 flex gap-10 lg:gap-16 items-start">

        {/* TOC */}
        <aside className="hidden lg:block w-52 shrink-0 sticky top-24">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3 px-2">Endpoints</p>
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

        {/* Content */}
        <div className="flex-1 min-w-0">

          {/* ── Authentication ──────────────────────────────────────────────── */}
          <div id="authentication" className="scroll-mt-24 mb-10">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-3">Authentication</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
              All merchant endpoints require a Bearer API key in the{' '}
              <code className="text-brand-700 bg-brand-50 px-1 rounded text-xs font-mono">Authorization</code> header.
              Keys start with <code className="font-mono text-sm">sp_live_</code> (production) or{' '}
              <code className="font-mono text-sm">sp_test_</code> (sandbox).
            </p>
            <CodeBlock title="HTTP header" code={`Authorization: Bearer sp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`} />
            <Callout type="warning">
              Never expose your API key in client-side code or commit it to source control. Store it as a server-side
              environment variable (<code>SEEDHAPE_API_KEY</code>). Public endpoints under{' '}
              <code>/v1/pay/*</code> require no authentication.
            </Callout>
          </div>

          {/* ── Errors ──────────────────────────────────────────────────────── */}
          <div id="errors" className="scroll-mt-24 mb-10">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-3">Errors</h2>
            <p className="text-[15px] text-gray-600 leading-relaxed mb-4">
              All error responses return a JSON body with <code className="font-mono text-sm">error</code> (human-readable message)
              and <code className="font-mono text-sm">code</code> (machine-readable constant).
            </p>
            <CodeBlock title="Error response body" code={`{
  "error": "Order not found",
  "code": "ORDER_NOT_FOUND"
}`} />
            <div className="rounded-xl border border-gray-200 overflow-hidden text-sm">
              {[
                { status: 400, desc: 'Validation error — check the error.code for details' },
                { status: 401, desc: 'Invalid or missing API key' },
                { status: 404, desc: 'Resource not found or belongs to another merchant' },
                { status: 503, desc: 'Merchant Android device is offline — payments temporarily unavailable' },
              ].map(({ status, desc }) => (
                <div key={status} className="flex items-start gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
                  <StatusBadge code={status} />
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <hr className="my-10 border-gray-100" />

          {/* ─── ORDERS ────────────────────────────────────────────────────── */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-5">Orders — Authenticated</p>

          {/* POST /v1/orders */}
          <EndpointCard
            id="create-order"
            method="POST"
            path="/v1/orders"
            summary="Create a payment order"
            auth
            description="Creates a new UPI payment order. Returns a UPI deep-link and QR code for the customer to pay. The order ID is embedded in the UPI transaction note (tn) for reliable auto-matching."
          >
            <SubSection title="Request body (application/json)">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="amount" type="integer" required location="body">
                  Amount in paise. ₹1 = 100 paise. So ₹499 = <code>49900</code>.
                </Param>
                <Param name="description" type="string" location="body">
                  Shown on the hosted payment page and in some UPI apps. Max 100 characters.
                </Param>
                <Param name="externalOrderId" type="string" location="body">
                  Your own order ID for deduplication. Echoed back in all webhook payloads.
                </Param>
                <Param name="expectedSenderName" type="string" location="body">
                  Payer&apos;s name as shown in their UPI app. Strongly recommended — used as a
                  fallback matching signal when the UPI transaction note is unavailable.
                </Param>
                <Param name="customerEmail" type="string (email)" location="body">
                  Customer email address. Stored on the order for reference.
                </Param>
                <Param name="customerPhone" type="string" location="body">
                  Customer phone number. E.g. <code>+919876543210</code>.
                </Param>
                <Param name="expiresInMinutes" type="integer" location="body">
                  Order time-to-live in minutes. Defaults to 30. After expiry the order moves to EXPIRED
                  and cannot be paid.
                </Param>
                <Param name="metadata" type="object" location="body">
                  Arbitrary JSON object. Stored on the order and echoed verbatim in all webhook payloads.
                  Useful for passing <code>userId</code>, <code>planKey</code>, etc.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Example request">
              <CodeBlock title="curl" code={`curl -X POST "https://api.seedhape.com/v1/orders" \\
  -H "Authorization: Bearer sp_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 49900,
    "description": "Pro plan subscription",
    "externalOrderId": "your_order_123",
    "expectedSenderName": "Rahul Sharma",
    "expiresInMinutes": 15,
    "metadata": { "userId": "usr_abc", "planKey": "PRO" }
  }'`} />
            </SubSection>

            <SubSection title="201 Response">
              <CodeBlock title="application/json" code={`{
  "id": "sp_ord_ab12cd34ef56",
  "amount": 49900,
  "originalAmount": 49900,
  "currency": "INR",
  "description": "Pro plan subscription",
  "status": "CREATED",
  "upiUri": "upi://pay?pa=merchant@ybl&pn=My+Store&am=499.00&tn=sp_ord_ab12cd34ef56&cu=INR",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUh...",
  "expiresAt": "2026-03-15T12:34:56.000Z",
  "createdAt": "2026-03-15T12:19:56.000Z",
  "externalOrderId": "your_order_123",
  "metadata": { "userId": "usr_abc", "planKey": "PRO" }
}`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={201} description="Order created — returns full OrderData object" />
                <ResponseRow code={400} description="Validation error (e.g. missing amount, amount <= 0)" />
                <ResponseRow code={401} description="Invalid or missing API key" />
                <ResponseRow code={503} description="Merchant device is offline" />
              </div>
            </SubSection>
          </EndpointCard>

          {/* GET /v1/orders/:id */}
          <EndpointCard
            id="get-order"
            method="GET"
            path="/v1/orders/{orderId}"
            summary="Get order details"
            auth
            description="Returns the full order object including status, amounts, QR code, and metadata. Use this for server-side order lookup."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID (e.g. <code>sp_ord_ab12cd34ef56</code>).
                </Param>
              </div>
            </SubSection>

            <SubSection title="Example request">
              <CodeBlock title="curl" code={`curl "https://api.seedhape.com/v1/orders/sp_ord_ab12cd34ef56" \\
  -H "Authorization: Bearer sp_live_YOUR_KEY"`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="Order found — returns full OrderData object" />
                <ResponseRow code={401} description="Invalid or missing API key" />
                <ResponseRow code={404} description="Order not found or belongs to another merchant" />
              </div>
            </SubSection>
          </EndpointCard>

          {/* GET /v1/orders/:id/status */}
          <EndpointCard
            id="get-order-status"
            method="GET"
            path="/v1/orders/{orderId}/status"
            summary="Poll order status"
            auth
            description="Lightweight status poll. Returns only id, status, amount, and verifiedAt. Prefer this over fetching the full order when polling from your backend."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Example request">
              <CodeBlock title="curl" code={`curl "https://api.seedhape.com/v1/orders/sp_ord_ab12cd34ef56/status" \\
  -H "Authorization: Bearer sp_live_YOUR_KEY"`} />
            </SubSection>

            <SubSection title="200 Response">
              <CodeBlock title="application/json" code={`{
  "id": "sp_ord_ab12cd34ef56",
  "status": "VERIFIED",
  "amount": 49900,
  "verifiedAt": "2026-03-15T11:11:09.000Z"
}`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="Returns id, status, amount, and verifiedAt" />
                <ResponseRow code={401} description="Invalid API key" />
                <ResponseRow code={404} description="Order not found" />
              </div>
            </SubSection>
          </EndpointCard>

          <hr className="my-10 border-gray-100" />

          {/* ─── PAYMENT PAGE ──────────────────────────────────────────────── */}
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-5">Payment Page — Public (no auth)</p>

          {/* GET /v1/pay/:id */}
          <EndpointCard
            id="get-public-order"
            method="GET"
            path="/v1/pay/{orderId}"
            summary="Get public order data"
            description="Returns payment page data for the hosted checkout UI. No authentication required — safe to call from the browser. Returns 503 if the merchant device is offline."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID.
                </Param>
              </div>
            </SubSection>

            <SubSection title="200 Response">
              <CodeBlock title="application/json" code={`{
  "id": "sp_ord_ab12cd34ef56",
  "amount": 49900,
  "originalAmount": 49900,
  "currency": "INR",
  "description": "Pro plan subscription",
  "status": "PENDING",
  "upiUri": "upi://pay?pa=merchant@ybl&am=499.00&tn=sp_ord_ab12cd34ef56&cu=INR",
  "qrCode": "data:image/png;base64,iVBOR...",
  "expiresAt": "2026-03-15T12:34:56.000Z",
  "expectedSenderName": "Rahul Sharma"
}`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="Order data for payment page (PublicOrderData object)" />
                <ResponseRow code={404} description="Order not found" />
                <ResponseRow code={503} description="Merchant device is offline — payments temporarily blocked" />
              </div>
            </SubSection>
          </EndpointCard>

          {/* POST /v1/pay/:id/expectation */}
          <EndpointCard
            id="set-expectation"
            method="POST"
            path="/v1/pay/{orderId}/expectation"
            summary="Set expected payer name"
            description="Stores the payer's name on the order to improve fallback matching accuracy. Called by the hosted payment page after the customer enters their name. Only valid for CREATED / PENDING / DISPUTED orders."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Request body (application/json)">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="expectedSenderName" type="string" required location="body">
                  The payer&apos;s name as it appears in their UPI app. 2–100 characters.
                  Used for fallback matching when the transaction note is missing.
                </Param>
              </div>
            </SubSection>

            <SubSection title="200 Response">
              <CodeBlock title="application/json" code={`{
  "ok": true,
  "expectedSenderName": "Rahul Sharma"
}`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="Name saved successfully" />
                <ResponseRow code={400} description="Validation error or order is in a terminal state (VERIFIED/EXPIRED/etc.)" />
                <ResponseRow code={404} description="Order not found" />
              </div>
            </SubSection>
          </EndpointCard>

          {/* POST /v1/pay/:id/screenshot */}
          <EndpointCard
            id="upload-screenshot"
            method="POST"
            path="/v1/pay/{orderId}/screenshot"
            summary="Upload dispute screenshot"
            description="Uploads a screenshot of the UPI payment confirmation. Creates or updates a dispute record for manual review. Only accepted for PENDING or DISPUTED orders. File must be an image ≤ 5 MB."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Request body (multipart/form-data)">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="screenshot" type="file (binary)" required location="body">
                  Image file in JPEG, PNG, or WebP format. Maximum size 5 MB.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Example request">
              <CodeBlock title="curl" code={`curl -X POST "https://api.seedhape.com/v1/pay/sp_ord_ab12cd34ef56/screenshot" \\
  -F "screenshot=@/path/to/payment-confirmation.jpg"`} />
            </SubSection>

            <SubSection title="200 Response">
              <CodeBlock title="application/json" code={`{
  "ok": true,
  "screenshotUrl": "https://cdn.seedhape.com/disputes/sp_ord_ab12cd34ef56.jpg",
  "message": "Screenshot uploaded. Our team will review within 24 hours."
}`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="Screenshot uploaded, dispute record created/updated" />
                <ResponseRow code={400} description="No file provided or order is in wrong state" />
                <ResponseRow code={404} description="Order not found" />
              </div>
            </SubSection>
          </EndpointCard>

          {/* GET /v1/pay/qr/:id */}
          <EndpointCard
            id="get-qr"
            method="GET"
            path="/v1/pay/qr/{orderId}"
            summary="Get QR code as PNG image"
            description="Returns the UPI QR code as a raw PNG image (not a data URL). Useful for embedding in emails, PDFs, or custom UIs. Returns 503 if the merchant device is offline."
          >
            <SubSection title="Path parameters">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <Param name="orderId" type="string" required location="path">
                  The SeedhaPe order ID.
                </Param>
              </div>
            </SubSection>

            <SubSection title="Example usage">
              <CodeBlock title="HTML" code={`<img src="https://api.seedhape.com/v1/pay/qr/sp_ord_ab12cd34ef56" alt="Pay with UPI" />`} />
              <CodeBlock title="Email template (e.g. Nodemailer)" code={`attachments: [{
  filename: 'payment-qr.png',
  path: \`https://api.seedhape.com/v1/pay/qr/\${order.id}\`,
}]`} />
            </SubSection>

            <SubSection title="Responses">
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <ResponseRow code={200} description="PNG image (Content-Type: image/png)" />
                <ResponseRow code={404} description="Order not found" />
                <ResponseRow code={503} description="Merchant device is offline" />
              </div>
            </SubSection>
          </EndpointCard>

          <hr className="my-10 border-gray-100" />

          {/* ─── SCHEMAS ───────────────────────────────────────────────────── */}
          <div id="schemas" className="scroll-mt-24">
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-6">Schemas</h2>

            {/* OrderStatus */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">OrderStatus</h3>
              <p className="text-sm text-gray-500 mb-3">
                The lifecycle state of a payment order. Terminal states are <strong>VERIFIED</strong>,{' '}
                <strong>RESOLVED</strong>, <strong>EXPIRED</strong>, and <strong>REJECTED</strong>.
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  { s: 'CREATED', color: 'bg-gray-100 text-gray-700', desc: 'Order created, no payment attempt yet' },
                  { s: 'PENDING', color: 'bg-blue-100 text-blue-700', desc: 'Payment notification received, matching in progress' },
                  { s: 'VERIFIED', color: 'bg-emerald-100 text-emerald-700', desc: 'Payment verified — trigger fulfillment' },
                  { s: 'DISPUTED', color: 'bg-amber-100 text-amber-700', desc: 'Payer claims payment but auto-match failed' },
                  { s: 'RESOLVED', color: 'bg-emerald-100 text-emerald-700', desc: 'Dispute manually resolved by merchant' },
                  { s: 'EXPIRED', color: 'bg-red-100 text-red-700', desc: 'Order TTL elapsed without payment' },
                  { s: 'REJECTED', color: 'bg-red-100 text-red-700', desc: 'Dispute rejected by merchant' },
                ].map(({ s, color, desc }) => (
                  <div key={s} className="flex items-start gap-2 rounded-xl border border-gray-100 px-3 py-2.5 bg-gray-50 w-full sm:w-auto sm:flex-1 sm:min-w-[200px]">
                    <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded shrink-0 mt-0.5 ${color}`}>{s}</span>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* OrderData */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">OrderData</h3>
              <p className="text-sm text-gray-500 mb-3">
                Returned by <code className="font-mono text-sm">POST /v1/orders</code> and{' '}
                <code className="font-mono text-sm">GET /v1/orders/:id</code>.
              </p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {[
                  { name: 'id', type: 'string', desc: 'SeedhaPe order ID, e.g. sp_ord_ab12cd34ef56' },
                  { name: 'amount', type: 'integer', desc: 'Final amount in paise (may differ from originalAmount if amount was randomized to aid matching)' },
                  { name: 'originalAmount', type: 'integer', desc: 'The amount you requested when creating the order' },
                  { name: 'currency', type: 'string', desc: 'Always "INR"' },
                  { name: 'status', type: 'OrderStatus', desc: 'Current lifecycle status' },
                  { name: 'upiUri', type: 'string', desc: 'UPI deep-link for payment apps. Render as a button on mobile.' },
                  { name: 'qrCode', type: 'string', desc: 'Base64 PNG data URL of the QR code. Use directly as <img src={order.qrCode} />' },
                  { name: 'expiresAt', type: 'date-time', desc: 'ISO 8601 timestamp when the order expires' },
                  { name: 'createdAt', type: 'date-time', desc: 'ISO 8601 creation timestamp' },
                  { name: 'verifiedAt', type: 'date-time | null', desc: 'Set when the payment is confirmed (status = VERIFIED or RESOLVED)' },
                  { name: 'externalOrderId', type: 'string | null', desc: 'Your own order ID, echoed back' },
                  { name: 'description', type: 'string | null', desc: 'Order description shown on the payment page' },
                  { name: 'metadata', type: 'object | null', desc: 'Arbitrary JSON passed at creation, echoed in all webhook payloads' },
                ].map(({ name, type, desc }) => (
                  <div key={name} className="border-b border-gray-100 py-3 px-4 last:border-0 flex flex-wrap gap-x-3 gap-y-1">
                    <code className="text-[13px] font-mono font-semibold text-slate-800 shrink-0">{name}</code>
                    <code className="text-[12px] font-mono text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded self-start">{type}</code>
                    <p className="text-sm text-gray-500 w-full leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Webhook events */}
            <div className="mb-8">
              <h3 className="text-base font-bold text-gray-900 mb-3">Webhook Event Types</h3>
              <p className="text-sm text-gray-500 mb-3">
                Events are delivered via HTTP POST to your webhook URL. See the{' '}
                <Link href="/docs#webhooks" className="text-brand-600 underline underline-offset-2">
                  Webhooks section
                </Link>{' '}
                in the main docs for signature verification.
              </p>
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {[
                  { event: 'order.verified', desc: 'Payment confirmed. Trigger order fulfillment. The data object includes utr, senderName, upiApp, verifiedAt.' },
                  { event: 'order.expired', desc: 'Order TTL elapsed without a verified payment.' },
                  { event: 'order.disputed', desc: 'Payer claims to have paid but auto-match failed. A dispute screenshot may have been uploaded.' },
                  { event: 'order.resolved', desc: 'Dispute manually resolved. Check data.status: RESOLVED (approve) or REJECTED (decline).' },
                ].map(({ event, desc }) => (
                  <div key={event} className="border-b border-gray-100 py-3 px-4 last:border-0">
                    <code className="text-[13px] font-mono font-semibold text-slate-800 block mb-1">{event}</code>
                    <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="mt-12 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/60 to-white p-6 text-center">
            <p className="text-sm text-gray-600 mb-4">Looking for the SDK or React integration?</p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Integration Docs
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
