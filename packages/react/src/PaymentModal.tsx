import React, { useEffect, useRef, useState } from 'react';
import type { PaymentModalProps } from './types.js';

// API URL can be set via __SEEDHAPE_API_URL__ global, or defaults to production
declare const __SEEDHAPE_API_URL__: string | undefined;
const API_URL: string =
  typeof __SEEDHAPE_API_URL__ !== 'undefined'
    ? __SEEDHAPE_API_URL__
    : 'https://api.seedhape.com';

type OrderData = {
  id: string;
  amount: number;
  description: string | null;
  status: string;
  upiUri: string;
  qrCode: string;
  expiresAt: string;
};

export function PaymentModal({ orderId, open, onClose, onSuccess, onExpired }: PaymentModalProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;
    fetchOrder();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, orderId]);

  async function fetchOrder() {
    const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
    if (!res.ok) return;
    const data = await res.json() as OrderData;
    setOrder(data);
    if (!isTerminal(data.status)) startPolling();
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
      if (!res.ok) return;
      const data = await res.json() as OrderData;
      setOrder(data);
      if (isTerminal(data.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleTerminal(data);
      }
    }, 3000);
  }

  function isTerminal(status: string) {
    return ['VERIFIED', 'RESOLVED', 'EXPIRED', 'REJECTED'].includes(status);
  }

  function handleTerminal(data: OrderData) {
    if (data.status === 'VERIFIED' || data.status === 'RESOLVED') {
      onSuccess?.({ orderId: data.id, status: data.status as 'VERIFIED', amount: data.amount });
    } else if (data.status === 'EXPIRED') {
      onExpired?.(data.id);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        fontFamily: 'system-ui, sans-serif',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: 32,
          width: 360,
          maxWidth: 'calc(100vw - 32px)',
          textAlign: 'center',
        }}
      >
        {!order ? (
          <p style={{ color: '#999' }}>Loading...</p>
        ) : (
          <>
            {(order.status === 'VERIFIED' || order.status === 'RESOLVED') ? (
              <>
                <div style={{ fontSize: 48 }}>✅</div>
                <p style={{ fontWeight: 600, fontSize: 18, color: '#16a34a', margin: '8px 0' }}>
                  Payment Verified!
                </p>
                <p style={{ fontSize: 28, fontWeight: 700 }}>₹{(order.amount / 100).toFixed(2)}</p>
              </>
            ) : order.status === 'EXPIRED' ? (
              <>
                <div style={{ fontSize: 48 }}>⏰</div>
                <p style={{ fontWeight: 600, fontSize: 18, color: '#dc2626' }}>Link Expired</p>
              </>
            ) : (
              <>
                <p style={{ fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
                  {order.description ?? 'Complete Payment'}
                </p>
                <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>
                  ₹{(order.amount / 100).toFixed(2)}
                </p>
                {order.qrCode && (
                  <img src={order.qrCode} width={200} height={200} style={{ borderRadius: 8, marginBottom: 16 }} alt="UPI QR" />
                )}
                <a
                  href={order.upiUri}
                  style={{
                    display: 'inline-block',
                    background: '#16a34a',
                    color: 'white',
                    padding: '10px 24px',
                    borderRadius: 10,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  Open UPI App
                </a>
                <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>⏳ Waiting for payment...</p>
              </>
            )}
          </>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            background: 'none',
            border: 'none',
            color: '#999',
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
