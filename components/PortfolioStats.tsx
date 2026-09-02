'use client';

interface PortfolioStatsProps {
  portfolio: any;
  user: any;
}

export default function PortfolioStats({ portfolio, user }: PortfolioStatsProps) {
  const totalPnL = portfolio?.total_pnl || 0;
  const pnlPercentage = ((totalPnL / user.starting_balance) * 100).toFixed(2);
  const pnlPositive = totalPnL >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 mb-8 md:grid-cols-2 xl:grid-cols-4">
      <div className="premium-card animate-stagger-1 rounded-[1.75rem] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Account Balance</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          GHS {portfolio?.current_balance?.toFixed(2) || '0.00'}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Started: GHS {user.starting_balance?.toFixed(2)}</p>
      </div>

      <div className="premium-card animate-stagger-2 rounded-[1.75rem] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total P&amp;L</p>
        <p className={`mt-2 text-3xl font-bold tracking-tight ${pnlPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {pnlPositive ? '+' : '-'}GHS {Math.abs(totalPnL).toFixed(2)}
        </p>
        <p className={`mt-2 text-xs font-semibold ${pnlPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {pnlPositive ? '+' : ''}{pnlPercentage}%
        </p>
      </div>

      <div className="premium-card animate-stagger-3 rounded-[1.75rem] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Win Rate</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{portfolio?.win_rate || '0%'}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          W: {portfolio?.winning_trades || 0} / L: {portfolio?.losing_trades || 0}
        </p>
      </div>

      <div className="premium-card animate-stagger-4 rounded-[1.75rem] p-6 transition duration-200 hover:-translate-y-1 hover:shadow-lg dark:bg-slate-950/70 border border-slate-200/80 dark:border-slate-800/80">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Open Positions</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{portfolio?.open_positions || 0}</p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Total Trades: {portfolio?.total_trades || 0}</p>
      </div>
    </div>
  );
}
