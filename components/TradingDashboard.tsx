import { useState, useEffect, useCallback } from 'react';
import { Zap, ArrowRight, Sliders } from 'lucide-react';
import { portfolioAPI, marketAPI, sentimentAPI, positionAPI, coachAPI, riskAPI, userAPI } from '@/lib/api';
import MarketWatch from './MarketWatch';
import PositionForm from './PositionForm';
import PortfolioStats from './PortfolioStats';
import RiskGuardian from './RiskGuardian';
import OpenPositions from './OpenPositions';
import TradeHistory from './TradeHistory';
import EquityChart from './EquityChart';
import DisciplineGauge from './DisciplineGauge';
import RiskSettingsModal, { type RiskSettings } from './RiskSettingsModal';

interface User {
  id: number;
  username: string;
  current_balance: number;
  starting_balance: number;
}

interface PortfolioData {
  current_balance: number;
  starting_balance: number;
  total_pnl: number;
  win_rate: string;
  total_trades: number;
  open_positions: number;
  winning_trades: number;
  losing_trades: number;
}

interface TradeRecord {
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

interface OpenPosition {
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

interface MarketPriceData {
  bid: number;
  ask: number;
  last_price: number;
  timestamp?: string;
}

interface SentimentData {
  sentiment_label?: string;
  sentiment_score?: number;
  summary?: string;
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

export default function TradingDashboard({ user }: { user: User }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPriceData>>({});
  const [sentiments, setSentiments] = useState<Record<string, SentimentData>>({});
  const [coachEvents, setCoachEvents] = useState<CoachEvent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [riskSettings, setRiskSettings] = useState<RiskSettings | null>(null);
  const [showRiskSettingsModal, setShowRiskSettingsModal] = useState(false);
  const [brokerConfig, setBrokerConfig] = useState<any>(null);
  const [brokerEndpoint, setBrokerEndpoint] = useState('POST /api/risk/suggest-trade');
  const [brokerReason, setBrokerReason] = useState('I want to trade BTC because it looks strong and I want to make money.');
  const [brokerSide, setBrokerSide] = useState('BUY');
  const [brokerConfidence, setBrokerConfidence] = useState(3);
  const [brokerSessionMinutes, setBrokerSessionMinutes] = useState(20);
  const [brokerTradesThisSession, setBrokerTradesThisSession] = useState(1);
  const [brokerResponse, setBrokerResponse] = useState<any>(null);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerError, setBrokerError] = useState('');
  const [prefillTrade, setPrefillTrade] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadRiskSettings = useCallback(async () => {
    try {
      const data = await userAPI.getRiskSettings(user.id);
      if (data) {
        setRiskSettings(data);
      }
    } catch (err) {
      console.error('Failed to load risk settings:', err);
    }
  }, [user.id]);

  const loadPortfolioData = useCallback(async () => {
    try {
      setLoading(true);
      const [portfolioData, tradesData, positionsData, pricesData] = await Promise.all([
        portfolioAPI.getPortfolio(user.id),
        portfolioAPI.getTrades(user.id),
        positionAPI.getPositions(user.id),
        marketAPI.getAllPrices(),
      ]);

      setPortfolio(portfolioData);
      setTrades(tradesData);
      setPositions(positionsData);
      setMarketPrices(pricesData);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  const loadSentiments = useCallback(async () => {
    try {
      const instruments = ['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'];
      const sentimentData: Record<string, SentimentData> = {};

      for (const instrument of instruments) {
        try {
          const data = await sentimentAPI.getSentiment(instrument);
          sentimentData[instrument] = data;
        } catch {
          // Sentiment might not exist yet
        }
      }

      setSentiments(sentimentData);
    } catch (err) {
      console.error('Failed to load sentiments:', err);
    }
  }, []);

  const loadCoachData = useCallback(async () => {
    try {
      const [eventsData, analyticsData, brokerData] = await Promise.all([
        coachAPI.getEvents(user.id),
        coachAPI.getAnalytics(user.id),
        coachAPI.getBrokerDemoConfig(),
      ]);

      setCoachEvents(eventsData);
      setAnalytics(analyticsData);
      setBrokerConfig(brokerData);
    } catch (err) {
      console.error('Failed to load coach data:', err);
    }
  }, [user.id]);

  const updateMarketData = async () => {
    try {
      await Promise.all([
        marketAPI.updatePrices(),
        sentimentAPI.updateSentiments(),
      ]);
      await loadPortfolioData();
      await loadSentiments();
    } catch (err) {
      console.error('Failed to update market data:', err);
    }
  };

  useEffect(() => {
    loadPortfolioData();
    loadSentiments();
    loadCoachData();
    loadRiskSettings();

    // Update market data every 5 seconds
    const interval = setInterval(updateMarketData, 5000);
    return () => clearInterval(interval);
  }, [user.id, loadCoachData, loadPortfolioData, loadSentiments, loadRiskSettings]);

  const handlePositionOpened = async () => {
    setPrefillTrade(null);
    await loadPortfolioData();
    await loadSentiments();
    await loadCoachData();
    setActiveTab('positions');
  };

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  const runBrokerTest = async () => {
    setBrokerLoading(true);
    setBrokerError('');
    setBrokerResponse(null);

    try {
      if (brokerEndpoint.includes('suggest-trade')) {
        const result = await riskAPI.suggestTrade({
          user_id: user.id,
          reason: brokerReason,
          side: brokerSide,
          confidence_level: brokerConfidence,
          session_minutes: brokerSessionMinutes,
          trades_this_session: brokerTradesThisSession,
        });
        setBrokerResponse(result);
      } else if (brokerEndpoint.includes('pretrade-assess')) {
        const result = await riskAPI.pretradeAssess({
          user_id: user.id,
          instrument: 'BTCUSD',
          side: brokerSide,
          amount_at_risk: 25,
          reason: brokerReason,
          followed_strategy: true,
          chasing_losses: false,
          confidence_level: brokerConfidence,
          session_minutes: brokerSessionMinutes,
          trades_this_session: brokerTradesThisSession,
        });
        setBrokerResponse(result);
      } else if (brokerEndpoint.includes('coach/events')) {
        const result = await coachAPI.getEvents(user.id);
        setBrokerResponse(result);
      } else if (brokerEndpoint.includes('analytics')) {
        const result = await coachAPI.getAnalytics(user.id);
        setBrokerResponse(result);
      } else {
        const result = await coachAPI.getBrokerDemoConfig();
        setBrokerResponse(result);
      }
    } catch (err: any) {
      setBrokerError(err.message || 'Broker test failed');
    } finally {
      setBrokerLoading(false);
    }
  };

  const getBrokerResultTone = (response: any) => {
    if (!response) return 'neutral';
    if (response.accepted_reason === false) return 'caution';
    if (response.accepted_reason === true) return 'success';
    return 'neutral';
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.04),transparent_28%),linear-gradient(180deg,rgba(248,250,252,1),rgba(241,245,249,1))] text-slate-900 dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_24%),linear-gradient(180deg,rgba(2,6,23,1),rgba(15,23,42,1))] dark:text-slate-50">
      {/* Background Animated Aurora Glows */}
      <div className="pointer-events-none absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl filter animate-aurora dark:bg-sky-500/10" />
      <div className="pointer-events-none absolute top-1/2 -right-20 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl filter animate-aurora [animation-delay:6s] dark:bg-indigo-600/10" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        {/* Header */}
        <div className="premium-card animate-stagger-1 mb-6 rounded-[2rem] px-6 py-5 shadow-sm border border-slate-200/80 dark:border-slate-800/80 dark:bg-slate-950/70 sm:px-8 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                Trading workspace
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">TradeDNA Coach</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
                Behavioral risk coaching with pre-trade interventions, live market simulation, and disciplined execution controls.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRiskSettingsModal(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:scale-105 hover:bg-sky-100 active:scale-95 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-300 dark:hover:bg-sky-900"
                >
                  <Sliders className="h-4 w-4" />
                  Risk Guardrails
                </button>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-ring" />
                  Live session
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Risk engine', '2% cap enforced on every trade'],
              ['Behavioral AI', 'Pre-trade score: allow, warn, or block'],
              ['Market mode', 'Simulated prices and sentiment'],
              ['Coach logs', 'Every intervention is recorded for review'],
            ].map(([title, description]) => (
              <div key={title} className="premium-card p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900/70">
                <p className="text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Overview */}
        {portfolio && (
          <PortfolioStats 
            portfolio={portfolio} 
            user={user}
          />
        )}

        {error && (
          <div className="animate-pop-in bg-red-500/10 border border-red-500 text-red-200 px-4 py-3 rounded-2xl mb-4">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="premium-card mb-6 rounded-[1.5rem] p-2 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`premium-tab ${
                activeTab === 'dashboard'
                  ? 'premium-tab-active'
                  : 'premium-tab-inactive'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('trade')}
              className={`premium-tab ${
                activeTab === 'trade'
                  ? 'premium-tab-active'
                  : 'premium-tab-inactive'
              }`}
            >
              Open Trade
            </button>
            <button
              onClick={() => setActiveTab('positions')}
              className={`premium-tab ${
                activeTab === 'positions'
                  ? 'premium-tab-active'
                  : 'premium-tab-inactive'
              }`}
            >
              Open Positions ({positions.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`premium-tab ${
                activeTab === 'history'
                  ? 'premium-tab-active'
                  : 'premium-tab-inactive'
              }`}
            >
              Trade History
            </button>
            <button
              onClick={() => setActiveTab('broker')}
              className={`premium-tab ${
                activeTab === 'broker'
                  ? 'premium-tab-active'
                  : 'premium-tab-inactive'
              }`}
            >
              Broker API
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 pt-1">
          {activeTab === 'dashboard' && (
            <div className="animate-stagger-1 space-y-6">
              {/* Interactive Equity & Drawdown Curve */}
              <EquityChart
                trades={trades}
                startingBalance={user.starting_balance || 10000}
                currentBalance={portfolio?.current_balance || user.current_balance}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MarketWatch marketPrices={marketPrices} sentiments={sentiments} />
                <RiskGuardian 
                  balance={portfolio?.current_balance || user.current_balance}
                  riskSettings={riskSettings}
                  onOpenSettings={() => setShowRiskSettingsModal(true)}
                />
              </div>

              {/* Behavioral Discipline Compliance Gauge */}
              <DisciplineGauge
                trades={trades}
                coachEvents={coachEvents}
                analytics={analytics}
              />

              {/* TradeDNA Performance Pulse */}
              {analytics && (
                <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950 dark:text-white">TradeDNA Performance Pulse</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Behavioral insights and optimal trading timing.</p>
                    </div>
                    <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-500/10 dark:text-sky-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
                      Live Analytics
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Best Hour</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                        {analytics.best_hour !== null && analytics.best_hour !== undefined ? `${analytics.best_hour}:00` : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Worst Hour</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                        {analytics.worst_hour !== null && analytics.worst_hour !== undefined ? `${analytics.worst_hour}:00` : 'N/A'}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Avg Hold Time</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                        {analytics.avg_hold_minutes?.toFixed?.(1) ?? '0.0'}m
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-4 transition hover:-translate-y-0.5 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Loss Streak</p>
                      <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">
                        {analytics.loss_streak ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trade' && (
            <div className="animate-stagger-1">
              <PositionForm 
                userId={user.id}
                balance={portfolio?.current_balance || user.current_balance}
                onPositionOpened={handlePositionOpened}
                marketPrices={marketPrices}
                prefillData={prefillTrade}
              />
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="animate-stagger-1">
              <OpenPositions 
                positions={positions}
                marketPrices={marketPrices}
                onPositionClosed={loadPortfolioData}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-stagger-1">
              <TradeHistory
                trades={trades}
                coachEvents={coachEvents}
                analytics={analytics}
                startingBalance={user.starting_balance || 10000}
                currentBalance={portfolio?.current_balance}
                username={user.username}
              />
            </div>
          )}

          {activeTab === 'broker' && brokerConfig && (
            <div className="animate-stagger-1 space-y-6">
              <div className="rounded-[2rem] border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Broker Mode</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">TradeDNA API Demo</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This is the B2B-style version: a broker can plug the risk engine into their own app.
                </p>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Demo API Key</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-950 dark:text-white">{brokerConfig.api_key}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Base URL</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-950 dark:text-white">{brokerConfig.base_url}</p>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Available Endpoints</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {brokerConfig.endpoints.map((endpoint: string) => (
                      <button
                        key={endpoint}
                        type="button"
                        onClick={() => setBrokerEndpoint(endpoint)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                          brokerEndpoint === endpoint
                            ? 'border-sky-500 bg-sky-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:text-sky-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200'
                        }`}
                      >
                        {endpoint}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-500/30 dark:bg-sky-500/10">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">Selected Endpoint: {brokerEndpoint}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300">
                        {brokerEndpoint.includes('suggest-trade') && 'AI Coach Trade Builder — Analyzes trader idea, checks sentiment, and auto-calculates safe entry, stop loss, and target.'}
                        {brokerEndpoint.includes('pretrade-assess') && 'Pre-Trade Risk Guardian — Evaluates loss streaks, overtrading, and emotional indicators to return ALLOW, WARN, or BLOCK.'}
                        {brokerEndpoint.includes('coach/events') && 'Coaching Audit Log — Retrieves the chronological list of all interventions and behavioral assessments.'}
                        {brokerEndpoint.includes('analytics') && 'Behavioral Performance Analytics — Returns win rate, loss streak, best/worst hours, and average holding time.'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(brokerEndpoint)}
                      className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm dark:bg-slate-950 dark:text-slate-200"
                    >
                      Copy endpoint
                    </button>
                  </div>
                </div>

                {/* Test Payload Area */}
                <div className="mt-5 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">Test Request Parameters</p>
                  
                  {brokerEndpoint.includes('coach/events') || brokerEndpoint.includes('analytics') ? (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                      <span className="font-semibold">HTTP Method: GET</span> — No request body required. The API automatically queries records for user ID <code className="font-mono font-bold text-sky-500">{user.id}</code> using your broker API key.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                          {brokerEndpoint.includes('suggest-trade') ? 'Trader Idea / Prompt' : 'Trade Setup Reason'}
                        </label>
                        <textarea
                          value={brokerReason}
                          onChange={(e) => setBrokerReason(e.target.value)}
                          rows={2}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                          placeholder="e.g. I want to buy BTC after pullback"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Direction (Side)</label>
                        <select
                          value={brokerSide}
                          onChange={(e) => setBrokerSide(e.target.value)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          <option value="BUY">BUY</option>
                          <option value="SELL">SELL</option>
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Confidence Level (1-5)</label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={brokerConfidence}
                          onChange={(e) => setBrokerConfidence(Number(e.target.value) || 1)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Time Trading Today (Min)</label>
                        <input
                          type="number"
                          min="1"
                          value={brokerSessionMinutes}
                          onChange={(e) => setBrokerSessionMinutes(Number(e.target.value) || 1)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Trades Opened Today</label>
                        <input
                          type="number"
                          min="0"
                          value={brokerTradesThisSession}
                          onChange={(e) => setBrokerTradesThisSession(Number(e.target.value) || 0)}
                          className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={runBrokerTest}
                    disabled={brokerLoading}
                    className="mt-4 flex items-center gap-2 rounded-2xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60 transition"
                  >
                    <span>{brokerLoading ? 'Calling API...' : `Execute ${brokerEndpoint.split(' ')[0]} Request`}</span>
                  </button>

                  {brokerError && (
                    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                      {brokerError}
                    </div>
                  )}

                  {/* Broker Response Cards */}
                  {brokerResponse && (
                    <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
                      
                      {/* 1. Pretrade Assess Response */}
                      {brokerResponse.score !== undefined && (
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">TradeDNA Behavioral Assessment</p>
                              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                                Risk Score: {brokerResponse.score}/100 ({brokerResponse.risk_level})
                              </h3>
                            </div>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                              brokerResponse.intervention === 'BLOCK'
                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : brokerResponse.intervention === 'WARN'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}>
                              Intervention: {brokerResponse.intervention}
                            </span>
                          </div>

                          <div className="mt-4 rounded-xl bg-sky-50/70 p-3 text-xs text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                            <span className="font-semibold">Coaching Advice: </span>
                            {brokerResponse.coaching_prompt}
                          </div>

                          {brokerResponse.reasons?.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Behavioral Triggers Detected:</p>
                              <ul className="mt-1 space-y-1 text-xs text-slate-700 dark:text-slate-300">
                                {brokerResponse.reasons.map((r: string, idx: number) => (
                                  <li key={idx} className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                    <span>{r}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 2. Suggest Trade Response */}
                      {brokerResponse.entry_price !== undefined && (
                        <div>
                          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">AI Coach Setup Generated</p>
                              <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{brokerResponse.feedback}</h3>
                              {brokerResponse.suggested_reason && (
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{brokerResponse.suggested_reason}</p>
                              )}
                            </div>
                            <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              Setup Ready
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Instrument</p>
                              <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{brokerResponse.instrument} ({brokerResponse.side})</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Entry</p>
                              <p className="mt-0.5 font-mono text-sm font-bold text-slate-900 dark:text-white">{brokerResponse.entry_price}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Stop Loss</p>
                              <p className="mt-0.5 font-mono text-sm font-bold text-rose-600 dark:text-rose-400">{brokerResponse.stop_loss}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Take Profit</p>
                              <p className="mt-0.5 font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">{brokerResponse.take_profit}</p>
                            </div>
                          </div>

                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPrefillTrade(brokerResponse);
                                setActiveTab('trade');
                              }}
                              className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-sky-500 transition"
                            >
                              <Zap className="h-3.5 w-3.5" />
                              <span>Use in Open Trade</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(JSON.stringify(brokerResponse, null, 2))}
                              className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
                            >
                              Copy JSON
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 3. Analytics Response */}
                      {brokerResponse.total_trades !== undefined && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trader Behavioral Health Report</p>
                          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Total Trades</p>
                              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">{brokerResponse.total_trades}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Win Rate</p>
                              <p className="mt-0.5 text-base font-bold text-emerald-600 dark:text-emerald-400">{brokerResponse.win_rate}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Total P&amp;L</p>
                              <p className="mt-0.5 text-base font-bold text-slate-900 dark:text-white">GHS {Number(brokerResponse.total_pnl || 0).toFixed(2)}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 text-center dark:bg-slate-900">
                              <p className="text-[11px] text-slate-400">Loss Streak</p>
                              <p className="mt-0.5 text-base font-bold text-amber-600 dark:text-amber-400">{brokerResponse.loss_streak}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. Events Array Response */}
                      {Array.isArray(brokerResponse) && (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Coaching Events Audit ({brokerResponse.length} Records)
                          </p>
                          <div className="mt-3 max-h-60 overflow-y-auto space-y-2">
                            {brokerResponse.slice(0, 8).map((evt: any, i: number) => (
                              <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs dark:bg-slate-900">
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white">{evt.event_type}</span>
                                  {evt.instrument && <span className="ml-1.5 text-slate-500">({evt.instrument})</span>}
                                  <p className="text-slate-500 dark:text-slate-400 mt-0.5">{evt.reasons || evt.notes || 'Routine check'}</p>
                                </div>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  evt.intervention === 'BLOCK' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                }`}>
                                  {evt.intervention || 'ALLOW'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw JSON toggle */}
                      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <details className="text-xs text-slate-500">
                          <summary className="cursor-pointer font-medium hover:text-sky-500">View Raw API Response JSON</summary>
                          <pre className="mt-2 max-h-48 overflow-x-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-200">
                            {JSON.stringify(brokerResponse, null, 2)}
                          </pre>
                        </details>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  {brokerConfig.notes.map((note: string) => (
                    <div key={note} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
                      {note}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Customizable Risk Guardrails Modal */}
      <RiskSettingsModal
        isOpen={showRiskSettingsModal}
        onClose={() => setShowRiskSettingsModal(false)}
        userId={user.id}
        currentBalance={portfolio?.current_balance || user.current_balance}
        onSaved={(newSettings) => setRiskSettings(newSettings)}
      />
    </div>
  );
}
