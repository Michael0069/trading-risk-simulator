'use client';

import React, { useState, useEffect } from 'react';
import { Sliders, X, Shield, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { userAPI } from '@/lib/api';

export interface RiskSettings {
  max_risk_pct: number;
  max_trades_per_day: number;
  daily_loss_limit: number;
  min_risk_reward: number;
  custom_strategy: string;
}

interface RiskSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  currentBalance: number;
  onSaved?: (settings: RiskSettings) => void;
}

export default function RiskSettingsModal({
  isOpen,
  onClose,
  userId,
  currentBalance,
  onSaved,
}: RiskSettingsModalProps) {
  const [maxRiskPct, setMaxRiskPct] = useState<number>(2.0);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(5);
  const [dailyLossLimit, setDailyLossLimit] = useState<number>(500);
  const [minRiskReward, setMinRiskReward] = useState<number>(1.5);
  const [customStrategy, setCustomStrategy] = useState<string>('Breakout & Trend Retest');
  
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadSettings();
    }
  }, [isOpen, userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.getRiskSettings(userId);
      if (data) {
        setMaxRiskPct(data.max_risk_pct ?? 2.0);
        setMaxTradesPerDay(data.max_trades_per_day ?? 5);
        setDailyLossLimit(data.daily_loss_limit ?? 500);
        setMinRiskReward(data.min_risk_reward ?? 1.5);
        setCustomStrategy(data.custom_strategy || 'General Strategy');
      }
    } catch (err: any) {
      console.error('Failed to load risk settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const payload: RiskSettings = {
        max_risk_pct: Number(maxRiskPct),
        max_trades_per_day: Number(maxTradesPerDay),
        daily_loss_limit: Number(dailyLossLimit),
        min_risk_reward: Number(minRiskReward),
        custom_strategy: customStrategy.trim() || 'General Strategy',
      };

      const updated = await userAPI.updateRiskSettings(userId, payload);
      setSaveSuccess(true);
      if (onSaved) {
        onSaved(payload);
      }
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err?.message || 'Failed to update risk guardrails.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setMaxRiskPct(2.0);
    setMaxTradesPerDay(5);
    setDailyLossLimit(Math.round(currentBalance * 0.05));
    setMinRiskReward(1.5);
    setCustomStrategy('General Trend & Risk Guardian');
  };

  if (!isOpen) return null;

  const maxRiskAmount = (currentBalance * (maxRiskPct / 100)).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customizable Risk Guardrails</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Personalize your position sizing rules, loss ceilings, and discipline targets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-sky-500" />
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Loading risk profile...</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Max Risk % per trade slider */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Max Risk Per Trade (%)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-sky-600 dark:text-sky-400">
                    {maxRiskPct.toFixed(1)}%
                  </span>
                  <span className="text-xs text-slate-500">
                    (Max: GHS {maxRiskAmount})
                  </span>
                </div>
              </div>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={maxRiskPct}
                onChange={(e) => setMaxRiskPct(parseFloat(e.target.value))}
                className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-sky-500 dark:bg-slate-700"
              />
              <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                <span>0.5% (Ultra-Safe)</span>
                <span>2.0% (Standard)</span>
                <span>5.0% (Aggressive)</span>
              </div>
            </div>

            {/* Daily Loss Limit ($) & Max Trades/Day */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Daily Loss Stop (GHS)
                </label>
                <div className="relative mt-2">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">GHS</span>
                  <input
                    type="number"
                    min="50"
                    step="50"
                    value={dailyLossLimit}
                    onChange={(e) => setDailyLossLimit(parseFloat(e.target.value) || 100)}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-12 pr-3 text-sm font-bold text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Trading halts if daily losses exceed this amount.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Max Trades Per Session / Day
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {[3, 5, 8, 12].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setMaxTradesPerDay(num)}
                      className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                        maxTradesPerDay === num
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  Prevents over-trading and fatigue.
                </p>
              </div>
            </div>

            {/* Target Min Risk:Reward Ratio */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Minimum Risk:Reward Ratio
              </label>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  { label: '1:1.0', val: 1.0 },
                  { label: '1:1.5', val: 1.5 },
                  { label: '1:2.0', val: 2.0 },
                  { label: '1:3.0', val: 3.0 },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMinRiskReward(item.val)}
                    className={`rounded-xl py-2 text-xs font-bold transition ${
                      minRiskReward === item.val
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Strategy Tag */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Trading Strategy / System Tag
              </label>
              <input
                type="text"
                value={customStrategy}
                onChange={(e) => setCustomStrategy(e.target.value)}
                placeholder="e.g. 15M EMA Pullback, Breakout Retest"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Used by the TradeDNA AI Coach to evaluate strategy adherence.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Reset to Defaults
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold text-white shadow-md transition ${
                    saveSuccess
                      ? 'bg-emerald-600'
                      : 'bg-sky-500 hover:bg-sky-600 active:scale-95'
                  }`}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : saveSuccess ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Saved!
                    </>
                  ) : (
                    'Save Guardrails'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
