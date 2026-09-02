'use client';

import { useState } from 'react';
import { CheckCircle, Copy, FileText, Printer, Share2, ShieldCheck, X } from 'lucide-react';
import { analyzeTrade } from '@/lib/tradeReview';

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

interface PerformanceStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: Trade[];
  coachEvents?: CoachEvent[];
  startingBalance?: number;
  currentBalance?: number;
  username?: string;
}

export default function PerformanceStatementModal({
  isOpen,
  onClose,
  trades,
  coachEvents = [],
  startingBalance = 10000,
  currentBalance,
  username = 'Demo Trader',
}: PerformanceStatementModalProps) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  if (!isOpen) return null;

  const winCount = trades.filter((t) => t.pnl > 0).length;
  const lossCount = trades.filter((t) => t.pnl < 0).length;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0';
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = trades.length > 0 ? (totalPnL / trades.length).toFixed(2) : '0';
  const bestWin = trades.reduce((max, t) => (t.pnl > max ? t.pnl : max), 0);

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00';

  // Discipline metrics
  const cleanTrades = trades.filter((t) => {
    const rev = analyzeTrade(t, coachEvents);
    return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
  }).length;
  const disciplineScore = trades.length > 0 ? Math.round((cleanTrades / trades.length) * 100) : 100;

  const traderRank =
    disciplineScore >= 85 && parseFloat(winRate) >= 55
      ? 'Master Prop Trader (Elite)'
      : disciplineScore >= 70
      ? 'Disciplined Operator (Verified)'
      : 'Developing Trader (In-Training)';

  const finalBalance = currentBalance ?? (startingBalance + totalPnL);
  const returnOnCapital = startingBalance > 0 ? ((totalPnL / startingBalance) * 100).toFixed(2) : '0.00';

  const generatePrintableHTML = () => {
    const tradeRows = trades
      .map((t) => {
        const rev = analyzeTrade(t, coachEvents);
        const pnlFormatted = `${t.pnl >= 0 ? '+' : ''}GHS ${t.pnl.toFixed(2)}`;
        const pnlColor = t.pnl >= 0 ? '#166534' : '#991b1b';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 6px 8px; font-weight: 600; color: #475569;">#${t.id}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${t.instrument}</td>
            <td style="padding: 6px 8px; color: ${t.side === 'BUY' ? '#166534' : '#991b1b'}; font-weight: 700;">${t.side}</td>
            <td style="padding: 6px 8px; color: #334155;">${t.quantity}</td>
            <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${t.entry_price.toFixed(t.instrument.includes('USD') ? 4 : 2)}</td>
            <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${t.exit_price.toFixed(t.instrument.includes('USD') ? 4 : 2)}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: ${pnlColor}; font-family: monospace;">${pnlFormatted}</td>
            <td style="padding: 6px 8px; color: #64748b;">${rev.label}</td>
            <td style="padding: 6px 8px; color: #64748b;">${new Date(t.closed_at).toLocaleDateString()}</td>
          </tr>
        `;
      })
      .join('');
    const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    const pdfFilename = `TradeDNA_Statement_${cleanUsername}_${dateStr}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${pdfFilename}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { display: inline-block; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 24px; }
          .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .metric-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .metric-value { font-size: 17px; font-weight: 800; margin-top: 3px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 10px; }
          th { background: #f1f5f9; color: #475569; padding: 8px; font-size: 10px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
          .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #64748b; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TradeDNA Performance Statement</h1>
            <p class="subtitle">Audited Paper Trading Record &bull; Behavioral Risk Report</p>
            <p style="font-size: 11px; margin-top: 6px; color: #475569;">Trader: <strong style="color: #0f172a;">${username}</strong> &bull; Generated: <strong>${new Date().toLocaleDateString()}</strong></p>
          </div>
          <div style="text-align: right;">
            <div class="badge">${traderRank}</div>
            <p style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 6px;">TradeDNA Verified</p>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value" style="color: #166534;">${winRate}%</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${winCount}W / ${lossCount}L</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Net P&L</div>
            <div class="metric-value" style="color: ${totalPnL >= 0 ? '#166534' : '#991b1b'};">
              ${totalPnL >= 0 ? '+' : ''}GHS ${totalPnL.toFixed(2)}
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${returnOnCapital}% ROC</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Plan Adherence</div>
            <div class="metric-value" style="color: #334155;">${disciplineScore}%</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${cleanTrades}/${trades.length} Clean</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Profit Factor</div>
            <div class="metric-value" style="color: #334155;">${profitFactor}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Avg GHS ${avgPnL}</div>
          </div>
        </div>

        <h3 style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: #334155;">Audited Trade Executions (${trades.length} Closed Trades)</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Asset</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>P&L (GHS)</th>
              <th>Diagnosis</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${tradeRows}
          </tbody>
        </table>

        <div class="footer">
          <span>TradeDNA Risk Guardian &bull; Confidential Trading Statement</span>
          <span>Starting: GHS ${startingBalance.toFixed(2)} &bull; Ending: GHS ${finalBalance.toFixed(2)}</span>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to download or print your PDF statement.');
      return;
    }
    printWindow.document.write(generatePrintableHTML());
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleNativeShare = async () => {
    const shareText = `📊 TradeDNA Verified Trading Statement for ${username}\n` +
      `• Win Rate: ${winRate}% (${winCount}W / ${lossCount}L)\n` +
      `• Total P&L: ${totalPnL >= 0 ? '+' : ''}GHS ${totalPnL.toFixed(2)} (${returnOnCapital}% Return)\n` +
      `• Plan Adherence: ${disciplineScore}%\n` +
      `• Profit Factor: ${profitFactor}\n` +
      `• Rank: ${traderRank}\n\n` +
      `Verified via TradeDNA Risk Guardian`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `TradeDNA Performance Statement - ${username}`,
          text: shareText,
          url: window.location.origin,
        });
        setShared(true);
        setTimeout(() => setShared(false), 2500);
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-400">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">Performance Statement &amp; Share</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Audited trading performance statement and shareable scorecard</p>
          </div>
        </div>

        {/* Statement Card Preview */}
        <div className="mt-5 overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-5 text-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-sky-400" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Official Statement</p>
                <p className="text-sm font-bold text-white">{username}</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
              {traderRank}
            </span>
          </div>

          <div className="my-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Win Rate</p>
              <p className="mt-1 text-xl font-black text-emerald-400">{winRate}%</p>
              <p className="text-[10px] text-slate-400">{winCount}W / {lossCount}L</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total P&amp;L</p>
              <p className={`mt-1 text-xl font-black ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? '+' : ''}GHS {totalPnL.toFixed(0)}
              </p>
              <p className="text-[10px] text-slate-400">{returnOnCapital}% Return</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plan Adherence</p>
              <p className="mt-1 text-xl font-black text-sky-400">{disciplineScore}%</p>
              <p className="text-[10px] text-slate-400">{cleanTrades}/{trades.length} Clean</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 p-3 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Profit Factor</p>
              <p className="mt-1 text-xl font-black text-amber-400">{profitFactor}</p>
              <p className="text-[10px] text-slate-400">Avg GHS {avgPnL}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
            <span>Starting: <strong>GHS {startingBalance.toFixed(2)}</strong></span>
            <span>Current: <strong>GHS {finalBalance.toFixed(2)}</strong></span>
            <span>Best: <strong className="text-emerald-400">+GHS {bestWin.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={handlePrintPDF}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-500 active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            Download PDF / Print Statement
          </button>
          <button
            type="button"
            onClick={handleNativeShare}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-750 active:scale-[0.98]"
          >
            {copied || shared ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4 text-sky-500" />}
            {copied ? 'Copied Summary!' : shared ? 'Shared Successfully!' : 'Share Performance'}
          </button>
        </div>
      </div>
    </div>
  );
}
