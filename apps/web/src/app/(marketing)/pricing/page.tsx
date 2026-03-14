import { CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

import { PLAN_LIMITS } from '@seedhape/shared';
import { PricingCheckoutButton } from '@/components/marketing/PricingCheckoutButton';

type PlanKey = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

const PLANS: {
  key: PlanKey;
  name: string;
  price: number;
  description: string;
  highlight?: boolean;
}[] = [
  { key: 'FREE',    name: 'Free',    price: 0,    description: 'Try it out, no credit card needed.' },
  { key: 'STARTER', name: 'Starter', price: 1,  description: 'Solo entrepreneurs and side hustles.', highlight: true },
  { key: 'GROWTH',  name: 'Growth',  price: 2, description: 'Growing stores and small teams.' },
  { key: 'PRO',     name: 'Pro',     price: 3, description: 'High-volume merchants and agencies.' },
];

const FEATURES: { label: string; plans: Record<PlanKey, string | boolean> }[] = [
  {
    label: 'Monthly verified transactions',
    plans: {
      FREE:    `${PLAN_LIMITS.FREE.toLocaleString()}`,
      STARTER: `${PLAN_LIMITS.STARTER.toLocaleString()}`,
      GROWTH:  `${PLAN_LIMITS.GROWTH.toLocaleString()}`,
      PRO:     `${PLAN_LIMITS.PRO.toLocaleString()}`,
    },
  },
  { label: 'Webhook deliveries',   plans: { FREE: true,  STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'API access',           plans: { FREE: true,  STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'JS + React SDK',       plans: { FREE: true,  STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'Dispute management',   plans: { FREE: false, STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'Analytics dashboard',  plans: { FREE: false, STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'Webhook retry logs',   plans: { FREE: false, STARTER: true,  GROWTH: true,  PRO: true  } },
  { label: 'Multiple API keys',    plans: { FREE: false, STARTER: false, GROWTH: true,  PRO: true  } },
  { label: 'Priority support',     plans: { FREE: false, STARTER: false, GROWTH: true,  PRO: true  } },
  { label: 'Custom webhook secret', plans: { FREE: false, STARTER: false, GROWTH: false, PRO: true } },
  { label: 'SLA guarantee',        plans: { FREE: false, STARTER: false, GROWTH: false, PRO: true  } },
];

function FeatureValue({ value }: { value: string | boolean }) {
  if (value === true)  return <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />;
  if (value === false) return <XCircle     className="h-5 w-5 text-gray-200 mx-auto"  />;
  return <span className="text-sm text-gray-700 font-medium">{value}</span>;
}

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Is there a transaction fee?',
    a: 'No. SeedhaPe charges a flat monthly fee only. Money flows directly from the customer\'s bank to yours — we never touch it.',
  },
  {
    q: 'How does the free plan work?',
    a: `The Free plan lets you verify up to ${PLAN_LIMITS.FREE} transactions per month — plenty for testing and small projects.`,
  },
  {
    q: 'What counts as a "verified transaction"?',
    a: 'An order whose payment is confirmed either automatically (notification match) or manually by you (dispute approval). Expired and rejected orders are not counted.',
  },
  {
    q: 'Do I need to install the Android app?',
    a: 'Yes. The SeedhaPe Merchant app runs on your Android device and listens for UPI payment notifications. This is how we verify payments without access to banking APIs.',
  },
  {
    q: 'Can I upgrade or downgrade at any time?',
    a: 'Yes, plan changes take effect immediately. If you upgrade mid-cycle you pay the prorated difference.',
  },
  {
    q: 'What payment methods do you accept for the subscription?',
    a: 'We accept all major UPI apps',
  },
];

export default function PricingPage() {
  return (
    <main className="bg-white">
      {/* Hero */}
      <section className="pt-24 pb-16 text-center px-4">
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          Zero transaction fees — ever
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          Pay a flat monthly fee. Keep 100% of every payment.
          No per-transaction cut, no surprise charges.
        </p>
      </section>

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`relative flex flex-col rounded-2xl border p-8 ${
              plan.highlight
                ? 'border-green-500 shadow-lg shadow-green-100 bg-white'
                : 'border-gray-100 bg-white'
            }`}
          >
            {plan.highlight && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </span>
              </div>
            )}
            <h2 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h2>
            <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-900">
                {plan.price === 0 ? 'Free' : `₹${plan.price}`}
              </span>
              {plan.price > 0 && <span className="text-gray-400 ml-1">/mo</span>}
            </div>
            <PricingCheckoutButton
              planKey={plan.key}
              highlight={!!plan.highlight}
            />
          </div>
        ))}
      </section>

      {/* Feature comparison table */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Full feature comparison</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-4 px-6 text-sm font-semibold text-gray-500 w-1/3">Feature</th>
                {PLANS.map((p) => (
                  <th key={p.key} className="py-4 px-4 text-sm font-semibold text-gray-900 text-center">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}>
                  <td className="py-3.5 px-6 text-sm text-gray-700">{row.label}</td>
                  {PLANS.map((p) => (
                    <td key={p.key} className="py-3.5 px-4 text-center">
                      <FeatureValue value={row.plans[p.key]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-4 pb-32">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Frequently asked questions</h2>
        <div className="space-y-6">
          {FAQ.map(({ q, a }) => (
            <div key={q} className="border-b border-gray-100 pb-6">
              <h3 className="text-base font-semibold text-gray-900 mb-2">{q}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center bg-green-50 rounded-2xl p-10">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to stop paying 2–3% per transaction?</h3>
          <p className="text-gray-500 mb-6 text-sm">Set up takes under 10 minutes. No credit card required to start.</p>
          <Link
            href="/sign-up"
            className="inline-block bg-green-500 hover:bg-green-600 text-white font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Create free account
          </Link>
        </div>
      </section>
    </main>
  );
}
