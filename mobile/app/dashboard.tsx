import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { coachAPI, marketAPI, portfolioAPI, positionAPI, riskAPI, sentimentAPI, userAPI } from '../lib/api';
import { clearSession } from '../lib/session';
import { canOpenTrade, interventionTone, parseTradeOpenError } from '../lib/tradeFlow';
import {
  getBrokerResultLabel,
  getBrokerResultTone,
  isBehaviorAssessResponse,
  isTradeSuggestionResponse,
} from '../lib/brokerUi';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import ThemeToggle from '../components/ThemeToggle';
import MobileEquityChart from '../components/MobileEquityChart';
import MobileDisciplineGauge from '../components/MobileDisciplineGauge';
import MobileMarketWatch from '../components/MobileMarketWatch';
import MobileRiskSettingsModal, { type MobileRiskSettings } from '../components/MobileRiskSettingsModal';
import MobilePerformanceStatementModal from '../components/MobilePerformanceStatementModal';
import { pnlColor, useTheme, type Palette } from '../lib/theme-context';
import { analyzeMobileTrade } from '../lib/tradeReview';

type TabKey = 'dashboard' | 'trade' | 'positions' | 'history' | 'broker';

interface MarketPriceData {
  bid: number;
  ask: number;
  last_price: number;
}

interface SentimentData {
  sentiment_label?: string;
  sentiment_score?: number;
  summary?: string;
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

const instruments = ['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'];

function formatGhs(value: number) {
  return `GHS ${Number(value || 0).toFixed(2)}`;
}

export default function DashboardScreen() {
  const params = useLocalSearchParams<{
    userId?: string;
    username?: string;
    currentBalance?: string;
    startingBalance?: string;
  }>();

  const userId = Number(params.userId || 0);
  const username = params.username || 'Trader';
  const fallbackBalance = Number(params.currentBalance || 0);
  const fallbackStartingBalance = Number(params.startingBalance || 0);

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [portfolio, setPortfolio] = useState<any>(null);
  const [trades, setTrades] = useState<TradeRecord[]>([]);
  const [positions, setPositions] = useState<OpenPosition[]>([]);
  const [marketPrices, setMarketPrices] = useState<Record<string, MarketPriceData>>({});
  const [priceHistory, setPriceHistory] = useState<Record<string, number[]>>({});
  const [sentiments, setSentiments] = useState<Record<string, SentimentData>>({});
  const [coachEvents, setCoachEvents] = useState<CoachEvent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [riskSettings, setRiskSettings] = useState<MobileRiskSettings | null>(null);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [brokerConfig, setBrokerConfig] = useState<any>(null);
  const [replayTradeId, setReplayTradeId] = useState<number | null>(null);

  const [instrument, setInstrument] = useState('AAPL');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
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
  const [tradeLoading, setTradeLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [tradeSuccess, setTradeSuccess] = useState('');
  const [tradeError, setTradeError] = useState('');
  const [validation, setValidation] = useState<any>(null);
  const [behavior, setBehavior] = useState<any>(null);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const [simPreset, setSimPreset] = useState<'tp' | 'sl' | 'drop2' | 'gain2' | 'custom'>('tp');
  const [simOffsetPct, setSimOffsetPct] = useState<number>(0);
  const [showShareModal, setShowShareModal] = useState(false);

  const sharePerformanceRecap = async () => {
    const cleanTrades = trades.filter((t) => {
      const rev = analyzeMobileTrade(t, coachEvents, isDarkMode);
      return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
    }).length;
    const disciplineScore = trades.length > 0 ? Math.round((cleanTrades / trades.length) * 100) : 100;

    const message = [
      `📊 TradeDNA Performance Summary`,
      `• Total Trades: ${trades.length}`,
      `• Win Rate: ${summary.winRate}%`,
      `• Total P&L: ${summary.totalPnL >= 0 ? '+' : ''}${formatGhs(summary.totalPnL)}`,
      `• Average P&L: ${formatGhs(summary.avgPnL)}`,
      `• Discipline Score: ${disciplineScore}% Plan Adherence`,
      `Verified via TradeDNA Risk Guardian`,
    ].join('\n');

    try {
      await Share.share({ message });
    } catch {
      // ignore
    }
  };

  const exportCsvSummary = async () => {
    const headers = ['ID,Instrument,Side,Review,Entry,Exit,Quantity,PnL_GHS,PnL_Pct,Date'];
    const rows = trades.map((t) => {
      const rev = analyzeMobileTrade(t, coachEvents, isDarkMode);
      return `${t.id},${t.instrument},${t.side},"${rev.label}",${t.entry_price},${t.exit_price},${t.quantity},${Number(t.pnl || 0).toFixed(2)},${Number(t.pnl_percentage || 0).toFixed(2)},"${new Date(t.closed_at).toISOString()}"`;
    });
    const content = [headers, ...rows].join('\n');
    try {
      const cleanUsername = (username || 'trader').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `TradeDNA_Journal_${cleanUsername}_${dateStr}.csv`;
      const fileUri = `${FileSystem.documentDirectory || ''}${filename}`;

      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: filename,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        await Share.share({ title: filename, message: content });
      }
    } catch {
      // ignore
    }
  };

  const [brokerEndpoint, setBrokerEndpoint] = useState('POST /api/risk/suggest-trade');
  const [brokerReason, setBrokerReason] = useState('I want to trade BTC because it looks strong and I want to make money.');
  const [brokerSide, setBrokerSide] = useState<'BUY' | 'SELL'>('BUY');
  const [brokerConfidence, setBrokerConfidence] = useState(3);
  const [brokerSessionMinutes, setBrokerSessionMinutes] = useState(20);
  const [brokerTradesThisSession, setBrokerTradesThisSession] = useState(1);
  const [brokerLoading, setBrokerLoading] = useState(false);
  const [brokerError, setBrokerError] = useState('');
  const [brokerResponse, setBrokerResponse] = useState<any>(null);
  const [showBrokerRaw, setShowBrokerRaw] = useState(false);

  const currentBalance = portfolio?.current_balance ?? fallbackBalance;
  const startingBalance = portfolio?.starting_balance ?? fallbackStartingBalance;
  const { isDark: isDarkMode, palette } = useTheme();
  const colorPnl = (value: number) => pnlColor(value, isDarkMode);

  const submitAllowed = canOpenTrade(validation, behavior, confirmHighRisk);
  const behaviorTone = interventionTone(behavior?.intervention);
  const styles = useMemo(() => createStyles(palette, isDarkMode), [palette, isDarkMode]);

  const summary = useMemo(() => {
    const wins = trades.filter((t) => t.pnl > 0).length;
    const losses = trades.filter((t) => t.pnl < 0).length;
    const totalPnL = trades.reduce((acc, t) => acc + Number(t.pnl || 0), 0);
    const avgPnL = trades.length ? totalPnL / trades.length : 0;
    const winRate = trades.length ? ((wins / trades.length) * 100).toFixed(1) : '0.0';
    return { wins, losses, totalPnL, avgPnL, winRate };
  }, [trades]);

  const pnlPulse = useMemo(() => {
    const recent = trades.slice(0, 8).reverse();
    if (!recent.length) return [];

    const maxAbs = Math.max(...recent.map((item) => Math.abs(Number(item.pnl || 0))), 1);
    return recent.map((item) => {
      const pnl = Number(item.pnl || 0);
      const ratio = Math.max(0.15, Math.abs(pnl) / maxAbs);
      return {
        id: item.id,
        pnl,
        height: 26 + Math.round(54 * ratio),
      };
    });
  }, [trades]);

  const loadSentiments = useCallback(async () => {
    const next: Record<string, SentimentData> = {};
    for (const symbol of instruments) {
      try {
        next[symbol] = await sentimentAPI.getSentiment(symbol);
      } catch {
        // Sentiment endpoint may not have all symbols every cycle.
      }
    }
    setSentiments(next);
  }, []);

  const appendPriceHistory = useCallback((snapshot: Record<string, MarketPriceData>) => {
    setPriceHistory((prev) => {
      const next: Record<string, number[]> = { ...prev };
      for (const [symbol, quote] of Object.entries(snapshot)) {
        const lastPrice = Number(quote?.last_price || 0);
        if (!lastPrice) {
          continue;
        }

        const existing = next[symbol] || [];
        next[symbol] = [...existing, lastPrice].slice(-16);
      }
      return next;
    });
  }, []);

  const loadAllData = useCallback(async () => {
    if (!userId) {
      router.replace('/login');
      return;
    }

    try {
      const [portfolioData, tradesData, positionsData, pricesData, eventsData, analyticsData, brokerData, riskData] = await Promise.all([
        portfolioAPI.getPortfolio(userId),
        portfolioAPI.getTrades(userId),
        positionAPI.getPositions(userId),
        marketAPI.getAllPrices(),
        coachAPI.getEvents(userId),
        coachAPI.getAnalytics(userId),
        coachAPI.getBrokerDemoConfig(),
        userAPI.getRiskSettings(userId).catch(() => null),
      ]);

      setPortfolio(portfolioData);
      setTrades(tradesData);
      setPositions(positionsData);
      setMarketPrices(pricesData);
      appendPriceHistory(pricesData);
      setCoachEvents(eventsData);
      setAnalytics(analyticsData);
      setBrokerConfig(brokerData);
      if (riskData) {
        setRiskSettings(riskData);
      }
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [appendPriceHistory, userId]);

  const refreshMarketData = useCallback(async () => {
    try {
      await Promise.all([marketAPI.updatePrices(), sentimentAPI.updateSentiments()]);
      const [pricesData, portfolioData, positionsData, tradesData] = await Promise.all([
        marketAPI.getAllPrices(),
        portfolioAPI.getPortfolio(userId),
        positionAPI.getPositions(userId),
        portfolioAPI.getTrades(userId),
      ]);

      setMarketPrices(pricesData);
      appendPriceHistory(pricesData);
      setPortfolio(portfolioData);
      setPositions(positionsData);
      setTrades(tradesData);
    } catch {
      // Keep UI responsive even if market refresh has a temporary API issue.
    }
  }, [appendPriceHistory, userId]);

  useEffect(() => {
    loadAllData();
    loadSentiments();

    const interval = setInterval(() => {
      refreshMarketData();
      loadSentiments();
    }, 5000);

    return () => clearInterval(interval);
  }, [loadAllData, loadSentiments, refreshMarketData]);

  useEffect(() => {
    const marketPrice = marketPrices[instrument]?.last_price;
    if (marketPrice) {
      setEntryPrice(String(marketPrice));
    }
  }, [instrument, marketPrices]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!entryPrice || !stopLoss || !takeProfit || !quantity) {
        return;
      }

      try {
        const risk = await riskAPI.validate({
          entry_price: Number(entryPrice),
          stop_loss: Number(stopLoss),
          take_profit: Number(takeProfit),
          quantity: Number(quantity),
          account_balance: Number(currentBalance || 0),
          side,
        });
        setValidation(risk);

        const behaviorResult = await riskAPI.pretradeAssess({
          user_id: userId,
          instrument,
          side,
          amount_at_risk: risk.amount_at_risk,
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
      } catch {
        // Do not block typing when validation endpoint is temporarily unavailable.
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [entryPrice, stopLoss, takeProfit, quantity, currentBalance, side, userId, instrument, reason, followedStrategy, chasingLosses, confidenceLevel, sessionMinutes, tradesThisSession]);

  const runAiCoach = async (modeOverride?: 'custom' | 'trends') => {
    const activeMode = modeOverride || aiMode;
    setTradeError('');
    setTradeSuccess('');

    if (activeMode === 'custom' && !aiIntent.trim()) {
      setTradeError('Tell the AI what you want first, e.g. "I want to trend in GBP/USD after a pullback."');
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
      setReason(suggestion.suggested_reason || '');
      setTradeSuccess(
        activeMode === 'trends'
          ? `AI Coach built a trend setup for ${suggestion.instrument} (${suggestion.side}). Review trade levels below.`
          : `AI Coach built a setup for ${suggestion.instrument} (${suggestion.side}) from your idea. Review trade levels below.`
      );
    } catch (err: any) {
      setTradeError(err?.message || 'Failed to generate AI suggestion.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleOpenTrade = async () => {
    setTradeError('');
    setTradeSuccess('');

    if (!reason.trim()) {
      setTradeError('Add a trade reason for TradeDNA, or use AI Coach to generate one.');
      return;
    }

    if (!validation?.allowed) {
      setTradeError('Risk validation failed. Fix warnings before opening this trade.');
      return;
    }

    if (behavior?.intervention === 'BLOCK') {
      setTradeError('TradeDNA blocked this trade due to behavioral risk.');
      return;
    }

    if (behavior?.intervention === 'WARN' && !confirmHighRisk) {
      setTradeError('Confirm high-risk override to continue.');
      return;
    }

    setTradeLoading(true);
    try {
      await positionAPI.open({
        user_id: userId,
        instrument,
        entry_price: Number(entryPrice),
        stop_loss: Number(stopLoss),
        take_profit: Number(takeProfit),
        quantity: Number(quantity),
        side,
        reason,
        followed_strategy: followedStrategy,
        chasing_losses: chasingLosses,
        confidence_level: confidenceLevel,
        session_minutes: sessionMinutes,
        trades_this_session: tradesThisSession,
        confirm_high_risk: confirmHighRisk,
      });

      setTradeSuccess('Position opened successfully.');
      setActiveTab('positions');
      await Promise.all([loadAllData(), loadSentiments()]);
    } catch (err: any) {
      const parsed = parseTradeOpenError(err);
      if (parsed.behavior) {
        setBehavior(parsed.behavior);
      }
      setTradeError(parsed.message);
    } finally {
      setTradeLoading(false);
    }
  };

  const handleClosePosition = async (positionId: number) => {
    try {
      await positionAPI.close(positionId, 'MANUAL');
      await loadAllData();
    } catch (err: any) {
      setError(err?.message || 'Failed to close position.');
    }
  };

  const runBrokerTest = async () => {
    setBrokerLoading(true);
    setBrokerError('');
    setBrokerResponse(null);
    setShowBrokerRaw(false);

    try {
      if (brokerEndpoint.includes('suggest-trade')) {
        const result = await riskAPI.suggestTrade({
          user_id: userId,
          reason: brokerReason,
          side: brokerSide,
          confidence_level: brokerConfidence,
          session_minutes: brokerSessionMinutes,
          trades_this_session: brokerTradesThisSession,
        });
        setBrokerResponse(result);
      } else if (brokerEndpoint.includes('pretrade-assess')) {
        const result = await riskAPI.pretradeAssess({
          user_id: userId,
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
        setBrokerResponse(await coachAPI.getEvents(userId));
      } else if (brokerEndpoint.includes('analytics')) {
        setBrokerResponse(await coachAPI.getAnalytics(userId));
      } else {
        setBrokerResponse(await coachAPI.getBrokerDemoConfig());
      }
    } catch (err: any) {
      setBrokerError(err?.message || 'Broker test failed.');
    } finally {
      setBrokerLoading(false);
    }
  };

  const applyBrokerToTradeForm = () => {
    if (!brokerResponse) {
      return;
    }

    if (isTradeSuggestionResponse(brokerResponse)) {
      setInstrument(brokerResponse.instrument);
      setSide(brokerResponse.side as 'BUY' | 'SELL');
      setEntryPrice(String(brokerResponse.entry_price));
      setStopLoss(String(brokerResponse.stop_loss));
      setTakeProfit(String(brokerResponse.take_profit));
      setQuantity(String(brokerResponse.quantity));
      if (brokerResponse.suggested_reason) {
        setReason(brokerResponse.suggested_reason);
      }
      setAiSuggestion(brokerResponse);
    } else if (isBehaviorAssessResponse(brokerResponse)) {
      setInstrument('BTCUSD');
      setSide(brokerSide);
      if (brokerReason) {
        setReason(brokerReason);
      }
      setBehavior(brokerResponse);
    }

    setConfidenceLevel(brokerConfidence);
    setSessionMinutes(brokerSessionMinutes);
    setTradesThisSession(brokerTradesThisSession);
    setActiveTab('trade');
    setTradeSuccess('Broker response applied to Open Trade! Review parameters and submit.');
    setTradeError('');
  };

  const brokerTone = getBrokerResultTone(brokerResponse);

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
  const simReturnPct = currentBalance > 0 ? (simPnl / currentBalance) * 100 : 0;
  const simNewBalance = currentBalance + simPnl;
  const priceMovePct = numEntry > 0 ? ((simPrice - numEntry) / numEntry) * 100 : 0;

  if (!userId) {
    router.replace('/login');
    return null;
  }

  return (
    <SafeAreaView style={[styles.safeRoot, { backgroundColor: palette.screen }]} edges={['top', 'left', 'right']}>
      {/* Top Navbar Header matching Web App */}
      <View style={[styles.topNavbar, { backgroundColor: palette.card, borderColor: palette.border }]}>
        <View style={styles.topNavLeft}>
          <View style={[styles.brandBadge, { backgroundColor: isDarkMode ? '#ffffff' : '#0f172a' }]}>
            <Text style={[styles.brandBadgeText, { color: isDarkMode ? '#0f172a' : '#ffffff' }]}>AI</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.navTitle, { color: palette.text }]} numberOfLines={1}>AI Trading Simulator</Text>
            <View style={styles.navSubRow}>
              <Text style={[styles.navWelcome, { color: palette.muted }]}>Welcome, {username}</Text>
              <View style={[styles.navDot, { backgroundColor: palette.muted }]} />
              <Text style={[styles.navSession, { color: palette.muted }]}>Demo session</Text>
            </View>
          </View>
        </View>

        <View style={styles.topNavRight}>
          <ThemeToggle />
          <Pressable
            onPress={async () => {
              await clearSession();
              router.replace('/login');
            }}
            style={[
              styles.navLogoutBtn,
              {
                backgroundColor: isDarkMode ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2',
                borderColor: isDarkMode ? 'rgba(244, 63, 94, 0.25)' : '#fecdd3',
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={15} color="#f43f5e" />
            <Text style={styles.navLogoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.container, { backgroundColor: palette.screen }]}> 
        {/* Header Card */}
        <View style={[styles.headerCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>TRADING WORKSPACE</Text>
              <Text style={[styles.title, { color: palette.text }]}>TradeDNA Risk Guardian</Text>
              <Text style={[styles.subtitle, { color: palette.muted }]}>
                Behavioral risk coaching with pre-trade interventions, live market simulation, and disciplined execution controls.
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <Pressable
                onPress={() => setShowRiskModal(true)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 99,
                  backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
                  borderWidth: 1,
                  borderColor: isDarkMode ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd',
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>Risk Guardrails</Text>
              </Pressable>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live session</Text>
              </View>
            </View>
          </View>

        {/* 4 Feature Micro Cards */}
        <View style={{ marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[
            ['Risk engine', '2% cap enforced on every trade'],
            ['Behavioral AI', 'Pre-trade score: allow, warn, or block'],
            ['Market mode', 'Simulated prices and sentiment'],
            ['Coach logs', 'Every intervention is recorded for review'],
          ].map(([title, description]) => (
            <View
              key={title}
              style={{
                flexBasis: '47%',
                flexGrow: 1,
                minWidth: '45%',
                padding: 10,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: palette.borderSoft,
                backgroundColor: palette.inputBg,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: palette.text }}>{title}</Text>
              <Text style={{ fontSize: 10, color: palette.muted, marginTop: 2, lineHeight: 14 }}>{description}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color="#38bdf8" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* 4 Portfolio Stats Cards (Matching Web PortfolioStats) */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={styles.statLabel}>Account Balance</Text>
          <Text style={[styles.statValue, { color: palette.text }]}>{formatGhs(currentBalance)}</Text>
          <Text style={{ fontSize: 10, color: palette.muted, marginTop: 3 }}>
            Started: {formatGhs(fallbackStartingBalance || 10000)}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={styles.statLabel}>Total P&L</Text>
          <Text style={[styles.statValue, { color: colorPnl(Number(portfolio?.total_pnl || 0)) }]}>
            {Number(portfolio?.total_pnl || 0) >= 0 ? '+' : ''}
            {formatGhs(Number(portfolio?.total_pnl || 0))}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: colorPnl(Number(portfolio?.total_pnl || 0)), marginTop: 3 }}>
            {Number(portfolio?.total_pnl || 0) >= 0 ? '+' : ''}
            {(((Number(portfolio?.total_pnl || 0)) / (fallbackStartingBalance || 10000)) * 100).toFixed(2)}%
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={styles.statLabel}>Win Rate</Text>
          <Text style={[styles.statValue, { color: palette.text }]}>{portfolio?.win_rate || '0%'}</Text>
          <Text style={{ fontSize: 10, color: palette.muted, marginTop: 3 }}>
            W: {portfolio?.winning_trades || 0} / L: {portfolio?.losing_trades || 0}
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={styles.statLabel}>Open Positions</Text>
          <Text style={[styles.statValue, { color: palette.text }]}>{positions.length}</Text>
          <Text style={{ fontSize: 10, color: palette.muted, marginTop: 3 }}>
            Total Trades: {trades.length}
          </Text>
        </View>
      </View>

      {/* Tab Navigation (Matching Web tabs exactly) */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabWrap} contentContainerStyle={styles.tabScrollContent}>
        {[
          ['dashboard', 'Dashboard'],
          ['trade', 'Open Trade'],
          ['positions', `Open Positions (${positions.length})`],
          ['history', 'Trade History'],
          ['broker', 'Broker API'],
        ].map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setActiveTab(key as TabKey)}
            style={({ pressed }) => [
              styles.tabButton,
              activeTab === key ? styles.tabButtonActive : [styles.tabButtonInactive, { borderColor: palette.borderSoft, backgroundColor: palette.inactiveTabBg }],
              { transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
          >
            <Text style={[styles.tabText, activeTab === key ? styles.tabTextActive : [styles.tabTextInactive, { color: palette.inactiveTabText }]]}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {activeTab === 'dashboard' && (
        <>
          {/* Interactive Equity & Drawdown Curve */}
          <MobileEquityChart
            trades={trades}
            startingBalance={fallbackStartingBalance || 10000}
            currentBalance={portfolio?.current_balance || fallbackBalance}
          />

          {/* Market Watch (Matching Web MarketWatch UI) */}
          <MobileMarketWatch marketPrices={marketPrices} sentiments={sentiments} />

          {/* Risk Guardian Engine Card */}
          <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={[styles.sectionTitle, { color: palette.text }]}>Risk Guardian Engine</Text>
                <Text style={[styles.sectionSub, { color: palette.muted }]}>
                  {riskSettings?.custom_strategy ? `${riskSettings.custom_strategy} active` : 'Real-time behavioral and technical guardrails.'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <Pressable
                  onPress={() => setShowRiskModal(true)}
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 99,
                    backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.15)' : '#e0f2fe',
                    borderWidth: 1,
                    borderColor: isDarkMode ? 'rgba(2, 132, 199, 0.3)' : '#bae6fd',
                  }}
                >
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#0284c7' }}>Customize</Text>
                </Pressable>
                <View style={[styles.liveBadge, { backgroundColor: 'rgba(16, 185, 129, 0.12)', flexShrink: 0 }]}>
                  <Text style={[styles.liveText, { color: '#10b981' }]}>Guardrails on</Text>
                </View>
              </View>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ padding: 10, borderRadius: 14, backgroundColor: palette.inputBg, borderWidth: 1, borderColor: palette.borderSoft }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: palette.text }}>
                  {(riskSettings?.max_risk_pct ?? 2.0).toFixed(1)}% Rule Maximum
                </Text>
                <Text style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                  Never risk more than {(riskSettings?.max_risk_pct ?? 2.0).toFixed(1)}% of account per trade (Max: GHS {((currentBalance) * ((riskSettings?.max_risk_pct ?? 2.0) / 100)).toFixed(2)})
                </Text>
              </View>
              <View style={{ padding: 10, borderRadius: 14, backgroundColor: palette.inputBg, borderWidth: 1, borderColor: palette.borderSoft }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: palette.text }}>Daily Loss Ceiling</Text>
                <Text style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                  Halts entries at GHS {(riskSettings?.daily_loss_limit ?? 500).toFixed(2)} loss • Limit: {riskSettings?.max_trades_per_day ?? 5} trades/day
                </Text>
              </View>
              <View style={{ padding: 10, borderRadius: 14, backgroundColor: palette.inputBg, borderWidth: 1, borderColor: palette.borderSoft }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: palette.text }}>
                  1:{(riskSettings?.min_risk_reward ?? 1.5).toFixed(1)} R:R Minimum Target
                </Text>
                <Text style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>
                  Enforces cooling breaks when consecutive loss patterns or poor risk-to-reward ratios are detected.
                </Text>
              </View>
            </View>
          </View>

          {/* Behavioral Discipline Gauge */}
          <MobileDisciplineGauge
            trades={trades}
            coachEvents={coachEvents}
            analytics={analytics}
          />

          {/* TradeDNA Performance Pulse */}
          {analytics && (
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={[styles.sectionTitle, { color: palette.text }]}>TradeDNA Performance Pulse</Text>
                  <Text style={[styles.sectionSub, { color: palette.muted }]}>Behavioral insights and optimal trading timing.</Text>
                </View>
                <View style={[styles.liveBadge, { flexShrink: 0 }]}>
                  <Text style={styles.liveText}>Live Analytics</Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Best Hour</Text>
                  <Text style={[styles.metricValue, { fontSize: 14, color: palette.text }]}>
                    {analytics.best_hour !== null && analytics.best_hour !== undefined ? `${analytics.best_hour}:00` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Worst Hour</Text>
                  <Text style={[styles.metricValue, { fontSize: 14, color: palette.text }]}>
                    {analytics.worst_hour !== null && analytics.worst_hour !== undefined ? `${analytics.worst_hour}:00` : 'N/A'}
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Avg Hold</Text>
                  <Text style={[styles.metricValue, { fontSize: 14, color: palette.text }]}>
                    {Number(analytics.avg_hold_minutes || 0).toFixed(1)}m
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Loss Streak</Text>
                  <Text style={[styles.metricValue, { fontSize: 14, color: palette.text }]}>{analytics.loss_streak ?? 0}</Text>
                </View>
              </View>
            </View>
          )}
        </>
      )}

      {activeTab === 'trade' && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Open New Position</Text>
          <Text style={[styles.sectionSub, { color: palette.muted }]}>Validate risk and behavior before sending the order.</Text>

          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Trade Setup</Text>

            <Text style={styles.label}>Instrument</Text>
            <View style={styles.pillRow}>
              {instruments.map((symbol) => (
                <Pressable
                  key={symbol}
                  onPress={() => setInstrument(symbol)}
                  style={[styles.pill, instrument === symbol ? styles.pillActive : styles.pillInactive]}
                >
                  <Text style={instrument === symbol ? styles.pillTextActive : styles.pillTextInactive}>{symbol}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Side</Text>
            <View style={styles.rowGap}>
              <Pressable onPress={() => setSide('BUY')} style={[styles.sideButton, side === 'BUY' ? styles.buyActive : styles.sideInactive]}>
                <Text style={side === 'BUY' ? styles.sideActiveText : styles.sideInactiveText}>BUY</Text>
              </Pressable>
              <Pressable onPress={() => setSide('SELL')} style={[styles.sideButton, side === 'SELL' ? styles.sellActive : styles.sideInactive]}>
                <Text style={side === 'SELL' ? styles.sideActiveText : styles.sideInactiveText}>SELL</Text>
              </Pressable>
            </View>

            <View style={styles.rowGap}>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Entry Price</Text>
                <TextInput value={entryPrice} onChangeText={setEntryPrice} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]} placeholder="0.00" placeholderTextColor={palette.muted} />
              </View>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]} placeholder="1" placeholderTextColor={palette.muted} />
              </View>
            </View>

            <View style={styles.rowGap}>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Stop Loss</Text>
                <TextInput value={stopLoss} onChangeText={setStopLoss} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]} placeholder="0.00" placeholderTextColor={palette.muted} />
              </View>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Take Profit</Text>
                <TextInput value={takeProfit} onChangeText={setTakeProfit} keyboardType="decimal-pad" style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]} placeholder="0.00" placeholderTextColor={palette.muted} />
              </View>
            </View>
          </View>

          <View style={styles.subCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={styles.subCardTitle}>AI Coach Setup</Text>
              <View style={{ backgroundColor: isDarkMode ? '#0369a130' : '#e0f2fe', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: palette.brand }}>Risk Engine</Text>
              </View>
            </View>
            <Text style={[styles.insightText, { marginBottom: 12 }]}>
              Choose custom idea or market momentum to auto-calculate calibrated entry, stop, and target.
            </Text>

            {/* Segmented Mode Selector */}
            <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? palette.cardSoft : '#f1f5f9', borderRadius: 14, padding: 4, marginBottom: 12 }}>
              <Pressable
                onPress={() => {
                  setAiMode('custom');
                  setTradeError('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: aiMode === 'custom' ? (isDarkMode ? palette.panel : '#ffffff') : 'transparent',
                  shadowOpacity: aiMode === 'custom' ? 0.08 : 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: aiMode === 'custom' ? palette.brand : palette.muted }}>
                  💡 Build from Idea
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setAiMode('trends');
                  setTradeError('');
                }}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  borderRadius: 10,
                  backgroundColor: aiMode === 'trends' ? (isDarkMode ? palette.panel : '#ffffff') : 'transparent',
                  shadowOpacity: aiMode === 'trends' ? 0.08 : 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: aiMode === 'trends' ? palette.green : palette.muted }}>
                  📈 Best Market Trend
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Custom Idea Mode */}
            {aiMode === 'custom' && (
              <View>
                <Text style={styles.label}>What do you want to trade?</Text>
                <TextInput
                  value={aiIntent}
                  onChangeText={setAiIntent}
                  multiline
                  numberOfLines={3}
                  style={[styles.input, styles.textArea, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder='Example: "I want to trend in GBP/USD after a pullback"'
                  placeholderTextColor={palette.muted}
                />

                <Text style={[styles.label, { marginTop: 8, marginBottom: 6, fontSize: 11, color: palette.muted }]}>QUICK PROMPTS</Text>
                <View style={styles.pillRow}>
                  {[
                    'Long GBP/USD pullback',
                    'EUR/USD trend breakout',
                    'BTC scalp long',
                    'Gold safe-haven momentum',
                  ].map((chip) => (
                    <Pressable
                      key={chip}
                      onPress={() => setAiIntent(chip)}
                      style={[styles.pill, { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: palette.inputBg, borderColor: palette.border }]}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '600', color: palette.textSoft }}>{chip}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  style={[styles.button, styles.primaryButton, { marginTop: 12 }, aiLoading ? styles.buttonDisabled : undefined]}
                  onPress={() => runAiCoach('custom')}
                  disabled={aiLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {aiLoading ? 'Analyzing & Building Setup...' : 'Build Setup from Idea'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Tab 2: Market Trend Mode */}
            {aiMode === 'trends' && (
              <View>
                <Text style={styles.label}>Trend Target</Text>
                <View style={styles.rowGap}>
                  <Pressable
                    onPress={() => setTrendScanTarget('current')}
                    style={[
                      styles.sideButton,
                      { flex: 1, paddingVertical: 10 },
                      trendScanTarget === 'current'
                        ? { backgroundColor: isDarkMode ? '#064e3b50' : '#dcfce7', borderColor: palette.green, borderWidth: 1 }
                        : styles.sideInactive,
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: trendScanTarget === 'current' ? palette.green : palette.muted }}>
                      Selected ({instrument})
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => setTrendScanTarget('all')}
                    style={[
                      styles.sideButton,
                      { flex: 1, paddingVertical: 10 },
                      trendScanTarget === 'all'
                        ? { backgroundColor: isDarkMode ? '#0369a140' : '#e0f2fe', borderColor: palette.brand, borderWidth: 1 }
                        : styles.sideInactive,
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: trendScanTarget === 'all' ? palette.brand : palette.muted }}>
                      Scan All Markets
                    </Text>
                  </Pressable>
                </View>

                <View style={[styles.tipBox, { marginTop: 10, padding: 10 }]}>
                  <Text style={[styles.tipTitle, { fontSize: 12 }]}>
                    Target: {trendScanTarget === 'current' ? instrument : 'Highest Momentum across 5 pairs'}
                  </Text>
                  <Text style={[styles.tipText, { fontSize: 11 }]}>
                    Auto-calibrates entry price, stop-loss distance, and target at 1.8:1 reward-to-risk.
                  </Text>
                </View>

                <Pressable
                  style={[
                    styles.button,
                    { backgroundColor: palette.green, borderColor: palette.green, marginTop: 12 },
                    aiLoading ? styles.buttonDisabled : undefined,
                  ]}
                  onPress={() => runAiCoach('trends')}
                  disabled={aiLoading}
                >
                  <Text style={[styles.primaryButtonText, { color: '#ffffff' }]}>
                    {aiLoading
                      ? 'Scanning Trends...'
                      : trendScanTarget === 'current'
                      ? `Apply ${instrument} Trend Setup`
                      : 'Scan & Apply Best Trend'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {aiSuggestion && (
            <View style={styles.subCard}>
              <Text style={styles.subCardTitle}>AI Coach Recommendation</Text>
              <Text style={styles.insightText}>{aiSuggestion.feedback}</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Instrument</Text>
                  <Text style={styles.metricValue}>{aiSuggestion.instrument}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Side</Text>
                  <Text style={styles.metricValue}>{aiSuggestion.side}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Risk %</Text>
                  <Text style={[styles.metricValue, { color: palette.green }]}>{Number(aiSuggestion.risk_percentage || 0).toFixed(2)}%</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>R:R</Text>
                  <Text style={[styles.metricValue, { color: palette.brand }]}>{Number(aiSuggestion.risk_reward_ratio || 0).toFixed(2)}:1</Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>TradeDNA Pre-Trade Check</Text>
            <Text style={[styles.insightText, { marginBottom: 10 }]}>
              Check your mindset and discipline before submitting.
            </Text>

            <Text style={styles.label}>Why are you taking this trade? (Trade Reason)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
              placeholder="Explain your simple setup reason here"
              placeholderTextColor={palette.muted}
            />
            <Text style={[styles.insightText, { marginTop: 4, marginBottom: 8 }]}>
              Writing down your reason stops you from trading on random impulses.
            </Text>

            <Text style={styles.label}>How confident are you in this setup? (1 to 5)</Text>
            <View style={styles.confidenceRow}>
              {[1, 2, 3, 4, 5].map((level) => (
                <Pressable
                  key={level}
                  onPress={() => setConfidenceLevel(level)}
                  style={[
                    styles.confidencePill,
                    {
                      borderColor: confidenceLevel === level ? palette.brand : palette.borderSoft,
                      backgroundColor: confidenceLevel === level ? palette.toggleOnBg : palette.inputBg,
                    },
                  ]}
                >
                  <Text style={{ color: confidenceLevel === level ? '#f8fafc' : palette.mutedSoft, fontWeight: '800' }}>{level}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.insightText, { marginTop: 4, marginBottom: 8 }]}>
              1 = Just guessing / FOMO (High Risk), 5 = Clear setup matching all rules.
            </Text>

            <View style={styles.rowGap}>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Time trading today (Min)</Text>
                <TextInput
                  value={String(sessionMinutes)}
                  onChangeText={(v) => setSessionMinutes(Math.max(1, Number(v) || 1))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder="30"
                  placeholderTextColor={palette.muted}
                />
              </View>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Trades opened today</Text>
                <TextInput
                  value={String(tradesThisSession)}
                  onChangeText={(v) => setTradesThisSession(Math.max(0, Number(v) || 0))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder="1"
                  placeholderTextColor={palette.muted}
                />
              </View>
            </View>

            <View style={[styles.rowGap, { marginTop: 6 }]}>
              <Pressable onPress={() => setFollowedStrategy((prev) => !prev)} style={[styles.togglePill, followedStrategy ? styles.toggleOn : styles.toggleOff]}>
                <Text style={[styles.toggleText, { color: followedStrategy ? '#f8fafc' : palette.text }]}>Following strategy: {followedStrategy ? 'Yes' : 'No'}</Text>
              </Pressable>
              <Pressable onPress={() => setChasingLosses((prev) => !prev)} style={[styles.togglePill, chasingLosses ? styles.toggleWarn : styles.toggleOff]}>
                <Text style={[styles.toggleText, { color: chasingLosses ? '#f8fafc' : palette.text }]}>Chasing losses: {chasingLosses ? 'Yes' : 'No'}</Text>
              </Pressable>
            </View>

            {/* Beginner Trading Psychology Guide */}
            <View style={{ marginTop: 12, padding: 10, borderRadius: 12, backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: palette.brand, marginBottom: 4 }}>
                Beginner Guide: Trading Terms Explained
              </Text>
              <Text style={{ fontSize: 10, color: palette.text, lineHeight: 14 }}>
                • <Text style={{ fontWeight: '700' }}>FOMO:</Text> Rushing in because you fear missing free profit.{"\n"}
                • <Text style={{ fontWeight: '700' }}>Revenge Trading:</Text> Angrily trading to quickly win back a loss.{"\n"}
                • <Text style={{ fontWeight: '700' }}>Overtrading:</Text> Opening too many trades due to boredom or excitement.{"\n"}
                • <Text style={{ fontWeight: '700' }}>Market Variance:</Text> Normal statistical losses when following good rules.
              </Text>
            </View>
          </View>

          {validation && (
            <View style={styles.subCard}>
              <Text style={styles.subCardTitle}>Risk Metrics</Text>
              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Amount at Risk</Text>
                  <Text style={styles.metricValue}>{formatGhs(Number(validation.amount_at_risk || 0))}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Risk %</Text>
                  <Text style={[styles.metricValue, { color: validation.risk_percentage > 2 ? palette.red : palette.green }]}>
                    {Number(validation.risk_percentage || 0).toFixed(2)}%
                  </Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Potential Reward</Text>
                  <Text style={[styles.metricValue, { color: palette.green }]}>{formatGhs(Number(validation.potential_reward || 0))}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>R:R Ratio</Text>
                  <Text style={styles.metricValue}>{Number(validation.risk_reward_ratio || 0).toFixed(2)}:1</Text>
                </View>
              </View>
              {validation.warnings?.length > 0 && (
                <View style={styles.warningBox}>
                  {validation.warnings.map((warning: string, idx: number) => (
                    <Text key={idx} style={styles.warningText}>{warning.replace('❌', '').replace('⚠️', '').trim()}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Pre-Trade "What-If" Scenario Simulator */}
          {numEntry > 0 && numQty > 0 && (
            <View style={styles.subCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.subCardTitle}>&quot;What-If&quot; Scenario Simulator</Text>
                <View style={[styles.liveBadge, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe' }]}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: palette.brand }}>Live P&amp;L</Text>
                </View>
              </View>
              <Text style={[styles.insightText, { marginTop: 4, marginBottom: 10 }]}>
                Test price movements before placing your order to see projected dollar gain/loss and balance drawdown.
              </Text>

              {/* Scenario Preset Buttons */}
              <View style={[styles.pillRow, { marginBottom: 12 }]}>
                <Pressable
                  onPress={() => setSimPreset('tp')}
                  disabled={!numTP}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: simPreset === 'tp' ? (isDarkMode ? '#064e3b' : '#dcfce7') : palette.inputBg,
                      borderColor: simPreset === 'tp' ? palette.green : palette.border,
                      opacity: numTP ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: simPreset === 'tp' ? palette.green : palette.textSoft }}>
                    Target (TP)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSimPreset('sl')}
                  disabled={!numSL}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: simPreset === 'sl' ? (isDarkMode ? '#7f1d1d' : '#fee2e2') : palette.inputBg,
                      borderColor: simPreset === 'sl' ? palette.red : palette.border,
                      opacity: numSL ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: simPreset === 'sl' ? palette.red : palette.textSoft }}>
                    Stop (SL)
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSimPreset('drop2')}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: simPreset === 'drop2' ? (isDarkMode ? '#78350f' : '#fef3c7') : palette.inputBg,
                      borderColor: simPreset === 'drop2' ? palette.orange : palette.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: simPreset === 'drop2' ? palette.orange : palette.textSoft }}>
                    -2% Drop
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSimPreset('gain2')}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: simPreset === 'gain2' ? (isDarkMode ? '#0369a1' : '#e0f2fe') : palette.inputBg,
                      borderColor: simPreset === 'gain2' ? palette.brand : palette.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: simPreset === 'gain2' ? palette.brand : palette.textSoft }}>
                    +2% Rally
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setSimPreset('custom')}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: simPreset === 'custom' ? (isDarkMode ? '#581c87' : '#f3e8ff') : palette.inputBg,
                      borderColor: simPreset === 'custom' ? '#a855f7' : palette.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: simPreset === 'custom' ? '#a855f7' : palette.textSoft }}>
                    Custom %
                  </Text>
                </Pressable>
              </View>

              {/* Custom Stepper for Mobile */}
              {simPreset === 'custom' && (
                <View style={{ marginBottom: 12, padding: 10, borderRadius: 12, backgroundColor: palette.inputBg, borderWidth: 1, borderColor: palette.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: palette.text }}>Movement Shift: {simOffsetPct > 0 ? `+${simOffsetPct}%` : `${simOffsetPct}%`}</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable
                        onPress={() => setSimOffsetPct((p) => Math.max(-10, p - 1))}
                        style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }}
                      >
                        <Text style={{ fontWeight: '700', color: palette.text }}>-1%</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setSimOffsetPct(0)}
                        style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }}
                      >
                        <Text style={{ fontWeight: '700', color: palette.text }}>0%</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setSimOffsetPct((p) => Math.min(10, p + 1))}
                        style={{ paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border }}
                      >
                        <Text style={{ fontWeight: '700', color: palette.text }}>+1%</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}

              {/* Projected Metric Grid */}
              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Sim Price</Text>
                  <Text style={styles.metricValue}>GHS {simPrice.toFixed(decimals)}</Text>
                  <Text style={[styles.metricLabel, { marginTop: 2 }]}>{priceMovePct >= 0 ? `+${priceMovePct.toFixed(2)}%` : `${priceMovePct.toFixed(2)}%`}</Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Projected P&amp;L</Text>
                  <Text style={[styles.metricValue, { color: simPnl >= 0 ? palette.green : palette.red }]}>
                    {simPnl >= 0 ? `+${formatGhs(simPnl)}` : `-${formatGhs(Math.abs(simPnl))}`}
                  </Text>
                  <Text style={[styles.metricLabel, { marginTop: 2, color: simPnl >= 0 ? palette.green : palette.red }]}>
                    {simReturnPct >= 0 ? `+${simReturnPct.toFixed(2)}%` : `${simReturnPct.toFixed(2)}%`}
                  </Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Projected Balance</Text>
                  <Text style={styles.metricValue}>{formatGhs(simNewBalance)}</Text>
                </View>

                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Guardrail Status</Text>
                  <Text style={[styles.metricValue, { fontSize: 11 }]}>
                    {Math.abs(simReturnPct) <= 2 ? '✅ Safe (<2%)' : '⚠️ Elevated Risk'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {behavior && (
            <View style={styles.subCard}>
              <Text style={styles.subCardTitle}>TradeDNA Behavioral Risk</Text>
              <View
                style={[
                  styles.interventionBadge,
                  behaviorTone === 'danger' ? styles.interventionBadgeDanger : behaviorTone === 'caution' ? styles.interventionBadgeCaution : styles.interventionBadgeSuccess,
                ]}
              >
                <Text
                  style={[
                    styles.interventionBadgeText,
                    {
                      color:
                        behaviorTone === 'danger'
                          ? isDarkMode ? '#fecaca' : '#b91c1c'
                          : behaviorTone === 'caution'
                          ? isDarkMode ? '#fde68a' : '#b45309'
                          : isDarkMode ? '#86efac' : '#166534',
                    },
                  ]}
                >
                  {behavior.intervention} • {Number(behavior.score || 0).toFixed(0)}/100
                </Text>
              </View>
              <View style={styles.metricGrid}>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Risk Level</Text>
                  <Text style={styles.metricValue}>{behavior.risk_level}</Text>
                </View>
                <View style={styles.metricCell}>
                  <Text style={styles.metricLabel}>Cooldown</Text>
                  <Text style={styles.metricValue}>{behavior.cooldown_minutes} min</Text>
                </View>
              </View>
              {behavior.coaching_prompt ? <Text style={styles.insightText}>{behavior.coaching_prompt}</Text> : null}
              {behavior.reasons?.map((item: string, idx: number) => (
                <View key={idx} style={styles.warningBox}>
                  <Text style={styles.warningText}>{item}</Text>
                </View>
              ))}

              {behavior.intervention === 'WARN' && (
                <Pressable
                  onPress={() => setConfirmHighRisk((prev) => !prev)}
                  style={[styles.togglePill, confirmHighRisk ? styles.toggleOn : styles.toggleOff, { marginTop: 10, flex: undefined }]}
                >
                  <Text style={[styles.toggleText, { color: confirmHighRisk ? '#f8fafc' : palette.text }]}>
                    I understand this is high-risk and want to continue
                  </Text>
                </Pressable>
              )}
            </View>
          )}

          {tradeError ? <Text style={styles.error}>{tradeError}</Text> : null}
          {tradeSuccess ? <Text style={styles.success}>{tradeSuccess}</Text> : null}

          <Pressable
            style={[
              styles.button,
              styles.primaryButton,
              !submitAllowed || tradeLoading ? styles.primaryButtonDisabled : undefined,
              tradeLoading ? styles.buttonDisabled : undefined,
            ]}
            onPress={handleOpenTrade}
            disabled={!submitAllowed || tradeLoading}
          >
            <Text style={styles.primaryButtonText}>{tradeLoading ? 'Opening Position...' : 'Open Position'}</Text>
          </Pressable>
        </View>
      )}

      {activeTab === 'positions' && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Open Positions</Text>
          <Text style={[styles.sectionSub, { color: palette.muted }]}>Close manually at market or wait for TP/SL to trigger.</Text>
          
          {positions.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <Text style={[styles.empty, { textAlign: 'center', marginBottom: 14 }]}>No open positions currently active.</Text>
              <Pressable
                style={[styles.button, styles.primaryButton, { paddingHorizontal: 24 }]}
                onPress={() => setActiveTab('trade')}
              >
                <Text style={styles.primaryButtonText}>Open New Position</Text>
              </Pressable>
            </View>
          ) : null}

          {positions.map((position) => {
            const currentPrice = marketPrices[position.instrument]?.last_price ?? position.entry_price;
            const diff = position.side === 'BUY' ? currentPrice - position.entry_price : position.entry_price - currentPrice;
            const unrealizedPnl = diff * position.quantity;
            const unrealizedPnlPct = position.entry_price > 0 ? (diff / position.entry_price) * 100 : 0;
            const decimals = position.instrument === 'EURUSD' || position.instrument === 'GBPUSD' ? 4 : 2;

            return (
              <View key={position.id} style={[styles.positionCard, { backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1, marginTop: 12 }]}>
                <View style={styles.positionHead}>
                  <View>
                    <Text style={[styles.quoteSymbol, { color: palette.text }]}>{position.instrument}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: position.side === 'BUY' ? palette.green : palette.red, marginTop: 2 }}>
                      {position.side} {position.quantity} @ {Number(position.entry_price).toFixed(decimals)}
                    </Text>
                  </View>
                  <Pressable style={[styles.button, styles.closeButton, { paddingVertical: 6, paddingHorizontal: 14 }]} onPress={() => handleClosePosition(position.id)}>
                    <Text style={styles.primaryButtonText}>Close</Text>
                  </Pressable>
                </View>

                <View style={[styles.metricGrid, { marginTop: 12 }]}>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>Entry</Text>
                    <Text style={styles.metricValue}>{Number(position.entry_price).toFixed(decimals)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>Current</Text>
                    <Text style={[styles.metricValue, { color: palette.brand }]}>{Number(currentPrice).toFixed(decimals)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>Stop Loss</Text>
                    <Text style={[styles.metricValue, { color: palette.red }]}>{Number(position.stop_loss).toFixed(decimals)}</Text>
                  </View>
                  <View style={styles.metricCell}>
                    <Text style={styles.metricLabel}>Take Profit</Text>
                    <Text style={[styles.metricValue, { color: palette.green }]}>{Number(position.take_profit).toFixed(decimals)}</Text>
                  </View>
                </View>

                {/* Unrealized P&L banner */}
                <View style={{ marginTop: 10, padding: 12, borderRadius: 14, backgroundColor: palette.inputBg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: palette.textSoft }}>Unrealized P&amp;L</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: unrealizedPnl >= 0 ? palette.green : palette.red }}>
                      {unrealizedPnl >= 0 ? `+${formatGhs(unrealizedPnl)}` : `-${formatGhs(Math.abs(unrealizedPnl))}`}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: unrealizedPnl >= 0 ? palette.green : palette.red }}>
                      {unrealizedPnlPct >= 0 ? `+${unrealizedPnlPct.toFixed(2)}%` : `${unrealizedPnlPct.toFixed(2)}%`}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {activeTab === 'history' && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: palette.text }]}>Trade Journal & History</Text>
              <Text style={[styles.sectionSub, { color: palette.muted }]}>
                Replay execution checkpoints, review psychological habits, and export records.
              </Text>
            </View>
          </View>

          {/* Action Row */}
          <View style={[styles.rowGap, { marginTop: 10, marginBottom: 14, flexWrap: 'wrap' }]}>
            <Pressable
              onPress={exportCsvSummary}
              style={[styles.sideButton, { flex: 1, minWidth: 100, backgroundColor: palette.inputBg, borderColor: palette.border, borderWidth: 1 }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: palette.text }}>Export (.csv)</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowShareModal(true)}
              style={[
                styles.sideButton,
                {
                  flex: 1,
                  minWidth: 105,
                  backgroundColor: isDarkMode ? 'rgba(2, 132, 199, 0.18)' : '#e0f2fe',
                  borderColor: isDarkMode ? 'rgba(2, 132, 199, 0.35)' : '#bae6fd',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#0284c7' }}>Statement (.pdf)</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowShareModal(true)}
              style={[styles.sideButton, { flex: 1, minWidth: 110, backgroundColor: palette.brand, borderColor: palette.brand, borderWidth: 1 }]}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#ffffff' }}>Share Performance</Text>
            </Pressable>
          </View>

          {/* Interactive Equity & Drawdown Curve */}
          <MobileEquityChart
            trades={trades}
            startingBalance={fallbackStartingBalance || 10000}
            currentBalance={portfolio?.current_balance || fallbackBalance}
          />

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Trades</Text>
              <Text style={styles.statValue}>{trades.length}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={[styles.statValue, { color: palette.green }]}>{summary.winRate}%</Text>
              <Text style={{ fontSize: 10, color: palette.muted, marginTop: 2 }}>W: {summary.wins} L: {summary.losses}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total P&L</Text>
              <Text style={[styles.statValue, { color: colorPnl(summary.totalPnL) }]}> 
                {summary.totalPnL >= 0 ? '+' : ''}{formatGhs(summary.totalPnL)}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Avg Trade P&L</Text>
              <Text style={[styles.statValue, { color: colorPnl(summary.avgPnL) }]}>
                {summary.avgPnL >= 0 ? '+' : ''}{formatGhs(summary.avgPnL)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitleSmall}>Closed Trades</Text>
          {trades.length === 0 ? <Text style={styles.empty}>No closed trades yet.</Text> : null}
          {trades.map((trade) => {
            const expanded = replayTradeId === trade.id;
            const review = analyzeMobileTrade(trade, coachEvents, isDarkMode);
            const range = Math.abs(Number(trade.exit_price) - Number(trade.entry_price));
            const direction = trade.side === 'BUY' ? 1 : -1;
            const decimals = trade.instrument === 'EURUSD' || trade.instrument === 'GBPUSD' ? 4 : 2;
            const replay = [
              { label: 'Entry', value: Number(trade.entry_price), note: 'Trade opened here.' },
              { label: 'Midway', value: Number(trade.entry_price) + range * 0.35 * direction, note: 'Price drifted with normal volatility.' },
              { label: 'Decision Point', value: Number(trade.entry_price) + range * 0.7 * direction, note: 'Where discipline mattered most.' },
              { label: 'Exit', value: Number(trade.exit_price), note: Number(trade.pnl || 0) >= 0 ? 'Closed in profit.' : 'Closed at stop or exit.' },
            ];

            return (
              <View key={trade.id} style={[styles.tradeCard, { backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1, marginTop: 12 }]}>
                <Pressable onPress={() => setReplayTradeId(expanded ? null : trade.id)}>
                  <View style={styles.positionHead}>
                    <View>
                      <Text style={[styles.quoteSymbol, { color: palette.text }]}>{trade.instrument} ({trade.side})</Text>
                      <Text style={{ fontSize: 11, color: palette.muted, marginTop: 2 }}>{new Date(trade.closed_at).toLocaleString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.quotePrice, { color: colorPnl(Number(trade.pnl || 0)) }]}>
                        {Number(trade.pnl || 0) >= 0 ? '+' : ''}{formatGhs(Number(trade.pnl || 0))}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colorPnl(Number(trade.pnl || 0)) }}>
                        {Number(trade.pnl_percentage || 0) >= 0 ? '+' : ''}{Number(trade.pnl_percentage || 0).toFixed(2)}%
                      </Text>
                    </View>
                  </View>

                  {/* Review badge on card */}
                  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: review.badgeBg,
                      borderColor: review.badgeBorder,
                      borderWidth: 1,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: review.badgeText }}>{review.label}</Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: palette.brand }}>
                      {expanded ? '▲ Hide Review' : '▼ View Review'}
                    </Text>
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: palette.border, paddingTop: 12 }}>
                    {/* Post-Trade Review & Breakdown */}
                    <View style={{ backgroundColor: palette.inputBg, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: palette.border }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: palette.text }}>{review.headline}</Text>

                      <Text style={[styles.insightText, { marginTop: 6 }]}>{review.diagnosis}</Text>

                      <View style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.12)' : '#e0f2fe' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: palette.brand }}>Key Coaching Takeaway:</Text>
                        <Text style={{ fontSize: 11, color: palette.text, marginTop: 2 }}>{review.takeaway}</Text>
                      </View>

                      <View style={[styles.metricGrid, { marginTop: 10 }]}>
                        <View style={styles.metricCell}>
                          <Text style={styles.metricLabel}>Sizing</Text>
                          <Text style={[styles.metricValue, { fontSize: 11 }]}>{review.factors.sizing}</Text>
                        </View>
                        <View style={styles.metricCell}>
                          <Text style={styles.metricLabel}>Psychology</Text>
                          <Text style={[styles.metricValue, { fontSize: 11 }]}>{review.factors.psychology}</Text>
                        </View>
                        <View style={styles.metricCell}>
                          <Text style={styles.metricLabel}>Execution</Text>
                          <Text style={[styles.metricValue, { fontSize: 11 }]}>{review.factors.execution}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Trade Replay Timeline */}
                    <Text style={[styles.label, { marginTop: 12, marginBottom: 6, fontSize: 11 }]}>REPLAY TIMELINE</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {replay.map((step) => (
                        <View key={step.label} style={{ flexBasis: '48%', flexGrow: 1, backgroundColor: palette.inputBg, borderRadius: 12, padding: 8, borderWidth: 1, borderColor: palette.border }}>
                          <Text style={styles.replayLabel}>{step.label}</Text>
                          <Text style={[styles.replayValue, { color: palette.text }]}>{Number(step.value).toFixed(decimals)}</Text>
                          <Text style={{ fontSize: 9, color: palette.muted, marginTop: 2 }}>{step.note}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      {activeTab === 'broker' && (
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}> 
          <Text style={[styles.kicker, { color: palette.brand }]}>BROKER MODE</Text>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>TradeDNA API Demo</Text>
          <Text style={[styles.sectionSub, { color: palette.muted }]}>
            B2B-style broker integration: test endpoints and review structured responses.
          </Text>

          <View style={styles.metricGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Demo API Key</Text>
              <Text style={[styles.metricValue, { fontFamily: 'monospace', fontSize: 13 }]}>{brokerConfig?.api_key || 'Loading...'}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Base URL</Text>
              <Text style={[styles.metricValue, { fontFamily: 'monospace', fontSize: 13 }]}>{brokerConfig?.base_url || '/api/proxy'}</Text>
            </View>
          </View>

          <Text style={styles.label}>Available Endpoints</Text>
          <View style={styles.pillRow}>
            {(brokerConfig?.endpoints || [
              'POST /api/risk/suggest-trade',
              'POST /api/risk/pretrade-assess',
              'GET /api/coach/events/{user_id}',
              'GET /api/analytics/{user_id}',
            ]).map((endpoint: string) => (
              <Pressable
                key={endpoint}
                onPress={() => setBrokerEndpoint(endpoint)}
                style={[styles.pill, brokerEndpoint === endpoint ? styles.pillActive : styles.pillInactive]}
              >
                <Text style={brokerEndpoint === endpoint ? styles.pillTextActive : styles.pillTextInactive}>{endpoint}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Selected Endpoint</Text>
            <Text style={[styles.insightText, { fontFamily: 'monospace' }]}>{brokerEndpoint}</Text>
          </View>

          <View style={styles.subCard}>
            <Text style={styles.subCardTitle}>Test Payload</Text>

            <Text style={styles.label}>Reason</Text>
            <TextInput
              value={brokerReason}
              onChangeText={setBrokerReason}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textArea, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
              placeholder="Broker request note"
              placeholderTextColor={palette.muted}
            />

            <View style={styles.rowGap}>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Side</Text>
                <View style={styles.rowGap}>
                  <Pressable onPress={() => setBrokerSide('BUY')} style={[styles.sideButton, brokerSide === 'BUY' ? styles.buyActive : styles.sideInactive]}>
                    <Text style={brokerSide === 'BUY' ? styles.sideActiveText : styles.sideInactiveText}>BUY</Text>
                  </Pressable>
                  <Pressable onPress={() => setBrokerSide('SELL')} style={[styles.sideButton, brokerSide === 'SELL' ? styles.sellActive : styles.sideInactive]}>
                    <Text style={brokerSide === 'SELL' ? styles.sideActiveText : styles.sideInactiveText}>SELL</Text>
                  </Pressable>
                </View>
              </View>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Confidence</Text>
                <TextInput
                  value={String(brokerConfidence)}
                  onChangeText={(v) => setBrokerConfidence(Math.min(5, Math.max(1, Number(v) || 1)))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder="1-5"
                  placeholderTextColor={palette.muted}
                />
              </View>
            </View>

            <View style={styles.rowGap}>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Session Minutes</Text>
                <TextInput
                  value={String(brokerSessionMinutes)}
                  onChangeText={(v) => setBrokerSessionMinutes(Math.max(1, Number(v) || 1))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder="20"
                  placeholderTextColor={palette.muted}
                />
              </View>
              <View style={styles.rowCell}>
                <Text style={styles.label}>Trades This Session</Text>
                <TextInput
                  value={String(brokerTradesThisSession)}
                  onChangeText={(v) => setBrokerTradesThisSession(Math.max(0, Number(v) || 0))}
                  keyboardType="number-pad"
                  style={[styles.input, { backgroundColor: palette.inputBg, borderColor: palette.inputBorder, color: palette.text }]}
                  placeholder="1"
                  placeholderTextColor={palette.muted}
                />
              </View>
            </View>

            <Pressable style={[styles.button, styles.primaryButton, brokerLoading ? styles.buttonDisabled : undefined]} onPress={runBrokerTest} disabled={brokerLoading}>
              <Text style={styles.primaryButtonText}>{brokerLoading ? 'Running test...' : 'Run Test'}</Text>
            </Pressable>
          </View>

          {brokerError ? <Text style={styles.error}>{brokerError}</Text> : null}

          {brokerResponse && (
            <View style={styles.subCard}>
              <View style={styles.positionHead}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.metricLabel, { letterSpacing: 2 }]}>BROKER RESPONSE</Text>
                  <Text style={[styles.sectionTitle, { fontSize: 18, marginTop: 4 }]}>
                    {brokerResponse.feedback || brokerResponse.coaching_prompt || 'Live API result'}
                  </Text>
                  {brokerResponse.suggested_reason ? (
                    <Text style={[styles.insightText, { marginTop: 6 }]}>{brokerResponse.suggested_reason}</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.interventionBadge,
                    brokerTone === 'success'
                      ? styles.interventionBadgeSuccess
                      : brokerTone === 'caution'
                      ? styles.interventionBadgeCaution
                      : { backgroundColor: palette.cardSoft, borderWidth: 1, borderColor: palette.border },
                  ]}
                >
                  <Text style={[styles.interventionBadgeText, { color: palette.textSoft }]}>{getBrokerResultLabel(brokerResponse)}</Text>
                </View>
              </View>

              {isTradeSuggestionResponse(brokerResponse) && (
                <View style={styles.metricGrid}>
                  {[
                    ['Instrument', brokerResponse.instrument],
                    ['Side', brokerResponse.side],
                    ['Entry', formatGhs(Number(brokerResponse.entry_price || 0))],
                    ['Risk %', `${Number(brokerResponse.risk_percentage || 0).toFixed(2)}%`],
                    ['Stop Loss', formatGhs(Number(brokerResponse.stop_loss || 0))],
                    ['Take Profit', formatGhs(Number(brokerResponse.take_profit || 0))],
                    ['Quantity', String(brokerResponse.quantity ?? '—')],
                    ['R:R', `${Number(brokerResponse.risk_reward_ratio || 0).toFixed(2)}:1`],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.metricCell}>
                      <Text style={styles.metricLabel}>{label}</Text>
                      <Text style={styles.metricValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {isBehaviorAssessResponse(brokerResponse) && (
                <View style={styles.metricGrid}>
                  {[
                    ['Score', `${Number(brokerResponse.score || 0).toFixed(0)}/100`],
                    ['Risk Level', brokerResponse.risk_level],
                    ['Intervention', brokerResponse.intervention],
                    ['Cooldown', `${brokerResponse.cooldown_minutes} min`],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.metricCell}>
                      <Text style={styles.metricLabel}>{label}</Text>
                      <Text style={styles.metricValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {brokerResponse.notes?.length > 0 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={styles.subCardTitle}>Coach Notes</Text>
                  {brokerResponse.notes.map((note: string) => (
                    <View key={note} style={[styles.metricCell, { width: '100%', minWidth: '100%' }]}>
                      <Text style={styles.insightText}>{note}</Text>
                    </View>
                  ))}
                </View>
              )}

              {isBehaviorAssessResponse(brokerResponse) && brokerResponse.reasons?.length > 0 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={styles.subCardTitle}>Risk Reasons</Text>
                  {brokerResponse.reasons.map((item: string) => (
                    <View key={item} style={styles.warningBox}>
                      <Text style={styles.warningText}>{item}</Text>
                    </View>
                  ))}
                </View>
              )}

              {Array.isArray(brokerResponse) && (
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.insightText}>{brokerResponse.length} coach events returned.</Text>
                </View>
              )}

              {brokerResponse?.total_trades !== undefined && !Array.isArray(brokerResponse) && !isTradeSuggestionResponse(brokerResponse) && !isBehaviorAssessResponse(brokerResponse) && (
                <View style={styles.metricGrid}>
                  {[
                    ['Total Trades', String(brokerResponse.total_trades)],
                    ['Win Rate', brokerResponse.win_rate],
                    ['Total P&L', formatGhs(Number(brokerResponse.total_pnl || 0))],
                    ['Loss Streak', String(brokerResponse.loss_streak ?? 0)],
                  ].map(([label, value]) => (
                    <View key={label} style={styles.metricCell}>
                      <Text style={styles.metricLabel}>{label}</Text>
                      <Text style={styles.metricValue}>{value}</Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={[styles.rowGap, { marginTop: 12 }]}>
                {isTradeSuggestionResponse(brokerResponse) || isBehaviorAssessResponse(brokerResponse) ? (
                  <Pressable style={[styles.button, styles.primaryButton, { flex: 1 }]} onPress={applyBrokerToTradeForm}>
                    <Text style={styles.primaryButtonText}>Use in Open Trade</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.button, { flex: 1 }]}
                  onPress={() => setShowBrokerRaw((prev) => !prev)}
                >
                  <Text style={styles.buttonText}>{showBrokerRaw ? 'Hide Raw JSON' : 'View Raw JSON'}</Text>
                </Pressable>
              </View>

              {showBrokerRaw ? (
                <Text style={styles.codeBlock}>{JSON.stringify(brokerResponse, null, 2)}</Text>
              ) : null}
            </View>
          )}

          {brokerConfig?.notes?.length > 0 && (
            <View style={{ gap: 8, marginTop: 8 }}>
              {brokerConfig.notes.map((note: string) => (
                <View key={note} style={styles.metricCell}>
                  <Text style={styles.insightText}>{note}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Performance Statement & Share Modal */}
      <MobilePerformanceStatementModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        trades={trades}
        coachEvents={coachEvents}
        startingBalance={fallbackStartingBalance || 10000}
        currentBalance={currentBalance}
        username={username}
      />

      {/* Customizable Risk Guardrails Modal */}
      {userId ? (
        <MobileRiskSettingsModal
          visible={showRiskModal}
          onClose={() => setShowRiskModal(false)}
          userId={userId}
          currentBalance={currentBalance}
          onSaved={(newSettings) => setRiskSettings(newSettings)}
        />
      ) : null}
    </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(p: Palette, isDark: boolean) {
  return StyleSheet.create({
    safeRoot: {
      flex: 1,
    },
    topNavbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 1,
    },
    topNavLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    brandBadge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    brandBadgeText: {
      fontSize: 15,
      fontWeight: '900',
    },
    navTitle: {
      fontSize: 14,
      fontWeight: '800',
    },
    navSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    navWelcome: {
      fontSize: 11,
      fontWeight: '600',
    },
    navDot: {
      width: 3,
      height: 3,
      borderRadius: 99,
    },
    navSession: {
      fontSize: 11,
      fontWeight: '500',
    },
    topNavRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    navLogoutBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 99,
      borderWidth: 1,
    },
    navLogoutText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#f43f5e',
    },
    container: {
      flexGrow: 1,
      backgroundColor: p.screen,
      padding: 16,
      paddingBottom: 40,
    },
    headerCard: {
      backgroundColor: p.card,
      borderRadius: 28,
      padding: 24,
      borderWidth: 1,
      borderColor: p.border,
      marginBottom: 16,
    },
    kicker: {
      color: p.brand,
      textTransform: 'uppercase',
      letterSpacing: 2,
      fontSize: 12,
      fontWeight: '700',
    },
    title: {
      color: p.text,
      fontSize: 30,
      lineHeight: 36,
      fontWeight: '800',
      marginTop: 10,
    },
    subtitle: {
      color: p.mutedSoft,
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
    },
    liveBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: p.liveBg,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    headerRow: {
      marginTop: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      backgroundColor: '#22c55e',
    },
    liveText: {
      color: p.liveText,
      fontWeight: '700',
      fontSize: 12,
    },
    loadingCard: {
      backgroundColor: p.panel,
      borderRadius: 20,
      padding: 18,
      alignItems: 'center',
      marginBottom: 16,
    },
    loadingText: {
      color: p.mutedSoft,
      marginTop: 10,
    },
    error: {
      color: p.danger,
      backgroundColor: p.dangerBg,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
    },
    success: {
      color: p.success,
      backgroundColor: p.successBg,
      borderRadius: 14,
      padding: 12,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: p.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: p.border,
    },
    statLabel: {
      color: p.muted,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    statValue: {
      color: p.text,
      fontSize: 18,
      fontWeight: '800',
    },
    tabWrap: {
      marginBottom: 16,
      flexGrow: 0,
      flexShrink: 0,
      height: 44,
    },
    tabScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingRight: 8,
      height: 44,
    },
    tabButton: {
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderWidth: 1,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      borderColor: p.brandStrong,
      backgroundColor: p.brandStrong,
    },
    tabButtonInactive: {
      borderColor: p.borderSoft,
      backgroundColor: p.inactiveTabBg,
    },
    tabText: {
      fontWeight: '700',
      fontSize: 12,
      lineHeight: 16,
    },
    tabTextActive: {
      color: '#f8fafc',
    },
    tabTextInactive: {
      color: p.inactiveTabText,
    },
    card: {
      backgroundColor: p.card,
      borderRadius: 28,
      padding: 18,
      borderWidth: 1,
      borderColor: p.border,
      marginBottom: 14,
      width: '100%',
      overflow: 'hidden',
    },
    sectionTitle: {
      color: p.text,
      fontSize: 20,
      fontWeight: '800',
    },
    sectionSub: {
      color: p.muted,
      marginTop: 4,
      marginBottom: 12,
      lineHeight: 20,
    },
    label: {
      color: p.mutedSoft,
      marginBottom: 8,
      marginTop: 10,
      fontWeight: '700',
      fontSize: 13,
    },
    input: {
      backgroundColor: p.inputBg,
      color: p.text,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: p.inputBorder,
    },
    textArea: {
      minHeight: 96,
      textAlignVertical: 'top',
    },
    rowGap: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    rowCell: {
      flex: 1,
    },
    sideButton: {
      flex: 1,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderWidth: 1,
    },
    sideInactive: {
      borderColor: p.borderSoft,
      backgroundColor: p.inputBg,
    },
    buyActive: {
      backgroundColor: p.buyBg,
      borderColor: p.buyBorder,
    },
    sellActive: {
      backgroundColor: p.sellBg,
      borderColor: p.sellText,
    },
    sideActiveText: {
      color: '#f8fafc',
      fontWeight: '800',
    },
    sideInactiveText: {
      color: p.mutedSoft,
      fontWeight: '700',
    },
    togglePill: {
      flex: 1,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
    },
    toggleOn: {
      backgroundColor: p.toggleOnBg,
      borderColor: p.brand,
    },
    toggleWarn: {
      backgroundColor: p.toggleWarnBg,
      borderColor: p.sellText,
    },
    toggleOff: {
      backgroundColor: p.toggleOffBg,
      borderColor: p.toggleBorder,
    },
    toggleText: {
      color: p.textSoft,
      fontWeight: '700',
      fontSize: 12,
    },
    insightBox: {
      backgroundColor: p.panel,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.panelBorder,
      padding: 12,
      marginTop: 12,
    },
    insightTitle: {
      color: p.text,
      fontWeight: '800',
      marginBottom: 6,
    },
    insightText: {
      color: p.textSoft,
      lineHeight: 20,
    },
    metricGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 8,
    },
    metricCell: {
      flexBasis: '47%',
      flexGrow: 1,
      minWidth: '45%',
      backgroundColor: p.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.border,
      padding: 10,
    },
    metricLabel: {
      color: p.muted,
      fontSize: 11,
      fontWeight: '600',
    },
    metricValue: {
      color: p.text,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 4,
    },
    warningBox: {
      marginTop: 8,
      borderRadius: 12,
      padding: 10,
      backgroundColor: isDark ? '#78350f33' : '#fffbeb',
      borderWidth: 1,
      borderColor: isDark ? '#f59e0b55' : '#fcd34d',
    },
    warningText: {
      color: isDark ? '#fde68a' : '#92400e',
      fontSize: 12,
      lineHeight: 18,
    },
    interventionBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginTop: 8,
      marginBottom: 6,
    },
    interventionBadgeSuccess: {
      backgroundColor: isDark ? '#052e16' : '#dcfce7',
    },
    interventionBadgeCaution: {
      backgroundColor: isDark ? '#78350f55' : '#fef3c7',
    },
    interventionBadgeDanger: {
      backgroundColor: isDark ? '#450a0a' : '#fee2e2',
    },
    interventionBadgeText: {
      fontSize: 11,
      fontWeight: '800',
    },
    confidenceRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    confidencePill: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    subCard: {
      marginTop: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: p.panelBorder,
      backgroundColor: p.panel,
      padding: 14,
    },
    subCardTitle: {
      color: p.text,
      fontWeight: '800',
      fontSize: 15,
      marginBottom: 8,
    },
    button: {
      marginTop: 12,
      backgroundColor: isDark ? p.cardSoft : '#f1f5f9',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 13,
      borderWidth: 1,
      borderColor: p.border,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    primaryButton: {
      backgroundColor: p.brandStrong,
    },
    primaryButtonDisabled: {
      backgroundColor: isDark ? p.inactiveTabBg : '#cbd5e1',
      opacity: 0.75,
    },
    closeButton: {
      backgroundColor: '#dc2626',
    },
    buttonText: {
      color: isDark ? p.textSoft : '#0f172a',
      fontWeight: '800',
      fontSize: 15,
    },
    primaryButtonText: {
      color: '#f8fafc',
      fontWeight: '800',
      fontSize: 15,
    },
    quoteRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: p.border,
      paddingVertical: 12,
    },
    quoteSymbol: {
      color: p.text,
      fontSize: 15,
      fontWeight: '800',
    },
    quoteMeta: {
      color: p.muted,
      marginTop: 2,
      fontSize: 12,
    },
    quotePrice: {
      color: p.brand,
      fontWeight: '800',
    },
    tipBox: {
      marginTop: 14,
      backgroundColor: p.tipBg,
      borderWidth: 1,
      borderColor: p.tipBorder,
      borderRadius: 16,
      padding: 12,
    },
    tipTitle: {
      color: p.tipTitle,
      fontWeight: '800',
      marginBottom: 4,
    },
    tipText: {
      color: p.tipText,
      lineHeight: 20,
    },
    empty: {
      color: p.muted,
      marginTop: 6,
    },
    positionCard: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.panelBorder,
      backgroundColor: p.panel,
      padding: 12,
    },
    positionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    buyText: {
      color: p.buyText,
      fontWeight: '800',
    },
    sellText: {
      color: p.sellText,
      fontWeight: '800',
    },
    sectionTitleSmall: {
      marginTop: 14,
      marginBottom: 8,
      color: p.text,
      fontWeight: '800',
    },
    eventCard: {
      backgroundColor: p.panel,
      borderWidth: 1,
      borderColor: p.panelBorder,
      borderRadius: 16,
      padding: 12,
      marginBottom: 8,
    },
    eventTitle: {
      color: p.text,
      fontWeight: '700',
    },
    eventMeta: {
      color: p.muted,
      fontSize: 12,
      marginTop: 2,
      marginBottom: 4,
    },
    tradeCard: {
      backgroundColor: p.panel,
      borderWidth: 1,
      borderColor: p.panelBorder,
      borderRadius: 16,
      padding: 12,
      marginBottom: 8,
    },
    replayWrap: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    replayStep: {
      flex: 1,
      backgroundColor: p.card,
      borderWidth: 1,
      borderColor: p.border,
      borderRadius: 12,
      padding: 8,
    },
    replayLabel: {
      color: p.muted,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    replayValue: {
      color: p.textSoft,
      fontWeight: '700',
      marginTop: 4,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    pillActive: {
      borderColor: p.brandStrong,
      backgroundColor: p.brandStrong,
    },
    pillInactive: {
      borderColor: p.borderSoft,
      backgroundColor: p.inputBg,
    },
    pillTextActive: {
      color: '#f8fafc',
      fontWeight: '700',
      fontSize: 12,
    },
    pillTextInactive: {
      color: p.mutedSoft,
      fontWeight: '600',
      fontSize: 12,
    },
    codeBlock: {
      marginTop: 8,
      marginBottom: 4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.panelBorder,
      backgroundColor: p.panel,
      color: p.textSoft,
      padding: 10,
      fontSize: 12,
      lineHeight: 18,
    },
    pulseWrap: {
      flexDirection: 'row',
      gap: 8,
      alignItems: 'flex-end',
      marginBottom: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: p.panelBorder,
      backgroundColor: p.panel,
      paddingHorizontal: 10,
      paddingVertical: 12,
      minHeight: 96,
    },
    pulseItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-end',
    },
    pulseBar: {
      width: 12,
      borderRadius: 999,
    },
    pulseText: {
      marginTop: 6,
      fontSize: 10,
      color: p.muted,
    },
    chartListWrap: {
      gap: 8,
      marginBottom: 12,
    },
    chartCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: p.panelBorder,
      backgroundColor: p.panel,
      paddingHorizontal: 10,
      paddingVertical: 10,
    },
    chartHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    chartSymbol: {
      color: p.textSoft,
      fontWeight: '700',
      fontSize: 12,
    },
    chartDelta: {
      fontWeight: '700',
      fontSize: 11,
    },
    sparkRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      minHeight: 40,
    },
    sparkBar: {
      flex: 1,
      borderRadius: 4,
    },
    chartMeta: {
      marginTop: 7,
      fontSize: 10,
      color: p.muted,
    },
  });
}
