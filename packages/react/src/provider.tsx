import React, { createContext, useContext } from 'react';
import type { CreateOrderOptions, OrderData } from '@seedhape/sdk';

interface SeedhaPeContextValue {
  onCreateOrder: (opts: CreateOrderOptions) => Promise<OrderData>;
}

const SeedhaPeContext = createContext<SeedhaPeContextValue | null>(null);

export function SeedhaPeProvider({
  onCreateOrder,
  children,
}: {
  /**
   * Called when a payment button is clicked.
   * Implement this on your server — call the SeedhaPe API with your secret API key
   * and return the resulting OrderData. Never put your API key in client-side code.
   *
   * @example Next.js server action
   * async function createOrder(opts) {
   *   'use server';
   *   const client = new SeedhaPe({ apiKey: process.env.SEEDHAPE_API_KEY! });
   *   return client.createOrder(opts);
   * }
   */
  onCreateOrder: (opts: CreateOrderOptions) => Promise<OrderData>;
  children: React.ReactNode;
}) {
  return (
    <SeedhaPeContext.Provider value={{ onCreateOrder }}>
      {children}
    </SeedhaPeContext.Provider>
  );
}

export function useSeedhaPeContext(): SeedhaPeContextValue {
  const ctx = useContext(SeedhaPeContext);
  if (!ctx) throw new Error('useSeedhaPe must be used inside <SeedhaPeProvider>');
  return ctx;
}
