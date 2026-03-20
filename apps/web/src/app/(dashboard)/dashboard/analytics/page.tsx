import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { TrendingUp, TrendingDown, DollarSign, CheckCircle, AlertTriangle } from 'lucide-react';

import { paiseToRupees } from '@seedhape/shared';

import { VerificationChart } from '@/components/dashboard/VerificationChart';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

// Gateway fee rates for comparison
const GATEWAY_FEE_RATE = 0.02; // 2% (Razorpay standard)

export default async function AnalyticsPage() {
  const { getToken, userId } = await auth();
  if (!userId) redirect('/sign-in');

  const token = await getToken();

  const [analyticsRes, txRes] = await Promise.all([
    fetch(`${API_URL}/v1/merchant/analytics`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      next: { revalidate: 60 },
    }),
    fetch(`${API_URL}/v1/merchant/transactions?limit=100`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      next: { revalidate: 60 },
    }),
  ]);

  const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
  const { data: txData = [] } = txRes.ok ? await txRes.json() : { data: [] };

  const totalVerifiedPaise = analytics?.totalVerifiedAmountPaise ?? 0;
  const savedFees = Math.round(totalVerifiedPaise * GATEWAY_FEE_RATE);
  const verificationRate = analytics?.verificationRate ?? '0.0';

  // Build daily chart data from transactions
  type DayEntry = { date: string; verified: number; disputed: number; total: number };
  const dailyMap = new Map<string, DayEntry>();
  for (const tx of txData) {
    const date = new Date(tx.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    const existing = dailyMap.get(date) ?? { date, verified: 0, disputed: 0, total: 0 };
    existing.total += 1;
    if (tx.status === 'VERIFIED') existing.verified += 1;
    if (tx.status === 'DISPUTED') existing.disputed += 1;
    dailyMap.set(date, existing);
  }
  const chartData = Array.from(dailyMap.values()).slice(-14);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>

      {/* Savings hero card */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 text-white mb-6">
        <p className="text-brand-100 text-sm font-medium mb-1">Estimated fees saved vs. Razorpay (2%)</p>
        <p className="text-3xl sm:text-4xl font-bold mb-1 break-words">₹{paiseToRupees(savedFees)}</p>
        <p className="text-brand-200 text-sm">on ₹{paiseToRupees(totalVerifiedPaise)} verified payments</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Orders',
            value: analytics?.totalOrders ?? '—',
            icon: <DollarSign className="h-5 w-5 text-gray-400" />,
          },
          {
            label: 'Verified',
            value: analytics?.verifiedOrders ?? '—',
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          },
          {
            label: 'Verification Rate',
            value: `${verificationRate}%`,
            icon: <TrendingUp className="h-5 w-5 text-brand-500" />,
          },
          {
            label: 'Disputed',
            value: analytics?.disputedOrders ?? '—',
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500">{stat.label}</p>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Daily payment activity (last 14 days)</h2>
        {chartData.length > 0 ? (
          <VerificationChart data={chartData} />
        ) : (
          <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
            No data yet — start accepting payments to see your stats here.
          </div>
        )}
      </div>
    </div>
  );
}
