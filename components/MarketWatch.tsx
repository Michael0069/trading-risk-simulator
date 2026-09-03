'use client';

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, AlertCircle } from 'lucide-react';

interface MarketWatchProps {
  marketPrices: any;
  sentiments: any;
}

export default function MarketWatch({ marketPrices, sentiments }: MarketWatchProps) {
  const instruments = ['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'];
  const prevPrices = useRef<{ [key: string]: number }>({});
  const [ticks, setTicks] = useState<{ [key: string]: 'up' | 'down' | null }>({});

  useEffect(() => {
    const nextTicks: { [key: string]: 'up' | 'down' | null } = {};
    instruments.forEach((inst) => {
      const current = marketPrices?.[inst]?.last_price;
      const prev = prevPrices.current[inst];
      if (current !== undefined && prev !== undefined && current !== prev) {
        nextTicks[inst] = current > prev ? 'up' : 'down';
      }
      if (current !== undefined) {
        prevPrices.current[inst] = current;
      }
    });

    if (Object.keys(nextTicks).length > 0) {
      setTicks(nextTicks);
      const timer = setTimeout(() => setTicks({}), 800);
      return () => clearTimeout(timer);
    }
  }, [marketPrices]);

  const getSentimentColor = (label: string) => {
    switch (label) {
      case 'POSITIVE':
        return 'text-green-400';
      case 'NEGATIVE':
        return 'text-red-400';
      default:
        return 'text-yellow-400';
    }
  };

  const getSentimentBgColor = (label: string) => {
    switch (label) {
      case 'POSITIVE':
        return 'bg-green-500/10';
      case 'NEGATIVE':
        return 'bg-red-500/10';
      default:
        return 'bg-yellow-500/10';
    }
  };

  return (
    <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
          <TrendingUp className="h-5 w-5 text-sky-500" />
          Market Watch
        </h2>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live ticks
        </span>
      </div>

      <div className="space-y-3">
        {instruments.map((instrument) => {
          const price = marketPrices[instrument];
          const sentiment = sentiments[instrument];
          const tick = ticks[instrument];

          return (
            <div
              key={instrument}
              className={`rounded-2xl border border-slate-200 bg-slate-50 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-sky-300 hover:bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-500/30 dark:hover:bg-slate-900 ${
                tick === 'up' ? 'tick-up' : tick === 'down' ? 'tick-down' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1">
                  <p className="font-semibold text-slate-950 dark:text-white">{instrument}</p>
                  {price ? (
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-lg font-mono text-sky-700 dark:text-sky-300">
                        {price.last_price.toFixed(instrument === 'EURUSD' || instrument === 'GBPUSD' ? 4 : 2)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Bid: {price.bid.toFixed(instrument === 'EURUSD' || instrument === 'GBPUSD' ? 4 : 2)}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        Ask: {price.ask.toFixed(instrument === 'EURUSD' || instrument === 'GBPUSD' ? 4 : 2)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">Loading...</p>
                  )}
                </div>
              </div>

              {sentiment && (
                <div className={`mt-3 rounded-xl border p-3 ${getSentimentBgColor(sentiment.sentiment_label)}`}>
                  <p className={`text-xs font-semibold ${getSentimentColor(sentiment.sentiment_label)}`}>
                    {sentiment.sentiment_label} (Score: {sentiment.sentiment_score.toFixed(2)})
                  </p>
                  <p className="mt-1 text-xs italic text-slate-600 dark:text-slate-300">&quot;{sentiment.summary}&quot;</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Prices update every 5 seconds. Sentiment analysis is AI-powered.</span>
      </div>
    </div>
  );
}
