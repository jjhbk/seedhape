import React, { createContext, useContext } from 'react';
import type { CreateOrderOptions, OrderData } from '@seedhape/sdk';

const DEFAULT_BASE_URL = 'https://seedhape.onrender.com';

interface SeedhaPeContextValue {
  onCreateOrder: (opts: CreateOrderOptions) => Promise<OrderData>;
  baseUrl: string;
}

const SeedhaPeContext = createContext<SeedhaPeContextValue | null>(null);

export function SeedhaPeProvider({
  onCreateOrder,
  baseUrl = DEFAULT_BASE_URL,
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
  /** Override the SeedhaPe API base URL. Defaults to https://seedhape.onrender.com */
  baseUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <SeedhaPeContext.Provider value={{ onCreateOrder, baseUrl }}>
      {children}
    </SeedhaPeContext.Provider>
  );
}

export function useSeedhaPeContext(): SeedhaPeContextValue {
  const ctx = useContext(SeedhaPeContext);
  if (!ctx) throw new Error('useSeedhaPe must be used inside <SeedhaPeProvider>');
  return ctx;
}
