import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme-context';
import { analyzeMobileTrade } from '../lib/tradeReview';

interface MobileDisciplineGaugeProps {
  trades: any[];
  coachEvents?: any[];
  analytics?: any;
}

export default function MobileDisciplineGauge({
  trades = [],
  coachEvents = [],
  analytics,
}: MobileDisciplineGaugeProps) {
  const { palette, isDark } = useTheme();

  const metrics = useMemo(() => {
    if (trades.length === 0) {
      return {
        overallScore: 100,
        strategyScore: 100,
        riskScore: 100,
        composureScore: 100,
        statusLabel: 'Pristine Discipline',
        statusColor: '#10b981',
        advice: 'No trades placed yet. Maintain strict 2% risk and strategy checklist on your first execution.',
      };
    }

    // 1. Strategy Adherence Rate
    const strategyCleanCount = trades.filter((t) => {
      const rev = analyzeMobileTrade(t, coachEvents);
      return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
    }).length;
    const strategyScore = Math.round((strategyCleanCount / trades.length) * 100);

    // 2. Risk Ceiling Compliance
    const overleveragedCount = trades.filter((t) => {
      const rev = analyzeMobileTrade(t, coachEvents);
      return rev.category === 'OVERLEVERAGE';
    }).length;
    const riskScore = Math.max(0, Math.round(((trades.length - overleveragedCount) / trades.length) * 100));

    // 3. Emotional Composure
    const emotionalCount = trades.filter((t) => {
      const rev = analyzeMobileTrade(t, coachEvents);
      return rev.category === 'EMOTIONAL_FOMO' || rev.category === 'PLAN_DEVIATION';
    }).length;
    const lossStreak = analytics?.loss_streak || 0;
    const streakPenalty = Math.min(25, lossStreak * 8);
    const composureScore = Math.max(
      0,
      Math.round(((trades.length - emotionalCount) / trades.length) * 100) - streakPenalty
    );

    // Weighted Overall Score
    const overallScore = Math.round(strategyScore * 0.4 + riskScore * 0.3 + composureScore * 0.3);

    let statusLabel = 'Disciplined Trader';
    let statusColor = '#10b981';
    let advice = 'Excellent adherence to risk parameters. Continue executing setups with disciplined sizing.';

    if (overallScore < 60) {
      statusLabel = 'Elevated Risk';
      statusColor = '#f43f5e';
      advice = 'High frequency of emotional or unverified setups detected. Take a 15-minute cooldown before opening your next position.';
    } else if (overallScore < 80) {
      statusLabel = 'Moderate Caution';
      statusColor = '#f59e0b';
      advice = 'Minor rule deviations observed. Ensure you verify risk/reward ratio is at least 1.5:1 before placing orders.';
    }

    return {
      overallScore,
      strategyScore,
      riskScore,
      composureScore,
      statusLabel,
      statusColor,
      advice,
    };
  }, [trades, coachEvents, analytics]);

  const radius = 48;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (metrics.overallScore / 100) * circumference;

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.badgeRow}>
          <Text style={[styles.title, { color: palette.text }]}>Discipline Scorecard</Text>
          <View style={[styles.statusBadge, { backgroundColor: `${metrics.statusColor}20` }]}>
            <Text style={[styles.statusText, { color: metrics.statusColor }]}>{metrics.statusLabel}</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: palette.muted }]}>
          Real-time behavioral adherence and emotional composure index.
        </Text>
      </View>

      {/* Main Grid: Gauge Circle + Breakdown Bars */}
      <View style={styles.contentRow}>
        <View style={[styles.gaugeContainer, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <View style={styles.svgWrapper}>
            <Svg height={radius * 2} width={radius * 2}>
              <Circle
                stroke={isDark ? '#334155' : '#e2e8f0'}
                fill="transparent"
                strokeWidth={strokeWidth}
                r={normalizedRadius}
                cx={radius}
                cy={radius}
              />
              <Circle
                stroke={metrics.statusColor}
                fill="transparent"
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                r={normalizedRadius}
                cx={radius}
                cy={radius}
                originX={radius}
                originY={radius}
                rotation="-90"
              />
            </Svg>
            <View style={styles.gaugeCenter}>
              <Text style={[styles.gaugeScore, { color: metrics.statusColor }]}>{metrics.overallScore}</Text>
              <Text style={[styles.gaugeLabel, { color: palette.muted }]}>/ 100</Text>
            </View>
          </View>
        </View>

        <View style={styles.barsContainer}>
          {/* Strategy Checklist */}
          <View style={styles.barItem}>
            <View style={styles.barHeader}>
              <Text style={[styles.barTitle, { color: palette.text }]}>Strategy Plan</Text>
              <Text style={[styles.barVal, { color: palette.text }]}>{metrics.strategyScore}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <View style={[styles.fill, { width: `${metrics.strategyScore}%`, backgroundColor: '#38bdf8' }]} />
            </View>
          </View>

          {/* Risk Ceiling */}
          <View style={styles.barItem}>
            <View style={styles.barHeader}>
              <Text style={[styles.barTitle, { color: palette.text }]}>Risk Ceiling (≤2%)</Text>
              <Text style={[styles.barVal, { color: palette.text }]}>{metrics.riskScore}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <View style={[styles.fill, { width: `${metrics.riskScore}%`, backgroundColor: '#10b981' }]} />
            </View>
          </View>

          {/* Composure */}
          <View style={styles.barItem}>
            <View style={styles.barHeader}>
              <Text style={[styles.barTitle, { color: palette.text }]}>Composure</Text>
              <Text style={[styles.barVal, { color: palette.text }]}>{metrics.composureScore}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
              <View style={[styles.fill, { width: `${metrics.composureScore}%`, backgroundColor: '#a855f7' }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Diagnostic Tip */}
      <View style={[styles.adviceBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
        <Text style={[styles.adviceTitle, { color: '#0284c7' }]}>Coach Takeaway</Text>
        <Text style={[styles.adviceText, { color: palette.muted }]}>{metrics.advice}</Text>
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
  header: {
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  gaugeContainer: {
    padding: 8,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeScore: {
    fontSize: 20,
    fontWeight: '900',
  },
  gaugeLabel: {
    fontSize: 9,
    fontWeight: '700',
  },
  barsContainer: {
    flex: 1,
    gap: 8,
  },
  barItem: {
    gap: 3,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTitle: {
    fontSize: 11,
    fontWeight: '600',
  },
  barVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  track: {
    height: 6,
    borderRadius: 99,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 99,
  },
  adviceBox: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  adviceTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  adviceText: {
    fontSize: 11,
    lineHeight: 16,
  },
});
