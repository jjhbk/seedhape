import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

import { paiseToRupees } from '@seedhape/shared';

import { DisputeActions } from '@/components/dashboard/DisputeActions';

const API_URL = process.env['API_BASE_URL'] ?? 'http://localhost:3001';

type Dispute = {
  id: string;
  orderId: string;
  amount: number;
  resolution: 'PENDING' | 'APPROVED' | 'REJECTED';
  screenshotUrl: string | null;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export default async function DisputesPage() {
  const { getToken, userId } = await auth();
  if (!userId) redirect('/sign-in');

  const token = await getToken();

  const res = await fetch(`${API_URL}/v1/merchant/disputes`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    cache: 'no-store',
  });

  const { data = [] }: { data: Dispute[] } = res.ok ? await res.json() : { data: [] };

  const pending = data.filter((d) => d.resolution === 'PENDING');
  const resolved = data.filter((d) => d.resolution !== 'PENDING');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Disputes</h1>
      <p className="text-gray-500 text-sm mb-8">
        Payments that couldn't be automatically matched. Review and resolve manually.
      </p>

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            Needs Review ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} token={token ?? ''} />
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && (
        <div className="bg-green-50 border border-green-100 rounded-xl p-8 text-center mb-8">
          <CheckCircle className="h-10 w-10 text-green-400 mx-auto mb-3" />
          <p className="font-medium text-green-800">No pending disputes</p>
          <p className="text-sm text-green-600 mt-1">All payments have been resolved.</p>
        </div>
      )}

      {resolved.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Resolved ({resolved.length})
          </h2>
          <div className="space-y-2">
            {resolved.map((dispute) => (
              <DisputeCard key={dispute.id} dispute={dispute} token={token ?? ''} resolved />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function DisputeCard({
  dispute,
  token,
  resolved = false,
}: {
  dispute: Dispute;
  token: string;
  resolved?: boolean;
}) {
  const resolutionConfig = {
    PENDING: { label: 'Pending', icon: <Clock className="h-4 w-4" />, color: 'text-yellow-600 bg-yellow-50' },
    APPROVED: { label: 'Approved', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-700 bg-green-50' },
    REJECTED: { label: 'Rejected', icon: <XCircle className="h-4 w-4" />, color: 'text-red-700 bg-red-50' },
  }[dispute.resolution];

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${resolutionConfig.color}`}>
              {resolutionConfig.icon}
              {resolutionConfig.label}
            </span>
            <span className="text-sm font-semibold text-gray-900">
              ₹{paiseToRupees(dispute.amount)}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono truncate">Order: {dispute.orderId}</p>
          {dispute.resolutionNote && (
            <p className="text-sm text-gray-600 mt-2 bg-gray-50 rounded-lg px-3 py-2">
              {dispute.resolutionNote}
            </p>
          )}
          {dispute.screenshotUrl && (
            <a
              href={dispute.screenshotUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline mt-2 inline-block"
            >
              View screenshot →
            </a>
          )}
        </div>
        {!resolved && <DisputeActions disputeId={dispute.id} token={token} />}
      </div>
    </div>
  );
}
