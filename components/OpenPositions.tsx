'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import { positionAPI } from '@/lib/api';

interface Position {
  id: number;
  instrument: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  quantity: number;
  side: string;
  amount_at_risk: number;
  risk_percentage: number;
  risk_reward_ratio: number;
  opened_at: string;
}

interface OpenPositionsProps {
  positions: Position[];
  marketPrices: any;
  onPositionClosed: () => void;
}

export default function OpenPositions({ positions, marketPrices, onPositionClosed }: OpenPositionsProps) {
  const [closingId, setClosingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClosePosition = async (positionId: number) => {
    setLoading(true);
    try {
      await positionAPI.close(positionId, 'MANUAL');
      setClosingId(null);
      onPositionClosed();
    } catch (error) {
      console.error('Failed to close position:', error);
    } finally {
      setLoading(false);
    }
  };

  if (positions.length === 0) {
    return (
      <div className="premium-card premium-fade-in rounded-[1.75rem] p-12 text-center dark:bg-slate-950/70">
        <p className="text-lg text-slate-700 dark:text-slate-300">No open positions</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Open a new trade to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {positions.map((position) => {
        const marketPrice = marketPrices[position.instrument];
        const currentPrice = marketPrice?.last_price || position.entry_price;
        
        let pnl = 0;
        let pnlPercent = 0;
        if (position.side === 'BUY') {
          pnl = (currentPrice - position.entry_price) * position.quantity;
          pnlPercent = ((currentPrice - position.entry_price) / position.entry_price) * 100;
        } else {
          pnl = (position.entry_price - currentPrice) * position.quantity;
          pnlPercent = ((position.entry_price - currentPrice) / position.entry_price) * 100;
        }

        const pnlPositive = pnl >= 0;
        const isNearSL = position.side === 'BUY' 
          ? currentPrice <= position.stop_loss * 1.01
          : currentPrice >= position.stop_loss * 0.99;

        return (
          <div
            key={position.id}
            className={`premium-card animate-stagger-1 rounded-[2rem] p-6 transition duration-200 ${
              isNearSL
                ? 'border-rose-300 bg-rose-50/80 shadow-md shadow-rose-500/10 dark:border-rose-500/30 dark:bg-rose-500/10'
                : 'border-slate-200/80 bg-white/85 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-950/70'
            }`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                  position.side === 'BUY' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                }`}>
                  {position.side === 'BUY' ? (
                    <TrendingUp className="h-5 w-5" />
                  ) : (
                    <TrendingDown className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-950 dark:text-white">{position.instrument}</h3>
                  <p className={`text-sm font-semibold ${
                    position.side === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {position.side} {position.quantity} @ {position.entry_price.toFixed(4)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setClosingId(position.id)}
                className="premium-button rounded-full border border-slate-200 bg-white p-2 text-rose-500 transition hover:scale-110 hover:bg-rose-50 hover:text-rose-600 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-rose-500/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Price Levels */}
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">Entry</p>
                <p className="font-mono font-semibold text-slate-950 dark:text-white">{position.entry_price.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">Current</p>
                <p className="font-mono font-semibold text-sky-700 dark:text-sky-300">{currentPrice.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">Stop Loss</p>
                <p className="font-mono font-semibold text-rose-600 dark:text-rose-400">{position.stop_loss.toFixed(4)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900">
                <p className="text-xs text-slate-500 dark:text-slate-400">Take Profit</p>
                <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">{position.take_profit.toFixed(4)}</p>
              </div>
            </div>

            {/* Risk Metrics */}
            <div className="mb-4 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-sm md:grid-cols-3 dark:border-slate-800 dark:bg-slate-900/80">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Amount at Risk</p>
                <p className="font-semibold text-amber-600 dark:text-amber-400">GHS {position.amount_at_risk.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Risk %</p>
                <p className={position.risk_percentage > 2 ? 'font-semibold text-rose-600 dark:text-rose-400' : 'font-semibold text-emerald-600 dark:text-emerald-400'}>
                  {position.risk_percentage.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">R:R Ratio</p>
                <p className="font-semibold text-sky-600 dark:text-sky-400">{position.risk_reward_ratio.toFixed(2)}:1</p>
              </div>
            </div>

            {/* P&L */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Unrealized P&amp;L</span>
              <div className="text-right">
                <p className={`text-lg font-bold ${pnlPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {pnlPositive ? '+' : ''}GHS {pnl.toFixed(2)}
                </p>
                <p className={`text-xs font-semibold ${pnlPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {pnlPositive ? '+' : ''}{pnlPercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Warnings */}
            {isNearSL && (
              <div className="animate-pulse mb-4 flex items-center gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                <span>⚠️ Position is near stop loss!</span>
              </div>
            )}

            {/* Close Confirmation */}
            {closingId === position.id && (
              <div className="animate-pop-in mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm dark:border-rose-500/30 dark:bg-rose-500/10">
                <p className="mb-3 font-semibold text-slate-950 dark:text-white">Close this position?</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleClosePosition(position.id)}
                    disabled={loading}
                    className="premium-button flex-1 rounded-2xl bg-rose-600 px-4 py-2.5 font-semibold text-white hover:bg-rose-700 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? 'Closing...' : 'Confirm Close'}
                  </button>
                  <button
                    onClick={() => setClosingId(null)}
                    disabled={loading}
                    className="premium-button flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
