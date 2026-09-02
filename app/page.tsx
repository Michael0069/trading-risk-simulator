'use client';

import Link from 'next/link';
import { ArrowRight, BarChart3, Brain, CheckCircle2, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { productRoadmap } from '@/lib/roadmap';

const roadmap = productRoadmap;

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden text-slate-900 dark:text-slate-50">
      {/* Background Animated Aurora Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-400/15 blur-3xl filter animate-aurora dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute top-1/3 -right-20 h-96 w-96 rounded-full bg-indigo-500/15 blur-3xl filter animate-aurora [animation-delay:4s] dark:bg-blue-600/10" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl filter animate-aurora [animation-delay:8s] dark:bg-emerald-500/10" />

      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/15 dark:bg-white dark:text-slate-950 transition hover:scale-105 active:scale-95">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">AI Trading Simulator</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Risk-first paper trading</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="premium-button rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
              Login
            </Link>
            <Link
              href="/register"
              className="premium-button inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 hover:shadow-xl hover:shadow-sky-500/15"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <section className="premium-card animate-stagger-1 relative overflow-hidden rounded-[2.5rem] p-8 shadow-[0_20px_80px_rgba(15,23,42,0.08)] dark:bg-slate-950/70 sm:p-12 border border-slate-200/80 dark:border-slate-800/80">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_30%)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="animate-float mb-5 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                Risk-aware simulator
              </div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl leading-[1.15]">
                Trade with clarity, not guesswork.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300 sm:text-lg">
                A polished paper-trading workspace that combines market simulation, risk controls, and coaching so users can learn faster and act with confidence.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="premium-button inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 hover:shadow-xl dark:bg-white dark:text-slate-950"
                >
                  Start free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#roadmap"
                  className="premium-button inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-6 py-3.5 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  View roadmap
                </a>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  ['Risk Engine', 'Every trade is validated before entry'],
                  ['Market Feed', 'Simulated prices, spreads, and sentiment'],
                  ['Coach Mode', 'Explainability for every decision'],
                ].map(([title, description]) => (
                  <div key={title} className="premium-card p-4 transition duration-300 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-900/80">
                    <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="premium-card rounded-[2rem] p-6 shadow-xl shadow-slate-900/5 dark:shadow-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800/80">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Today&apos;s focus</p>
                    <p className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">Risk-first coaching</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-ring" />
                    Live
                  </div>
                </div>
                <div className="space-y-3.5 py-5">
                  {[
                    ['Portfolio guardrails', 'Max 2% risk per trade'],
                    ['Trade validation', 'Stop loss, reward ratio, and balance checks'],
                    ['Learning loop', 'Post-trade summaries and replay'],
                  ].map(([label, detail]) => (
                    <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition duration-200 hover:border-sky-300 hover:bg-sky-50/40 dark:border-slate-800/80 dark:bg-slate-900/60 dark:hover:border-sky-500/30 dark:hover:bg-sky-950/20">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">{label}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{detail}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3 border-t border-slate-200/80 pt-4 text-center dark:border-slate-800/80">
                  {[
                    ['5', 'Markets'],
                    ['2%', 'Risk cap'],
                    ['24/7', 'Simulated'],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-3 py-4 dark:border-slate-800/80 dark:bg-slate-900/60 transition hover:scale-105">
                      <div className="text-lg font-semibold text-slate-950 dark:text-white">{value}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="animate-stagger-2 mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[
            [Shield, 'Risk Guardian', 'Quantifies exposure, R:R, and approval rules before the trade can open.'],
            [TrendingUp, 'Live Market Data', 'Realistic bid-ask spreads and price updates for every instrument.'],
            [Brain, 'Sentiment Layer', 'A quick signal feed that helps explain market context.'],
            [BarChart3, 'Analytics', 'Win rate, P&L, and performance history in one place.'],
          ].map(([Icon, title, description]) => (
            <article key={title as string} className="premium-card p-6 transition duration-300 hover:-translate-y-2 hover:shadow-xl dark:bg-slate-950/70">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title as string}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{description as string}</p>
            </article>
          ))}
        </section>

        <section className="animate-stagger-3 mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Available instruments</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:grid-cols-2 xl:grid-cols-5">
              {['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'].map((instrument) => (
                <div key={instrument} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-900/80 transition duration-200 hover:-translate-y-1 hover:border-sky-400 hover:shadow-md">
                  <p className="text-lg font-semibold text-slate-950 dark:text-white">{instrument}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {instrument === 'AAPL' && 'Apple Stock'}
                    {instrument === 'EURUSD' && 'EUR/USD Forex'}
                    {instrument === 'GBPUSD' && 'GBP/USD Forex'}
                    {instrument === 'GOLD' && 'Gold Commodity'}
                    {instrument === 'BTCUSD' && 'Bitcoin Crypto'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div id="roadmap" className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-7 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Roadmap</p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">What makes the product stand out</h2>
              </div>
              <Sparkles className="h-6 w-6 text-sky-500 animate-float" />
            </div>

            <div className="mt-6 space-y-4">
              {roadmap.map((item) => (
                <div key={item.phase} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/80 transition duration-200 hover:border-sky-300 dark:hover:border-sky-500/40">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-sky-600 dark:text-sky-400">{item.phase}</p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{item.title}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.items.map((point) => (
                      <span key={point} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
