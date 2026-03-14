import Link from 'next/link';
import {
  ArrowRight,
  Zap,
  Shield,
  Smartphone,
  CheckCircle,
  TrendingDown,
  Webhook,
  Code2,
} from 'lucide-react';
import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';

// ─── Nav ─────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-emerald-100/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <SeedhaPeLogo />
        <div className="hidden md:flex items-center gap-6">
          <Link href="/docs" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Docs
          </Link>
          <Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Pricing
          </Link>
          <Link href="/sign-in" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            Get started free
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 text-center relative overflow-hidden">
      {/* Gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(34,197,94,0.12) 0%, transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 text-brand-700 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <Zap className="h-3.5 w-3.5" />
          Zero transaction fees — money goes straight to your bank
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-[1.05] tracking-tight mb-6">
          Accept UPI payments
          <br />
          <span className="text-brand-600">without the 2–3% tax</span>
        </h1>

        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          SeedhaPe automatically verifies UPI payments through your Android device.
          No payment gateway middleman. No percentage cut. Just direct bank transfers.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-base transition-colors shadow-lg shadow-brand-200"
          >
            Start for free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/pricing"
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium px-8 py-4 rounded-xl text-base border border-gray-200 hover:border-gray-300 transition-colors"
          >
            See pricing
          </Link>
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-gray-400">
          <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> No credit card required</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Free tier available</span>
          <span className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-brand-500" /> Works with all UPI apps</span>
        </div>
      </div>
    </section>
  );
}

// ─── Comparison bar ───────────────────────────────────────────────────────────

function ComparisonBar() {
  return (
    <section className="py-8 border-y border-gray-100 bg-gray-50/60">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { label: 'Razorpay / Cashfree cut', value: '2–3%', bad: true },
            { label: 'SeedhaPe cut', value: '0%', good: true },
            { label: 'Supported UPI apps', value: '7+' },
            { label: 'Avg verification time', value: '<5s' },
          ].map((item) => (
            <div key={item.label}>
              <p
                className={`text-3xl font-extrabold mb-1 ${
                  item.good ? 'text-brand-600' : item.bad ? 'text-red-500' : 'text-gray-900'
                }`}
              >
                {item.value}
              </p>
              <p className="text-xs text-gray-400 leading-tight">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: <Code2 className="h-6 w-6 text-brand-600" />,
      title: 'Call our API',
      desc: 'POST an order with the amount. Get back a UPI URI and QR code instantly.',
    },
    {
      n: '02',
      icon: <Smartphone className="h-6 w-6 text-brand-600" />,
      title: 'Customer pays',
      desc: 'They scan the QR or tap the deep link. Money transfers directly to your UPI ID.',
    },
    {
      n: '03',
      icon: <Zap className="h-6 w-6 text-brand-600" />,
      title: 'App detects it',
      desc: 'Our Android app on your phone listens for UPI notifications and parses the amount + UTR.',
    },
    {
      n: '04',
      icon: <Webhook className="h-6 w-6 text-brand-600" />,
      title: 'Webhook fires',
      desc: 'We match the notification to the order and POST to your webhook in under 5 seconds.',
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Dead simple to integrate</h2>
          <p className="text-gray-500 text-lg">Four steps. No bank API approvals. No escrow account. No waiting.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Connecting line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent"
          />
          {steps.map((step) => (
            <div key={step.n} className="relative text-center">
              <div className="w-16 h-16 bg-brand-50 border-2 border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 bg-white">
                {step.icon}
              </div>
              <span className="text-xs font-bold text-brand-400 tracking-widest">{step.n}</span>
              <h3 className="font-semibold text-gray-900 mt-1 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Code snippet ─────────────────────────────────────────────────────────────

function CodeExample() {
  const code = `import SeedhaPe from '@seedhape/sdk';

const sp = new SeedhaPe({ apiKey: 'sp_live_...' });

// Create an order
const order = await sp.createOrder({
  amount: 100,          // ₹1.00 in paise
  currency: 'INR',
  description: 'Pro subscription',
});

// Show the payment modal (QR + polling)
const result = await sp.showPayment(order.id);

if (result.status === 'VERIFIED') {
  console.log('Payment confirmed!', result.utr);
  // Your customer has paid. Webhook already fired. ✓
}`;

  return (
    <section className="py-24 px-6 bg-gray-950">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
        <div>
          <span className="text-sm font-semibold text-brand-400 uppercase tracking-wider">Developer-first</span>
          <h2 className="text-4xl font-bold text-white mt-3 mb-5 leading-tight">
            Integrate in
            <br />
            under 10 minutes
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Drop-in JS SDK, React component, or call the REST API directly. Full TypeScript support,
            HMAC-signed webhooks, and idempotent order IDs included.
          </p>
          <ul className="space-y-3">
            {[
              'TypeScript SDK + React component',
              'HMAC-SHA256 signed webhooks',
              'Idempotent order IDs (sp_ord_...)',
              'Exponential retry on webhook failure',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-300">
                <CheckCircle className="h-4 w-4 text-brand-400 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
          <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-900 border-b border-gray-800">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-2 text-xs text-gray-500">checkout.ts</span>
          </div>
          <pre className="p-5 text-sm overflow-x-auto bg-gray-950">
            <code className="text-gray-300 leading-relaxed font-mono">{code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

// ─── Savings calculator ───────────────────────────────────────────────────────

function Savings() {
  const rows = [
    { gmv: '₹1L / month',  razorpay: '₹2,000–3,000',  seedhape: '₹0',   plan: 'Free plan' },
    { gmv: '₹10L / month', razorpay: '₹20,000–30,000', seedhape: '₹1', plan: 'Starter plan' },
    { gmv: '₹50L / month', razorpay: '₹1L–1.5L',       seedhape: '₹2', plan: 'Growth plan' },
    { gmv: '₹1Cr / month', razorpay: '₹2L–3L',         seedhape: '₹3', plan: 'Pro plan' },
  ];

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            How much are you leaving on the table?
          </h2>
          <p className="text-gray-500 text-lg">
            Razorpay and Cashfree charge 2–3% on every transaction. SeedhaPe charges nothing per transaction.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="py-4 px-6 text-sm font-semibold text-gray-500">Monthly GMV</th>
                <th className="py-4 px-6 text-sm font-semibold text-red-400">Razorpay / Cashfree fees</th>
                <th className="py-4 px-6 text-sm font-semibold text-brand-600">SeedhaPe cost</th>
                <th className="py-4 px-6 text-sm font-semibold text-gray-400">Plan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.gmv} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                  <td className="py-4 px-6 font-semibold text-gray-900">{row.gmv}</td>
                  <td className="py-4 px-6 text-red-500 font-medium line-through opacity-70">{row.razorpay}</td>
                  <td className="py-4 px-6 text-brand-600 font-bold">{row.seedhape}</td>
                  <td className="py-4 px-6 text-xs text-gray-400">{row.plan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          * Assumes 2% blended gateway fee. Actual savings depend on transaction mix and plan.
        </p>
      </div>
    </section>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: <Zap className="h-6 w-6 text-brand-600" />,
      title: 'Sub-5 second verification',
      desc: 'Notification captured, parsed, matched, and webhook fired before the customer even puts their phone down.',
    },
    {
      icon: <Shield className="h-6 w-6 text-brand-600" />,
      title: 'HMAC-signed webhooks',
      desc: 'Every webhook includes an X-SeedhaPe-Signature header. Verify it or reject it — your call.',
    },
    {
      icon: <Smartphone className="h-6 w-6 text-brand-600" />,
      title: 'All major UPI apps',
      desc: 'PhonePe, Google Pay, Paytm, BHIM, CRED, Amazon Pay, and more — parsed from real notifications.',
    },
    {
      icon: <TrendingDown className="h-6 w-6 text-brand-600" />,
      title: 'Dispute management',
      desc: 'When auto-match fails, screenshot OCR extracts UTR + amount. You approve or reject with one tap.',
    },
    {
      icon: <Webhook className="h-6 w-6 text-brand-600" />,
      title: 'Retry with backoff',
      desc: 'Failed webhook deliveries are retried 5 times with exponential backoff. No missed payments.',
    },
    {
      icon: <Code2 className="h-6 w-6 text-brand-600" />,
      title: 'Hosted payment page',
      desc: 'Use our /pay/:orderId page or embed the React component. QR code, UPI deep links, auto-redirect.',
    },
  ];

  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need</h2>
          <p className="text-gray-500 text-lg">Nothing you don't.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-brand-50 border border-brand-100 rounded-3xl px-10 py-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Stop sharing your revenue
          </h2>
          <p className="text-gray-500 mb-8 leading-relaxed">
            Set up takes under 10 minutes. No bank API approval. No escrow account.
            No monthly commitment on the free plan.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors shadow-lg shadow-brand-200"
          >
            Create free account <ArrowRight className="h-5 w-5" />
          </Link>
          <p className="text-xs text-gray-400 mt-4">No credit card required</p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10 px-6">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
        <SeedhaPeLogo className="opacity-90" />
        <nav className="flex items-center gap-6">
          <Link href="/docs" className="hover:text-gray-600 transition-colors">Docs</Link>
          <Link href="/pricing" className="hover:text-gray-600 transition-colors">Pricing</Link>
          <Link href="/sign-in"  className="hover:text-gray-600 transition-colors">Sign in</Link>
          <Link href="/sign-up"  className="hover:text-gray-600 transition-colors">Get started</Link>
        </nav>
        <p>© 2025 SeedhaPe. Built for Indian digital merchants.</p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <Hero />
      <ComparisonBar />
      <HowItWorks />
      <CodeExample />
      <Savings />
      <Features />
      <FinalCta />
      <Footer />
    </div>
  );
}
