export interface SeedhaPeConfig {
  /**
   * Your SeedhaPe API key. Required for server-side methods (createOrder, getOrderStatus).
   * Not needed — and should NOT be included — when only using showPayment in the browser.
   */
  apiKey?: string;
  baseUrl?: string;
}

export interface CreateOrderOptions {
  amount: number; // paise
  externalOrderId?: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  /**
   * The payer's name exactly as it appears in their UPI app.
   * Strongly recommended — used by the matching engine to verify payments
   * when the transaction note doesn't contain the order ID.
   * Maps to `metadata.expectedSenderName` on the order.
   */
  expectedSenderName?: string;
  expiresInMinutes?: number;
  metadata?: Record<string, unknown>;
}

export interface OrderData {
  id: string;
  amount: number;
  originalAmount: number;
  currency: string;
  description: string | null;
  status: OrderStatus;
  upiUri: string;
  qrCode: string;
  expiresAt: string;
  createdAt: string;
  expectedSenderName: string | null;
}

export type OrderStatus =
  | 'CREATED'
  | 'PENDING'
  | 'VERIFIED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'EXPIRED'
  | 'REJECTED';

export interface PaymentResult {
  orderId: string;
  status: OrderStatus;
  amount: number;
  verifiedAt?: string;
}

export interface ShowPaymentOptions {
  orderId: string;
  onSuccess?: (result: PaymentResult) => void;
  onExpired?: (orderId: string) => void;
  onClose?: () => void;
  containerEl?: HTMLElement;
  theme?: {
    primaryColor?: string;
    borderRadius?: string;
  };
}
