'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle, Smartphone, RefreshCw, Upload, ArrowRight, User } from 'lucide-react';

import { paiseToRupees } from '@seedhape/shared';

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

type OrderData = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  upiUri: string;
  qrCode: string;
  expiresAt: string;
  expectedSenderName: string | null;
};
type OrderStatusData = Pick<OrderData, 'id' | 'status' | 'amount'>;

export default function PaymentPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payer name — must be submitted before QR is shown
  const [payerName, setPayerName] = useState('');
  const [savingPayerName, setSavingPayerName] = useState(false);
  const [payerNameError, setPayerNameError] = useState<string | null>(null);
  // true once name saved this session, or if order already had one when loaded
  const [nameConfirmed, setNameConfirmed] = useState(false);

  // Screenshot fallback
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchOrder();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [params.orderId]);

  async function fetchOrder() {
    try {
      const res = await fetch(`${API_URL}/v1/pay/${params.orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json() as OrderData;
      setOrder(data);
      // If the order already has a name (set at creation time by the merchant), skip the gate
      if (data.expectedSenderName) {
        setPayerName(data.expectedSenderName);
        setNameConfirmed(true);
      }
      setLoading(false);
      if (!['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'].includes(data.status)) {
        startPolling();
      }
    } catch {
      setError('Payment link not found or expired');
      setLoading(false);
    }
  }

  async function fetchOrderStatus(orderId: string): Promise<OrderStatusData | null> {
    const res = await fetch(`${API_URL}/v1/pay/${orderId}/status`);
    if (!res.ok) return null;
    return res.json() as Promise<OrderStatusData>;
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const statusData = await fetchOrderStatus(params.orderId);
        if (!statusData) return;
        setOrder((prev) => (prev ? { ...prev, ...statusData } : prev));
        if (['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'].includes(statusData.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 3000);
  }

  async function confirmPayerName() {
    const name = payerName.trim();
    if (name.length < 2) {
      setPayerNameError('Please enter at least 2 characters.');
      return;
    }
    setSavingPayerName(true);
    setPayerNameError(null);
    try {
      const res = await fetch(`${API_URL}/v1/pay/${order!.id}/expectation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedSenderName: name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'Failed to save name');
      setOrder({ ...order!, expectedSenderName: name });
      setNameConfirmed(true);
    } catch (err) {
      setPayerNameError(err instanceof Error ? err.message : 'Could not save name. Please try again.');
    } finally {
      setSavingPayerName(false);
    }
  }

  async function submitScreenshot() {
    if (!uploadFile || !order) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('screenshot', uploadFile);
      const res = await fetch(`${API_URL}/v1/pay/${order.id}/screenshot`, {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      setUploadDone(true);
    } catch {
      alert('Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-900">{error ?? 'Something went wrong'}</h1>
        </div>
      </div>
    );
  }

  const isVerified = order.status === 'VERIFIED' || order.status === 'RESOLVED';
  const isExpired = order.status === 'EXPIRED' || order.status === 'REJECTED';
  const isDisputed = order.status === 'DISPUTED';
  const isPending = !isVerified && !isExpired && !isDisputed;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">

        {/* Terminal states */}
        {isVerified && (
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Payment Received!</h1>
            <p className="text-gray-500 mt-1">Your payment has been verified</p>
          </div>
        )}
        {isExpired && (
          <div className="text-center mb-6">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Link Expired</h1>
            <p className="text-gray-500 mt-1">Did you complete this payment? Upload a screenshot to raise a dispute.</p>
          </div>
        )}
        {isDisputed && (
          <div className="text-center mb-6">
            <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Under Review</h1>
            <p className="text-gray-500 mt-1">Your payment is being reviewed. Upload another screenshot if needed.</p>
          </div>
        )}

        {/* Amount — always shown */}
        <div className="bg-brand-50 rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-brand-700 mb-1">Amount</p>
          <p className="text-3xl font-bold text-brand-800">₹{paiseToRupees(order.amount)}</p>
          {order.description && <p className="text-sm text-brand-600 mt-1">{order.description}</p>}
        </div>

        {/* ── Dispute upload — shown for EXPIRED and DISPUTED ── */}
        {(isExpired || isDisputed) && (
          <div className="pt-2">
            {uploadDone ? (
              <div className="text-center py-4">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-600 font-medium">Screenshot submitted for review</p>
                <p className="text-xs text-gray-400 mt-1">The merchant will verify and resolve your payment</p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block w-full cursor-pointer">
                  <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 px-4 hover:border-brand-300 transition-colors">
                    <Upload className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {uploadFile ? uploadFile.name : 'Upload payment screenshot'}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {uploadFile && (
                  <button
                    onClick={submitScreenshot}
                    disabled={uploading}
                    className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Submit dispute'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 1: Collect payer name (gates the QR code) ── */}
        {isPending && !nameConfirmed && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">1</div>
              <h2 className="font-semibold text-gray-900 text-sm">Enter your name</h2>
            </div>
            <p className="text-xs text-gray-500 mb-3 leading-relaxed">
              Enter your name exactly as it appears in your UPI app. This helps us instantly verify your payment.
            </p>
            <div className="relative mb-2">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                value={payerName}
                onChange={(e) => { setPayerName(e.target.value); setPayerNameError(null); }}
                onKeyDown={(e) => e.key === 'Enter' && confirmPayerName()}
                placeholder="e.g. Rahul Sharma"
                className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
                autoComplete="name"
                autoFocus
              />
            </div>
            {payerNameError && (
              <p className="text-xs text-red-600 mb-2">{payerNameError}</p>
            )}
            <button
              type="button"
              onClick={confirmPayerName}
              disabled={savingPayerName || payerName.trim().length < 2}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
            >
              {savingPayerName ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>Continue <ArrowRight className="h-4 w-4" /></>
              )}
            </button>

            {/* Step indicator */}
            <div className="flex justify-center gap-1.5 mt-4">
              <div className="h-1.5 w-6 rounded-full bg-brand-600" />
              <div className="h-1.5 w-6 rounded-full bg-gray-200" />
            </div>
          </div>
        )}

        {/* ── Step 2: QR + pay (shown after name confirmed) ── */}
        {isPending && nameConfirmed && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold">2</div>
              <h2 className="font-semibold text-gray-900 text-sm">Scan &amp; pay</h2>
              <span className="ml-auto text-xs text-gray-400 flex items-center gap-1">
                <User className="h-3 w-3" />{payerName}
              </span>
            </div>

            <div className="flex justify-center mb-4">
              <img src={order.qrCode} alt="UPI QR Code" className="w-64 h-64 rounded-xl border border-gray-100" />
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">Scan with any UPI app to pay</p>

            <a
              href={order.upiUri}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-4"
            >
              <Smartphone className="h-5 w-5" />
              Open UPI App
            </a>

            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Expires {new Date(order.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Waiting for payment…
              </span>
            </div>

            {/* Step indicator */}
            <div className="flex justify-center gap-1.5 mt-2 mb-6">
              <div className="h-1.5 w-6 rounded-full bg-gray-200" />
              <div className="h-1.5 w-6 rounded-full bg-brand-600" />
            </div>

            {/* Screenshot fallback */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Already paid but not verified?</p>
              {uploadDone ? (
                <p className="text-center text-sm text-green-600 font-medium">✓ Screenshot submitted for review</p>
              ) : (
                <div className="space-y-2">
                  <label className="block w-full cursor-pointer">
                    <div className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl py-3 px-4 hover:border-brand-300 transition-colors">
                      <Upload className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">
                        {uploadFile ? uploadFile.name : 'Upload payment screenshot'}
                      </span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {uploadFile && (
                    <button
                      onClick={submitScreenshot}
                      disabled={uploading}
                      className="w-full py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {uploading ? 'Uploading...' : 'Submit for manual review'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <p className="text-center text-xs text-gray-300 mt-6">Order ID: {order.id}</p>
      </div>
    </div>
  );
}
