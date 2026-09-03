import { Fragment, useState } from 'react';
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Download, Share2, Award, CheckCircle, Copy, X, FileText, Printer } from 'lucide-react';
import { analyzeTrade } from '@/lib/tradeReview';
import EquityChart from './EquityChart';
import PerformanceStatementModal from './PerformanceStatementModal';

interface Trade {
  id: number;
  instrument: string;
  entry_price: number;
  exit_price: number;
  quantity: number;
  side: string;
  pnl: number;
  pnl_percentage: number;
  closed_at: string;
}

interface CoachEvent {
  id: number;
  event_type: string;
  instrument?: string;
  risk_score?: number;
  intervention?: string;
  reasons?: string;
  notes?: string;
  created_at: string;
}

interface TradeHistoryProps {
  trades: Trade[];
  coachEvents?: CoachEvent[];
  analytics?: any;
  startingBalance?: number;
  currentBalance?: number;
  username?: string;
}

export default function TradeHistory({
  trades = [],
  coachEvents = [],
  startingBalance = 10000,
  currentBalance,
  username = 'Demo Trader',
}: TradeHistoryProps) {
  const [openTradeId, setOpenTradeId] = useState<number | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const safeTrades = Array.isArray(trades) ? trades : [];

  if (safeTrades.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/85 p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <p className="text-lg text-slate-700 dark:text-slate-300">No trade history</p>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Closed trades will appear here</p>
      </div>
    );
  }

  const winCount = safeTrades.filter((t) => t.pnl > 0).length;
  const lossCount = safeTrades.filter((t) => t.pnl < 0).length;
  const winRate = safeTrades.length > 0 ? ((winCount / safeTrades.length) * 100).toFixed(1) : '0';
  const totalPnL = safeTrades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = safeTrades.length > 0 ? (totalPnL / safeTrades.length).toFixed(2) : '0';
  const bestWin = safeTrades.reduce((max, t) => (t.pnl > max ? t.pnl : max), 0);

  // Clean execution count
  const cleanTrades = trades.filter((t) => {
    const rev = analyzeTrade(t, coachEvents);
    return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
  }).length;
  const disciplineScore = trades.length > 0 ? Math.round((cleanTrades / trades.length) * 100) : 100;

  const exportCSV = () => {
    const headers = ['ID', 'Instrument', 'Side', 'Review Category', 'Entry Price', 'Exit Price', 'Quantity', 'PnL (GHS)', 'PnL (%)', 'Closed At'];
    const rows = trades.map((t) => {
      const review = analyzeTrade(t, coachEvents);
      return [
        t.id,
        t.instrument,
        t.side,
        `"${review.label}"`,
        t.entry_price,
        t.exit_price,
        t.quantity,
        t.pnl.toFixed(2),
        t.pnl_percentage.toFixed(2),
        `"${new Date(t.closed_at).toISOString()}"`,
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `trade_journal_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Trade Journal &amp; History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Replay execution checkpoints, review psychological habits, and export records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-850"
          >
            <Download className="h-3.5 w-3.5 text-sky-500" />
            Export Journal (.csv)
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 dark:border-sky-800/80 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900"
          >
            <Printer className="h-3.5 w-3.5" />
            Statement (.pdf)
          </button>
          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share Performance
          </button>
        </div>
      </div>

      {/* Interactive Equity & Drawdown Curve */}
      <EquityChart
        trades={trades}
        startingBalance={startingBalance}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Total Trades</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">{trades.length}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Win Rate</p>
          <p className="text-3xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">{winRate}%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">W: {winCount} L: {lossCount}</p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Total P&amp;L</p>
          <p className={`text-3xl font-semibold tracking-tight ${totalPnL >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {totalPnL >= 0 ? '+' : ''}GHS {totalPnL.toFixed(2)}
          </p>
        </div>
        <div className="rounded-[1.5rem] border border-slate-200/80 bg-white/85 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
          <p className="mb-1 text-sm text-slate-500 dark:text-slate-400">Discipline Score</p>
          <p className="text-3xl font-semibold tracking-tight text-sky-600 dark:text-sky-400">
            {disciplineScore}%
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Plan Adherence</p>
        </div>
      </div>

      {/* Trade List */}
      <div className="overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white/85 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Instrument</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Side</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Review / Category</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Entry</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Exit</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">Qty</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">P&amp;L</th>
                <th className="px-6 py-3 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">%</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-slate-600 dark:text-slate-300">Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => {
                const isWin = trade.pnl >= 0;
                const opened = openTradeId === trade.id;
                const review = analyzeTrade(trade, coachEvents);
                const priceRange = Math.abs(trade.exit_price - trade.entry_price);
                const directionSign = trade.side === 'BUY' ? 1 : -1;
                const replaySteps = [
                  { label: 'Entry Point', value: trade.entry_price, note: 'Order opened and risk cap set.' },
                  { label: 'Mid-Session', value: trade.entry_price + priceRange * 0.35 * directionSign, note: 'Volatile price oscillation.' },
                  { label: 'Key Pivot', value: trade.entry_price + priceRange * 0.7 * directionSign, note: 'Tested stop/target boundaries.' },
                  { label: 'Exit Settlement', value: trade.exit_price, note: isWin ? 'Target hit cleanly.' : 'Stop-loss or exit triggered.' },
                ];

                return (
                  <Fragment key={trade.id}>
                  <tr
                    onClick={() => setOpenTradeId(opened ? null : trade.id)}
                    className="cursor-pointer border-b border-slate-100 transition-colors hover:bg-slate-50/80 dark:border-slate-850 dark:hover:bg-slate-900/60"
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-950 dark:text-white">
                      <div className="flex items-center gap-2">
                        {opened ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                        <span>{trade.instrument}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {trade.side === 'BUY' ? (
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-rose-500" />
                        )}
                        <span className={trade.side === 'BUY' ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>
                          {trade.side}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${review.badgeBg} ${review.badgeText} ${review.badgeBorder}`}>
                        <span>{review.label}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-300">
                      {trade.entry_price.toFixed(4)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-mono text-sm text-slate-600 dark:text-slate-300">
                      {trade.exit_price.toFixed(4)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-slate-600 dark:text-slate-300">
                      {trade.quantity.toFixed(2)}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right font-semibold ${
                      isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isWin ? '+' : ''}GHS {trade.pnl.toFixed(2)}
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-right text-sm font-semibold ${
                      isWin ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isWin ? '+' : ''}{trade.pnl_percentage.toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {new Date(trade.closed_at).toLocaleDateString()} {new Date(trade.closed_at).toLocaleTimeString()}
                    </td>
                  </tr>
                  {opened && (
                    <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/80">
                      <td colSpan={9} className="p-5">
                        <div className="space-y-4">
                          {/* Post-Trade Review Diagnosis */}
                          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/90">
                            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-slate-950 dark:text-white">{review.headline}</h4>
                              </div>
                              <span className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${review.badgeBg} ${review.badgeText} ${review.badgeBorder}`}>
                                {review.label}
                              </span>
                            </div>

                            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">{review.diagnosis}</p>
                            <div className="mt-3 rounded-xl bg-sky-50/80 p-3 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                              <span className="font-semibold">Key Coaching Takeaway: </span>
                              {review.takeaway}
                            </div>

                            {/* Factor evaluations */}
                            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                <span className="text-slate-500 dark:text-slate-400">Position Sizing</span>
                                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{review.factors.sizing}</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                <span className="text-slate-500 dark:text-slate-400">Psychology</span>
                                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{review.factors.psychology}</p>
                              </div>
                              <div className="rounded-xl bg-slate-50 p-2 dark:bg-slate-900">
                                <span className="text-slate-500 dark:text-slate-400">Execution Discipline</span>
                                <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">{review.factors.execution}</p>
                              </div>
                            </div>
                          </div>

                          {/* Replay Steps */}
                          <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trade Replay Timeline</p>
                            <div className="grid gap-3 md:grid-cols-4">
                              {replaySteps.map((step) => (
                                <div key={step.label} className="rounded-2xl border border-slate-200/60 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{step.label}</p>
                                  <p className="mt-1 font-mono text-sm font-semibold text-slate-950 dark:text-white">{step.value.toFixed(4)}</p>
                                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{step.note}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Statement & Share Modal */}
      <PerformanceStatementModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        trades={trades}
        coachEvents={coachEvents}
        startingBalance={startingBalance}
        currentBalance={currentBalance}
        username={username}
      />
    </div>
  );
}
