import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import {
  LayoutDashboard,
  List,
  AlertTriangle,
  BarChart2,
  Settings,
} from 'lucide-react';
import { SeedhaPeLogo } from '@/components/brand/SeedhaPeLogo';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/transactions', label: 'Transactions', icon: List },
  { href: '/dashboard/disputes', label: 'Disputes', icon: AlertTriangle },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50/60">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-emerald-100/70 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-emerald-100/70">
          <Link href="/dashboard" className="flex items-center gap-2">
            <SeedhaPeLogo />
          </Link>
        </div>
        <nav className="flex-1 p-4 space-y-1.5">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
            >
              <item.icon className="h-4 w-4 text-slate-400 group-hover:text-emerald-700" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-emerald-100/70">
          <UserButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
