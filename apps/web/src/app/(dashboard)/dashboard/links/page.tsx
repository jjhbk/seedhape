import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

import { paiseToRupees } from '@seedhape/shared';

import { LinksClient, LinkRowActions } from './LinksClient';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

type PaymentLink = {
  id: string;
  linkType: 'REUSABLE' | 'ONE_TIME';
  title: string;
  description: string | null;
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  isActive: boolean;
  expiresAt: string | null;
  usesCount: number;
  totalCollected: number;
  shareUrl: string;
  createdAt: string;
};

function amountLabel(link: PaymentLink): string {
  if (link.amount !== null) return `₹${paiseToRupees(link.amount)}`;
  if (link.minAmount !== null && link.maxAmount !== null) {
    return `₹${paiseToRupees(link.minAmount)} – ₹${paiseToRupees(link.maxAmount)}`;
  }
  if (link.minAmount !== null) return `from ₹${paiseToRupees(link.minAmount)}`;
  if (link.maxAmount !== null) return `up to ₹${paiseToRupees(link.maxAmount)}`;
  return 'Variable';
}

export default async function LinksPage() {
  const { getToken, userId } = await auth();
  if (!userId) redirect('/sign-in');

  const token = await getToken();

  const res = await fetch(`${API_URL}/v1/links?limit=50`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  const { data = [] } = res.ok ? await res.json() as { data: PaymentLink[] } : { data: [] };

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Payment Links</h1>
        <LinksClient />
      </div>

      {data.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-2">No payment links yet</p>
          <p className="text-sm text-gray-400">Create a link to start accepting payments without a website.</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {data.map((link) => (
              <div key={link.id} className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{link.title}</p>
                    {link.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">{link.description}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {link.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p className="text-gray-500">Amount</p>
                  <p className="text-gray-700 text-right font-medium">{amountLabel(link)}</p>
                  <p className="text-gray-500">Uses</p>
                  <p className="text-gray-700 text-right">{link.usesCount}</p>
                  <p className="text-gray-500">Collected</p>
                  <p className="text-gray-700 text-right">₹{paiseToRupees(link.totalCollected)}</p>
                </div>
                <LinkRowActions
                  url={link.shareUrl}
                  title={link.title}
                  linkId={link.id}
                  isActive={link.isActive}
                  linkType={link.linkType}
                />
              </div>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Title</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Uses</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Collected</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium hidden lg:table-cell">Expires</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((link) => (
                <tr key={link.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[180px]">{link.title}</p>
                    {link.description && (
                      <p className="text-xs text-gray-400 truncate max-w-[180px]">{link.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{amountLabel(link)}</td>
                  <td className="px-4 py-3 text-gray-600">{link.usesCount}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    ₹{paiseToRupees(link.totalCollected)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${link.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {link.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400 hidden lg:table-cell">
                    {link.expiresAt
                      ? new Date(link.expiresAt).toLocaleDateString('en-IN')
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <LinkRowActions
                      url={link.shareUrl}
                      title={link.title}
                      linkId={link.id}
                      isActive={link.isActive}
                      linkType={link.linkType}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </>
      )}
    </div>
  );
}
