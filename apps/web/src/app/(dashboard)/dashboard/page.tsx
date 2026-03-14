import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CheckCircle, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { PLAN_LIMITS, type Plan } from '@seedhape/shared';

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
  const plan = (profile?.plan ?? 'FREE') as Plan;
  const monthlyUsed = Number(profile?.monthlyTxCount ?? 0);
  const limit = PLAN_LIMITS[plan];
  const isUnlimited = !Number.isFinite(limit);
  const remaining = isUnlimited ? null : Math.max(0, limit - monthlyUsed);
  const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((monthlyUsed / limit) * 100));
  const isAtLimit = !isUnlimited && monthlyUsed >= limit;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-6">
        <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {profile?.businessName || 'Dashboard'}
            </h1>
            <p className="text-slate-500 text-sm mt-1">{profile?.email}</p>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${statusColor}`}>
          <Activity className="h-3.5 w-3.5" />
          {profile?.status ?? 'UNKNOWN'}
        </div>
      </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div key={stat.label} className="bg-white rounded-2xl border border-emerald-100/70 p-5 shadow-sm shadow-emerald-100/50">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-slate-500">{stat.label}</p>
              {stat.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Plan usage */}
      <div className="bg-white rounded-2xl border border-emerald-100/70 p-5 shadow-sm shadow-emerald-100/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Current Plan</p>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{plan}</h2>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 text-right">
            <p className="text-xs text-slate-500">Monthly Usage</p>
            <p className="text-sm font-semibold text-slate-800">
              {monthlyUsed.toLocaleString()} / {isUnlimited ? 'Unlimited' : limit.toLocaleString()}
            </p>
          </div>
        </div>

        {!isUnlimited && (
          <>
            <div className="mt-4 h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full ${isAtLimit ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <p className="text-slate-500">{usagePercent}% used this month</p>
              <p className={`${isAtLimit ? 'text-rose-700 font-semibold' : 'text-slate-500'}`}>
                {remaining?.toLocaleString()} remaining
              </p>
            </div>
          </>
        )}
      </div>

      {/* UPI ID prompt */}
      {!profile?.upiId && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
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
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <h3 className="font-semibold text-red-800 mb-1">Android app is offline</h3>
          <p className="text-sm text-red-700">
            The SeedhaPe Android app is not running on your device. New payments will not be
            automatically verified until the app is active.
          </p>
        </div>
      )}

      {isAtLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-semibold text-amber-800 mb-1">Plan limit reached</h3>
          <p className="text-sm text-amber-700">
            New orders are currently blocked for this month. Upgrade your plan in pricing to continue accepting payments.
          </p>
          <a href="/pricing" className="mt-3 inline-block text-sm font-medium text-amber-800 underline">
            View pricing →
          </a>
        </div>
      )}
    </div>
  );
}
