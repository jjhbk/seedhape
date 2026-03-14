'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Menu, X, ArrowRight, LayoutDashboard } from 'lucide-react';
import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';

const links = [
  { href: '/docs', label: 'Docs' },
  { href: '/pricing', label: 'Pricing' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { isSignedIn } = useUser();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => setOpen(false), [pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm shadow-black/5 border-b border-gray-100'
            : 'bg-white/80 backdrop-blur-sm'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          {/* Logo */}
          <Link href="/" className="shrink-0 mr-auto md:mr-0">
            <SeedhaPeLogo />
          </Link>

          {/* Desktop center nav */}
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname.startsWith(l.href)
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-2 ml-auto">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-brand-700 border border-gray-200 hover:border-brand-300 bg-white hover:bg-brand-50 px-4 py-2 rounded-lg transition-all"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm shadow-brand-200"
                >
                  Get started <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 md:hidden transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Mobile drawer */}
      <div
        className={`fixed top-16 inset-x-0 z-40 md:hidden bg-white border-b border-gray-100 shadow-xl transition-all duration-200 ${
          open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <nav className="px-4 pt-3 pb-6 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center px-4 py-3.5 rounded-xl text-base font-medium transition-colors ${
                pathname.startsWith(l.href)
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {l.label}
            </Link>
          ))}

          <div className="pt-4 mt-2 border-t border-gray-100 space-y-2">
            {isSignedIn ? (
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="flex items-center justify-center w-full px-4 py-3.5 rounded-xl text-base font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3.5 rounded-xl text-base font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  Get started free <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
