export interface SeedhaPeConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface CreateOrderOptions {
  amount: number; // paise
  externalOrderId?: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
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
