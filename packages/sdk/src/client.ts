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
   */
  async createOrder(options: CreateOrderOptions): Promise<OrderData> {
    const res = await fetch(`${this.baseUrl}/v1/orders`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(options),
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
      background: white; border-radius: 16px; padding: 32px;
      width: 360px; max-width: calc(100vw - 32px); text-align: center;
      box-shadow: 0 25px 50px rgba(0,0,0,0.25);
    `;

    card.innerHTML = `
      <div id="sp-status" style="margin-bottom: 16px;">
        <p style="font-size: 18px; font-weight: 600; color: #111;">Loading payment...</p>
      </div>
      <div id="sp-qr" style="display: flex; justify-content: center; margin-bottom: 16px;"></div>
      <div id="sp-actions"></div>
      <button id="sp-close" style="
        margin-top: 16px; background: none; border: none; color: #999;
        font-size: 13px; cursor: pointer;
      ">Close</button>
    `;

    overlay.appendChild(card);

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const cleanup = () => {
      if (pollTimer) clearInterval(pollTimer);
      overlay.remove();
    };

    card.querySelector('#sp-close')!.addEventListener('click', () => {
      cleanup();
      options.onClose?.();
      reject(new Error('Payment closed by user'));
    });

    // Load order and start polling
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
      // Fetch order data (public endpoint)
      const res = await fetch(`${this.baseUrl}/v1/pay/${orderId}`);
      if (!res.ok) throw new Error('Order not found');
      const order = await res.json() as OrderData;

      this.updateModal(card, order);

      if (TERMINAL_STATUSES.includes(order.status as (typeof TERMINAL_STATUSES)[number])) {
        this.handleTerminal(order.status, order, options, resolve, cleanup);
        return;
      }

      // Start polling
      const pollTimer = setInterval(async () => {
        try {
          const statusRes = await fetch(`${this.baseUrl}/v1/pay/${orderId}`);
          if (!statusRes.ok) return;
          const updated = await statusRes.json() as OrderData;

          this.updateModal(card, updated);

          if (TERMINAL_STATUSES.includes(updated.status as (typeof TERMINAL_STATUSES)[number])) {
            clearInterval(pollTimer);
            this.handleTerminal(updated.status, updated, options, resolve, cleanup);
          }
        } catch {
          // ignore
        }
      }, POLL_INTERVAL_MS);
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      cleanup();
    }
  }

  private updateModal(card: HTMLElement, order: OrderData) {
    const statusEl = card.querySelector('#sp-status')!;
    const qrEl = card.querySelector('#sp-qr')!;
    const actionsEl = card.querySelector('#sp-actions')!;

    if (order.status === 'VERIFIED' || order.status === 'RESOLVED') {
      statusEl.innerHTML = `
        <div style="font-size: 48px;">✅</div>
        <p style="font-size: 18px; font-weight: 600; color: #16a34a; margin-top: 8px;">Payment Verified!</p>
        <p style="font-size: 28px; font-weight: 700; color: #111; margin-top: 4px;">
          ₹${(order.amount / 100).toFixed(2)}
        </p>
      `;
      qrEl.innerHTML = '';
      actionsEl.innerHTML = '';
    } else if (order.status === 'EXPIRED') {
      statusEl.innerHTML = `
        <p style="font-size: 18px; font-weight: 600; color: #dc2626;">Payment Expired</p>
      `;
      qrEl.innerHTML = '';
    } else {
      statusEl.innerHTML = `
        <p style="font-size: 18px; font-weight: 600; color: #111;">${order.description ?? 'Complete Payment'}</p>
        <p style="font-size: 28px; font-weight: 700; color: #111; margin: 8px 0;">
          ₹${(order.amount / 100).toFixed(2)}
        </p>
      `;

      if (order.qrCode) {
        qrEl.innerHTML = `<img src="${order.qrCode}" width="200" height="200" style="border-radius: 8px;" />`;
      }

      actionsEl.innerHTML = `
        <a href="${order.upiUri}" style="
          display: inline-block; background: #16a34a; color: white;
          padding: 12px 24px; border-radius: 10px; text-decoration: none;
          font-weight: 600; font-size: 15px; margin-bottom: 8px;
        ">Open UPI App</a>
        <p style="font-size: 12px; color: #999; margin-top: 8px;">
          ⏳ Waiting for payment...
        </p>
      `;
    }
  }

  private handleTerminal(
    status: string,
    order: OrderData,
    options: ShowPaymentOptions,
    resolve: (result: PaymentResult) => void,
    cleanup: () => void,
  ) {
    const result: PaymentResult = {
      orderId: order.id,
      status: order.status,
      amount: order.amount,
    };

    if (status === 'VERIFIED' || status === 'RESOLVED') {
      options.onSuccess?.(result);
      setTimeout(() => {
        cleanup();
        resolve(result);
      }, 2000);
    } else if (status === 'EXPIRED') {
      options.onExpired?.(order.id);
      cleanup();
      resolve(result);
    } else {
      cleanup();
      resolve(result);
    }
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }
}
