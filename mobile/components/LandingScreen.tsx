import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import ThemeToggle from './ThemeToggle';
import { productRoadmap } from '../lib/roadmap';

const heroFeatures = [
  ['Risk Engine', 'Every trade is validated before entry'],
  ['Market Feed', 'Simulated prices, spreads, and sentiment'],
  ['Coach Mode', 'Explainability for every decision'],
];

const focusItems = [
  ['Portfolio guardrails', 'Max 2% risk per trade'],
  ['Trade validation', 'Stop loss, reward ratio, and balance checks'],
  ['Learning loop', 'Post-trade summaries and replay'],
];

const focusStats = [
  ['5', 'Markets'],
  ['2%', 'Risk cap'],
  ['24/7', 'Simulated'],
];

const capabilityCards = [
  ['shield-checkmark', 'Risk Guardian', 'Quantifies exposure, R:R, and approval rules before the trade can open.'],
  ['trending-up-outline', 'Live Market Data', 'Realistic bid-ask spreads and price updates for every instrument.'],
  ['bulb-outline', 'Sentiment Layer', 'A quick signal feed that helps explain market context.'],
  ['bar-chart-outline', 'Analytics', 'Win rate, P&L, and performance history in one place.'],
] as const;

const instruments = [
  ['AAPL', 'Apple Stock'],
  ['EURUSD', 'EUR/USD Forex'],
  ['GBPUSD', 'GBP/USD Forex'],
  ['GOLD', 'Gold Commodity'],
  ['BTCUSD', 'Bitcoin Crypto'],
] as const;

const roadmap = productRoadmap;

export default function LandingScreen() {
  const { isDark, palette } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [roadmapY, setRoadmapY] = useState(0);

  // Animated values
  const floatAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Fade and slide in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -8,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, floatAnim, slideAnim]);

  const scrollToRoadmap = () => {
    scrollRef.current?.scrollTo({ y: Math.max(roadmapY - 24, 0), animated: true });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screen }]} edges={['top', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Nav */}
        <View style={styles.navContainer}>
          <View style={styles.navTopRow}>
            <View style={styles.brandRow}>
              <View style={[styles.logoMark, { backgroundColor: isDark ? '#f8fafc' : '#0f172a' }]}>
                <Ionicons name="sparkles" size={20} color={isDark ? '#0f172a' : '#f8fafc'} />
              </View>
              <View style={styles.brandText}>
                <Text style={[styles.brandTitle, { color: palette.text }]} numberOfLines={1}>
                  AI Trading Simulator
                </Text>
                <Text style={[styles.brandSubtitle, { color: palette.muted }]} numberOfLines={1}>
                  Risk-first paper trading
                </Text>
              </View>
            </View>
            <ThemeToggle size={40} />
          </View>

          <View style={styles.navBottomRow}>
            <Pressable
              onPress={() => router.push('/login')}
              style={[styles.navSecondaryButton, { borderColor: palette.border, backgroundColor: palette.cardSoft }]}
            >
              <Text style={[styles.navSecondaryText, { color: palette.textSoft }]}>Login</Text>
            </Pressable>
            <Pressable
              style={[styles.navPrimaryButton, { backgroundColor: isDark ? '#f8fafc' : '#0f172a' }]}
              onPress={() => router.push('/register')}
            >
              <Text style={[styles.navPrimaryText, { color: isDark ? '#0f172a' : '#f8fafc' }]}>Get Started</Text>
              <Ionicons name="arrow-forward" size={14} color={isDark ? '#0f172a' : '#f8fafc'} />
            </Pressable>
          </View>
        </View>

        {/* Hero card */}
        <Animated.View
          style={[
            styles.heroCard,
            {
              backgroundColor: isDark ? 'rgba(2, 6, 23, 0.7)' : palette.card,
              borderColor: palette.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Animated.View style={[styles.heroGlowOne, { backgroundColor: palette.orbOne, transform: [{ translateY: floatAnim }] }]} />
          <Animated.View style={[styles.heroGlowTwo, { backgroundColor: palette.orbTwo, transform: [{ translateY: Animated.multiply(floatAnim, -1) }] }]} />

          <View style={[styles.badge, { borderColor: palette.border, backgroundColor: palette.cardSoft }]}>
            <Ionicons name="checkmark-circle" size={14} color={palette.green} />
            <Text style={[styles.badgeText, { color: palette.mutedSoft }]}>Risk-aware simulator</Text>
          </View>

          <Text style={[styles.heroTitle, { color: palette.text }]}>Trade with clarity, not guesswork.</Text>
          <Text style={[styles.heroSubtitle, { color: palette.muted }]}>
            A polished paper-trading workspace that combines market simulation, risk controls, and coaching so users can learn faster and act with confidence.
          </Text>

          <View style={styles.ctaRow}>
            <Pressable
              style={[styles.primaryCta, { backgroundColor: isDark ? '#f8fafc' : '#0f172a' }]}
              onPress={() => router.push('/register')}
            >
              <Text style={[styles.primaryCtaText, { color: isDark ? '#0f172a' : '#f8fafc' }]}>Start free</Text>
              <Ionicons name="arrow-forward" size={16} color={isDark ? '#0f172a' : '#f8fafc'} />
            </Pressable>
            <Pressable
              style={[styles.secondaryCta, { borderColor: palette.border, backgroundColor: palette.cardSoft }]}
              onPress={scrollToRoadmap}
            >
              <Text style={[styles.secondaryCtaText, { color: palette.textSoft }]}>View roadmap</Text>
            </Pressable>
          </View>

          {/* Today's focus panel */}
          <View style={[styles.focusCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.focusHeader, { borderBottomColor: palette.border }]}>
              <View>
                <Text style={[styles.focusKicker, { color: palette.muted }]}>Today's focus</Text>
                <Text style={[styles.focusTitle, { color: palette.text }]}>Risk-first coaching</Text>
              </View>
              <View style={[styles.liveBadge, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.12)' }]}>
                <Text style={[styles.liveBadgeText, { color: palette.liveText }]}>Live</Text>
              </View>
            </View>

            <View style={styles.focusList}>
              {focusItems.map(([label, detail]) => (
                <View key={label} style={[styles.focusItem, { backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1 }]}>
                  <Text style={[styles.focusItemTitle, { color: palette.text }]}>{label}</Text>
                  <Text style={[styles.focusItemDetail, { color: palette.muted }]}>{detail}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.focusStatsRow, { borderTopColor: palette.border }]}>
              {focusStats.map(([value, label]) => (
                <View key={label} style={[styles.focusStat, { backgroundColor: palette.cardSoft, borderColor: palette.border, borderWidth: 1 }]}>
                  <Text style={[styles.focusStatValue, { color: palette.text }]}>{value}</Text>
                  <Text style={[styles.focusStatLabel, { color: palette.muted }]}>{label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Hero feature strip */}
          <View style={styles.heroFeatureGrid}>
            {heroFeatures.map(([title, description]) => (
              <View
                key={title}
                style={[styles.heroFeatureCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}
              >
                <Text style={[styles.heroFeatureTitle, { color: palette.text }]}>{title}</Text>
                <Text style={[styles.heroFeatureBody, { color: palette.muted }]}>{description}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Capability cards */}
        <View style={styles.capabilityGrid}>
          {capabilityCards.map(([icon, title, description]) => (
            <View
              key={title}
              style={[styles.capabilityCard, { backgroundColor: palette.card, borderColor: palette.border }]}
            >
              <Ionicons name={icon} size={28} color={palette.text} />
              <Text style={[styles.capabilityTitle, { color: palette.text }]}>{title}</Text>
              <Text style={[styles.capabilityBody, { color: palette.muted }]}>{description}</Text>
            </View>
          ))}
        </View>

        {/* Instruments */}
        <View style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>Available instruments</Text>
          <View style={styles.instrumentGrid}>
            {instruments.map(([symbol, label]) => (
              <View
                key={symbol}
                style={[styles.instrumentCard, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}
              >
                <Text style={[styles.instrumentSymbol, { color: palette.text }]}>{symbol}</Text>
                <Text style={[styles.instrumentLabel, { color: palette.muted }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Roadmap */}
        <View
          onLayout={(event) => setRoadmapY(event.nativeEvent.layout.y)}
          style={[styles.sectionCard, { backgroundColor: palette.card, borderColor: palette.border }]}
        >
          <View style={styles.roadmapHeader}>
            <View style={styles.roadmapKickerRow}>
              <Text style={[styles.roadmapKicker, { color: palette.muted }]}>ROADMAP</Text>
              <Ionicons name="sparkles" size={16} color={palette.brand} />
            </View>
            <Text style={[styles.sectionTitle, styles.roadmapTitle, { color: palette.text }]}>
              What makes the product stand out
            </Text>
          </View>

          <View style={styles.roadmapList}>
            {roadmap.map((item) => (
              <View
                key={item.phase}
                style={[styles.roadmapItem, { backgroundColor: palette.cardSoft, borderColor: palette.border }]}
              >
                <View style={styles.roadmapItemHeader}>
                  <Text style={[styles.roadmapPhase, { color: palette.brand }]}>{item.phase}</Text>
                  <Text style={[styles.roadmapItemTitle, { color: palette.muted }]}>{item.title}</Text>
                </View>
                <View style={styles.roadmapTags}>
                  {item.items.map((point) => (
                    <View key={point} style={[styles.roadmapTag, { backgroundColor: palette.card }]}>
                      <Text style={[styles.roadmapTagText, { color: palette.textSoft }]}>{point}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 4,
  },
  navContainer: {
    gap: 12,
    paddingVertical: 8,
  },
  navTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
  },
  navPrimaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  navSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 999,
    borderWidth: 1,
  },
  navSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  logoMark: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
    minWidth: 0,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  brandSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  heroCard: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
    marginTop: 4,
  },
  heroGlowOne: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 999,
  },
  heroGlowTwo: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '700',
    marginTop: 16,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 24,
    marginTop: 14,
  },
  ctaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryCta: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  focusCard: {
    borderRadius: 28,
    padding: 18,
    marginTop: 24,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingBottom: 14,
  },
  focusKicker: {
    color: '#94a3b8',
    fontSize: 13,
  },
  focusTitle: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
  },
  liveBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  focusList: {
    gap: 12,
    paddingTop: 16,
  },
  focusItem: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 14,
  },
  focusItemTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '600',
  },
  focusItemDetail: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  focusStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 14,
  },
  focusStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  focusStatValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  focusStatLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 4,
  },
  heroFeatureGrid: {
    gap: 12,
    marginTop: 20,
  },
  heroFeatureCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  heroFeatureTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  heroFeatureBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  capabilityGrid: {
    gap: 12,
    marginTop: 20,
  },
  capabilityCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  capabilityTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 12,
  },
  capabilityBody: {
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  sectionCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 18,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  instrumentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 16,
  },
  instrumentCard: {
    flexBasis: '48%',
    flexGrow: 1,
    minWidth: '46%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  instrumentSymbol: {
    fontSize: 17,
    fontWeight: '700',
  },
  instrumentLabel: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  roadmapHeader: {
    gap: 8,
  },
  roadmapKickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roadmapTitle: {
    marginTop: 4,
  },
  roadmapKicker: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  roadmapList: {
    gap: 12,
    marginTop: 16,
  },
  roadmapItem: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  roadmapItemHeader: {
    gap: 4,
  },
  roadmapPhase: {
    fontSize: 13,
    fontWeight: '700',
  },
  roadmapItemTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  roadmapTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  roadmapTag: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  roadmapTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
