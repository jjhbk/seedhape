import { useState } from 'react';
import type { PaymentButtonProps } from './types.js';
import { PaymentModal } from './PaymentModal.js';
import { useSeedhaPeContext } from './provider.js';

export function PaymentButton({
  amount,
  description,
  customerEmail,
  customerPhone,
  expectedSenderName,
  metadata,
  onSuccess,
  onExpired,
  className = '',
  children = 'Pay Now',
}: PaymentButtonProps) {
  const { onCreateOrder } = useSeedhaPeContext();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const opts: import('@seedhape/sdk').CreateOrderOptions = { amount };
      if (description) opts.description = description;
      if (customerEmail) opts.customerEmail = customerEmail;
      if (customerPhone) opts.customerPhone = customerPhone;
      if (expectedSenderName) opts.expectedSenderName = expectedSenderName;
      if (metadata) opts.metadata = metadata;
      const order = await onCreateOrder(opts);
      setOrderId(order.id);
    } catch (err) {
      console.error('[SeedhaPe] Failed to create order:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className={className || 'sp-pay-btn'}
        style={
          !className
            ? {
                background: '#16a34a',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: 600,
                fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }
            : undefined
        }
      >
        {loading ? 'Loading...' : children}
      </button>

      {orderId && (
        <PaymentModal
          orderId={orderId}
          open={true}
          onClose={() => setOrderId(null)}
          onSuccess={(result) => {
            onSuccess?.(result);
          }}
          onExpired={(id) => {
            // Do NOT close the modal here — the dispute upload screen is now visible.
            // The modal stays open until the user explicitly closes it via onClose.
            onExpired?.(id);
          }}
        />
      )}
    </>
  );
}
