'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Activity, ShieldAlert, Award, Layers } from 'lucide-react';

export interface TradePoint {
  id: number;
  instrument: string;
  pnl: number;
  pnl_percentage?: number;
  closed_at: string;
  side?: string;
}

interface EquityChartProps {
  trades: TradePoint[];
  startingBalance: number;
  currentBalance?: number;
}

export default function EquityChart({ trades = [], startingBalance = 10000, currentBalance }: EquityChartProps) {
  const safeStarting = Number(startingBalance) || 10000;
  const [viewMode, setViewMode] = useState<'equity' | 'drawdown' | 'combined'>('equity');
  const [rangeFilter, setRangeFilter] = useState<'all' | '10' | '20'>('all');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Sort trades chronologically
  const sortedTrades = useMemo(() => {
    const list = Array.isArray(trades) ? trades : [];
    const copy = [...list];
    copy.sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());
    return copy;
  }, [trades]);

  // Filter trades based on range
  const filteredTrades = useMemo(() => {
    if (rangeFilter === '10') return sortedTrades.slice(-10);
    if (rangeFilter === '20') return sortedTrades.slice(-20);
    return sortedTrades;
  }, [sortedTrades, rangeFilter]);

  // Compute equity and drawdown trajectory checkpoints
  const trajectory = useMemo(() => {
    let runningBalance = safeStarting;
    let peak = safeStarting;
    let maxDrawdownAbs = 0;
    let maxDrawdownPct = 0;

    const points = [
      {
        index: 0,
        label: 'Start',
        instrument: 'Initial Capital',
        side: '',
        pnl: 0,
        balance: safeStarting,
        peak: safeStarting,
        drawdownAbs: 0,
        drawdownPct: 0,
        closed_at: sortedTrades[0]?.closed_at || new Date().toISOString(),
      },
    ];

    filteredTrades.forEach((trade, i) => {
      runningBalance += trade.pnl;
      if (runningBalance > peak) {
        peak = runningBalance;
      }
      const ddAbs = Math.max(0, peak - runningBalance);
      const ddPct = peak > 0 ? (ddAbs / peak) * 100 : 0;

      if (ddAbs > maxDrawdownAbs) maxDrawdownAbs = ddAbs;
      if (ddPct > maxDrawdownPct) maxDrawdownPct = ddPct;

      points.push({
        index: i + 1,
        label: `Trade #${i + 1}`,
        instrument: trade.instrument,
        side: trade.side || 'BUY',
        pnl: trade.pnl,
        balance: runningBalance,
        peak,
        drawdownAbs: ddAbs,
        drawdownPct: ddPct,
        closed_at: trade.closed_at,
      });
    });

    const latest = points[points.length - 1];
    const totalGain = latest.balance - safeStarting;
    const totalGainPct = safeStarting > 0 ? (totalGain / safeStarting) * 100 : 0;

    // Profit Factor
    const grossProfit = filteredTrades.filter((t) => t.pnl > 0).reduce((acc, t) => acc + t.pnl, 0);
    const grossLoss = Math.abs(filteredTrades.filter((t) => t.pnl < 0).reduce((acc, t) => acc + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '0.00';

    return {
      points,
      peak,
      maxDrawdownAbs,
      maxDrawdownPct,
      currentDrawdownPct: latest.drawdownPct,
      currentBalance: latest.balance,
      totalGain,
      totalGainPct,
      profitFactor,
    };
  }, [filteredTrades, safeStarting, sortedTrades]);

  const { points, peak, maxDrawdownPct, currentDrawdownPct, currentBalance: effBalance, totalGain, totalGainPct, profitFactor } = trajectory;

  // Chart dimensions & scaling
  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 30, bottom: 35, left: 65 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const minBalance = Math.min(...points.map((p) => p.balance), safeStarting * 0.98);
  const maxBalance = Math.max(...points.map((p) => p.balance), safeStarting * 1.02);
  const balanceRange = Math.max(maxBalance - minBalance, 1);

  const maxDDPctScaled = Math.max(...points.map((p) => p.drawdownPct), 5);

  const getX = (index: number) => {
    if (points.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  const getEquityY = (balance: number) => {
    return padding.top + chartHeight - ((balance - minBalance) / balanceRange) * chartHeight;
  };

  const getDrawdownY = (ddPct: number) => {
    return padding.top + (ddPct / maxDDPctScaled) * chartHeight;
  };

  // Build SVG Path strings
  const equityPointsString = points.map((p, idx) => `${getX(idx)},${getEquityY(p.balance)}`).join(' ');
  const equityAreaPath =
    points.length > 0
      ? `M ${getX(0)},${getEquityY(points[0].balance)} ` +
        points.slice(1).map((p, idx) => `L ${getX(idx + 1)},${getEquityY(p.balance)}`).join(' ') +
        ` L ${getX(points.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`
      : '';

  const drawdownPointsString = points.map((p, idx) => `${getX(idx)},${getDrawdownY(p.drawdownPct)}`).join(' ');
  const drawdownAreaPath =
    points.length > 0
      ? `M ${getX(0)},${padding.top} ` +
        points.map((p, idx) => `L ${getX(idx)},${getDrawdownY(p.drawdownPct)}`).join(' ') +
        ` L ${getX(points.length - 1)},${padding.top} Z`
      : '';

  const startBalanceY = getEquityY(startingBalance);

  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : points[points.length - 1];

  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/75">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Equity &amp; Drawdown Curve
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Activity className="h-3 w-3" />
              Real-Time
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Account growth trajectory and peak-to-trough risk exposure across trades.
          </p>
        </div>

        {/* View Mode & Range Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/70">
            <button
              onClick={() => setViewMode('equity')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === 'equity'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Equity
            </button>
            <button
              onClick={() => setViewMode('drawdown')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === 'drawdown'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Drawdown
            </button>
            <button
              onClick={() => setViewMode('combined')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                viewMode === 'combined'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Combined
            </button>
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100/70 p-1 dark:border-slate-800 dark:bg-slate-900/70">
            <button
              onClick={() => setRangeFilter('all')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                rangeFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRangeFilter('20')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                rangeFilter === '20'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Last 20
            </button>
            <button
              onClick={() => setRangeFilter('10')}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                rangeFilter === '10'
                  ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Last 10
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 gap-3 mb-6 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Peak Balance</p>
          <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
            GHS {peak.toFixed(2)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Drawdown</p>
          <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
            -{maxDrawdownPct.toFixed(2)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current Drawdown</p>
          <p className={`mt-1 text-lg font-bold ${currentDrawdownPct > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {currentDrawdownPct > 0 ? `-${currentDrawdownPct.toFixed(2)}%` : '0.00% (At Peak)'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Profit Factor</p>
          <p className="mt-1 text-lg font-bold text-sky-600 dark:text-sky-400">
            {profitFactor}
          </p>
        </div>
      </div>

      {/* SVG Vector Chart */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-900/5 p-2 dark:border-slate-800/80 dark:bg-slate-950/90">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto max-h-75 overflow-visible select-none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Equity Gradient */}
            <linearGradient id="equityGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>

            {/* Drawdown Gradient */}
            <linearGradient id="drawdownGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.35" />
            </linearGradient>

            {/* Grid Pattern */}
            <pattern id="chartGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeOpacity="0.04" />
            </pattern>
          </defs>

          {/* Background Grid */}
          <rect
            x={padding.left}
            y={padding.top}
            width={chartWidth}
            height={chartHeight}
            fill="url(#chartGrid)"
            className="text-slate-900 dark:text-slate-100"
          />

          {/* Baseline starting balance indicator */}
          <line
            x1={padding.left}
            y1={startBalanceY}
            x2={padding.left + chartWidth}
            y2={startBalanceY}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.6"
          />
          <text
            x={padding.left + 8}
            y={startBalanceY - 6}
            fontSize="10"
            fill="#94a3b8"
            className="font-mono font-medium"
          >
            Start: GHS {startingBalance.toFixed(0)}
          </text>

          {/* Drawdown Underwater Area */}
          {(viewMode === 'drawdown' || viewMode === 'combined') && (
            <>
              <path d={drawdownAreaPath} fill="url(#drawdownGrad)" />
              <polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray={viewMode === 'combined' ? '3 3' : undefined}
                points={drawdownPointsString}
              />
            </>
          )}

          {/* Equity Line & Area */}
          {(viewMode === 'equity' || viewMode === 'combined') && (
            <>
              <path d={equityAreaPath} fill="url(#equityGrad)" />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={equityPointsString}
              />
            </>
          )}

          {/* Y-Axis Value Ticks */}
          <g className="text-slate-400 font-mono text-[10px] select-none" fill="currentColor">
            <text x={padding.left - 8} y={getEquityY(maxBalance)} textAnchor="end" dominantBaseline="middle">
              {maxBalance.toFixed(0)}
            </text>
            <text x={padding.left - 8} y={getEquityY((maxBalance + minBalance) / 2)} textAnchor="end" dominantBaseline="middle">
              {((maxBalance + minBalance) / 2).toFixed(0)}
            </text>
            <text x={padding.left - 8} y={getEquityY(minBalance)} textAnchor="end" dominantBaseline="middle">
              {minBalance.toFixed(0)}
            </text>
          </g>

          {/* Interactive Points and Touch Area */}
          {points.map((point, idx) => {
            const x = getX(idx);
            const y = viewMode === 'drawdown' ? getDrawdownY(point.drawdownPct) : getEquityY(point.balance);
            const isHovered = hoverIndex === idx;

            return (
              <g key={idx} className="cursor-pointer">
                {/* Hover vertical guideline */}
                {isHovered && (
                  <>
                    <line
                      x1={x}
                      y1={padding.top}
                      x2={x}
                      y2={padding.top + chartHeight}
                      stroke="#38bdf8"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                    <circle
                      cx={x}
                      cy={y}
                      r="6"
                      fill="#38bdf8"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="animate-ping opacity-75"
                    />
                  </>
                )}

                {/* Point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? 5 : 3}
                  fill={point.pnl >= 0 ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />

                {/* Invisible wide hit target for smooth hovering */}
                <rect
                  x={x - chartWidth / (points.length * 2 || 1)}
                  y={padding.top}
                  width={chartWidth / (points.length || 1)}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Inspector */}
        {activePoint && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/60 bg-slate-50/80 px-4 py-2.5 rounded-xl dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/10 text-xs font-bold text-sky-600 dark:text-sky-400">
                {activePoint.index === 0 ? '0' : `#${activePoint.index}`}
              </span>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {activePoint.instrument} {activePoint.side ? `(${activePoint.side})` : ''}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {new Date(activePoint.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-right">
              {activePoint.index > 0 && (
                <div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Trade P&amp;L</p>
                  <p className={`text-xs font-bold ${activePoint.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {activePoint.pnl >= 0 ? '+' : ''}GHS {activePoint.pnl.toFixed(2)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Balance</p>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  GHS {activePoint.balance.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">Drawdown</p>
                <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  -{activePoint.drawdownPct.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
