'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TradingDashboard from '@/components/TradingDashboard';
import { LogOut, RefreshCw } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { clearStoredUser, getStoredUser } from '@/lib/auth';

class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('Dashboard boundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md rounded-3xl border border-sky-200/80 bg-white/90 p-8 shadow-xl dark:border-sky-800/80 dark:bg-slate-900/90">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Syncing Trading Engine</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Connected to cloud backend. Click below to load live market and portfolio stats.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-sky-500 active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Dashboard
              </button>
              <button
                onClick={() => {
                  clearStoredUser();
                  window.location.href = '/login';
                }}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
              >
                Re-login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser || !storedUser.id) {
      clearStoredUser();
      router.push('/login');
      return;
    }

    setUser({
      id: Number(storedUser.id) || 1,
      username: storedUser.username || 'demo_trader',
      email: storedUser.email || 'demo@example.com',
      starting_balance: Number(storedUser.starting_balance) || 10000,
      current_balance: Number(storedUser.current_balance) || 10000,
    });
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearStoredUser();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-white text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-slate-900 dark:border-white"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-transparent">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-18 items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/15 dark:bg-white dark:text-slate-950">
                <span className="font-display text-lg font-semibold">AI</span>
              </div>
              <div>
                <p className="font-display text-lg font-semibold tracking-tight text-slate-950 dark:text-white">AI Trading Simulator</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Welcome, {user.username}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                  <span>Demo session</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>

          <div className="pb-3">
            <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {['Risk cap 2%', '5 instruments', 'Live market updates', 'Paper trading'].map((label) => (
                <span key={label} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 dark:border-slate-800 dark:bg-slate-900/80">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <DashboardErrorBoundary>
        <TradingDashboard user={user} />
      </DashboardErrorBoundary>
    </div>
  );
}
