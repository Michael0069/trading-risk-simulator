'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';
import { AlertCircle, CheckCircle2, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const user = await userAPI.register({ username, email, password });
      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    void handleSubmit(e);
  };

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      {/* Background Animated Aurora Glows */}
      <div className="pointer-events-none absolute -top-40 right-1/4 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl filter animate-aurora dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 h-96 w-96 rounded-full bg-indigo-500/12 blur-3xl filter animate-aurora [animation-delay:5s] dark:bg-indigo-600/10" />

      <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="premium-button inline-flex items-center gap-3 rounded-full bg-white/90 px-3 py-2 text-slate-900 shadow-sm dark:bg-slate-950/90 dark:text-white transition hover:scale-105 active:scale-95">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">AI Trading Simulator</span>
        </Link>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/"
            className="premium-button rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900"
          >
            Back to home
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-center py-6">
      <div className="premium-card animate-stagger-1 grid w-full max-w-5xl overflow-hidden rounded-[2.5rem] shadow-2xl border border-slate-200/80 dark:border-slate-800/80 lg:grid-cols-[0.9fr_1fr]">
        <div className="hidden flex-col justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-10 text-white lg:flex">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">Join the simulator</p>
            <h1 className="mt-4 max-w-md text-4xl font-semibold tracking-tight">Build skill without the noise of a real brokerage account.</h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Create a profile, practice risk discipline, and compare your decisions against a visual coaching layer.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            {[
              ['Demo', 'Capital included'],
              ['Safe', 'Paper trading'],
              ['Fast', 'Onboarding flow'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-2xl bg-white/5 p-4">
                <div className="text-lg font-semibold">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 dark:bg-slate-950">
          <div className="mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">Create account</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Join AI Trading Simulator.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                placeholder="trader_name"
              />
            </div>

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                placeholder="••••••••"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                {success}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              onClick={handleAction}
              disabled={loading}
              className={`premium-button w-full rounded-2xl px-4 py-3 font-semibold ${
                loading
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
                  : 'cursor-pointer bg-slate-950 text-white dark:bg-white dark:text-slate-950'
              }`}
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          {/* Already have account */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-emerald-700 hover:text-emerald-600 dark:text-emerald-300 dark:hover:text-emerald-200">
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
