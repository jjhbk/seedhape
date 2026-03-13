'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle, Clock, XCircle, Smartphone, RefreshCw } from 'lucide-react';

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
  const isPending = !isVerified && !isExpired;

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

        {/* QR Code */}
        {isPending && (
          <>
            <div className="flex justify-center mb-4">
              <img
                src={order.qrCode}
                alt="UPI QR Code"
                className="w-64 h-64 rounded-lg"
              />
            </div>

            <p className="text-center text-sm text-gray-500 mb-4">
              Scan with any UPI app to pay
            </p>

            {/* UPI App deep link button */}
            <a
              href={order.upiUri}
              className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
            >
              <Smartphone className="h-5 w-5" />
              Open UPI App
            </a>

            {/* Expiry */}
            <div className="flex items-center justify-center gap-1 mt-4 text-xs text-gray-400">
              <Clock className="h-3 w-3" />
              <span>
                Expires {new Date(order.expiresAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {/* Polling indicator */}
            <div className="flex items-center justify-center gap-1 mt-2 text-xs text-gray-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Waiting for payment...</span>
            </div>
          </>
        )}

        {/* Order ID footer */}
        <p className="text-center text-xs text-gray-300 mt-6">
          Order ID: {order.id}
        </p>
      </div>
    </div>
  );
}
