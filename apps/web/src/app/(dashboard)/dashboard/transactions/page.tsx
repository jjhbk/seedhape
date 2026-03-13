import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { CheckCircle, Clock, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';

import { paiseToRupees } from '@seedhape/shared';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  VERIFIED: {
    label: 'Verified',
    color: 'bg-green-100 text-green-700',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  PENDING: {
    label: 'Pending',
    color: 'bg-yellow-100 text-yellow-700',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  CREATED: {
    label: 'Created',
    color: 'bg-gray-100 text-gray-600',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  DISPUTED: {
    label: 'Disputed',
    color: 'bg-orange-100 text-orange-700',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  EXPIRED: {
    label: 'Expired',
    color: 'bg-gray-100 text-gray-500',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  REJECTED: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-700',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { getToken, userId } = await auth();
  if (!userId) redirect('/sign-in');

  const token = await getToken();
  const page = Number((await searchParams).page ?? 1);

  const res = await fetch(
    `${API_URL}/v1/merchant/transactions?page=${page}&limit=20`,
    { headers: { Authorization: `Bearer ${token ?? ''}` }, cache: 'no-store' },
  );

  const { data = [] } = res.ok ? await res.json() : { data: [] };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Transactions</h1>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Order ID</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">UTR</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">UPI App</th>
              <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  No transactions yet
                </td>
              </tr>
            ) : (
              data.map((tx: Record<string, string | number>) => {
                const status = STATUS_CONFIG[String(tx['status'])] ?? {
                  label: String(tx['status']),
                  color: 'bg-gray-100 text-gray-600',
                  icon: <HelpCircle className="h-3.5 w-3.5" />,
                };
                return (
                  <tr key={String(tx['id'])} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {String(tx['id'])}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ₹{paiseToRupees(Number(tx['amount']))}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {String(tx['utr'] ?? '—')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{String(tx['upiApp'] ?? '—')}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {tx['createdAt']
                        ? new Date(String(tx['createdAt'])).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <a
          href={`?page=${Math.max(1, page - 1)}`}
          className={`text-sm px-3 py-1.5 rounded-lg border ${page <= 1 ? 'opacity-40 pointer-events-none' : 'hover:bg-gray-50'}`}
        >
          Previous
        </a>
        <span className="text-sm text-gray-500">Page {page}</span>
        <a
          href={`?page=${page + 1}`}
          className={`text-sm px-3 py-1.5 rounded-lg border hover:bg-gray-50 ${data.length < 20 ? 'opacity-40 pointer-events-none' : ''}`}
        >
          Next
        </a>
      </div>
    </div>
  );
}
