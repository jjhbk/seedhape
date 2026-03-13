'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle, Smartphone, RefreshCw, Upload } from 'lucide-react';

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
};

export default function PaymentPage() {
  const params = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchOrder();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [params.orderId]);

  async function fetchOrder() {
    try {
      const res = await fetch(`${API_URL}/v1/pay/${params.orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const data = await res.json() as OrderData;
      setOrder(data);
      setLoading(false);

      if (!['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'].includes(data.status)) {
        startPolling();
      }
    } catch {
      setError('Payment link not found or expired');
      setLoading(false);
    }
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${API_URL}/v1/pay/${params.orderId}`);
        if (!res.ok) return;
        const data = await res.json() as OrderData;
        setOrder(data);
        if (['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'].includes(data.status)) {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // silently ignore poll errors
      }
    }, 3000);
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

        {/* Status header */}
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
            <p className="text-gray-500 mt-1">This payment link is no longer valid</p>
          </div>
        )}

        {isDisputed && (
          <div className="text-center mb-6">
            <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-gray-900">Under Review</h1>
            <p className="text-gray-500 mt-1">Your payment screenshot has been submitted</p>
          </div>
        )}

        {isPending && (
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Pay Now</h1>
            {order.description && (
              <p className="text-gray-500 mt-1">{order.description}</p>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="bg-brand-50 rounded-xl p-4 text-center mb-6">
          <p className="text-sm text-brand-700 mb-1">Amount</p>
          <p className="text-3xl font-bold text-brand-800">
            ₹{paiseToRupees(order.amount)}
          </p>
        </div>

        {/* QR + Pay button */}
        {isPending && (
          <>
            <div className="flex justify-center mb-4">
              <img src={order.qrCode} alt="UPI QR Code" className="w-64 h-64 rounded-lg" />
            </div>

            <p className="text-center text-sm text-gray-500 mb-4">
              Scan with any UPI app to pay
            </p>

            <a
              href={order.upiUri}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <Smartphone className="h-5 w-5" />
              Open UPI App
            </a>

            <div className="flex items-center justify-center gap-1 mt-4 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>
                Expires {new Date(order.expiresAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Waiting for payment...</span>
            </div>

            {/* Screenshot dispute fallback */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">
                Already paid but not verified?
              </p>
              {uploadDone ? (
                <p className="text-center text-sm text-green-600 font-medium">
                  ✓ Screenshot submitted for review
                </p>
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

        <p className="text-center text-xs text-gray-300 mt-6">
          Order ID: {order.id}
        </p>
      </div>
    </div>
  );
}
