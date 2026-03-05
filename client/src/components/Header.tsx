'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { hasFeatureAccess, type FeaturePermission } from '@/lib/accessControl';

type NavItem = {
  key:
    | 'dashboard'
    | 'pos'
    | 'orders'
    | 'inventory'
    | 'kds'
    | 'expense'
    | 'promotions'
    | 'reservations'
    | 'staff'
    | 'reports'
    | 'ai_assistant'
    | 'activity_logs'
    | 'platform';
  href: string;
  permission?: FeaturePermission;
  roles?: string[];
};

const navItems: NavItem[] = [
  { key: 'dashboard', href: '/dashboard', permission: 'dashboard' },
  { key: 'pos', href: '/pos', permission: 'pos' },
  { key: 'orders', href: '/orders', permission: 'orders' },
  { key: 'inventory', href: '/inventory', permission: 'inventory' },
  { key: 'kds', href: '/kds', permission: 'kds' },
  { key: 'expense', href: '/expense', permission: 'expense' },
  { key: 'promotions', href: '/promotions', permission: 'promotions' },
  { key: 'reservations', href: '/reservations', permission: 'reservations' },
  { key: 'staff', href: '/staff', permission: 'staff' },
  { key: 'reports', href: '/reports', permission: 'reports' },
  { key: 'ai_assistant', href: '/ai-assistant', permission: 'ai_assistant' },
  { key: 'activity_logs', href: '/activity-logs', permission: 'activity_logs' },
  { key: 'platform', href: '/admin-control', permission: 'platform' },
];

function canSeeItem(userRole: string | undefined, extraPermissions: string[] | undefined, item: NavItem): boolean {
  if (!item.permission) return true;
  return hasFeatureAccess(item.permission, userRole, extraPermissions || []);
}

function getInitials(firstName?: string, lastName?: string): string {
  const f = (firstName || '').trim()[0] || '';
  const l = (lastName || '').trim()[0] || '';
  return `${f}${l}`.toUpperCase() || 'U';
}

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout, subscription } = useAuth();
  const { language, setLanguage } = useLanguage();

  const text = {
    en: {
      home: 'User Guide',
      signIn: 'Sign in',
      logout: 'Logout',
      dashboard: 'Dashboard',
      pos: 'POS',
      orders: 'Orders',
      inventory: 'Inventory',
      kds: 'KDS',
      expense: 'Expense',
      promotions: 'Promotions',
      reservations: 'Reservations',
      staff: 'Staff',
      reports: 'Reports',
      ai_assistant: 'AI Assistant',
      activity_logs: 'Activity Logs',
      platform: 'Platform',
    },
    my: {
      home: 'အသုံးပြုလမ်းညွှန်',
      signIn: 'အကောင့်ဝင်မည်',
      logout: 'ထွက်မည်',
      dashboard: 'ဒက်ရှ်ဘုတ်',
      pos: 'POS',
      orders: 'အော်ဒါများ',
      inventory: 'စတော့',
      kds: 'မီးဖိုချောင်',
      expense: 'အသုံးစရိတ်',
      promotions: 'ပရိုမိုးရှင်း',
      reservations: 'ဘိုကင်',
      staff: 'ဝန်ထမ်း',
      reports: 'အစီရင်ခံစာ',
      ai_assistant: 'AI Assistant',
      activity_logs: 'လှုပ်ရှားမှုမှတ်တမ်း',
      platform: 'ပလက်ဖောင်း',
    },
  }[language];

  const filteredNavItems = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { label: text.home, href: '/' },
        { label: text.signIn, href: '/login' },
      ];
    }
    if (subscription.mode === 'subscription' && subscription.blocked && String(user?.role || '').toLowerCase() !== 'admin') {
      return [];
    }
    return navItems
      .filter((item) => canSeeItem(user?.role, user?.extraPermissions, item))
      .map((item) => ({ label: text[item.key], href: item.href }));
  }, [isAuthenticated, subscription.blocked, subscription.mode, text, user?.role, user?.extraPermissions]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 shrink-0 grid-rows-[auto_minmax(0,1fr)_auto] border-r border-slate-300/60 bg-white/90 p-4 lg:grid">
        <Link href="/" className="mb-6 flex items-center gap-3 text-slate-900">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-teal-300 bg-teal-50 text-sm font-bold tracking-wide text-teal-800">
            OX
          </span>
          <span className="font-[var(--font-display)] text-lg font-semibold tracking-tight">Rangoon F&B</span>
        </Link>

        <nav className="mt-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map(({ label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-[#0ea5a226] text-slate-900' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 space-y-2 border-t border-slate-200 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${language === 'en' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('my')}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${language === 'my' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'}`}
            >
              မြန်မာ
            </button>
          </div>
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-teal-300 bg-teal-50 text-xs font-semibold text-teal-800">
                  {getInitials(user?.firstName, user?.lastName)}
                </span>
                <span>{user?.role?.toUpperCase() || 'USER'}</span>
              </div>
              <button
                onClick={logout}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                {text.logout}
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
            >
              {text.signIn}
            </Link>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-50 border-b border-slate-300/60 bg-white/78 backdrop-blur-xl lg:hidden">
        <div className="cm-shell">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3 text-slate-900">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-teal-300 bg-teal-50 text-sm font-bold tracking-wide text-teal-800">
                OX
              </span>
              <span className="font-[var(--font-display)] text-base font-semibold tracking-tight">Rangoon F&B</span>
            </Link>

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center rounded-md border border-slate-300 p-2 text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label={language === 'en' ? 'Open menu' : 'မီနူးဖွင့်မည်'}
            >
              {!isMenuOpen ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-slate-300/80 bg-white/95">
            <div className="cm-shell space-y-1 py-3">
              <div className="mb-2 flex gap-2 border-b border-slate-200 pb-3">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${language === 'en' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'}`}
                >
                  EN
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('my')}
                  className={`rounded-md border px-2 py-1 text-xs font-semibold ${language === 'my' ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-300 text-slate-600'}`}
                >
                  မြန်မာ
                </button>
              </div>
              {filteredNavItems.map(({ label, href }) => {
                const isActive = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-[#0ea5a226] text-slate-900' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {label}
                  </Link>
                );
              })}
              {isAuthenticated && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                >
                  {text.logout}
                </button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
