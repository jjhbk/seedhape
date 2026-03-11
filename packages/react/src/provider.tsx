import React, { createContext, useContext, useMemo } from 'react';
import { SeedhaPe } from '@seedhape/sdk';

interface SeedhaPeContextValue {
  client: SeedhaPe;
}

const SeedhaPeContext = createContext<SeedhaPeContextValue | null>(null);

export function SeedhaPeProvider({
  apiKey,
  baseUrl,
  children,
}: {
  apiKey: string;
  baseUrl?: string;
  children: React.ReactNode;
}) {
  const client = useMemo(() => {
    const config: import('@seedhape/sdk').SeedhaPeConfig = { apiKey };
    if (baseUrl) config.baseUrl = baseUrl;
    return new SeedhaPe(config);
  }, [apiKey, baseUrl]);

  return (
    <SeedhaPeContext.Provider value={{ client }}>
      {children}
    </SeedhaPeContext.Provider>
  );
}

export function useSeedhaPe(): SeedhaPe {
  const ctx = useContext(SeedhaPeContext);
  if (!ctx) throw new Error('useSeedhaPe must be used inside <SeedhaPeProvider>');
  return ctx.client;
}
