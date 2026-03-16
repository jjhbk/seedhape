import { useEffect, useRef, useState } from 'react';
import type { PaymentModalProps } from './types.js';
import { useSeedhaPeContext } from './provider.js';

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

const TERMINAL = ['VERIFIED', 'RESOLVED', 'EXPIRED', 'REJECTED', 'DISPUTED'];

function formatSeconds(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const STYLE_ID = 'sp-modal-styles';
function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');

    @keyframes sp-fadeIn {
      from { opacity:0; transform:scale(0.97) translateY(10px); }
      to   { opacity:1; transform:scale(1)    translateY(0); }
    }
    @keyframes sp-spin {
      to { transform:rotate(360deg); }
    }
    @keyframes sp-success-pop {
      0%   { transform:scale(0) rotate(-12deg); opacity:0; }
      60%  { transform:scale(1.18) rotate(2deg); opacity:1; }
      100% { transform:scale(1) rotate(0); opacity:1; }
    }
    @keyframes sp-check {
      from { stroke-dashoffset:60; opacity:0; }
      to   { stroke-dashoffset:0;  opacity:1; }
    }
    @keyframes sp-dot-bounce {
      0%,80%,100% { transform:scale(0.4); opacity:0.3; }
      40%         { transform:scale(1);   opacity:1; }
    }
    @keyframes sp-scan-line {
      0%,100% { top:10px;               opacity:0.9; }
      50%     { top:calc(100% - 10px);  opacity:0.5; }
    }
    @keyframes sp-timer-urgent {
      0%,100% { opacity:1; }
      50%     { opacity:0.65; }
    }
    @keyframes sp-shimmer {
      0%   { background-position:-200% center; }
      100% { background-position: 200% center; }
    }

    .sp-card  { animation:sp-fadeIn 0.28s cubic-bezier(0.34,1.4,0.64,1) forwards; }
    .sp-btn   { transition:all 0.15s ease; }
    .sp-btn:hover:not(:disabled)  { filter:brightness(1.07); transform:translateY(-1px); box-shadow:0 6px 18px rgba(22,163,74,0.35) !important; }
    .sp-btn:active:not(:disabled) { transform:translateY(0); }

    .sp-upi-btn { transition:all 0.15s ease; }
    .sp-upi-btn:hover { filter:brightness(1.07); transform:translateY(-1px); box-shadow:0 6px 18px rgba(22,163,74,0.35) !important; }

    .sp-input { transition:border-color 0.15s, box-shadow 0.15s; }
    .sp-input:focus { border-color:#16a34a !important; box-shadow:0 0 0 3px rgba(22,163,74,0.14) !important; outline:none; }
    .sp-input::placeholder { color:#c4c9d4; }

    .sp-upload-zone { transition:all 0.2s ease; cursor:pointer; }
    .sp-upload-zone:hover { border-color:#16a34a !important; background:#f0fdf4 !important; }

    .sp-close-btn { transition:all 0.15s; }
    .sp-close-btn:hover { color:#374151 !important; background:#f3f4f6 !important; }

    .sp-overlay-bg {
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
  `;
  document.head.appendChild(el);
}

const F = "'DM Sans', system-ui, -apple-system, sans-serif";
const MONO = "'DM Mono', 'SF Mono', 'Fira Code', monospace";

export function PaymentModal({ orderId, open, onClose, onSuccess, onExpired }: PaymentModalProps) {
  const { baseUrl: API_URL } = useSeedhaPeContext();

  useEffect(() => { ensureStyles(); }, []);

  const [order, setOrder]                   = useState<OrderData | null>(null);
  const [nameInput, setNameInput]           = useState('');
  const [nameError, setNameError]           = useState<string | null>(null);
  const [savingName, setSavingName]         = useState(false);
  const [nameConfirmed, setNameConfirmed]   = useState(false);
  const [disputeFile, setDisputeFile]       = useState<File | null>(null);
  const [disputeUploading, setDisputeUploading] = useState(false);
  const [disputeDone, setDisputeDone]       = useState(false);
  const [secondsLeft, setSecondsLeft]       = useState<number | null>(null);
  const [timerExpired, setTimerExpired]     = useState(false);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open || !orderId) return;
    setOrder(null);
    setNameInput('');
    setNameError(null);
    setNameConfirmed(false);
    setDisputeFile(null);
    setDisputeUploading(false);
    setDisputeDone(false);
    setSecondsLeft(null);
    setTimerExpired(false);
    fetchOrder();
    return () => {
      if (pollRef.current)  clearInterval(pollRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, orderId]);

  // Warn on browser refresh / tab close while payment is pending
  useEffect(() => {
    if (!open || !order || TERMINAL.includes(order.status)) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [open, order]);

  async function fetchOrder() {
    const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
    if (!res.ok) return;
    const data = await res.json() as OrderData;
    setOrder(data);
    if (data.expectedSenderName) setNameInput(data.expectedSenderName);
    if (!TERMINAL.includes(data.status)) {
      startPolling();
      startTimer(data.expiresAt);
    }
  }

  function startPolling() {
    pollRef.current = setInterval(async () => {
      const res = await fetch(`${API_URL}/v1/pay/${orderId}`);
      if (!res.ok) return;
      const data = await res.json() as OrderData;
      setOrder(data);
      if (TERMINAL.includes(data.status)) {
        if (pollRef.current)  clearInterval(pollRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        handleTerminal(data);
      }
    }, 3000);
  }

  function startTimer(expiresAt: string) {
    const tick = () => {
      const secs = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(secs);
      if (secs === 0) {
        setTimerExpired(true);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
  }

  function handleTerminal(data: OrderData) {
    setSecondsLeft(null);
    if (data.status === 'VERIFIED' || data.status === 'RESOLVED') {
      onSuccess?.({ orderId: data.id, status: data.status as 'VERIFIED', amount: data.amount });
    } else if (data.status === 'EXPIRED') {
      onExpired?.(data.id);
    }
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
    if (name.length < 2) { setNameError('Please enter at least 2 characters.'); return; }
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
      setNameError('Could not save. Please try again.');
    } finally {
      setSavingName(false);
    }
  }

  if (!open) return null;

  const isUrgent  = secondsLeft !== null && secondsLeft <= 60;
  const isWarning = secondsLeft !== null && secondsLeft <= 120 && !isUrgent;
  const isTerminal = order && TERMINAL.includes(order.status);
  const isSuccess  = order?.status === 'VERIFIED' || order?.status === 'RESOLVED';
  const isDispute  = order?.status === 'EXPIRED'  || order?.status === 'DISPUTED';
  // Show dispute UI as soon as client timer hits 0, even before the server poll confirms EXPIRED.
  // Polling continues — if the server comes back VERIFIED, isSuccess wins and dispute UI hides.
  const showDisputeUI   = isDispute || (timerExpired && !isSuccess);
  const isExpiredBanner = timerExpired ? order?.status !== 'DISPUTED' : order?.status === 'EXPIRED';

  /* ─── Spinner helper ─── */
  const Spinner = ({ size = 18, light = false }: { size?: number; light?: boolean }) => (
    <div style={{
      width: size, height: size, flexShrink: 0,
      border: `2px solid ${light ? 'rgba(255,255,255,0.3)' : '#e5e7eb'}`,
      borderTopColor: light ? 'white' : '#16a34a',
      borderRadius: '50%',
      animation: 'sp-spin 0.75s linear infinite',
    }} />
  );

  /* ─── Step dots ─── */
  const StepDots = ({ step }: { step: 1 | 2 }) => (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 20 }}>
      <div style={{ width: 30, height: 5, borderRadius: 4, background: step === 1 ? '#16a34a' : '#e5e7eb', transition: 'background 0.3s' }} />
      <div style={{ width: 30, height: 5, borderRadius: 4, background: step === 2 ? '#16a34a' : '#e5e7eb', transition: 'background 0.3s' }} />
    </div>
  );

  return (
    <div
      className="sp-overlay-bg"
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.55)',
        fontFamily: F,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="sp-card"
        style={{
          background: 'white',
          borderRadius: 24,
          width: '100%', maxWidth: 400,
          boxShadow: '0 40px 100px rgba(0,0,0,0.30), 0 0 0 1px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}
      >

        {/* ── Green header — only while payment is active (not after timer expires) ── */}
        {order && !isTerminal && !timerExpired && (
          <div style={{
            background: 'linear-gradient(135deg, #14532d 0%, #16a34a 60%, #22c55e 100%)',
            padding: '22px 24px 20px',
            position: 'relative',
          }}>
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              {/* Amount */}
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.55)', margin: '0 0 5px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Secure Payment
                </p>
                <p style={{ fontSize: 34, fontWeight: 700, color: 'white', margin: 0, fontFamily: MONO, letterSpacing: '-0.03em', lineHeight: 1 }}>
                  ₹{(order.amount / 100).toFixed(2)}
                </p>
                {order.description && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', margin: '5px 0 0', fontWeight: 400 }}>
                    {order.description}
                  </p>
                )}
              </div>

              {/* Timer pill */}
              {secondsLeft !== null && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: isUrgent
                    ? 'rgba(220,38,38,0.9)'
                    : isWarning
                    ? 'rgba(217,119,6,0.85)'
                    : 'rgba(0,0,0,0.22)',
                  backdropFilter: 'blur(4px)',
                  borderRadius: 100,
                  padding: '5px 11px',
                  animation: isUrgent ? 'sp-timer-urgent 0.9s ease infinite' : undefined,
                  border: isUrgent ? '1px solid rgba(255,100,100,0.4)' : '1px solid rgba(255,255,255,0.1)',
                }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'white', fontFamily: MONO, letterSpacing: '0.04em' }}>
                    {formatSeconds(secondsLeft)}
                  </span>
                </div>
              )}
            </div>

            {/* SeedhaPe badge */}
            <div style={{
              position: 'absolute', bottom: 10, right: 16,
              fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.15em', textTransform: 'uppercase',
            }}>
              SEEDHAPE
            </div>
          </div>
        )}

        {/* ── Card body ── */}
        <div style={{ padding: isSuccess ? '32px 24px 8px' : '24px 24px 8px' }}>

          {/* Loading */}
          {!order && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <div style={{
                width: 40, height: 40, margin: '0 auto 14px',
                border: '3px solid #f0fdf4',
                borderTopColor: '#16a34a',
                borderRadius: '50%',
                animation: 'sp-spin 0.75s linear infinite',
              }} />
              <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>Setting up payment…</p>
            </div>
          )}

          {/* ── Verified ── */}
          {isSuccess && (
            <div style={{ textAlign: 'center', paddingBottom: 8 }}>
              <div style={{
                width: 80, height: 80, margin: '0 auto 18px',
                background: 'linear-gradient(135deg, #14532d, #16a34a)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(22,163,74,0.45)',
                animation: 'sp-success-pop 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards',
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" strokeDasharray="60" strokeDashoffset="60"
                    style={{ animation: 'sp-check 0.4s 0.35s ease forwards' }}
                  />
                </svg>
              </div>
              <p style={{ fontSize: 20, fontWeight: 700, color: '#15803d', margin: '0 0 6px' }}>
                Payment Verified!
              </p>
              <p style={{ fontSize: 30, fontWeight: 700, color: '#111827', margin: 0, fontFamily: MONO, letterSpacing: '-0.02em' }}>
                ₹{(order!.amount / 100).toFixed(2)}
              </p>
              {order!.description && (
                <p style={{ fontSize: 13, color: '#6b7280', margin: '6px 0 0' }}>{order!.description}</p>
              )}
            </div>
          )}

          {/* ── Expired / Disputed — shown immediately when client timer hits 0 ── */}
          {showDisputeUI && (
            <div>
              {/* Status banner */}
              <div style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                background: isExpiredBanner ? '#fef2f2' : '#fffbeb',
                border: `1.5px solid ${isExpiredBanner ? '#fecaca' : '#fde68a'}`,
                borderRadius: 16, padding: '14px 16px', marginBottom: 18,
              }}>
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
                  {isExpiredBanner ? '⏰' : '🔍'}
                </span>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: isExpiredBanner ? '#dc2626' : '#92400e', margin: '0 0 3px' }}>
                    {isExpiredBanner ? 'Payment Link Expired' : 'Under Review'}
                  </p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.6 }}>
                    {isExpiredBanner
                      ? 'Already paid? Upload your payment screenshot to raise a dispute.'
                      : 'Your screenshot was submitted. Upload another if needed.'}
                  </p>
                </div>
              </div>

              {/* Amount row */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#f9fafb', borderRadius: 12, padding: '12px 16px', marginBottom: 18,
                border: '1px solid #f3f4f6',
              }}>
                <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>Order amount</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#111827', fontFamily: MONO }}>
                  ₹{(order!.amount / 100).toFixed(2)}
                </span>
              </div>

              {disputeDone ? (
                <div style={{
                  background: '#f0fdf4', border: '1.5px solid #bbf7d0',
                  borderRadius: 16, padding: '20px 16px', textAlign: 'center',
                }}>
                  <div style={{
                    width: 44, height: 44, background: '#16a34a', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 10px',
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#15803d', margin: '0 0 4px' }}>Dispute submitted</p>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>We'll review and contact you within 24 hours.</p>
                </div>
              ) : (
                <>
                  {/* Upload zone */}
                  <label className="sp-upload-zone" style={{
                    display: 'block', marginBottom: 12,
                    border: `2px dashed ${disputeFile ? '#16a34a' : '#d1d5db'}`,
                    borderRadius: 16, padding: disputeFile ? '14px 16px' : '28px 16px',
                    textAlign: 'center',
                    background: disputeFile ? '#f0fdf4' : '#fafafa',
                  }}>
                    {disputeFile ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'center' }}>
                        <div style={{
                          width: 40, height: 40, background: '#dcfce7', borderRadius: 10, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {disputeFile.name}
                          </p>
                          <p style={{ fontSize: 11, color: '#16a34a', margin: '2px 0 0', fontWeight: 500 }}>
                            {(disputeFile.size / 1024).toFixed(0)} KB · Ready to submit
                          </p>
                        </div>
                        <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>Change</span>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: 48, height: 48, background: '#f3f4f6', borderRadius: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          margin: '0 auto 10px',
                        }}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                          </svg>
                        </div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 3px' }}>Upload payment screenshot</p>
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>PNG or JPG · max 5 MB</p>
                      </>
                    )}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      onChange={(e) => setDisputeFile(e.target.files?.[0] ?? null)} />
                  </label>

                  {disputeFile && (
                    <button
                      className="sp-btn"
                      onClick={submitDispute}
                      disabled={disputeUploading}
                      style={{
                        width: '100%',
                        background: disputeUploading ? '#9ca3af' : '#16a34a',
                        color: 'white', border: 'none', borderRadius: 14,
                        padding: '13px 0', fontSize: 15, fontWeight: 600,
                        cursor: disputeUploading ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        boxShadow: disputeUploading ? 'none' : '0 2px 10px rgba(22,163,74,0.3)',
                        fontFamily: F,
                      }}
                    >
                      {disputeUploading ? <><Spinner light /> Uploading…</> : 'Submit Dispute →'}
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── Step 1: Name gate ── */}
          {order && !isTerminal && !nameConfirmed && !timerExpired && (
            <div>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 5px' }}>
                Confirm your UPI name
              </p>
              <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', lineHeight: 1.65 }}>
                Enter your name <strong style={{ color: '#374151', fontWeight: 600 }}>exactly as it appears in your UPI app</strong> — this ensures your payment is matched instantly.
              </p>

              <div style={{ marginBottom: nameError ? 6 : 16 }}>
                <label style={{
                  display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280',
                  marginBottom: 7, letterSpacing: '0.09em', textTransform: 'uppercase',
                }}>
                  Your name
                </label>
                <input
                  className="sp-input"
                  value={nameInput}
                  onChange={(e) => { setNameInput(e.target.value); setNameError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && void confirmName()}
                  placeholder="e.g. Rahul Sharma"
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    border: `1.5px solid ${nameError ? '#f87171' : '#e5e7eb'}`,
                    borderRadius: 12, padding: '12px 14px',
                    fontSize: 16, fontWeight: 500, color: '#111827',
                    background: 'white', fontFamily: F,
                  }}
                />
              </div>

              {nameError && (
                <p style={{ fontSize: 12, color: '#ef4444', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {nameError}
                </p>
              )}

              <button
                className="sp-btn"
                onClick={confirmName}
                disabled={savingName || nameInput.trim().length < 2}
                style={{
                  width: '100%',
                  background: savingName || nameInput.trim().length < 2 ? '#f3f4f6' : '#16a34a',
                  color:      savingName || nameInput.trim().length < 2 ? '#9ca3af'  : 'white',
                  border: 'none', borderRadius: 14,
                  padding: '13px 0', fontSize: 15, fontWeight: 600,
                  cursor: savingName || nameInput.trim().length < 2 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: savingName || nameInput.trim().length < 2 ? 'none' : '0 2px 10px rgba(22,163,74,0.3)',
                  fontFamily: F,
                }}
              >
                {savingName ? <><Spinner light={nameInput.trim().length >= 2} /> Saving…</> : 'Continue →'}
              </button>

              <StepDots step={1} />
            </div>
          )}

          {/* ── Step 2: QR ── */}
          {order && !isTerminal && nameConfirmed && !timerExpired && (
            <div style={{ textAlign: 'center' }}>
              {/* QR frame */}
              <div style={{
                display: 'inline-flex', padding: 10,
                border: '1.5px solid #e5e7eb', borderRadius: 18,
                marginBottom: 18, position: 'relative', overflow: 'hidden',
                boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
                background: 'white',
              }}>
                {order.qrCode
                  ? <img src={order.qrCode} width={210} height={210} style={{ display: 'block', borderRadius: 10 }} alt="UPI QR Code" />
                  : <div style={{ width: 210, height: 210, background: '#f9fafb', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Spinner size={28} />
                    </div>
                }
                {/* Animated scan line */}
                <div style={{
                  position: 'absolute', left: 10, right: 10, height: 2,
                  background: 'linear-gradient(90deg, transparent 0%, #16a34a 40%, #22c55e 60%, transparent 100%)',
                  animation: 'sp-scan-line 2.2s ease-in-out infinite',
                  top: 10, borderRadius: 1,
                  boxShadow: '0 0 6px rgba(22,163,74,0.6)',
                }} />
              </div>

              <p style={{ fontSize: 12, color: '#9ca3af', margin: '0 0 14px', lineHeight: 1.5 }}>
                Scan with PhonePe, GPay, Paytm or any UPI app
              </p>

              <a
                href={order.upiUri}
                className="sp-upi-btn"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                  background: '#16a34a', color: 'white',
                  padding: '13px 20px', borderRadius: 14, textDecoration: 'none',
                  fontWeight: 600, fontSize: 15, marginBottom: 16,
                  boxShadow: '0 2px 10px rgba(22,163,74,0.3)',
                  fontFamily: F,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
                Open UPI App
              </a>

              {/* Animated waiting indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: '#16a34a',
                      animation: `sp-dot-bounce 1.4s ease-in-out ${i * 0.18}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{ fontSize: 13, color: '#6b7280' }}>Waiting for payment</span>
              </div>

              <StepDots step={2} />
            </div>
          )}
        </div>

        {/* ── Do-not-close warning — only while payment is active (not after timer expires) ── */}
        {order && !isTerminal && !timerExpired && (
          <div style={{
            margin: '0 16px 4px',
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '8px 12px',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ fontSize: 11, color: '#92400e', margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              Do not close or refresh this page until the payment is complete or the timer runs out.
            </p>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 24px 18px',
          display: 'flex', alignItems: 'center',
          justifyContent: isSuccess ? 'center' : 'space-between',
        }}>
          {!isSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#d1d5db' }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              256-bit encrypted
            </div>
          )}
          <button
            className="sp-close-btn"
            onClick={onClose}
            style={{
              background: 'none', border: 'none', borderRadius: 8,
              padding: '4px 10px', fontSize: 13, color: '#9ca3af',
              cursor: 'pointer', fontFamily: F,
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
