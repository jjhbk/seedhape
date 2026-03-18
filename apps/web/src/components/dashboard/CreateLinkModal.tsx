'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { X, RefreshCw, Link2, User } from 'lucide-react';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type Props = {
  onClose: () => void;
};

export function CreateLinkModal({ onClose }: Props) {
  const { getToken } = useAuth();
  const router = useRouter();

  const [linkType, setLinkType] = useState<'REUSABLE' | 'ONE_TIME'>('REUSABLE');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountType, setAmountType] = useState<'fixed' | 'variable'>('fixed');
  const [fixedAmount, setFixedAmount] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  // ONE_TIME fields
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; phone?: string }>({});

  async function handleCreate() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    // ONE_TIME links always have a fixed amount
    const effectiveAmountType = linkType === 'ONE_TIME' ? 'fixed' : amountType;

    if (effectiveAmountType === 'fixed' && (!fixedAmount || Number(fixedAmount) <= 0)) {
      setError('Please enter a valid amount.');
      return;
    }

    // Validate email and phone for ONE_TIME links
    const newFieldErrors: { email?: string; phone?: string } = {};
    if (linkType === 'ONE_TIME') {
      if (customerEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
        newFieldErrors.email = 'Enter a valid email address.';
      }
      if (customerPhone.trim() && !/^[6-9]\d{9}$/.test(customerPhone.trim())) {
        newFieldErrors.phone = 'Enter a valid 10-digit Indian mobile number.';
      }
    }
    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});

    try {
      const token = await getToken();
      const body: Record<string, unknown> = {
        linkType,
        title: title.trim(),
        ...(description.trim() && { description: description.trim() }),
        ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
      };

      if (effectiveAmountType === 'fixed') {
        body['amount'] = Math.round(Number(fixedAmount) * 100);
      } else {
        if (minAmount) body['minAmount'] = Math.round(Number(minAmount) * 100);
        if (maxAmount) body['maxAmount'] = Math.round(Number(maxAmount) * 100);
      }

      if (linkType === 'ONE_TIME') {
        if (customerName.trim()) body['customerName'] = customerName.trim();
        if (customerEmail.trim()) body['customerEmail'] = customerEmail.trim();
        if (customerPhone.trim()) body['customerPhone'] = customerPhone.trim();
      }

      const res = await fetch(`${API_URL}/v1/links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({})) as { message?: string };
      if (!res.ok) {
        setError(data.message ?? 'Failed to create payment link.');
        return;
      }

      router.refresh();
      onClose();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-gray-900 mb-5">Create Payment Link</h2>

        {/* Link type selector */}
        <div className="flex gap-2 mb-5">
          <button
            type="button"
            onClick={() => setLinkType('REUSABLE')}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium transition-colors ${linkType === 'REUSABLE' ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-slate-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Link2 className="h-4 w-4" />
            Reusable
            <span className="text-xs font-normal opacity-70">Multiple payments</span>
          </button>
          <button
            type="button"
            onClick={() => { setLinkType('ONE_TIME'); setAmountType('fixed'); }}
            className={`flex-1 flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-sm font-medium transition-colors ${linkType === 'ONE_TIME' ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-slate-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <User className="h-4 w-4" />
            One-time
            <span className="text-xs font-normal opacity-70">Single customer</span>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={linkType === 'ONE_TIME' ? 'e.g. Invoice #1042 — Web Design' : 'e.g. Photography Session Deposit'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details shown to the customer"
              rows={2}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
            />
          </div>

          {/* Amount — ONE_TIME always fixed */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount <span className="text-red-500">*</span></label>
            {linkType === 'REUSABLE' && (
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setAmountType('fixed')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${amountType === 'fixed' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Fixed
                </button>
                <button
                  type="button"
                  onClick={() => setAmountType('variable')}
                  className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${amountType === 'variable' ? 'bg-brand-600 text-white border-brand-600' : 'border-slate-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  Customer enters
                </button>
              </div>
            )}

            {(linkType === 'ONE_TIME' || amountType === 'fixed') ? (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-slate-200 rounded-xl pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Min ₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl pl-12 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
                <div className="flex-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">Max ₹</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full border border-slate-200 rounded-xl pl-12 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                  />
                </div>
              </div>
            )}
          </div>

          {/* ONE_TIME customer details */}
          {linkType === 'ONE_TIME' && (
            <div className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer details</p>
                <p className="text-xs text-gray-400">Order ID auto-generated</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Customer name (as in UPI app)</label>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
                />
                <p className="text-xs text-gray-400 mt-1">Used for automatic payment matching. Leave blank to ask the customer.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => { setCustomerEmail(e.target.value); setFieldErrors(({ email: _e, ...p }) => p); }}
                  placeholder="customer@example.com"
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 ${fieldErrors.email ? 'border-red-400' : 'border-slate-200'}`}
                />
                {fieldErrors.email && <p className="text-xs text-red-600 mt-1">{fieldErrors.email}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => { setCustomerPhone(e.target.value); setFieldErrors(({ phone: _p, ...rest }) => rest); }}
                  placeholder="10-digit mobile number"
                  className={`w-full border rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-400 ${fieldErrors.phone ? 'border-red-400' : 'border-slate-200'}`}
                />
                {fieldErrors.phone && <p className="text-xs text-red-600 mt-1">{fieldErrors.phone}</p>}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expires on (optional)</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Create Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
