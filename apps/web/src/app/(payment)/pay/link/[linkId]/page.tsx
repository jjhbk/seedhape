'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { XCircle, RefreshCw, ArrowRight, User, IndianRupee } from 'lucide-react';

import { paiseToRupees } from '@seedhape/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type LinkData = {
  id: string;
  title: string;
  description: string | null;
  linkType: 'REUSABLE' | 'ONE_TIME';
  amount: number | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: string;
  isActive: boolean;
  expiresAt: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
};

type Phase = 'loading' | 'error' | 'form' | 'submitting' | 'redirecting';

export default function PaymentLinkPage() {
  const params = useParams<{ linkId: string }>();
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>('loading');
  const [link, setLink] = useState<LinkData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [amountRupees, setAmountRupees] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; amount?: string }>({});

  useEffect(() => {
    void fetchLink();
  }, [params.linkId]);

  async function fetchLink() {
    try {
      const res = await fetch(`${API_URL}/v1/pay/link/${params.linkId}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        setErrorMsg(body.message ?? 'Payment link not found');
        setPhase('error');
        return;
      }
      const data = await res.json() as LinkData;
      if (!data.isActive) {
        setErrorMsg('This payment link is no longer active.');
        setPhase('error');
        return;
      }
      if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
        setErrorMsg('This payment link has expired.');
        setPhase('error');
        return;
      }
      setLink(data);
      // Pre-fill name for ONE_TIME links that have customerName set
      if (data.customerName) {
        setCustomerName(data.customerName);
      }
      setPhase('form');
    } catch {
      setErrorMsg('Could not load payment link. Please try again.');
      setPhase('error');
    }
  }

  async function handleSubmit() {
    if (!link) return;

    const errors: { name?: string; amount?: string } = {};

    // Only validate name if the link doesn't pre-set it
    const nameToUse = link.customerName ?? customerName.trim();
    if (!link.customerName && nameToUse.length < 2) {
      errors.name = 'Please enter at least 2 characters.';
    }

    let amountPaise: number | undefined;
    if (link.amount === null) {
      const parsed = parseFloat(amountRupees);
      if (!amountRupees || isNaN(parsed) || parsed <= 0) {
        errors.amount = 'Please enter a valid amount.';
      } else {
        amountPaise = Math.round(parsed * 100);
        if (link.minAmount !== null && amountPaise < link.minAmount) {
          errors.amount = `Minimum amount is ₹${paiseToRupees(link.minAmount)}`;
        } else if (link.maxAmount !== null && amountPaise > link.maxAmount) {
          errors.amount = `Maximum amount is ₹${paiseToRupees(link.maxAmount)}`;
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setPhase('submitting');
    try {
      const res = await fetch(`${API_URL}/v1/pay/link/${params.linkId}/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(nameToUse && { customerName: nameToUse }),
          ...(amountPaise !== undefined && { amount: amountPaise }),
        }),
      });
      const body = await res.json().catch(() => ({})) as { orderId?: string; message?: string };
      if (!res.ok) {
        setErrorMsg(body.message ?? 'Could not initiate payment. Please try again.');
        setPhase('error');
        return;
      }
      setPhase('redirecting');
      router.push(`/pay/${body.orderId}`);
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setPhase('error');
    }
  }

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">{errorMsg ?? 'Something went wrong'}</h1>
        </div>
      </div>
    );
  }

  if (phase === 'redirecting') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-brand-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Preparing your payment…</p>
        </div>
      </div>
    );
  }

  const isVariable = link!.amount === null;
  const namePreSet = !!link!.customerName;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        {/* ONE_TIME badge */}
        {link!.linkType === 'ONE_TIME' && (
          <div className="flex justify-center mb-4">
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
              Personal payment request
            </span>
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 text-center mb-1">{link!.title}</h1>
        {link!.description && (
          <p className="text-sm text-gray-500 text-center mb-5">{link!.description}</p>
        )}

        {/* Fixed amount display */}
        {!isVariable && (
          <div className="bg-brand-50 rounded-xl p-4 text-center mb-6">
            <p className="text-sm text-brand-700 mb-1">Amount</p>
            <p className="text-3xl font-bold text-brand-800">₹{paiseToRupees(link!.amount!)}</p>
          </div>
        )}

        {/* Variable amount input */}
        {isVariable && (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
            <div className="relative">
              <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                min={link!.minAmount ? link!.minAmount / 100 : 0.01}
                max={link!.maxAmount ? link!.maxAmount / 100 : undefined}
                step="0.01"
                value={amountRupees}
                onChange={(e) => { setAmountRupees(e.target.value); setFieldErrors(({ amount: _a, ...rest }) => rest); }}
                placeholder={
                  link!.minAmount && link!.maxAmount
                    ? `₹${paiseToRupees(link!.minAmount)} – ₹${paiseToRupees(link!.maxAmount)}`
                    : 'Enter amount'
                }
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
              />
            </div>
            {fieldErrors.amount && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.amount}</p>
            )}
          </div>
        )}

        {/* Payer name — hidden for ONE_TIME links that have it pre-set */}
        {namePreSet ? (
          <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-5">
            <User className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Paying as</p>
              <p className="text-sm font-medium text-gray-800">{link!.customerName}</p>
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Your name (as in UPI app)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setFieldErrors(({ name: _n, ...rest }) => rest); }}
                onKeyDown={(e) => e.key === 'Enter' && void handleSubmit()}
                placeholder="e.g. Rahul Sharma"
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                autoComplete="name"
                autoFocus
              />
            </div>
            {fieldErrors.name && (
              <p className="text-xs text-red-600 mt-1">{fieldErrors.name}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">This helps instantly verify your payment.</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={phase === 'submitting'}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
        >
          {phase === 'submitting' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>Continue to Pay <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
