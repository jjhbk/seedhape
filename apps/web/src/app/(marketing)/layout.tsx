import Link from 'next/link';
import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';
import { MarketingNav } from '@/components/marketing/MarketingNav';

function Footer() {
  const col1 = [
    { href: '/docs', label: 'Documentation' },
    { href: '/pricing', label: 'Pricing' },
    { href: '/contact', label: 'Contact us' },
  ];
  const col2 = [
    { href: '/sign-in', label: 'Sign in' },
    { href: '/sign-up', label: 'Create account' },
    { href: '/dashboard', label: 'Dashboard' },
  ];
  const col3 = [
    { href: '/privacy', label: 'Privacy Policy' },
  ];

  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* Brand */}
          <div className="max-w-xs">
            <Link href="/">
              <SeedhaPeLogo />
            </Link>
            <p className="text-sm text-gray-400 mt-3 leading-relaxed">
              Zero-fee UPI payment verification middleware for Indian merchants. Accept payments
              directly — no gateway cut, ever.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-12 text-sm">
            <div>
              <p className="font-semibold text-gray-900 mb-3">Product</p>
              <ul className="space-y-2.5">
                {col1.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-3">Account</p>
              <ul className="space-y-2.5">
                {col2.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-3">Legal</p>
              <ul className="space-y-2.5">
                {col3.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-gray-500 hover:text-gray-900 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© 2026 SeedhaPe. Built for Indian digital merchants.</p>
          <p>UPI · No transaction fees · Direct bank transfers</p>
        </div>
      </div>
    </footer>
  );
}

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
