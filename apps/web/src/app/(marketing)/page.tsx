import Link from 'next/link';
import { ArrowRight, CheckCircle, Zap, Shield, TrendingDown, Smartphone } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="text-xl font-bold text-brand-700">SeedhaPe</span>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
              Pricing
            </Link>
            <Link
              href="/sign-in"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-700 text-sm px-4 py-1.5 rounded-full mb-8">
          <Zap className="h-4 w-4" />
          Zero payment gateway fees
        </div>
        <h1 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
          Accept UPI payments
          <br />
          <span className="text-brand-600">directly to your bank</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10">
          Stop paying 2-3% per transaction. SeedhaPe automatically verifies UPI payments via your
          Android device — money goes straight to your account.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-colors"
          >
            Start for free <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium px-8 py-4 rounded-xl text-lg transition-colors"
          >
            View docs
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Create an order',
                desc: 'Call our API with the amount. We generate a UPI QR code.',
              },
              {
                step: '2',
                title: 'Customer pays',
                desc: 'Customer scans QR and pays via PhonePe, GPay, Paytm, etc.',
              },
              {
                step: '3',
                title: 'App detects payment',
                desc: 'Our Android app captures the UPI notification on your phone.',
              },
              {
                step: '4',
                title: 'Webhook fires',
                desc: 'We match the payment to the order and call your webhook in seconds.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fee calculator */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Stop burning money on fees</h2>
          <p className="text-gray-500 mb-12">
            At ₹1 lakh/month GMV, you save ₹2,000-3,000 every month.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: '₹1L/month GMV', savings: '₹2,000–3,000', plan: 'Free plan' },
              { label: '₹10L/month GMV', savings: '₹20,000–30,000', plan: 'Growth plan' },
              { label: '₹1Cr/month GMV', savings: '₹2L–3L', plan: 'Pro plan' },
            ].map((row) => (
              <div key={row.label} className="bg-brand-50 rounded-2xl p-6">
                <p className="text-brand-700 font-medium mb-2">{row.label}</p>
                <p className="text-3xl font-bold text-brand-800 mb-1">{row.savings}</p>
                <p className="text-sm text-brand-600">saved per month</p>
                <p className="text-xs text-gray-400 mt-2">{row.plan}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <Zap className="h-6 w-6 text-brand-600" />,
                title: 'Instant verification',
                desc: 'Payment verified within seconds of the customer paying, not minutes.',
              },
              {
                icon: <Shield className="h-6 w-6 text-brand-600" />,
                title: 'Signed webhooks',
                desc: 'HMAC-SHA256 signed webhooks so you know the request is genuine.',
              },
              {
                icon: <Smartphone className="h-6 w-6 text-brand-600" />,
                title: 'Works with all UPI apps',
                desc: 'PhonePe, Google Pay, Paytm, BHIM, CRED, and more.',
              },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="mb-4">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-400">
          © 2025 SeedhaPe. Built for Indian digital merchants.
        </div>
      </footer>
    </main>
  );
}
