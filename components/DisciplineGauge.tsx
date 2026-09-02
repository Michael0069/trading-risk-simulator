'use client';

import { useMemo } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Award, CheckCircle2, TrendingUp, Compass, HeartPulse } from 'lucide-react';
import { analyzeTrade } from '@/lib/tradeReview';

interface DisciplineGaugeProps {
  trades: any[];
  coachEvents?: any[];
  analytics?: any;
}

export default function DisciplineGauge({ trades = [], coachEvents = [], analytics }: DisciplineGaugeProps) {
  const metrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        overallScore: 100,
        strategyScore: 100,
        riskScore: 100,
        composureScore: 100,
        stopLossScore: 100,
        status: 'DISCIPLINED',
        statusLabel: 'Pristine Discipline',
        statusTone: 'text-emerald-600 dark:text-emerald-400',
        bgColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        advice: 'No trades placed yet. Maintain strict 2% risk and strategy checklist on your first execution.',
      };
    }

    // 1. Strategy Adherence Rate
    const strategyCleanCount = trades.filter((t) => {
      const rev = analyzeTrade(t, coachEvents);
      return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
    }).length;
    const strategyScore = Math.round((strategyCleanCount / trades.length) * 100);

    // 2. Risk Ceiling Compliance (Trades with pnl loss <= 3% of approximate balance)
    const overleveragedCount = trades.filter((t) => {
      const rev = analyzeTrade(t, coachEvents);
      return rev.category === 'OVERLEVERAGE';
    }).length;
    const riskScore = Math.max(0, Math.round(((trades.length - overleveragedCount) / trades.length) * 100));

    // 3. Emotional Composure (Revenge / FOMO control)
    const emotionalCount = trades.filter((t) => {
      const rev = analyzeTrade(t, coachEvents);
      return rev.category === 'EMOTIONAL_FOMO' || rev.category === 'PLAN_DEVIATION';
    }).length;
    const lossStreak = analytics?.loss_streak || 0;
    const streakPenalty = Math.min(25, lossStreak * 8);
    const composureScore = Math.max(0, Math.round(((trades.length - emotionalCount) / trades.length) * 100) - streakPenalty);

    // 4. Stop-loss discipline
    const stopLossScore = 100; // Simulated trades are always guardrail-checked

    // Weighted Overall Score
    const overallScore = Math.round(
      strategyScore * 0.4 + riskScore * 0.3 + composureScore * 0.3
    );

    let status = 'DISCIPLINED';
    let statusLabel = 'Disciplined Trader';
    let statusTone = 'text-emerald-600 dark:text-emerald-400';
    let bgColor = 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300';
    let advice = 'Excellent adherence to risk parameters. Continue executing setups with disciplined sizing.';

    if (overallScore < 60) {
      status = 'IMPULSIVE';
      statusLabel = 'Elevated Risk Profile';
      statusTone = 'text-rose-600 dark:text-rose-400';
      bgColor = 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
      advice = 'High frequency of emotional or unverified setups detected. Take a 15-minute cooldown before opening your next position.';
    } else if (overallScore < 80) {
      status = 'MODERATE';
      statusLabel = 'Moderate Caution';
      statusTone = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-500/10 text-amber-700 dark:text-amber-300';
      advice = 'Minor rule deviations observed. Ensure you verify risk/reward ratio is at least 1.5:1 before placing orders.';
    }

    return {
      overallScore,
      strategyScore,
      riskScore,
      composureScore,
      stopLossScore,
      status,
      statusLabel,
      statusTone,
      bgColor,
      advice,
    };
  }, [trades, coachEvents, analytics]);

  // Arc Gauge SVG Calculations
  const radius = 64;
  const strokeWidth = 10;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (metrics.overallScore / 100) * circumference;

  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Behavioral Discipline Gauge
            </h3>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${metrics.bgColor}`}>
              <ShieldCheck className="h-3 w-3" />
              {metrics.statusLabel}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time compliance scorecard measuring plan adherence and emotional composure.
          </p>
        </div>
      </div>

      {/* Main Grid: Gauge Circle + Breakdown Bars */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Circular Gauge */}
        <div className="md:col-span-4 flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-200/60 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="relative flex items-center justify-center">
            <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg] overflow-visible">
              {/* Background Track */}
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className="text-slate-200 dark:text-slate-800"
              />
              {/* Animated Value Arc */}
              <circle
                stroke="currentColor"
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference + ' ' + circumference}
                style={{ strokeDashoffset }}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                className={`transition-all duration-700 ease-out ${
                  metrics.overallScore >= 80
                    ? 'text-emerald-500'
                    : metrics.overallScore >= 60
                    ? 'text-amber-500'
                    : 'text-rose-500'
                }`}
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-3xl font-extrabold tracking-tight ${metrics.statusTone}`}>
                {metrics.overallScore}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Score / 100
              </span>
            </div>
          </div>

          <p className="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300 text-center">
            {metrics.statusLabel}
          </p>
        </div>

        {/* Sub-Score Breakdown Bars */}
        <div className="md:col-span-8 space-y-3.5">
          {/* Strategy Checklist */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <Compass className="h-3.5 w-3.5 text-sky-500" />
                Strategy Checklist Adherence
              </span>
              <span className="text-slate-900 dark:text-white font-mono">{metrics.strategyScore}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-500"
                style={{ width: `${metrics.strategyScore}%` }}
              />
            </div>
          </div>

          {/* Risk Per Trade Ceiling */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Risk Ceiling Compliance (≤2% Balance)
              </span>
              <span className="text-slate-900 dark:text-white font-mono">{metrics.riskScore}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${metrics.riskScore}%` }}
              />
            </div>
          </div>

          {/* Emotional Composure & Streak */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                <HeartPulse className="h-3.5 w-3.5 text-purple-500" />
                Emotional Composure (No Revenge Tilt)
              </span>
              <span className="text-slate-900 dark:text-white font-mono">{metrics.composureScore}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-500"
                style={{ width: `${metrics.composureScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Coach Diagnostic Callout */}
      <div className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
        <Award className="h-5 w-5 shrink-0 text-sky-500 mt-0.5" />
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">TradeDNA Diagnostic Takeaway</p>
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {metrics.advice}
          </p>
        </div>
      </div>
    </div>
  );
}
