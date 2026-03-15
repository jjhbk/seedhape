import { useState, useCallback } from 'react';
import type { CreateOrderOptions, OrderData, PaymentResult } from '@seedhape/sdk';

import { useSeedhaPeContext } from './provider.js';

type PaymentState =
  | { phase: 'idle' }
  | { phase: 'creating' }
  | { phase: 'pending'; order: OrderData }
  | { phase: 'verified'; result: PaymentResult }
  | { phase: 'expired'; orderId: string }
  | { phase: 'error'; error: string };

export function usePayment() {
  const { onCreateOrder } = useSeedhaPeContext();
  const [state, setState] = useState<PaymentState>({ phase: 'idle' });

  const createPayment = useCallback(
    async (options: CreateOrderOptions) => {
      setState({ phase: 'creating' });
      try {
        const order = await onCreateOrder(options);
        setState({ phase: 'pending', order });
        return order;
      } catch (err) {
        setState({ phase: 'error', error: String(err) });
        throw err;
      }
    },
    [onCreateOrder],
  );

  const onSuccess = useCallback((result: PaymentResult) => {
    setState({ phase: 'verified', result });
  }, []);

  const onExpired = useCallback((orderId: string) => {
    setState({ phase: 'expired', orderId });
  }, []);

  const reset = useCallback(() => setState({ phase: 'idle' }), []);

  return { state, createPayment, onSuccess, onExpired, reset };
}
