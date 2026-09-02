'use client';

import { Shield, AlertTriangle, CheckCircle2, Sliders } from 'lucide-react';
import type { RiskSettings } from './RiskSettingsModal';

interface RiskGuardianProps {
  balance: number;
  riskSettings?: RiskSettings | null;
  onOpenSettings?: () => void;
}

export default function RiskGuardian({ balance, riskSettings, onOpenSettings }: RiskGuardianProps) {
  const maxRiskPct = riskSettings?.max_risk_pct ?? 2.0;
  const maxRiskPerTrade = balance * (maxRiskPct / 100);
  const recommendedRiskAmount = balance * Math.min(0.01, maxRiskPct / 200);
  const minRR = riskSettings?.min_risk_reward ?? 1.5;
  const maxTrades = riskSettings?.max_trades_per_day ?? 5;
  const dailyLoss = riskSettings?.daily_loss_limit ?? 500;

  return (
    <div className="rounded-[1.75rem] border border-slate-200/80 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-950 dark:to-slate-900/80">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          <Shield className="h-5 w-5 text-sky-500" />
          Risk Guardian Engine
        </h2>
        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900"
            >
              <Sliders className="h-3 w-3" />
              Customize Rules
            </button>
          )}
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Guardrails on</span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Risk Rules */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-slate-950 dark:text-white">Active Position Sizing Rules</h3>
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400">
              {riskSettings?.custom_strategy || 'Standard Strategy'}
            </span>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">{maxRiskPct}% Max Risk Rule:</span> Never risk more than {maxRiskPct}% of account per trade
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Maximum: <span className="font-mono text-emerald-600 dark:text-emerald-400">GHS {maxRiskPerTrade.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Daily Loss Ceiling:</span> Halts entries at GHS {dailyLoss.toFixed(2)} loss
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Session Limit: <span className="font-semibold text-slate-800 dark:text-slate-200">{maxTrades} max trades/day</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">1:{minRR.toFixed(1)} R:R Target:</span> Minimum required reward-to-risk ratio
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Recommended safe size: <span className="font-mono text-sky-600 dark:text-sky-400">GHS {recommendedRiskAmount.toFixed(2)}</span>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <div>
                <p className="text-slate-600 dark:text-slate-300">
                  <span className="font-semibold">Stop Loss Required:</span> Every position must have a stop loss
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Protects your account from catastrophic losses
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Psychology Tips */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
          <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Key Principles
          </h3>
          
          <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <li className="flex gap-2">
              <span className="text-sky-500">→</span>
              <span>Risk management is more important than profit potential</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">→</span>
              <span>Calculate your position size BEFORE entering a trade</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">→</span>
              <span>Consistent small wins beat sporadic big losses</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">→</span>
              <span>Sentiment analysis helps but doesn&apos;t guarantee profits</span>
            </li>
            <li className="flex gap-2">
              <span className="text-sky-500">→</span>
              <span>Track your statistics to improve your trading</span>
            </li>
          </ul>
        </div>

        {/* Current Account Status */}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">Current Account Balance</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">GHS {balance.toFixed(2)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Safe Risk/Trade</p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">GHS {recommendedRiskAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Max Risk/Trade</p>
              <p className="font-semibold text-amber-600 dark:text-amber-400">GHS {maxRiskPerTrade.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
