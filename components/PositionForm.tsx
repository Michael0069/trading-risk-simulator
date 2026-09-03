'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2, XCircle, Sparkles, TrendingUp, Compass, Zap, Gauge } from 'lucide-react';
import { positionAPI, riskAPI } from '@/lib/api';
import { canOpenTrade, parseTradeOpenError } from '@/lib/tradeFlow';

interface PositionFormProps {
  userId: number;
  balance: number;
  onPositionOpened: () => void;
  marketPrices: any;
  prefillData?: any;
}

export default function PositionForm({ userId, balance, onPositionOpened, marketPrices, prefillData }: PositionFormProps) {
  const [instrument, setInstrument] = useState('AAPL');
  const [side, setSide] = useState('BUY');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [quantity, setQuantity] = useState('');
  const [aiIntent, setAiIntent] = useState('');
  const [aiMode, setAiMode] = useState<'custom' | 'trends'>('custom');
  const [trendScanTarget, setTrendScanTarget] = useState<'current' | 'all'>('current');
  const [reason, setReason] = useState('');
  const [followedStrategy, setFollowedStrategy] = useState(true);
  const [chasingLosses, setChasingLosses] = useState(false);
  const [confidenceLevel, setConfidenceLevel] = useState(4);
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [tradesThisSession, setTradesThisSession] = useState(1);
  const [confirmHighRisk, setConfirmHighRisk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [simPreset, setSimPreset] = useState<'tp' | 'sl' | 'drop2' | 'gain2' | 'custom'>('tp');
  const [simOffsetPct, setSimOffsetPct] = useState<number>(0);
  const [validation, setValidation] = useState<any>(null);
  const [behavior, setBehavior] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const instruments = ['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'];

  // Handle prefill data from Broker API or external triggers
  useEffect(() => {
    if (prefillData) {
      if (prefillData.instrument) setInstrument(prefillData.instrument);
      if (prefillData.side) setSide(prefillData.side);
      if (prefillData.entry_price !== undefined) setEntryPrice(String(prefillData.entry_price));
      if (prefillData.stop_loss !== undefined) setStopLoss(String(prefillData.stop_loss));
      if (prefillData.take_profit !== undefined) setTakeProfit(String(prefillData.take_profit));
      if (prefillData.quantity !== undefined) setQuantity(String(prefillData.quantity));
      if (prefillData.suggested_reason) setReason(prefillData.suggested_reason);
      else if (prefillData.reason) setReason(prefillData.reason);
      if (prefillData.feedback) setAiSuggestion(prefillData);
      setSuccess('Broker suggestion applied to Open Trade! Review risk levels and submit.');
    }
  }, [prefillData]);

  // Auto-fill current market price if entry price is empty
  useEffect(() => {
    if (marketPrices[instrument] && !prefillData) {
      const price = marketPrices[instrument].last_price;
      setEntryPrice(price.toString());
    }
  }, [instrument, marketPrices, prefillData]);

  // Validate trade
  const validateTrade = async () => {
    if (!entryPrice || !stopLoss || !takeProfit || !quantity) {
      setValidation({ warnings: ['Fill in all fields'] });
      return;
    }

    try {
      const result = await riskAPI.validate({
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        quantity: parseFloat(quantity),
        account_balance: balance,
        side,
      });
      setValidation(result);

      const behaviorResult = await riskAPI.pretradeAssess({
        user_id: userId,
        instrument,
        side,
        amount_at_risk: result.amount_at_risk,
        reason,
        followed_strategy: followedStrategy,
        chasing_losses: chasingLosses,
        confidence_level: confidenceLevel,
        session_minutes: sessionMinutes,
        trades_this_session: tradesThisSession,
      });
      setBehavior(behaviorResult);

      if (behaviorResult.intervention !== 'WARN') {
        setConfirmHighRisk(false);
      }
    } catch (err) {
      console.error('Validation error:', err);
    }
  };

  const runAiCoach = async (modeOverride?: 'custom' | 'trends') => {
    const activeMode = modeOverride || aiMode;
    setError('');
    setSuccess('');

    if (activeMode === 'custom' && !aiIntent.trim()) {
      setError('Tell the AI what you want first, e.g. "I want to trend in GBP/USD after a pullback."');
      return;
    }

    setAiLoading(true);
    try {
      const suggestion = await riskAPI.suggestTrade({
        user_id: userId,
        instrument: (activeMode === 'trends' && trendScanTarget === 'all') ? undefined : instrument,
        reason: activeMode === 'trends' ? '' : aiIntent,
        side,
        confidence_level: confidenceLevel,
        session_minutes: sessionMinutes,
        trades_this_session: tradesThisSession,
        mode: activeMode,
      });

      setAiSuggestion(suggestion);
      setInstrument(suggestion.instrument);
      setSide(suggestion.side);
      setEntryPrice(String(suggestion.entry_price));
      setStopLoss(String(suggestion.stop_loss));
      setTakeProfit(String(suggestion.take_profit));
      setQuantity(String(suggestion.quantity));
      setReason(suggestion.suggested_reason);
      setSuccess(
        activeMode === 'trends'
          ? `AI Coach built a trend setup for ${suggestion.instrument} (${suggestion.side}). Review the trade levels and reason below, then submit.`
          : `AI Coach built your setup for ${suggestion.instrument} (${suggestion.side}) from your idea. Review the trade levels and reason below, then submit.`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to generate AI trade suggestion');
    } finally {
      setAiLoading(false);
    }
  };

  // Validate on input change
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (entryPrice && stopLoss && takeProfit && quantity) {
        validateTrade();
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [entryPrice, stopLoss, takeProfit, quantity, side, balance, reason, followedStrategy, chasingLosses, confidenceLevel, sessionMinutes, tradesThisSession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim()) {
      setError('Add a trade reason for TradeDNA, or use AI Coach to generate one.');
      return;
    }

    if (!validation?.allowed) {
      setError('Trade validation failed. Check warnings below.');
      return;
    }

    if (behavior?.intervention === 'BLOCK') {
      setError('TradeDNA blocked this trade. Take the cooldown and try again later.');
      return;
    }

    if (behavior?.intervention === 'WARN' && !confirmHighRisk) {
      setError('High behavioral risk detected. Check the confirmation box to continue.');
      return;
    }

    setLoading(true);
    try {
      await positionAPI.open({
        user_id: userId,
        instrument,
        entry_price: parseFloat(entryPrice),
        stop_loss: parseFloat(stopLoss),
        take_profit: parseFloat(takeProfit),
        quantity: parseFloat(quantity),
        side,
        reason,
        followed_strategy: followedStrategy,
        chasing_losses: chasingLosses,
        confidence_level: confidenceLevel,
        session_minutes: sessionMinutes,
        trades_this_session: tradesThisSession,
        confirm_high_risk: confirmHighRisk,
      });
      setSuccess('Position opened successfully!');
      setTimeout(() => {
        setEntryPrice('');
        setStopLoss('');
        setTakeProfit('');
        setQuantity('');
        setAiIntent('');
        setReason('');
        setAiSuggestion(null);
        setFollowedStrategy(true);
        setChasingLosses(false);
        setConfidenceLevel(4);
        setSessionMinutes(30);
        setTradesThisSession(1);
        setConfirmHighRisk(false);
        setValidation(null);
        setBehavior(null);
        onPositionOpened();
      }, 1000);
    } catch (err: any) {
      const parsed = parseTradeOpenError(err);
      if (parsed.behavior) {
        setBehavior(parsed.behavior);
      }
      setError(parsed.message);
    } finally {
      setLoading(false);
    }
  };

  const numEntry = parseFloat(entryPrice) || 0;
  const numQty = parseFloat(quantity) || 0;
  const numSL = parseFloat(stopLoss) || 0;
  const numTP = parseFloat(takeProfit) || 0;

  let simPrice = numEntry;
  if (simPreset === 'tp' && numTP > 0) {
    simPrice = numTP;
  } else if (simPreset === 'sl' && numSL > 0) {
    simPrice = numSL;
  } else if (simPreset === 'drop2' && numEntry > 0) {
    simPrice = numEntry * 0.98;
  } else if (simPreset === 'gain2' && numEntry > 0) {
    simPrice = numEntry * 1.02;
  } else if (numEntry > 0) {
    simPrice = numEntry * (1 + simOffsetPct / 100);
  }

  const decimals = instrument === 'EURUSD' || instrument === 'GBPUSD' ? 4 : 2;
  const simPnl = side === 'BUY' ? (simPrice - numEntry) * numQty : (numEntry - simPrice) * numQty;
  const simReturnPct = balance > 0 ? (simPnl / balance) * 100 : 0;
  const simNewBalance = balance + simPnl;
  const priceMovePct = numEntry > 0 ? ((simPrice - numEntry) / numEntry) * 100 : 0;

  const submitAllowed = canOpenTrade(validation, behavior, confirmHighRisk);

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className="premium-card premium-fade-in rounded-[1.75rem] p-6 dark:bg-slate-950/70 sm:p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Open New Position</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Validate risk before sending the order.</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Use AI Coach to build a setup, then confirm your trade reason for TradeDNA.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Instrument */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Instrument</label>
            <select
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
            >
              {instruments.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          </div>

          {/* Side */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Side</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSide('BUY')}
                className={`premium-button flex-1 rounded-2xl px-3 py-3 font-semibold ${
                  side === 'BUY'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                BUY
              </button>
              <button
                type="button"
                onClick={() => setSide('SELL')}
                className={`premium-button flex-1 rounded-2xl px-3 py-3 font-semibold ${
                  side === 'SELL'
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                SELL
              </button>
            </div>
          </div>

          {/* Entry Price */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Entry Price</label>
            <input
              type="number"
              step="0.01"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
              placeholder="Current market price"
            />
          </div>

          {/* Stop Loss */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Stop Loss</label>
            <input
              type="number"
              step="0.01"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
              placeholder="Required"
            />
          </div>

          {/* Take Profit */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Take Profit</label>
            <input
              type="number"
              step="0.01"
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
              placeholder="Required"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
              placeholder="Number of units"
            />
          </div>

          {/* Session Minutes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Session Duration (minutes)</label>
            <input
              type="number"
              min="1"
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
            />
          </div>

          {/* Trades This Session */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Trades This Session</label>
            <input
              type="number"
              min="0"
              value={tradesThisSession}
              onChange={(e) => setTradesThisSession(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
            />
          </div>
        </div>

        {/* AI Coach Setup */}
        <div className="premium-card mb-6 p-4 md:p-5 dark:bg-slate-900/80">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-500" />
                <h3 className="font-semibold text-slate-950 dark:text-white">AI Coach Setup</h3>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Choose an idea prompt or scan live momentum to auto-build disciplined trade parameters.
              </p>
            </div>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
              Rule-Based Risk Engine
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="mb-4 flex rounded-2xl bg-slate-100 p-1.5 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setAiMode('custom');
                setError('');
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                aiMode === 'custom'
                  ? 'bg-white text-sky-600 shadow-sm dark:bg-slate-900 dark:text-sky-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Build from Idea</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAiMode('trends');
                setError('');
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                aiMode === 'trends'
                  ? 'bg-white text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Use Market Trend</span>
            </button>
          </div>

          {/* Tab 1: Custom Idea Mode */}
          {aiMode === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  What do you want to trade?
                </label>
                <textarea
                  value={aiIntent}
                  onChange={(e) => setAiIntent(e.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
                  placeholder='Example: "I want to trend in GBP/USD after a pullback" or "Scalp BTC breakout"'
                />
              </div>

              {/* Quick Prompt Chips */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Quick Ideas
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Long GBP/USD pullback',
                    'EUR/USD trend breakout',
                    'BTC scalp long',
                    'Gold safe-haven momentum',
                    'AAPL dip bounce',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => setAiIntent(chip)}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600 transition hover:border-sky-300 hover:bg-sky-50/50 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-sky-500/40 dark:hover:text-sky-300"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={() => runAiCoach('custom')}
                disabled={aiLoading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-semibold text-white transition-all duration-200 shadow-md ${
                  aiLoading
                    ? 'cursor-not-allowed bg-sky-700 shimmer-loading shadow-none opacity-90'
                    : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20 active:scale-[0.98]'
                }`}
              >
                <Sparkles className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading ? 'Analyzing Idea & Building Setup...' : 'Build Setup from Idea'}
              </button>
            </div>
          )}

          {/* Tab 2: Market Trend Mode */}
          {aiMode === 'trends' && (
            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trend Target
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTrendScanTarget('current')}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      trendScanTarget === 'current'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Selected Pair ({instrument})</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {marketPrices[instrument] ? `Live: ${marketPrices[instrument].last_price}` : 'Analyze active selection'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrendScanTarget('all')}
                    className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                      trendScanTarget === 'all'
                        ? 'border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-200'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Scan All Markets</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pick highest momentum across 5 pairs
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-slate-800/80 dark:bg-slate-950/50">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                  <span>Targeted Instrument:</span>
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {trendScanTarget === 'current' ? instrument : 'Auto-detected Strongest'}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Strategy:</span>
                  <span>Trend-Following + Controlled 1.8R Target</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => runAiCoach('trends')}
                disabled={aiLoading}
                className={`mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-4 text-sm font-semibold text-white transition-all duration-200 shadow-md ${
                  aiLoading
                    ? 'cursor-not-allowed bg-emerald-700 shimmer-loading shadow-none opacity-90'
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20 active:scale-[0.98]'
                }`}
              >
                <TrendingUp className={`h-4 w-4 ${aiLoading ? 'animate-spin' : ''}`} />
                {aiLoading
                  ? 'Scanning Trends & Building Setup...'
                  : trendScanTarget === 'current'
                  ? `Apply ${instrument} Trend Setup`
                  : 'Scan & Apply Best Market Trend'}
              </button>
            </div>
          )}
        </div>

        {/* AI Suggestion Card */}
        {aiSuggestion && (
          <div className="premium-card mb-6 p-4 dark:bg-slate-900/80">
            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">AI Coach Recommendation</h3>
            <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {aiSuggestion.feedback}
            </p>
            <div className="mb-3 grid grid-cols-2 gap-3 text-xs md:grid-cols-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Instrument</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{aiSuggestion.instrument}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Side</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{aiSuggestion.side}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Risk %</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">{aiSuggestion.risk_percentage.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">R:R</p>
                <p className="font-semibold text-sky-600 dark:text-sky-400">{aiSuggestion.risk_reward_ratio.toFixed(2)}:1</p>
              </div>
            </div>
            <div className="space-y-2">
              {aiSuggestion.notes.map((item: string, idx: number) => (
                <p key={idx} className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {item}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Behavioral Inputs */}
        <div className="premium-card mb-6 p-4 md:p-5 dark:bg-slate-900/80">
          <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
            <div>
              <h3 className="font-semibold text-slate-950 dark:text-white">TradeDNA Pre-Trade Check</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Self-check your mindset and discipline before submitting. This stops emotional mistakes before they happen.
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
              Discipline Guard
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Why are you taking this trade? (Trade Reason)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
                placeholder="Write your simple setup reason here, or let AI Coach generate it."
              />
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Writing down your reason forces you to have a real plan rather than gambling on a random impulse.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Following your strategy checklist?
              </label>
              <select
                value={followedStrategy ? 'yes' : 'no'}
                onChange={(e) => setFollowedStrategy(e.target.value === 'yes')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
              >
                <option value="yes">Yes — I followed all my setup rules</option>
                <option value="no">No — I am entering on a hunch or guessing</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Did you check your entry conditions? Choosing &apos;Yes&apos; means you are sticking to your rules.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Are you chasing losses? (Revenge Trading)
              </label>
              <select
                value={chasingLosses ? 'yes' : 'no'}
                onChange={(e) => setChasingLosses(e.target.value === 'yes')}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
              >
                <option value="no">No — Calm mindset, normal trade</option>
                <option value="yes">Yes — Trying to quickly win back lost money</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Revenge trading is jumping into a trade out of anger to make back a loss. It is the #1 cause of blown accounts.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Time trading today (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="600"
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                How long you have traded today. Trading for hours without breaks causes fatigue and mistakes.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Trades opened today (Session count)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={tradesThisSession}
                onChange={(e) => setTradesThisSession(Math.max(0, Number(e.target.value) || 0))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-slate-950 shadow-sm outline-none transition-all duration-300 hover:border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700 text-sm"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Number of trades you opened today. Placing too many trades quickly is called Overtrading.
              </p>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  How confident are you? (Conviction: {confidenceLevel}/5)
                </label>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {confidenceLevel <= 2 ? 'Low (Caution / Guessing)' : confidenceLevel <= 4 ? 'Moderate Setup' : 'High Conviction Setup'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={confidenceLevel}
                onChange={(e) => setConfidenceLevel(Number(e.target.value))}
                className="w-full mt-2"
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                1 = Just guessing / FOMO (High Risk), 5 = Perfect setup that matches 100% of your rules.
              </p>
            </div>
          </div>

          {/* Beginner Trading Psychology Guide */}
          <div className="mt-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-3.5 dark:border-sky-900/40 dark:bg-sky-950/30">
            <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">
              Quick Guide: Key Trading Terms Explained Simply
            </p>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-slate-600 dark:text-slate-300 sm:grid-cols-2">
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">FOMO: </span>
                Fear Of Missing Out — rushing into a trade because price is moving fast and you panic that you will miss free profit.
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Revenge Trading: </span>
                Angrily placing new trades right after a loss to make your money back immediately.
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Overtrading: </span>
                Opening too many trades in one sitting due to boredom or excitement rather than waiting for a good setup.
              </div>
              <div>
                <span className="font-semibold text-slate-900 dark:text-white">Market Variance: </span>
                Losing a trade even when you followed every rule properly. Losses are normal probabilities in trading.
              </div>
            </div>
          </div>
        </div>

        {/* Risk Metrics */}
        {validation && (
          <div className="premium-card mb-6 p-4 dark:bg-slate-900/80">
            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">Risk Metrics</h3>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Amount at Risk</p>
                <p className="font-semibold text-amber-600 dark:text-amber-400">GHS {validation.amount_at_risk.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Risk %</p>
                <p className={validation.risk_percentage > 2 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
                  {validation.risk_percentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Potential Reward</p>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400">GHS {validation.potential_reward.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">R:R Ratio</p>
                <p className={validation.risk_reward_ratio >= 1 ? 'font-semibold text-sky-600 dark:text-sky-400' : 'font-semibold text-amber-600 dark:text-amber-400'}>
                  {validation.risk_reward_ratio.toFixed(2)}:1
                </p>
              </div>
            </div>

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                {validation.warnings.map((warning: string, idx: number) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 rounded-xl p-3 ${
                      warning.includes('❌')
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-200'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
                    }`}
                  >
                    {warning.includes('❌') ? (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span className="text-xs">{warning.replace('❌', '').replace('⚠️', '')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pre-Trade "What-If" Scenario Simulator */}
        {numEntry > 0 && numQty > 0 && (
          <div className="premium-card mb-6 p-4 md:p-5 dark:bg-slate-900/80">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-sky-500" />
                <h3 className="font-semibold text-slate-950 dark:text-white">Pre-Trade &quot;What-If&quot; Scenario Simulator</h3>
              </div>
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">
                Live P&amp;L Modeler
              </span>
            </div>
            <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
              Test market movements before placing your order to see projected dollar gain/loss and balance drawdown.
            </p>

            {/* Scenario Preset Buttons */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSimPreset('tp')}
                disabled={!numTP}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  simPreset === 'tp'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Hit Target (TP)
              </button>
              <button
                type="button"
                onClick={() => setSimPreset('sl')}
                disabled={!numSL}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  simPreset === 'sl'
                    ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 ring-2 ring-rose-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Hit Stop-Loss (SL)
              </button>
              <button
                type="button"
                onClick={() => setSimPreset('drop2')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  simPreset === 'drop2'
                    ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                Market -2%
              </button>
              <button
                type="button"
                onClick={() => setSimPreset('gain2')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  simPreset === 'gain2'
                    ? 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 ring-2 ring-sky-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                Market +2%
              </button>
              <button
                type="button"
                onClick={() => setSimPreset('custom')}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  simPreset === 'custom'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 ring-2 ring-purple-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                }`}
              >
                Custom % Slider
              </button>
            </div>

            {/* Custom Slider */}
            {simPreset === 'custom' && (
              <div className="mb-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  <span>Price Movement Shift:</span>
                  <span className="font-semibold text-slate-950 dark:text-white">
                    {simOffsetPct > 0 ? `+${simOffsetPct}%` : `${simOffsetPct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.5"
                  value={simOffsetPct}
                  onChange={(e) => setSimOffsetPct(parseFloat(e.target.value))}
                  className="w-full cursor-pointer accent-sky-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>-10%</span>
                  <span>0%</span>
                  <span>+10%</span>
                </div>
              </div>
            )}

            {/* Projected Simulation Results */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 text-xs">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-slate-500 dark:text-slate-400">Simulated Price</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                  GHS {simPrice.toFixed(decimals)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {priceMovePct >= 0 ? `+${priceMovePct.toFixed(2)}%` : `${priceMovePct.toFixed(2)}%`} move
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-slate-500 dark:text-slate-400">Projected P&amp;L</p>
                <p className={`mt-1 font-semibold text-sm ${simPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {simPnl >= 0 ? `+GHS ${simPnl.toFixed(2)}` : `-GHS ${Math.abs(simPnl).toFixed(2)}`}
                </p>
                <p className={`mt-0.5 text-[11px] ${simReturnPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {simReturnPct >= 0 ? `+${simReturnPct.toFixed(2)}%` : `${simReturnPct.toFixed(2)}%`}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-slate-500 dark:text-slate-400">Projected Balance</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                  GHS {simNewBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  From GHS {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
                <p className="text-slate-500 dark:text-slate-400">Scenario Context</p>
                <p className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {simPreset === 'tp' ? '🎯 Target Hit' : simPreset === 'sl' ? '🛑 Stop Hit' : simPnl >= 0 ? 'Profit Scenario' : 'Drawdown Scenario'}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {Math.abs(simReturnPct) <= 2 ? 'Within 2% guardrail' : 'High exposure warning'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Behavioral Risk Card */}
        {behavior && (
          <div className="premium-card mb-6 p-4 dark:bg-slate-900/80">
            <h3 className="mb-3 font-semibold text-slate-950 dark:text-white">TradeDNA Behavioral Risk</h3>
            <div className="mb-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Risk Score</p>
                <p className={behavior.score >= 55 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
                  {behavior.score.toFixed(0)}/100
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Risk Level</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{behavior.risk_level}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Intervention</p>
                <p className={
                  behavior.intervention === 'BLOCK'
                    ? 'font-semibold text-rose-600 dark:text-rose-400'
                    : behavior.intervention === 'WARN'
                    ? 'font-semibold text-amber-600 dark:text-amber-400'
                    : 'font-semibold text-emerald-600 dark:text-emerald-400'
                }>
                  {behavior.intervention}
                </p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Cooldown</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{behavior.cooldown_minutes} min</p>
              </div>
            </div>

            <p className="mb-3 rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {behavior.coaching_prompt}
            </p>

            <div className="space-y-2">
              {behavior.reasons.map((item: string, idx: number) => (
                <div key={idx} className="rounded-xl bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
                  {item}
                </div>
              ))}
            </div>

            {behavior.intervention === 'WARN' && (
              <label className="mt-3 flex cursor-pointer items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={confirmHighRisk}
                  onChange={(e) => setConfirmHighRisk(e.target.checked)}
                  className="mt-0.5"
                />
                I understand this is a high-risk trade and still want to continue.
              </label>
            )}
          </div>
        )}

        {/* Status Messages */}
        {error && (
          <div className="mb-4 flex gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 premium-fade-in">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 premium-fade-in">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {success}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !submitAllowed}
          className={`premium-button w-full rounded-2xl px-4 py-3 font-semibold ${
            submitAllowed && !loading
              ? 'cursor-pointer bg-slate-950 text-white hover:-translate-y-0.5 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200'
              : 'cursor-not-allowed bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-500'
          }`}
        >
          {loading ? 'Opening Position...' : 'Open Position'}
        </button>
      </form>
    </div>
  );
}
