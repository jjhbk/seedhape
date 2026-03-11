import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

async function getMerchantData(token: string) {
  const [profile, analytics] = await Promise.all([
    fetch(`${API_URL}/v1/merchant/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    }).then((r) => (r.ok ? r.json() : null)),
    fetch(`${API_URL}/v1/merchant/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    }).then((r) => (r.ok ? r.json() : null)),
  ]);
  return { profile, analytics };
}

export default async function DashboardPage() {
  const { getToken, userId } = await auth();
  if (!userId) redirect('/sign-in');

  const token = await getToken();
  const { profile, analytics } = await getMerchantData(token ?? '');

  const statusColor = profile?.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {profile?.businessName || 'Dashboard'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{profile?.email}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
          <Activity className="h-3.5 w-3.5" />
          {profile?.status ?? 'UNKNOWN'}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total Orders',
            value: analytics?.totalOrders ?? '—',
            icon: <Clock className="h-5 w-5 text-gray-400" />,
          },
          {
            label: 'Verified',
            value: analytics?.verifiedOrders ?? '—',
            icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          },
          {
            label: 'Disputes',
            value: analytics?.disputedOrders ?? '—',
            icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          },
          {
            label: 'Verification Rate',
            value: analytics ? `${analytics.verificationRate}%` : '—',
            icon: <TrendingUp className="h-5 w-5 text-brand-500" />,
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

      {/* UPI ID prompt */}
      {!profile?.upiId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6">
          <h3 className="font-semibold text-yellow-800 mb-1">Set up your UPI ID</h3>
          <p className="text-sm text-yellow-700">
            You need to configure your UPI ID before you can accept payments.
          </p>
          <a href="/dashboard/settings" className="mt-3 inline-block text-sm font-medium text-yellow-800 underline">
            Go to Settings →
          </a>
        </div>
      )}

      {/* App offline prompt */}
      {profile?.status === 'OFFLINE' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <h3 className="font-semibold text-red-800 mb-1">Android app is offline</h3>
          <p className="text-sm text-red-700">
            The SeedhaPe Android app is not running on your device. New payments will not be
            automatically verified until the app is active.
          </p>
        </div>
      )}
    </div>
  );
}
