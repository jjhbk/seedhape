import type {
  SeedhaPeConfig,
  CreateOrderOptions,
  OrderData,
  PaymentResult,
  ShowPaymentOptions,
} from './types.js';

const DEFAULT_BASE_URL = 'https://api.seedhape.com';
const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = ['VERIFIED', 'EXPIRED', 'REJECTED', 'RESOLVED'] as const;

export class SeedhaPe {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: SeedhaPeConfig) {
    if (!config.apiKey) throw new Error('SeedhaPe: apiKey is required');
    this.apiKey = config.apiKey;
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

  private renderModal(
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    reject: (err: Error) => void,
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,0,0,0.5);
      display: flex; align-items: center; justify-content: center;
      z-index: 99999; font-family: system-ui, sans-serif;
    `;

    const card = document.createElement('div');
    card.style.cssText = `
      background: white; border-radius: 16px; padding: 28px;
      width: 360px; max-width: calc(100vw - 32px); text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    `;

    card.innerHTML = `
      <div id="sp-content">
        <p style="font-size: 15px; color: #9ca3af;">Loading payment...</p>
      </div>
      <button id="sp-close" style="
        margin-top: 14px; background: none; border: none; color: #9ca3af;
        font-size: 13px; cursor: pointer;
      ">Close</button>
    `;

    overlay.appendChild(card);

    const cleanup = () => overlay.remove();

    card.querySelector('#sp-close')!.addEventListener('click', () => {
      cleanup();
      options.onClose?.();
      reject(new Error('Payment closed by user'));
    });

    this.loadOrder(options.orderId, card, options, resolve, reject, cleanup);

    return overlay;
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

      // If merchant already supplied expectedSenderName at order creation, skip name gate
      if (order.expectedSenderName) {
        this.renderPayment(card, order, options, resolve, cleanup);
      } else {
        this.renderNameGate(card, order, options, resolve, cleanup);
      }
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
    cleanup: () => void,
  ) {
    const content = card.querySelector('#sp-content')!;
    content.innerHTML = `
      <div style="background:#f0fdf4;border-radius:12px;padding:12px 16px;margin-bottom:18px;text-align:left;">
        <p style="font-size:11px;color:#15803d;margin:0 0 2px;">Amount</p>
        <p style="font-size:26px;font-weight:700;color:#14532d;margin:0;">₹${(order.amount / 100).toFixed(2)}</p>
      </div>
      <p style="font-size:15px;font-weight:700;color:#111;text-align:left;margin-bottom:6px;">Enter your name</p>
      <p style="font-size:12px;color:#6b7280;text-align:left;line-height:1.6;margin-bottom:12px;">
        Enter your name exactly as shown in your UPI app. This helps us instantly match your payment.
      </p>
      <input id="sp-name-input" type="text" placeholder="e.g. Rahul Sharma" style="
        width:100%;box-sizing:border-box;border:1.5px solid #d1d5db;border-radius:10px;
        padding:10px 12px;font-size:14px;outline:none;margin-bottom:6px;
      " />
      <p id="sp-name-error" style="font-size:12px;color:#ef4444;text-align:left;min-height:18px;margin-bottom:8px;"></p>
      <button id="sp-name-btn" style="
        width:100%;background:#16a34a;color:white;border:none;border-radius:12px;
        padding:12px;font-size:15px;font-weight:600;cursor:pointer;
      ">Continue →</button>
      <div style="display:flex;justify-content:center;gap:6px;margin-top:14px;">
        <div style="width:24px;height:6px;border-radius:3px;background:#16a34a;"></div>
        <div style="width:24px;height:6px;border-radius:3px;background:#e5e7eb;"></div>
      </div>
    `;

    const input = card.querySelector('#sp-name-input') as HTMLInputElement;
    const errorEl = card.querySelector('#sp-name-error')!;
    const btn = card.querySelector('#sp-name-btn') as HTMLButtonElement;

    input.focus();

    const submit = async () => {
      const name = input.value.trim();
      if (name.length < 2) { errorEl.textContent = 'Enter at least 2 characters.'; return; }
      btn.textContent = 'Saving…';
      btn.disabled = true;
      errorEl.textContent = '';
      try {
        const res = await fetch(`${this.baseUrl}/v1/pay/${order.id}/expectation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedSenderName: name }),
        });
        if (!res.ok) throw new Error('Failed');
        this.renderPayment(card, order, options, resolve, cleanup);
      } catch {
        errorEl.textContent = 'Could not save name. Please try again.';
        btn.textContent = 'Continue →';
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
  ) {
    const content = card.querySelector('#sp-content')!;
    content.innerHTML = `
      <div style="background:#f0fdf4;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
        <p style="font-size:11px;color:#15803d;margin:0 0 2px;">Amount</p>
        <p style="font-size:26px;font-weight:700;color:#14532d;margin:0;">₹${(order.amount / 100).toFixed(2)}</p>
      </div>
      ${order.description ? `<p style="font-size:14px;color:#4b5563;margin-bottom:12px;">${order.description}</p>` : ''}
      <div id="sp-qr" style="display:flex;justify-content:center;margin-bottom:14px;">
        ${order.qrCode ? `<img src="${order.qrCode}" width="200" height="200" style="border-radius:8px;" />` : ''}
      </div>
      <a href="${order.upiUri}" style="
        display:flex;align-items:center;justify-content:center;gap:8px;
        background:#16a34a;color:white;padding:12px;border-radius:12px;
        text-decoration:none;font-weight:600;font-size:15px;margin-bottom:8px;
      ">Open UPI App</a>
      <p style="font-size:12px;color:#9ca3af;">⏳ Waiting for payment…</p>
      <div style="display:flex;justify-content:center;gap:6px;margin-top:14px;">
        <div style="width:24px;height:6px;border-radius:3px;background:#e5e7eb;"></div>
        <div style="width:24px;height:6px;border-radius:3px;background:#16a34a;"></div>
      </div>
    `;

    // Start polling
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`${this.baseUrl}/v1/pay/${order.id}`);
        if (!res.ok) return;
        const updated = await res.json() as OrderData;
        if (TERMINAL_STATUSES.includes(updated.status as (typeof TERMINAL_STATUSES)[number])) {
          clearInterval(pollTimer);
          this.renderTerminal(card, updated, options, resolve, cleanup);
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
    const result: PaymentResult = { orderId: order.id, status: order.status, amount: order.amount };
    const content = card.querySelector('#sp-content')!;

    if (order.status === 'VERIFIED' || order.status === 'RESOLVED') {
      content.innerHTML = `
        <div style="font-size:48px;margin-bottom:8px;">✅</div>
        <p style="font-size:18px;font-weight:600;color:#16a34a;margin:0 0 4px;">Payment Verified!</p>
        <p style="font-size:26px;font-weight:700;color:#111;margin:0;">₹${(order.amount / 100).toFixed(2)}</p>
      `;
      options.onSuccess?.(result);
      setTimeout(() => { cleanup(); resolve(result); }, 2000);
      return;
    }

    if (order.status === 'EXPIRED' || order.status === 'DISPUTED') {
      if (order.status === 'EXPIRED') options.onExpired?.(order.id);
      const isExpired = order.status === 'EXPIRED';
      content.innerHTML = `
        <div style="font-size:40px;margin-bottom:8px;">${isExpired ? '⏰' : '🔎'}</div>
        <p style="font-size:17px;font-weight:600;color:${isExpired ? '#dc2626' : '#d97706'};margin:0 0 4px;">
          ${isExpired ? 'Link Expired' : 'Under Review'}
        </p>
        <p style="font-size:13px;color:#6b7280;margin-bottom:16px;">
          ${isExpired ? 'Did you complete this payment? Upload a screenshot to raise a dispute.' : 'Your screenshot was submitted. Upload another if needed.'}
        </p>
        <div id="sp-dispute-zone"></div>
      `;
      this.attachDisputeUploader(card, order.id);
      return;
    }

    cleanup();
    resolve(result);
  }

  private attachDisputeUploader(card: HTMLElement, orderId: string) {
    const zone = card.querySelector('#sp-dispute-zone')!;
    zone.innerHTML = `
      <label style="display:block;cursor:pointer;margin-bottom:8px;">
        <div id="sp-file-label" style="
          border:2px dashed #d1d5db;border-radius:10px;padding:12px;
          font-size:13px;color:#6b7280;text-align:center;
        ">📎 Upload payment screenshot</div>
        <input id="sp-file-input" type="file" accept="image/*" style="display:none;" />
      </label>
      <button id="sp-submit-dispute" style="
        display:none;width:100%;padding:10px;background:#16a34a;color:white;
        border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;
      ">Submit Dispute</button>
    `;

    const fileInput = zone.querySelector('#sp-file-input') as HTMLInputElement;
    const fileLabel = zone.querySelector('#sp-file-label')!;
    const submitBtn = zone.querySelector('#sp-submit-dispute') as HTMLButtonElement;

    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) {
        fileLabel.textContent = `📎 ${file.name}`;
        (submitBtn as HTMLElement).style.display = 'block';
      }
    });

    submitBtn.addEventListener('click', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      submitBtn.textContent = 'Uploading…';
      submitBtn.disabled = true;
      try {
        const form = new FormData();
        form.append('screenshot', file);
        const res = await fetch(`${this.baseUrl}/v1/pay/${orderId}/screenshot`, { method: 'POST', body: form });
        if (!res.ok) throw new Error('Upload failed');
        zone.innerHTML = `<p style="color:#16a34a;font-size:14px;font-weight:600;">✓ Dispute submitted for review</p>`;
      } catch {
        submitBtn.textContent = 'Submit Dispute';
        submitBtn.disabled = false;
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
