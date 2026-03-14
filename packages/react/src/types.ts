import type { PaymentResult } from '@seedhape/sdk';

export interface PaymentButtonProps {
  amount: number; // paise
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  /**
   * The payer's name exactly as it appears in their UPI app.
   * Strongly recommended — improves payment matching accuracy.
   * When omitted the modal will prompt the user to enter it before showing the QR code.
   */
  expectedSenderName?: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (result: PaymentResult) => void;
  onExpired?: (orderId: string) => void;
  className?: string;
  children?: React.ReactNode;
}

export interface PaymentModalProps {
  orderId: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: (result: PaymentResult) => void;
  onExpired?: (orderId: string) => void;
}
