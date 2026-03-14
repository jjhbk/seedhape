'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import {
  LayoutDashboard,
  List,
  AlertTriangle,
  BarChart2,
  Settings,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/transactions', label: 'Transactions', icon: List, exact: false },
  { href: '/dashboard/disputes', label: 'Disputes', icon: AlertTriangle, exact: false },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2, exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings, exact: false },
];

function NavItem({
  item,
  onClick,
}: {
  item: (typeof nav)[number];
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      {...(onClick ? { onClick } : {})}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-brand-50 text-brand-700 shadow-sm shadow-brand-100'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      <item.icon
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600'
        }`}
      />
      {item.label}
    </Link>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setSidebarOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50/60">
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard">
          <SeedhaPeLogo />
        </Link>
        <div className="p-1">
          <UserButton />
        </div>
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/30 lg:hidden transition-opacity duration-200 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-100/80 flex flex-col
          transition-transform duration-200 ease-out shadow-xl shadow-black/5
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:shadow-none
        `}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
          <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
            <SeedhaPeLogo />
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map((item) => (
            <NavItem key={item.href} item={item} onClick={() => setSidebarOpen(false)} />
          ))}

        </nav>

        {/* Upgrade prompt + user */}
        <div className="p-3 border-t border-gray-100 shrink-0 space-y-2">
          <Link
            href="/pricing"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Upgrade your plan
          </Link>
          <div className="flex items-center gap-3 px-3 py-2.5">
            <UserButton />
            <Link
              href="/"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors truncate"
            >
              ← Back to site
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
