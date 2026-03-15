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
  expectedSenderName: string | null;
};

const TERMINAL = ['VERIFIED', 'RESOLVED', 'EXPIRED', 'REJECTED'];

const baseStyles = {
  overlay: {
    position: 'fixed' as const, inset: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, fontFamily: 'system-ui, sans-serif',
  },
  card: {
    background: 'white', borderRadius: 16, padding: 28,
    width: 360, maxWidth: 'calc(100vw - 32px)', textAlign: 'center' as const,
    boxShadow: '0 25px 50px rgba(0,0,0,0.2)',
  },
  amountBox: {
    background: '#f0fdf4', borderRadius: 12, padding: '12px 16px',
    marginBottom: 20,
  },
  amountLabel: { fontSize: 12, color: '#15803d', marginBottom: 2 },
  amount: { fontSize: 28, fontWeight: 700, color: '#14532d', margin: 0 },
  input: {
    width: '100%', border: '1.5px solid #d1d5db', borderRadius: 10,
    padding: '10px 12px', fontSize: 14, boxSizing: 'border-box' as const,
    outline: 'none', marginBottom: 8,
  },
  inputError: { borderColor: '#f87171' },
  btnPrimary: {
    width: '100%', background: '#16a34a', color: 'white', border: 'none',
    borderRadius: 12, padding: '12px 0', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.5, cursor: 'not-allowed' as const },
  closeBtn: {
    marginTop: 14, background: 'none', border: 'none',
    color: '#9ca3af', fontSize: 13, cursor: 'pointer',
  },
  hint: { fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 12, textAlign: 'left' as const },
  errorText: { fontSize: 12, color: '#ef4444', marginBottom: 8, textAlign: 'left' as const },
  stepDots: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 },
  dot: (active: boolean) => ({
    width: 24, height: 6, borderRadius: 3,
    background: active ? '#16a34a' : '#e5e7eb',
  }),
};

export function PaymentModal({ orderId, open, onClose, onSuccess, onExpired }: PaymentModalProps) {
  const [order, setOrder] = useState<OrderData | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [nameConfirmed, setNameConfirmed] = useState(false);
  const [disputeFile, setDisputeFile] = useState<File | null>(null);
  const [disputeUploading, setDisputeUploading] = useState(false);
  const [disputeDone, setDisputeDone] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;
    setOrder(null);
    setNameInput('');
    setNameError(null);
    setNameConfirmed(false);
    setDisputeFile(null);
    setDisputeUploading(false);
    setDisputeDone(false);
    fetchOrder();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [open, orderId]);

  async function fetchOrder() {
    const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
    if (!res.ok) return;
    const data = await res.json() as OrderData;
    setOrder(data);
    // Skip name gate if the merchant already supplied it at order creation time
    if (data.expectedSenderName) {
      setNameInput(data.expectedSenderName);
      setNameConfirmed(true);
    }
    if (!TERMINAL.includes(data.status)) startPolling();
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
      if (!res.ok) return;
      const data = await res.json() as OrderData;
      setOrder(data);
      if (TERMINAL.includes(data.status)) {
        if (pollRef.current) clearInterval(pollRef.current);
        handleTerminal(data);
      }
    }, 3000);
  }

  function handleTerminal(data: OrderData) {
    if (data.status === 'VERIFIED' || data.status === 'RESOLVED') {
      onSuccess?.({ orderId: data.id, status: data.status as 'VERIFIED', amount: data.amount });
    } else if (data.status === 'EXPIRED') {
      onExpired?.(data.id);
      // Stay open so user can submit a dispute screenshot
    }
    // DISPUTED: stay open for screenshot upload
  }

  async function submitDispute() {
    if (!disputeFile || !orderId) return;
    setDisputeUploading(true);
    try {
      const form = new FormData();
      form.append('screenshot', disputeFile);
      const res = await fetch(`${API_URL}/v1/pay/${orderId}/screenshot`, { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      setDisputeDone(true);
    } catch {
      alert('Failed to upload. Please try again.');
    } finally {
      setDisputeUploading(false);
    }
  }

  async function confirmName() {
    const name = nameInput.trim();
    if (name.length < 2) { setNameError('Enter at least 2 characters.'); return; }
    setSavingName(true);
    setNameError(null);
    try {
      const res = await fetch(`${API_URL}/v1/pay/${orderId}/expectation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedSenderName: name }),
      });
      if (!res.ok) throw new Error('Failed');
      setNameConfirmed(true);
    } catch {
      setNameError('Could not save name. Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  if (!open) return null;

  return (
    <div style={baseStyles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={baseStyles.card}>
        {!order ? (
          <p style={{ color: '#9ca3af' }}>Loading…</p>
        ) : (order.status === 'VERIFIED' || order.status === 'RESOLVED') ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#16a34a', margin: '0 0 4px' }}>Payment Verified!</p>
            <p style={{ fontSize: 26, fontWeight: 700, color: '#111', margin: 0 }}>
              ₹{(order.amount / 100).toFixed(2)}
            </p>
          </>
        ) : (order.status === 'EXPIRED' || order.status === 'DISPUTED') ? (
          <>
            <div style={{ fontSize: 40, marginBottom: 8 }}>
              {order.status === 'EXPIRED' ? '⏰' : '🔎'}
            </div>
            <p style={{ fontWeight: 600, fontSize: 17, color: order.status === 'EXPIRED' ? '#dc2626' : '#d97706', margin: '0 0 4px' }}>
              {order.status === 'EXPIRED' ? 'Link Expired' : 'Under Review'}
            </p>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
              {order.status === 'EXPIRED'
                ? 'Did you complete this payment? Upload a screenshot to raise a dispute.'
                : 'Your screenshot was submitted. Upload another if needed.'}
            </p>
            {disputeDone ? (
              <p style={{ color: '#16a34a', fontWeight: 600, fontSize: 14 }}>✓ Dispute submitted for review</p>
            ) : (
              <>
                <label style={{ display: 'block', cursor: 'pointer', marginBottom: 8 }}>
                  <div style={{
                    border: '2px dashed #d1d5db', borderRadius: 10, padding: '10px 12px',
                    fontSize: 13, color: '#6b7280', textAlign: 'center',
                  }}>
                    {disputeFile ? `📎 ${disputeFile.name}` : '📎 Upload payment screenshot'}
                  </div>
                  <input
                    type="file" accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => setDisputeFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                {disputeFile && (
                  <button
                    style={{ ...baseStyles.btnPrimary, ...(disputeUploading ? baseStyles.btnDisabled : {}) }}
                    onClick={submitDispute}
                    disabled={disputeUploading}
                  >
                    {disputeUploading ? 'Uploading…' : 'Submit Dispute'}
                  </button>
                )}
              </>
            )}
          </>
        ) : !nameConfirmed ? (
          /* ── Step 1: Name gate ── */
          <>
            <div style={baseStyles.amountBox}>
              <p style={baseStyles.amountLabel}>Amount</p>
              <p style={baseStyles.amount}>₹{(order.amount / 100).toFixed(2)}</p>
            </div>
            <p style={{ fontWeight: 700, fontSize: 15, textAlign: 'left', marginBottom: 6 }}>Enter your name</p>
            <p style={baseStyles.hint}>
              Enter your name exactly as shown in your UPI app. This is used to instantly match your payment.
            </p>
            <input
              style={{ ...baseStyles.input, ...(nameError ? baseStyles.inputError : {}) }}
              value={nameInput}
              onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && confirmName()}
              placeholder="e.g. Rahul Sharma"
              autoFocus
            />
            {nameError && <p style={baseStyles.errorText}>{nameError}</p>}
            <button
              style={{ ...baseStyles.btnPrimary, ...(savingName || nameInput.trim().length < 2 ? baseStyles.btnDisabled : {}) }}
              onClick={confirmName}
              disabled={savingName || nameInput.trim().length < 2}
            >
              {savingName ? 'Saving…' : 'Continue →'}
            </button>
            <div style={baseStyles.stepDots}>
              <div style={baseStyles.dot(true)} />
              <div style={baseStyles.dot(false)} />
            </div>
          </>
        ) : (
          /* ── Step 2: QR + Pay ── */
          <>
            <div style={baseStyles.amountBox}>
              <p style={baseStyles.amountLabel}>Amount</p>
              <p style={baseStyles.amount}>₹{(order.amount / 100).toFixed(2)}</p>
            </div>
            {order.description && (
              <p style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}>{order.description}</p>
            )}
            {order.qrCode && (
              <img src={order.qrCode} width={200} height={200} style={{ borderRadius: 8, marginBottom: 14 }} alt="UPI QR" />
            )}
            <a
              href={order.upiUri}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#16a34a', color: 'white',
                padding: '12px 0', borderRadius: 12, textDecoration: 'none',
                fontWeight: 600, fontSize: 15, marginBottom: 10,
              }}
            >
              Open UPI App
            </a>
            <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>⏳ Waiting for payment…</p>
            <div style={baseStyles.stepDots}>
              <div style={baseStyles.dot(false)} />
              <div style={baseStyles.dot(true)} />
            </div>
          </>
        )}

        <button style={baseStyles.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
