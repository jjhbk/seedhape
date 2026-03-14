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

// ─── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative bg-[#0a1a0e] overflow-hidden pt-28 pb-24 md:pt-36 md:pb-32 px-6">
      {/* Radial glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(34,197,94,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 80% 80%, rgba(20,163,74,0.08) 0%, transparent 60%)',
        }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-950/80 border border-emerald-800/50 text-emerald-400 text-sm font-medium px-4 py-1.5 rounded-full mb-8">
          <Zap className="h-3.5 w-3.5" />
          Zero transaction fees — every rupee goes to your bank
        </div>

        <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold text-white leading-[1.06] tracking-tight mb-6">
          Accept UPI payments
          <br />
          <span className="text-emerald-400">without the 2–3% tax</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
          SeedhaPe verifies UPI payments through your Android device — automatically.
          No payment gateway. No percentage cut. No bank API approval.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-8 py-3.5 rounded-xl text-base transition-all shadow-lg shadow-emerald-900/40 hover:shadow-emerald-500/30 hover:-translate-y-px w-full sm:w-auto justify-center"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 text-gray-300 hover:text-white font-medium px-8 py-3.5 rounded-xl text-base border border-gray-700 hover:border-gray-500 transition-colors w-full sm:w-auto justify-center"
          >
            Read the docs
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2.5 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            Free tier always available
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            Works with all major UPI apps
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar() {
  const stats = [
    { value: '0%', label: 'Transaction fee', highlight: 'good' },
    { value: '2–3%', label: 'Gateway fee saved', highlight: 'bad' },
    { value: '7+', label: 'UPI apps supported', highlight: null },
    { value: '<5s', label: 'Avg. verification time', highlight: null },
  ] as const;

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-gray-100">
          {stats.map((s) => (
            <div key={s.label} className="px-4 first:pl-0 last:pr-0">
              <p
                className={`text-3xl font-extrabold mb-1 tabular-nums ${
                  s.highlight === 'good'
                    ? 'text-brand-600'
                    : s.highlight === 'bad'
                    ? 'text-red-500 line-through decoration-2'
                    : 'text-gray-900'
                }`}
              >
                {s.value}
              </p>
              <p className="text-xs text-gray-400 leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      n: '01',
      icon: <Code2 className="h-5 w-5 text-brand-600" />,
      title: 'Create an order',
      desc: 'POST an order via API. Get back a UPI URI, QR code, and a hosted payment link.',
    },
    {
      n: '02',
      icon: <Smartphone className="h-5 w-5 text-brand-600" />,
      title: 'Customer pays',
      desc: 'They scan the QR or tap the link. Money goes directly to your UPI ID.',
    },
    {
      n: '03',
      icon: <Zap className="h-5 w-5 text-brand-600" />,
      title: 'App detects it',
      desc: 'Our Android app on your phone reads the UPI notification and parses the UTR.',
    },
    {
      n: '04',
      icon: <Webhook className="h-5 w-5 text-brand-600" />,
      title: 'Webhook fires',
      desc: 'We match the notification to your order and POST to your endpoint in under 5s.',
    },
  ];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">How it works</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4 tracking-tight">
            Dead simple to integrate
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            No bank API approvals. No escrow. No waiting weeks. Four steps and you're live.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 relative">
          <div
            aria-hidden
            className="hidden md:block absolute top-7 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent"
          />
          {steps.map((step) => (
            <div key={step.n} className="relative text-center px-2">
              <div className="relative z-10 w-14 h-14 bg-white border-2 border-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                {step.icon}
              </div>
              <span className="text-[10px] font-bold text-brand-400 tracking-[0.2em] uppercase">
                {step.n}
              </span>
              <h3 className="font-bold text-gray-900 mt-1.5 mb-2 text-[15px]">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Code snippet ──────────────────────────────────────────────────────────────

function CodeExample() {
  const code = `import { SeedhaPe } from '@seedhape/sdk';

const sp = new SeedhaPe({ apiKey: 'sp_live_...' });

// Create an order
const order = await sp.createOrder({
  amount: 49900,          // ₹499 in paise
  description: 'Pro subscription',
  expectedSenderName: 'Rahul Sharma', // recommended
});

// Show hosted payment modal
const result = await sp.showPayment({ orderId: order.id });

if (result.status === 'VERIFIED') {
  // Payment confirmed — webhook already fired ✓
  fulfillOrder(result.orderId);
}`;

  return (
    <section className="py-24 px-6 bg-gray-950">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 lg:gap-20 items-center">
        <div>
          <span className="text-xs font-bold tracking-widest text-brand-400 uppercase">
            Developer-first
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-3 mb-5 leading-tight tracking-tight">
            Integrate in
            <br />
            under 10 minutes
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8 text-[15px]">
            Drop-in JS SDK, React component, or call the REST API directly. Full TypeScript
            support, HMAC-signed webhooks, and idempotent order IDs included out of the box.
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
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 mt-8 text-sm font-semibold text-brand-400 hover:text-brand-300 transition-colors"
          >
            Read full documentation <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl overflow-hidden border border-gray-800 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-900 border-b border-gray-800">
            <span className="w-3 h-3 rounded-full bg-red-500/70" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <span className="w-3 h-3 rounded-full bg-green-500/70" />
            <span className="ml-3 text-xs text-gray-500 font-mono">checkout.ts</span>
          </div>
          <pre className="p-5 text-sm overflow-x-auto bg-gray-950 scrollbar-thin">
            <code className="text-gray-300 leading-relaxed font-mono text-[13px]">{code}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}

// ─── Savings ───────────────────────────────────────────────────────────────────

function Savings() {
  const rows = [
    { gmv: '₹1L / month', razorpay: '₹2,000–3,000', seedhape: '₹0', plan: 'Free' },
    { gmv: '₹10L / month', razorpay: '₹20,000–30,000', seedhape: '₹1', plan: 'Starter' },
    { gmv: '₹50L / month', razorpay: '₹1L–1.5L', seedhape: '₹2', plan: 'Growth' },
    { gmv: '₹1Cr / month', razorpay: '₹2L–3L', seedhape: '₹3', plan: 'Pro' },
  ];

  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Savings</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-4 tracking-tight">
            How much are you leaving on the table?
          </h2>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Razorpay and Cashfree charge 2–3% on every transaction. SeedhaPe charges nothing.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[480px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3.5 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wide">Monthly GMV</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-red-400 uppercase tracking-wide">Razorpay fees</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-brand-600 uppercase tracking-wide">SeedhaPe cost</th>
                  <th className="py-3.5 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wide">Plan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.gmv} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}>
                    <td className="py-4 px-6 font-bold text-gray-900">{row.gmv}</td>
                    <td className="py-4 px-6 text-red-400 font-medium line-through decoration-red-300/60">{row.razorpay}</td>
                    <td className="py-4 px-6 text-brand-600 font-extrabold text-lg">{row.seedhape}</td>
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {row.plan}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400 mt-4">
          * Assumes 2% blended gateway fee. SeedhaPe subscription pricing for reference.
        </p>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────

function Features() {
  const features = [
    {
      icon: <Zap className="h-5 w-5 text-brand-600" />,
      title: 'Sub-5 second verification',
      desc: 'Notification captured, parsed, matched, and webhook fired before the customer puts their phone down.',
    },
    {
      icon: <Shield className="h-5 w-5 text-brand-600" />,
      title: 'HMAC-signed webhooks',
      desc: 'Every webhook carries an X-SeedhaPe-Signature header. Verify it server-side or reject it.',
    },
    {
      icon: <Smartphone className="h-5 w-5 text-brand-600" />,
      title: 'All major UPI apps',
      desc: 'PhonePe, Google Pay, Paytm, BHIM, CRED, Amazon Pay — all parsed from real device notifications.',
    },
    {
      icon: <TrendingDown className="h-5 w-5 text-brand-600" />,
      title: 'Dispute management',
      desc: "When auto-match fails, you review the evidence and approve or reject with one tap.",
    },
    {
      icon: <Webhook className="h-5 w-5 text-brand-600" />,
      title: 'Retry with backoff',
      desc: 'Failed webhook deliveries are retried with exponential backoff. No missed payment events.',
    },
    {
      icon: <Code2 className="h-5 w-5 text-brand-600" />,
      title: 'Hosted payment page',
      desc: 'Use our /pay/:orderId page or embed the React component — QR code, deep links, auto-redirect.',
    },
  ];

  return (
    <section className="py-24 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-xs font-bold tracking-widest text-brand-600 uppercase">Features</span>
          <h2 className="text-4xl font-extrabold text-gray-900 mt-3 mb-3 tracking-tight">
            Everything you need
          </h2>
          <p className="text-gray-500 text-lg">Nothing you don't.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-[15px]">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-2xl mx-auto">
        <div className="relative bg-[#0a1a0e] rounded-3xl px-8 py-16 text-center overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 opacity-60"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(34,197,94,0.2) 0%, transparent 70%)',
            }}
          />
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
              Stop sharing your revenue
            </h2>
            <p className="text-gray-300 mb-8 leading-relaxed max-w-md mx-auto">
              Setup takes under 10 minutes. No bank API approval, no escrow account, no
              monthly commitment on the free plan.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-10 py-4 rounded-xl text-base transition-all shadow-lg shadow-emerald-900/40 hover:-translate-y-px"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="text-xs text-gray-500 mt-4">No credit card required</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBar />
      <HowItWorks />
      <CodeExample />
      <Savings />
      <Features />
      <FinalCta />
    </>
  );
}
