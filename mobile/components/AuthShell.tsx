import { ReactNode, useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../lib/theme-context';
import ThemeToggle from './ThemeToggle';

interface AuthShellProps {
  kicker?: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
  showBackHome?: boolean;
}

export default function AuthShell({
  kicker,
  title,
  subtitle,
  children,
  footer,
  showBackHome = true,
}: AuthShellProps) {
  const { isDark, palette } = useTheme();

  // Animated entrance and floating orbs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -10,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim, floatAnim, slideAnim]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: palette.screen }]} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.bgOrbOne, { backgroundColor: palette.orbOne, transform: [{ translateY: floatAnim }] }]} />
        <Animated.View style={[styles.bgOrbTwo, { backgroundColor: palette.orbTwo, transform: [{ translateY: Animated.multiply(floatAnim, -1) }] }]} />

        <View style={styles.topBar}>
          {showBackHome ? (
            <Pressable
              onPress={() => router.push('/')}
              style={[styles.backButton, { borderColor: palette.border, backgroundColor: palette.cardSoft }]}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
            >
              <Ionicons name="arrow-back" size={18} color={palette.text} />
              <Text style={[styles.backButtonText, { color: palette.textSoft }]}>Back to home</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <ThemeToggle size={40} />
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
              shadowOpacity: isDark ? 0.32 : 0.1,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {kicker ? <Text style={[styles.kicker, { color: palette.brand }]}>{kicker}</Text> : null}
          <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text>

          <View style={styles.body}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  bgOrbOne: {
    position: 'absolute',
    top: 80,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
  },
  bgOrbTwo: {
    position: 'absolute',
    bottom: 40,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '78%',
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    borderRadius: 32,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 22,
    elevation: 8,
  },
  kicker: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginTop: 10,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    marginTop: 22,
  },
  footer: {
    marginTop: 16,
  },
});
