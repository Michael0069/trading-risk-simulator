import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';

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

interface MobileMarketWatchProps {
  marketPrices: Record<string, MarketPriceData>;
  sentiments: Record<string, SentimentData>;
}

const instruments = ['AAPL', 'EURUSD', 'GBPUSD', 'GOLD', 'BTCUSD'];

export default function MobileMarketWatch({ marketPrices, sentiments }: MobileMarketWatchProps) {
  const { palette, isDark } = useTheme();
  const prevPrices = useRef<Record<string, number>>({});
  const [ticks, setTicks] = useState<Record<string, 'up' | 'down' | null>>({});

  useEffect(() => {
    const nextTicks: Record<string, 'up' | 'down' | null> = {};
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
      const timer = setTimeout(() => setTicks({}), 900);
      return () => clearTimeout(timer);
    }
  }, [marketPrices]);

  const getSentimentTone = (label?: string) => {
    switch (label) {
      case 'POSITIVE':
        return { text: '#10b981', bg: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5', border: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0' };
      case 'NEGATIVE':
        return { text: '#f43f5e', bg: isDark ? 'rgba(244, 63, 94, 0.12)' : '#fff1f2', border: isDark ? 'rgba(244, 63, 94, 0.25)' : '#fecdd3' };
      default:
        return { text: '#f59e0b', bg: isDark ? 'rgba(245, 158, 11, 0.12)' : '#fffbeb', border: isDark ? 'rgba(245, 158, 11, 0.25)' : '#fde68a' };
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Card Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerTitleWrap}>
          <View style={styles.titleWithIcon}>
            <Ionicons name="trending-up" size={18} color="#0284c7" />
            <Text style={[styles.titleText, { color: palette.text }]}>Market Watch</Text>
          </View>
          <Text style={[styles.subText, { color: palette.muted }]}>
            Live simulated prices, spreads, and real-time sentiment.
          </Text>
        </View>
        <View style={[styles.liveBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.12)' : '#ecfdf5' }]}>
          <View style={styles.liveDot} />
          <Text style={styles.liveBadgeText}>Live ticks</Text>
        </View>
      </View>

      {/* Instruments List */}
      <View style={styles.list}>
        {instruments.map((symbol) => {
          const price = marketPrices[symbol];
          const sentiment = sentiments[symbol];
          const tick = ticks[symbol];
          const isForex = symbol === 'EURUSD' || symbol === 'GBPUSD';
          const decimals = isForex ? 4 : 2;
          const tone = getSentimentTone(sentiment?.sentiment_label);

          const tickColor =
            tick === 'up'
              ? isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5'
              : tick === 'down'
              ? isDark ? 'rgba(244, 63, 94, 0.2)' : '#fee2e2'
              : palette.inputBg;

          return (
            <View
              key={symbol}
              style={[
                styles.instrumentCard,
                { backgroundColor: tickColor, borderColor: palette.borderSoft },
              ]}
            >
              {/* Top row: Symbol and Last Price */}
              <View style={styles.symbolRow}>
                <View style={styles.symbolWrap}>
                  <Text style={[styles.symbolText, { color: palette.text }]}>{symbol}</Text>
                  {tick && (
                    <Ionicons
                      name={tick === 'up' ? 'arrow-up' : 'arrow-down'}
                      size={14}
                      color={tick === 'up' ? '#10b981' : '#f43f5e'}
                    />
                  )}
                </View>

                {price ? (
                  <Text style={[styles.lastPrice, { color: '#0284c7' }]}>
                    {price.last_price.toFixed(decimals)}
                  </Text>
                ) : (
                  <Text style={[styles.loadingPrice, { color: palette.muted }]}>Loading...</Text>
                )}
              </View>

              {/* Quote details: Bid, Ask, Spread */}
              {price && (
                <View style={styles.quoteDetailRow}>
                  <Text style={[styles.quoteDetail, { color: palette.muted }]}>
                    Bid: <Text style={[styles.quoteDetailValue, { color: palette.text }]}>{price.bid.toFixed(decimals)}</Text>
                  </Text>
                  <Text style={[styles.quoteDetail, { color: palette.muted }]}>
                    Ask: <Text style={[styles.quoteDetailValue, { color: palette.text }]}>{price.ask.toFixed(decimals)}</Text>
                  </Text>
                  <Text style={[styles.quoteDetail, { color: palette.muted }]}>
                    Spread: <Text style={[styles.quoteDetailValue, { color: palette.text }]}>{(price.ask - price.bid).toFixed(decimals)}</Text>
                  </Text>
                </View>
              )}

              {/* Sentiment Box matching Web MarketWatch */}
              {sentiment && (
                <View style={[styles.sentimentBox, { backgroundColor: tone.bg, borderColor: tone.border }]}>
                  <View style={styles.sentimentHead}>
                    <Text style={[styles.sentimentLabel, { color: tone.text }]}>
                      {sentiment.sentiment_label || 'NEUTRAL'}
                    </Text>
                    {sentiment.sentiment_score !== undefined && (
                      <Text style={[styles.sentimentScore, { color: tone.text }]}>
                        Score: {sentiment.sentiment_score.toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {sentiment.summary ? (
                    <Text style={[styles.sentimentSummary, { color: palette.text }]}>
                      "{sentiment.summary}"
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Footer Info Notice matching Web MarketWatch */}
      <View style={[styles.footerNotice, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#ecfdf5', borderColor: isDark ? 'rgba(16, 185, 129, 0.25)' : '#a7f3d0' }]}>
        <Ionicons name="information-circle" size={16} color="#10b981" style={{ marginTop: 1 }} />
        <Text style={[styles.footerText, { color: isDark ? '#a7f3d0' : '#065f46' }]}>
          Prices update every few seconds. Sentiment analysis is AI-powered.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
    gap: 8,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 6,
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subText: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    flexShrink: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: '#10b981',
  },
  liveBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  list: {
    gap: 10,
  },
  instrumentCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  symbolRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  symbolWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  symbolText: {
    fontSize: 15,
    fontWeight: '800',
  },
  lastPrice: {
    fontSize: 16,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  loadingPrice: {
    fontSize: 12,
  },
  quoteDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  quoteDetail: {
    fontSize: 11,
  },
  quoteDetailValue: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  sentimentBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  sentimentHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sentimentLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  sentimentScore: {
    fontSize: 10,
    fontWeight: '700',
  },
  sentimentSummary: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 15,
    marginTop: 2,
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
});
