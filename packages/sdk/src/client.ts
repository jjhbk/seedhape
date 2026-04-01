import type {
  SeedhaPeConfig,
  CreateOrderOptions,
  OrderData,
  PaymentResult,
  ShowPaymentOptions,
} from './types.js';

const DEFAULT_BASE_URL = 'https://seedhape.onrender.com';
const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'] as const;
type PublicOrderStatus = Pick<OrderData, 'id' | 'status' | 'amount'> & { verifiedAt?: string | null };

export class SeedhaPe {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SeedhaPeConfig) {
    this.apiKey = config.apiKey ?? '';
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }

  /**
   * Create a new payment order.
   *
   * If `expectedSenderName` is provided it is forwarded as
   * `metadata.expectedSenderName` so the matching engine can verify the
   * payment using the payer's name even when the UPI transaction note
   * doesn't contain the order ID.
   */
  async createOrder(options: CreateOrderOptions): Promise<OrderData> {
    if (!this.apiKey) throw new Error('SeedhaPe: apiKey is required to create orders');
    const { expectedSenderName, metadata, ...rest } = options;
    const mergedMetadata = expectedSenderName
      ? { ...metadata, expectedSenderName }
      : metadata;

    const res = await fetch(`${this.baseUrl}/v1/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(mergedMetadata ? { ...rest, metadata: mergedMetadata } : rest),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`SeedhaPe: createOrder failed — ${body.error ?? res.status}`);
    }

    return res.json() as Promise<OrderData>;
  }

  /**
   * Get order status.
   */
  async getOrderStatus(orderId: string): Promise<PaymentResult> {
    if (!this.apiKey) throw new Error('SeedhaPe: apiKey is required to get order status');
    const res = await fetch(`${this.baseUrl}/v1/orders/${orderId}/status`, {
      headers: this.headers(),
    });

    if (!res.ok) throw new Error(`SeedhaPe: getOrderStatus failed — ${res.status}`);
    return res.json() as Promise<PaymentResult>;
  }

  /**
   * Show payment modal in the browser with QR code + polling.
   * Returns a promise that resolves when payment is verified or expires.
   */
  async showPayment(options: ShowPaymentOptions): Promise<PaymentResult> {
    return new Promise((resolve, reject) => {
      const modal = this.renderModal(options, resolve, reject);
      document.body.appendChild(modal);
    });
  }

  private async fetchPublicOrderStatus(orderId: string): Promise<PublicOrderStatus> {
    const res = await fetch(`${this.baseUrl}/v1/pay/${orderId}/status`);
    if (!res.ok) throw new Error(`SeedhaPe: status poll failed — ${res.status}`);
    return res.json() as Promise<PublicOrderStatus>;
  }

  private ensureModalStyles() {
    const STYLE_ID = 'sp-sdk-styles';
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@500&display=swap');
      @keyframes sp-sdk-spin    { to { transform:rotate(360deg); } }
      @keyframes sp-sdk-fadein  { from{opacity:0;transform:scale(0.97) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
      @keyframes sp-sdk-success { 0%{transform:scale(0) rotate(-12deg);opacity:0} 60%{transform:scale(1.18) rotate(2deg)} 100%{transform:scale(1) rotate(0);opacity:1} }
      @keyframes sp-sdk-check   { from{stroke-dashoffset:60;opacity:0} to{stroke-dashoffset:0;opacity:1} }
      @keyframes sp-sdk-bounce  { 0%,80%,100%{transform:scale(0.4);opacity:0.3} 40%{transform:scale(1);opacity:1} }
      @keyframes sp-sdk-scan    { 0%,100%{top:10px;opacity:0.9} 50%{top:calc(100% - 10px);opacity:0.5} }
      @keyframes sp-sdk-urgent  { 0%,100%{opacity:1} 50%{opacity:0.6} }
      .sp-sdk-card { animation:sp-sdk-fadein 0.28s cubic-bezier(0.34,1.4,0.64,1) forwards; }
      .sp-sdk-btn:hover  { filter:brightness(1.08);transform:translateY(-1px) !important;box-shadow:0 6px 18px rgba(22,163,74,0.35) !important; }
      .sp-sdk-btn:active { transform:translateY(0) !important; }
      .sp-sdk-btn { transition:all 0.15s ease !important; }
      .sp-sdk-upi:hover  { filter:brightness(1.08);transform:translateY(-1px) !important;box-shadow:0 6px 18px rgba(22,163,74,0.35) !important; }
      .sp-sdk-upi { transition:all 0.15s ease !important; }
      .sp-sdk-input:focus { border-color:#16a34a !important;box-shadow:0 0 0 3px rgba(22,163,74,0.14) !important;outline:none !important; }
      .sp-sdk-input::placeholder { color:#c4c9d4 !important; }
      .sp-sdk-upload:hover { border-color:#16a34a !important;background:#f0fdf4 !important; }
      .sp-sdk-close:hover { color:#374151 !important;background:#f3f4f6 !important; }
    `;
    document.head.appendChild(el);
  }

  private renderModal(
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    reject: (err: Error) => void,
  ): HTMLElement {
    this.ensureModalStyles();

    const F = "'DM Sans',system-ui,-apple-system,sans-serif";

    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:99999;
      display:flex;align-items:center;justify-content:center;padding:16px;
      background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
      font-family:${F};
    `;

    const card = document.createElement('div');
    card.className = 'sp-sdk-card';
    card.style.cssText = `
      background:white;border-radius:24px;width:100%;max-width:400px;
      box-shadow:0 40px 100px rgba(0,0,0,0.30),0 0 0 1px rgba(0,0,0,0.04);
      overflow:hidden;
    `;

    // Header (green) — updated dynamically
    const header = document.createElement('div');
    header.id = 'sp-header';
    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.style.cssText = 'padding:24px 24px 8px;';
    body.innerHTML = `<div id="sp-content" style="text-align:center;padding:28px 0;">
      <div style="width:40px;height:40px;margin:0 auto 14px;border:3px solid #f0fdf4;border-top-color:#16a34a;border-radius:50%;animation:sp-sdk-spin 0.75s linear infinite;"></div>
      <p style="font-size:14px;color:#9ca3af;margin:0;font-family:${F};">Setting up payment…</p>
    </div>`;
    card.appendChild(body);

    // Footer
    const footer = document.createElement('div');
    footer.id = 'sp-footer';
    footer.style.cssText = 'padding:12px 24px 18px;display:flex;align-items:center;justify-content:space-between;';
    footer.innerHTML = `
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:#d1d5db;">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        256-bit encrypted
      </div>
      <button id="sp-close" class="sp-sdk-close" style="
        background:none;border:none;border-radius:8px;padding:4px 10px;
        font-size:13px;color:#9ca3af;cursor:pointer;font-family:${F};
      ">Close</button>
    `;
    card.appendChild(footer);

    overlay.appendChild(card);

    const cleanup = () => overlay.remove();

    footer.querySelector('#sp-close')!.addEventListener('click', () => {
      cleanup();
      options.onClose?.();
      reject(new Error('Payment closed by user'));
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        options.onClose?.();
        reject(new Error('Payment closed by user'));
      }
    });

    this.loadOrder(options.orderId, card, options, resolve, reject, cleanup);

    return overlay;
  }

  private renderHeader(card: HTMLElement, order: OrderData, secondsLeft: number | null): void {
    const MONO = "'DM Mono','SF Mono','Courier New',monospace";
    const header = card.querySelector('#sp-header')!;
    const isUrgent  = secondsLeft !== null && secondsLeft <= 60;
    const isWarning = secondsLeft !== null && secondsLeft <= 300 && !isUrgent;
    const timerBg   = isUrgent ? 'rgba(220,38,38,0.9)' : isWarning ? 'rgba(217,119,6,0.85)' : 'rgba(0,0,0,0.22)';
    const timerAnim = isUrgent ? 'animation:sp-sdk-urgent 0.9s ease infinite;' : '';
    const m = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0;
    const s = secondsLeft !== null ? secondsLeft % 60 : 0;
    const timeStr = `${m}:${String(s).padStart(2, '0')}`;

    (header as HTMLElement).style.cssText = `
      background:linear-gradient(135deg,#14532d 0%,#16a34a 60%,#22c55e 100%);
      padding:22px 24px 20px;position:relative;
    `;
    header.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <p style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.55);margin:0 0 5px;letter-spacing:0.1em;text-transform:uppercase;font-family:'DM Sans',sans-serif;">Secure Payment</p>
          <p style="font-size:34px;font-weight:700;color:white;margin:0;font-family:${MONO};letter-spacing:-0.03em;line-height:1;">₹${(order.amount / 100).toFixed(2)}</p>
          ${order.description ? `<p style="font-size:13px;color:rgba(255,255,255,0.65);margin:5px 0 0;font-weight:400;font-family:'DM Sans',sans-serif;">${order.description}</p>` : ''}
        </div>
        ${secondsLeft !== null ? `
          <div style="display:flex;align-items:center;gap:5px;background:${timerBg};backdrop-filter:blur(4px);border-radius:100px;padding:5px 11px;border:1px solid rgba(255,255,255,0.1);${timerAnim}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span style="font-size:12px;font-weight:600;color:white;font-family:${MONO};letter-spacing:0.04em;">${timeStr}</span>
          </div>
        ` : ''}
      </div>
      <div style="position:absolute;bottom:10px;right:16px;font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);letter-spacing:0.15em;text-transform:uppercase;font-family:'DM Sans',sans-serif;">SEEDHAPE</div>
    `;
  }

  private async loadOrder(
    orderId: string,
    card: HTMLElement,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    reject: (err: Error) => void,
    cleanup: () => void,
  ) {
    try {
      const res = await fetch(`${this.baseUrl}/v1/pay/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const order = await res.json() as OrderData;

      if (TERMINAL_STATUSES.includes(order.status as (typeof TERMINAL_STATUSES)[number])) {
        this.renderTerminal(card, order, options, resolve, cleanup);
        return;
      }

      // Always show name gate — pre-fill if name already set
      this.renderNameGate(card, order, options, resolve, reject, cleanup);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      cleanup();
    }
  }

  private renderNameGate(
    card: HTMLElement,
    order: OrderData,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    _reject: (err: Error) => void,
    cleanup: () => void,
  ) {
    const F    = "'DM Sans',system-ui,-apple-system,sans-serif";

    // Start countdown timer
    let secondsLeft = Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000));
    this.renderHeader(card, order, secondsLeft);
    const timerInterval = setInterval(() => {
      secondsLeft = Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000));
      this.renderHeader(card, order, secondsLeft);
      if (secondsLeft === 0) clearInterval(timerInterval);
    }, 1000);

    const content = card.querySelector('#sp-content')!;
    content.innerHTML = `
      <div style="text-align:left;">
        <p style="font-size:15px;font-weight:700;color:#111827;margin:0 0 5px;font-family:${F};">Confirm your UPI name</p>
        <p style="font-size:13px;color:#6b7280;margin:0 0 20px;line-height:1.65;font-family:${F};">
          Enter your name <strong style="color:#374151;font-weight:600;">exactly as it appears in your UPI app</strong> — this ensures your payment is matched instantly.
        </p>
        <label style="display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:7px;letter-spacing:0.09em;text-transform:uppercase;font-family:${F};">Your name</label>
        <input id="sp-name-input" class="sp-sdk-input" type="text"
          placeholder="e.g. Rahul Sharma"
          value="${order.expectedSenderName ?? ''}"
          style="
            width:100%;box-sizing:border-box;
            border:1.5px solid #e5e7eb;border-radius:12px;
            padding:12px 14px;font-size:16px;font-weight:500;
            color:#111827;background:white;font-family:${F};
            transition:border-color 0.15s,box-shadow 0.15s;
          "
        />
        <p id="sp-name-error" style="font-size:12px;color:#ef4444;min-height:20px;margin:6px 0 10px;font-family:${F};display:flex;align-items:center;gap:5px;"></p>
        <button id="sp-name-btn" class="sp-sdk-btn" style="
          width:100%;background:#16a34a;color:white;border:none;border-radius:14px;
          padding:13px 0;font-size:15px;font-weight:600;cursor:pointer;
          display:flex;align-items:center;justify-content:center;gap:8px;
          box-shadow:0 2px 10px rgba(22,163,74,0.3);font-family:${F};
        ">Continue →</button>
        <div style="display:flex;justify-content:center;gap:7px;margin-top:20px;">
          <div style="width:30px;height:5px;border-radius:4px;background:#16a34a;"></div>
          <div style="width:30px;height:5px;border-radius:4px;background:#e5e7eb;"></div>
        </div>
      </div>
    `;

    const input   = content.querySelector('#sp-name-input') as HTMLInputElement;
    const errorEl = content.querySelector('#sp-name-error')!;
    const btn     = content.querySelector('#sp-name-btn') as HTMLButtonElement;

    setTimeout(() => input.focus(), 50);

    const submit = async () => {
      const name = input.value.trim();
      if (name.length < 2) {
        errorEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Please enter at least 2 characters.`;
        return;
      }
      btn.innerHTML = `<div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.35);border-top-color:white;border-radius:50%;animation:sp-sdk-spin 0.75s linear infinite;"></div> Saving…`;
      btn.disabled = true;
      errorEl.textContent = '';
      try {
        const res = await fetch(`${this.baseUrl}/v1/pay/${order.id}/expectation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedSenderName: name }),
        });
        if (!res.ok) throw new Error('Failed');
        clearInterval(timerInterval);
        this.renderPayment(card, order, options, resolve, cleanup, secondsLeft);
      } catch {
        errorEl.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Could not save. Please try again.`;
        btn.innerHTML = 'Continue →';
        btn.disabled = false;
      }
    };

    btn.addEventListener('click', () => { void submit(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submit(); });
  }

  private renderPayment(
    card: HTMLElement,
    order: OrderData,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    cleanup: () => void,
    initialSeconds?: number,
  ) {
    const F    = "'DM Sans',system-ui,-apple-system,sans-serif";

    let secondsLeft = initialSeconds ?? Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000));
    let timerFired = false;
    this.renderHeader(card, order, secondsLeft);

    // pollTimer is declared here so the timer callback can clear it on early expiry.
    // eslint-disable-next-line prefer-const
    let pollTimer: ReturnType<typeof setInterval>;

    const timerInterval = setInterval(() => {
      secondsLeft = Math.max(0, Math.round((new Date(order.expiresAt).getTime() - Date.now()) / 1000));
      this.renderHeader(card, order, secondsLeft);
      if (secondsLeft === 0 && !timerFired) {
        timerFired = true;
        clearInterval(timerInterval);
        clearInterval(pollTimer);
        // Show dispute UI immediately; onExpired fires only when server confirms.
        this.renderDisputeEarly(card, order, options, resolve, cleanup);
      }
    }, 1000);

    const content = card.querySelector('#sp-content') as HTMLElement;
    content.style.cssText = 'text-align:center;';
    content.innerHTML = `
      <div style="display:inline-flex;padding:10px;border:1.5px solid #e5e7eb;border-radius:18px;margin-bottom:18px;position:relative;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.06);background:white;">
        ${order.qrCode
          ? `<img src="${order.qrCode}" width="210" height="210" style="display:block;border-radius:10px;" alt="UPI QR Code" />`
          : `<div style="width:210px;height:210px;background:#f9fafb;border-radius:10px;display:flex;align-items:center;justify-content:center;"><div style="width:28px;height:28px;border:3px solid #e5e7eb;border-top-color:#16a34a;border-radius:50%;animation:sp-sdk-spin 0.75s linear infinite;"></div></div>`
        }
        <div style="position:absolute;left:10px;right:10px;height:2px;background:linear-gradient(90deg,transparent 0%,#16a34a 40%,#22c55e 60%,transparent 100%);animation:sp-sdk-scan 2.2s ease-in-out infinite;top:10px;border-radius:1px;box-shadow:0 0 6px rgba(22,163,74,0.6);"></div>
      </div>
      <p style="font-size:12px;color:#9ca3af;margin:0 0 14px;font-family:${F};line-height:1.5;">Scan with PhonePe, GPay, Paytm or any UPI app</p>
      <a id="sp-upi-link" href="${order.upiUri}" class="sp-sdk-upi" style="
        display:flex;align-items:center;justify-content:center;gap:9px;
        background:#16a34a;color:white;padding:13px 20px;border-radius:14px;
        text-decoration:none;font-weight:600;font-size:15px;margin-bottom:16px;
        box-shadow:0 2px 10px rgba(22,163,74,0.3);font-family:${F};
      ">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        Open UPI App
      </a>
      <div style="display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:4px;">
        <div style="display:flex;gap:5px;">
          <div style="width:7px;height:7px;border-radius:50%;background:#16a34a;animation:sp-sdk-bounce 1.4s ease-in-out 0s infinite;"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#16a34a;animation:sp-sdk-bounce 1.4s ease-in-out 0.18s infinite;"></div>
          <div style="width:7px;height:7px;border-radius:50%;background:#16a34a;animation:sp-sdk-bounce 1.4s ease-in-out 0.36s infinite;"></div>
        </div>
        <span style="font-size:13px;color:#6b7280;font-family:${F};">Waiting for payment</span>
      </div>
      <div style="display:flex;justify-content:center;gap:7px;margin-top:20px;">
        <div style="width:30px;height:5px;border-radius:4px;background:#e5e7eb;"></div>
        <div style="width:30px;height:5px;border-radius:4px;background:#16a34a;"></div>
      </div>
    `;

    pollTimer = setInterval(async () => {
      try {
        const updated = await this.fetchPublicOrderStatus(order.id);
        if (TERMINAL_STATUSES.includes(updated.status as (typeof TERMINAL_STATUSES)[number])) {
          clearInterval(pollTimer);
          clearInterval(timerInterval);
          this.renderTerminal(card, { ...order, ...updated }, options, resolve, cleanup);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS);
  }

  private renderDisputeEarly(
    card: HTMLElement,
    order: OrderData,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    cleanup: () => void,
  ) {
    const F    = "'DM Sans',system-ui,-apple-system,sans-serif";
    const MONO = "'DM Mono','SF Mono','Courier New',monospace";

    // Hide the green header — timer is up.
    const header = card.querySelector('#sp-header') as HTMLElement;
    if (header) header.style.display = 'none';

    const body = card.querySelector('#sp-content')!.parentElement!;
    body.style.cssText = 'padding:24px 24px 8px;';

    const content = card.querySelector('#sp-content')!;
    (content as HTMLElement).style.cssText = 'text-align:left;';
    content.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;background:#fef2f2;border:1.5px solid #fecaca;border-radius:16px;padding:14px 16px;margin-bottom:18px;">
        <span style="font-size:26px;line-height:1;flex-shrink:0;">⏰</span>
        <div>
          <p style="font-size:15px;font-weight:700;color:#dc2626;margin:0 0 3px;font-family:${F};">Payment Link Expired</p>
          <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;font-family:${F};">Already paid? Upload your payment screenshot to raise a dispute.</p>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:12px;padding:12px 16px;margin-bottom:18px;border:1px solid #f3f4f6;">
        <span style="font-size:13px;color:#6b7280;font-weight:500;font-family:${F};">Order amount</span>
        <span style="font-size:20px;font-weight:700;color:#111827;font-family:${MONO};">₹${(order.amount / 100).toFixed(2)}</span>
      </div>
      <div id="sp-dispute-zone"></div>
    `;

    // Re-use the same uploader; onExpired will be called by renderTerminal when server confirms.
    this.attachDisputeUploader(card, order.id);

    // Start a final poll so we can still call onExpired / onSuccess when server confirms.
    const finalPoll = setInterval(async () => {
      try {
        const updated = await this.fetchPublicOrderStatus(order.id);
        if (TERMINAL_STATUSES.includes(updated.status as (typeof TERMINAL_STATUSES)[number])) {
          clearInterval(finalPoll);
          this.renderTerminal(card, { ...order, ...updated }, options, resolve, cleanup);
        }
      } catch { /* ignore */ }
    }, POLL_INTERVAL_MS);
  }

  private renderTerminal(
    card: HTMLElement,
    order: OrderData,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    cleanup: () => void,
  ) {
    const F    = "'DM Sans',system-ui,-apple-system,sans-serif";
    const MONO = "'DM Mono','SF Mono','Courier New',monospace";
    const result: PaymentResult = { orderId: order.id, status: order.status, amount: order.amount };

    // Hide green header for terminal states
    const header = card.querySelector('#sp-header') as HTMLElement;
    if (header) header.style.display = 'none';

    const body = card.querySelector('#sp-content')!.parentElement!;
    body.style.cssText = 'padding:32px 24px 8px;';

    const content = card.querySelector('#sp-content')!;

    if (order.status === 'VERIFIED' || order.status === 'RESOLVED') {
      (content as HTMLElement).style.cssText = 'text-align:center;padding-bottom:8px;';
      content.innerHTML = `
        <div style="width:80px;height:80px;margin:0 auto 18px;background:linear-gradient(135deg,#14532d,#16a34a);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 28px rgba(22,163,74,0.45);animation:sp-sdk-success 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards;">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" stroke-dasharray="60" stroke-dashoffset="60" style="animation:sp-sdk-check 0.4s 0.35s ease forwards;"/>
          </svg>
        </div>
        <p style="font-size:20px;font-weight:700;color:#15803d;margin:0 0 6px;font-family:${F};">Payment Verified!</p>
        <p style="font-size:30px;font-weight:700;color:#111827;margin:0;font-family:${MONO};letter-spacing:-0.02em;">₹${(order.amount / 100).toFixed(2)}</p>
        ${order.description ? `<p style="font-size:13px;color:#6b7280;margin:6px 0 0;font-family:${F};">${order.description}</p>` : ''}
      `;

      // Update footer to center-only close
      const footer = card.querySelector('#sp-footer') as HTMLElement;
      if (footer) {
        footer.style.justifyContent = 'center';
        const lockDiv = footer.firstElementChild as HTMLElement;
        if (lockDiv) lockDiv.style.display = 'none';
      }

      // Keep success UI visible briefly before notifying host app, then close.
      setTimeout(() => {
        options.onSuccess?.(result);
        cleanup();
        resolve(result);
      }, 2500);
      return;
    }

    if (order.status === 'EXPIRED' || order.status === 'DISPUTED') {
      if (order.status === 'EXPIRED') options.onExpired?.(order.id);
      const isExpired = order.status === 'EXPIRED';
      (content as HTMLElement).style.cssText = 'text-align:left;';
      content.innerHTML = `
        <div style="display:flex;gap:12px;align-items:flex-start;background:${isExpired ? '#fef2f2' : '#fffbeb'};border:1.5px solid ${isExpired ? '#fecaca' : '#fde68a'};border-radius:16px;padding:14px 16px;margin-bottom:18px;">
          <span style="font-size:26px;line-height:1;flex-shrink:0;">${isExpired ? '⏰' : '🔍'}</span>
          <div>
            <p style="font-size:15px;font-weight:700;color:${isExpired ? '#dc2626' : '#92400e'};margin:0 0 3px;font-family:${F};">${isExpired ? 'Payment Link Expired' : 'Under Review'}</p>
            <p style="font-size:12px;color:#6b7280;margin:0;line-height:1.6;font-family:${F};">${isExpired ? 'Already paid? Upload your payment screenshot to raise a dispute.' : 'Your screenshot was submitted. Upload another if needed.'}</p>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;background:#f9fafb;border-radius:12px;padding:12px 16px;margin-bottom:18px;border:1px solid #f3f4f6;">
          <span style="font-size:13px;color:#6b7280;font-weight:500;font-family:${F};">Order amount</span>
          <span style="font-size:20px;font-weight:700;color:#111827;font-family:${MONO};">₹${(order.amount / 100).toFixed(2)}</span>
        </div>
        <div id="sp-dispute-zone"></div>
      `;
      this.attachDisputeUploader(card, order.id);
      return;
    }

    cleanup();
    resolve(result);
  }

  private attachDisputeUploader(card: HTMLElement, orderId: string) {
    const F = "'DM Sans',system-ui,-apple-system,sans-serif";
    const zone = card.querySelector('#sp-dispute-zone')!;
    zone.innerHTML = `
      <label class="sp-sdk-upload" style="
        display:block;cursor:pointer;margin-bottom:12px;
        border:2px dashed #d1d5db;border-radius:16px;
        padding:28px 16px;text-align:center;background:#fafafa;
        transition:all 0.2s ease;
      ">
        <div id="sp-file-preview" style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <div style="width:48px;height:48px;background:#f3f4f6;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:4px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <p style="font-size:14px;font-weight:600;color:#374151;margin:0;font-family:${F};">Upload payment screenshot</p>
          <p style="font-size:12px;color:#9ca3af;margin:0;font-family:${F};">PNG or JPG · max 5 MB</p>
        </div>
        <input id="sp-file-input" type="file" accept="image/*" style="display:none;" />
      </label>
      <button id="sp-submit-dispute" style="
        display:none;width:100%;padding:13px 0;background:#16a34a;color:white;
        border:none;border-radius:14px;font-size:15px;font-weight:600;cursor:pointer;
        box-shadow:0 2px 10px rgba(22,163,74,0.3);font-family:${F};
        display:none;align-items:center;justify-content:center;gap:8px;
      ">Submit Dispute →</button>
    `;

    const label     = zone.querySelector('label') as HTMLElement;
    const preview   = zone.querySelector('#sp-file-preview') as HTMLElement;
    const fileInput = zone.querySelector('#sp-file-input') as HTMLInputElement;
    const submitBtn = zone.querySelector('#sp-submit-dispute') as HTMLButtonElement;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      label.style.borderColor = '#16a34a';
      label.style.background  = '#f0fdf4';
      label.style.padding     = '14px 16px';
      preview.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;width:100%;">
          <div style="width:40px;height:40px;background:#dcfce7;border-radius:10px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div style="text-align:left;flex:1;min-width:0;">
            <p style="font-size:13px;font-weight:600;color:#111827;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:${F};">${file.name}</p>
            <p style="font-size:11px;color:#16a34a;margin:2px 0 0;font-weight:500;font-family:${F};">${(file.size / 1024).toFixed(0)} KB · Ready to submit</p>
          </div>
          <span style="font-size:12px;color:#6b7280;font-weight:500;flex-shrink:0;font-family:${F};">Change</span>
        </div>
      `;
      submitBtn.style.display = 'flex';
    });

    submitBtn.addEventListener('click', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      submitBtn.innerHTML = `<div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.35);border-top-color:white;border-radius:50%;animation:sp-sdk-spin 0.75s linear infinite;"></div> Uploading…`;
      submitBtn.disabled = true;
      submitBtn.style.background = '#9ca3af';
      submitBtn.style.boxShadow = 'none';
      try {
        const form = new FormData();
        form.append('screenshot', file);
        const res = await fetch(`${this.baseUrl}/v1/pay/${orderId}/screenshot`, { method: 'POST', body: form });
        if (!res.ok) throw new Error('Upload failed');
        zone.innerHTML = `
          <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:16px;padding:20px 16px;text-align:center;">
            <div style="width:44px;height:44px;background:#16a34a;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <p style="font-size:15px;font-weight:700;color:#15803d;margin:0 0 4px;font-family:${F};">Dispute submitted</p>
            <p style="font-size:12px;color:#6b7280;margin:0;font-family:${F};">We'll review and contact you within 24 hours.</p>
          </div>
        `;
      } catch {
        submitBtn.innerHTML = 'Submit Dispute →';
        submitBtn.disabled = false;
        submitBtn.style.background = '#16a34a';
        submitBtn.style.boxShadow = '0 2px 10px rgba(22,163,74,0.3)';
        alert('Upload failed. Please try again.');
      }
    });
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
