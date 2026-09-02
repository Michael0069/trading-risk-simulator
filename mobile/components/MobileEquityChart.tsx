import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Polyline, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../lib/theme-context';

export interface MobileTradePoint {
  id: number;
  instrument: string;
  pnl: number;
  pnl_percentage?: number;
  closed_at: string;
  side?: string;
}

interface MobileEquityChartProps {
  trades: MobileTradePoint[];
  startingBalance: number;
  currentBalance?: number;
}

export default function MobileEquityChart({
  trades,
  startingBalance = 10000,
  currentBalance,
}: MobileEquityChartProps) {
  const { palette, isDark } = useTheme();
  const [viewMode, setViewMode] = useState<'equity' | 'drawdown' | 'combined'>('equity');
  const [rangeFilter, setRangeFilter] = useState<'all' | '10' | '20'>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(320);

  const sortedTrades = useMemo(() => {
    const copy = [...trades];
    copy.sort((a, b) => new Date(a.closed_at).getTime() - new Date(b.closed_at).getTime());
    return copy;
  }, [trades]);

  const filteredTrades = useMemo(() => {
    if (rangeFilter === '10') return sortedTrades.slice(-10);
    if (rangeFilter === '20') return sortedTrades.slice(-20);
    return sortedTrades;
  }, [sortedTrades, rangeFilter]);

  const trajectory = useMemo(() => {
    let runningBalance = startingBalance;
    let peak = startingBalance;
    let maxDrawdownAbs = 0;
    let maxDrawdownPct = 0;

    const points = [
      {
        index: 0,
        label: 'Start',
        instrument: 'Initial Capital',
        side: '',
        pnl: 0,
        balance: startingBalance,
        peak: startingBalance,
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
    const totalGain = latest.balance - startingBalance;
    const totalGainPct = startingBalance > 0 ? (totalGain / startingBalance) * 100 : 0;

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
  }, [filteredTrades, startingBalance, sortedTrades]);

  const { points, peak, maxDrawdownPct, currentDrawdownPct, profitFactor } = trajectory;

  const height = 180;
  const padding = { top: 18, right: 15, bottom: 25, left: 48 };
  const innerWidth = Math.max(chartWidth - padding.left - padding.right, 50);
  const innerHeight = Math.max(height - padding.top - padding.bottom, 50);

  const minBalance = Math.min(...points.map((p) => p.balance), startingBalance * 0.98);
  const maxBalance = Math.max(...points.map((p) => p.balance), startingBalance * 1.02);
  const balanceRange = Math.max(maxBalance - minBalance, 1);
  const maxDDPctScaled = Math.max(...points.map((p) => p.drawdownPct), 5);

  const getX = (index: number) => {
    if (points.length <= 1) return padding.left + innerWidth / 2;
    return padding.left + (index / (points.length - 1)) * innerWidth;
  };

  const getEquityY = (balance: number) => {
    return padding.top + innerHeight - ((balance - minBalance) / balanceRange) * innerHeight;
  };

  const getDrawdownY = (ddPct: number) => {
    return padding.top + (ddPct / maxDDPctScaled) * innerHeight;
  };

  const equityPointsString = points.map((p, idx) => `${getX(idx)},${getEquityY(p.balance)}`).join(' ');
  const equityAreaPath =
    points.length > 0
      ? `M ${getX(0)},${getEquityY(points[0].balance)} ` +
        points.slice(1).map((p, idx) => `L ${getX(idx + 1)},${getEquityY(p.balance)}`).join(' ') +
        ` L ${getX(points.length - 1)},${padding.top + innerHeight} L ${getX(0)},${padding.top + innerHeight} Z`
      : '';

  const drawdownPointsString = points.map((p, idx) => `${getX(idx)},${getDrawdownY(p.drawdownPct)}`).join(' ');
  const drawdownAreaPath =
    points.length > 0
      ? `M ${getX(0)},${padding.top} ` +
        points.map((p, idx) => `L ${getX(idx)},${getDrawdownY(p.drawdownPct)}`).join(' ') +
        ` L ${getX(points.length - 1)},${padding.top} Z`
      : '';

  const startBalanceY = getEquityY(startingBalance);
  const activePoint = selectedIndex !== null && points[selectedIndex] ? points[selectedIndex] : points[points.length - 1];

  const handleLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - chartWidth) > 5) {
      setChartWidth(width);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.badgeRow}>
            <Text style={[styles.title, { color: palette.text }]}>Equity &amp; Drawdown</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>Real-Time</Text>
            </View>
          </View>
          <Text style={[styles.subtitle, { color: palette.muted }]}>
            Capital growth and risk exposure curve.
          </Text>
        </View>
      </View>

      {/* Mode & Filter Tabs */}
      <View style={styles.controlsRow}>
        <View style={[styles.segmented, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          {(['equity', 'drawdown', 'combined'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[
                styles.segmentBtn,
                viewMode === mode && [styles.segmentBtnActive, { backgroundColor: isDark ? '#334155' : '#ffffff' }],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: viewMode === mode ? (isDark ? '#f8fafc' : '#0f172a') : palette.muted },
                ]}
              >
                {mode === 'equity' ? 'Equity' : mode === 'drawdown' ? 'Drawdown' : 'Dual'}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[styles.segmented, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          {(['all', '20', '10'] as const).map((rng) => (
            <Pressable
              key={rng}
              onPress={() => setRangeFilter(rng)}
              style={[
                styles.segmentBtn,
                rangeFilter === rng && [styles.segmentBtnActive, { backgroundColor: isDark ? '#334155' : '#ffffff' }],
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: rangeFilter === rng ? (isDark ? '#f8fafc' : '#0f172a') : palette.muted },
                ]}
              >
                {rng === 'all' ? 'All' : `L${rng}`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* KPI Badges */}
      <View style={styles.kpiRow}>
        <View style={[styles.kpiBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Text style={[styles.kpiLabel, { color: palette.muted }]}>Peak Balance</Text>
          <Text style={[styles.kpiValue, { color: palette.text }]}>GHS {peak.toFixed(1)}</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Text style={[styles.kpiLabel, { color: palette.muted }]}>Max Drawdown</Text>
          <Text style={[styles.kpiValue, { color: '#fb7185' }]}>-{maxDrawdownPct.toFixed(1)}%</Text>
        </View>
        <View style={[styles.kpiBox, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Text style={[styles.kpiLabel, { color: palette.muted }]}>Profit Factor</Text>
          <Text style={[styles.kpiValue, { color: '#38bdf8' }]}>{profitFactor}</Text>
        </View>
      </View>

      {/* SVG Vector Chart */}
      <View onLayout={handleLayout} style={[styles.chartContainer, { backgroundColor: isDark ? '#020617' : '#f8fafc' }]}>
        <Svg width={chartWidth} height={height}>
          <Defs>
            <LinearGradient id="mEquityGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#10b981" stopOpacity="0.4" />
              <Stop offset="1" stopColor="#10b981" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="mDrawdownGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#f43f5e" stopOpacity="0.05" />
              <Stop offset="1" stopColor="#f43f5e" stopOpacity="0.4" />
            </LinearGradient>
          </Defs>

          {/* Baseline reference */}
          <Line
            x1={padding.left}
            y1={startBalanceY}
            x2={padding.left + innerWidth}
            y2={startBalanceY}
            stroke={isDark ? '#475569' : '#cbd5e1'}
            strokeDasharray="3 3"
            strokeWidth="1"
          />

          {/* Drawdown Area */}
          {(viewMode === 'drawdown' || viewMode === 'combined') && (
            <>
              <Path d={drawdownAreaPath} fill="url(#mDrawdownGrad)" />
              <Polyline
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.5"
                strokeDasharray={viewMode === 'combined' ? '2 2' : undefined}
                points={drawdownPointsString}
              />
            </>
          )}

          {/* Equity Area */}
          {(viewMode === 'equity' || viewMode === 'combined') && (
            <>
              <Path d={equityAreaPath} fill="url(#mEquityGrad)" />
              <Polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={equityPointsString}
              />
            </>
          )}

          {/* Y Axis Values */}
          <SvgText
            x={padding.left - 4}
            y={getEquityY(maxBalance) + 3}
            fontSize="9"
            fill={palette.muted}
            textAnchor="end"
          >
            {maxBalance.toFixed(0)}
          </SvgText>
          <SvgText
            x={padding.left - 4}
            y={getEquityY(minBalance) + 3}
            fontSize="9"
            fill={palette.muted}
            textAnchor="end"
          >
            {minBalance.toFixed(0)}
          </SvgText>

          {/* Touch Point Circles */}
          {points.map((point, idx) => {
            const x = getX(idx);
            const y = viewMode === 'drawdown' ? getDrawdownY(point.drawdownPct) : getEquityY(point.balance);
            const isSelected = selectedIndex === idx;

            return (
              <React.Fragment key={idx}>
                {isSelected && (
                  <Line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + innerHeight}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                )}
                <Circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 5 : 3}
                  fill={point.pnl >= 0 ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth={isSelected ? 2 : 1}
                  onPress={() => setSelectedIndex(idx)}
                />
                {/* Hit area */}
                <Rect
                  x={x - 15}
                  y={padding.top}
                  width={30}
                  height={innerHeight}
                  fill="transparent"
                  onPress={() => setSelectedIndex(idx)}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Point Inspector Bar */}
      {activePoint && (
        <View style={[styles.inspector, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <View style={styles.inspRow}>
            <View style={styles.inspTag}>
              <Text style={styles.inspTagText}>
                {activePoint.index === 0 ? 'Start' : `#${activePoint.index} ${activePoint.instrument}`}
              </Text>
            </View>
            <Text style={[styles.inspBal, { color: palette.text }]}>
              Bal: GHS {activePoint.balance.toFixed(2)}
            </Text>
          </View>
          <View style={styles.inspSubRow}>
            {activePoint.index > 0 && (
              <Text
                style={[
                  styles.inspMeta,
                  { color: activePoint.pnl >= 0 ? '#34d399' : '#fb7185', fontWeight: '700' },
                ]}
              >
                {activePoint.pnl >= 0 ? '+' : ''}GHS {activePoint.pnl.toFixed(2)}
              </Text>
            )}
            <Text style={[styles.inspMeta, { color: '#fb7185' }]}>
              DD: -{activePoint.drawdownPct.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}
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
  liveBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  liveText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 2,
  },
  segmentBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  segmentBtnActive: {
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  segmentText: {
    fontSize: 11,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  chartContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inspector: {
    marginTop: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  inspRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  inspTagText: {
    color: '#0284c7',
    fontSize: 11,
    fontWeight: '700',
  },
  inspBal: {
    fontSize: 12,
    fontWeight: '700',
  },
  inspSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  inspMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
});
