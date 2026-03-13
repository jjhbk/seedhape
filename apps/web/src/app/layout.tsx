import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ClerkProvider } from '@clerk/nextjs';

import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SeedhaPe — UPI Payment Middleware',
  description:
    'Accept UPI payments directly with zero gateway fees. Automated payment verification via Android app.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className={inter.variable}>
        <body className="font-sans antialiased" suppressHydrationWarning>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
