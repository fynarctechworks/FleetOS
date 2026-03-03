'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  Truck,
  Users,
  Building2,
  BookUser,
  FileText,
  Route,
  Fuel,
  Shield,
  Wrench,
  MapPin,
  DollarSign,
  Package,
  BarChart3,
  ScrollText,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/lib/i18n';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/vehicles', label: 'Vehicles', icon: Truck },
  { href: '/dashboard/drivers', label: 'Drivers', icon: Users },
  { href: '/dashboard/branches', label: 'Branches', icon: Building2 },
  { href: '/dashboard/address-book', label: 'Address Book', icon: BookUser },
  { href: '/dashboard/lr', label: 'LR / Bilty', icon: FileText },
  { href: '/dashboard/trips', label: 'Trips', icon: Route },
  { href: '/dashboard/diesel', label: 'Diesel', icon: Fuel },
  { href: '/dashboard/compliance', label: 'Compliance', icon: Shield },
  { href: '/dashboard/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/dashboard/map', label: 'Fleet Map', icon: MapPin },
  { href: '/dashboard/vendors', label: 'Vendors', icon: Package },
  { href: '/dashboard/salary', label: 'Salary', icon: DollarSign },
  { href: '/dashboard/reports', label: 'Reports', icon: BarChart3 },
  { href: '/dashboard/eway-bill', label: 'E-Way Bills', icon: ScrollText },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const { i18n } = useTranslation();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen bg-bg-light">
      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-30 flex h-screen flex-col bg-primary text-white transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          {!collapsed && (
            <span className="text-lg font-bold tracking-wide">FleetOS</span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="rounded p-1 hover:bg-white/10"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 font-medium text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Language + User */}
        <div className="border-t border-white/10 p-4">
          {!collapsed && (
            <select
              value={i18n.language}
              onChange={(e) => changeLanguage(e.target.value)}
              className="mb-2 w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs text-white/80 outline-none"
            >
              <option value="en" className="text-text-dark">English</option>
              <option value="hi" className="text-text-dark">हिन्दी</option>
              <option value="te" className="text-text-dark">తెలుగు</option>
            </select>
          )}
          {!collapsed && (
            <div className="mb-2 truncate text-xs text-white/60">
              {appUser?.name} &middot; {appUser?.role}
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
