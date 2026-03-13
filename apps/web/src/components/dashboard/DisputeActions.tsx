'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export function DisputeActions({ disputeId, token }: { disputeId: string; token: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');
  const [showNote, setShowNote] = useState(false);

  async function resolve(resolution: 'APPROVED' | 'REJECTED') {
    setLoading(resolution === 'APPROVED' ? 'approve' : 'reject');
    await fetch(`${API_URL}/v1/merchant/disputes/${disputeId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, resolutionNote: note || undefined }),
    });
    setLoading(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {showNote && (
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note (optional)"
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 w-48 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          rows={2}
        />
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNote(!showNote)}
          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
        >
          {showNote ? 'Hide note' : 'Add note'}
        </button>
        <button
          onClick={() => resolve('REJECTED')}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'reject' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
          Reject
        </button>
        <button
          onClick={() => resolve('APPROVED')}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
        >
          {loading === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
          Approve
        </button>
      </div>
    </div>
  );
}
