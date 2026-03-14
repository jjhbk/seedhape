'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PlanKey = 'FREE' | 'STARTER' | 'GROWTH' | 'PRO';

export function PricingCheckoutButton({
  planKey,
  highlight = false,
}: {
  planKey: PlanKey;
  highlight?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? 'Unable to start checkout');
      }
      router.push(data.checkoutUrl as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className={`block w-full text-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
          highlight
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        {planKey === 'FREE'
          ? (loading ? 'Opening...' : 'Get started free')
          : (loading ? 'Creating checkout...' : 'Start free trial')}
      </button>
      {error && (
        <p className="mt-2 text-xs text-red-600 text-center">{error}</p>
      )}
    </div>
  );
}
