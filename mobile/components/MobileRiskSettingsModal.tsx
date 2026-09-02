import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme-context';
import { userAPI } from '../lib/api';

export interface MobileRiskSettings {
  max_risk_pct: number;
  max_trades_per_day: number;
  daily_loss_limit: number;
  min_risk_reward: number;
  custom_strategy: string;
}

interface MobileRiskSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  userId: number;
  currentBalance: number;
  onSaved?: (settings: MobileRiskSettings) => void;
}

export default function MobileRiskSettingsModal({
  visible,
  onClose,
  userId,
  currentBalance,
  onSaved,
}: MobileRiskSettingsModalProps) {
  const { palette, isDark } = useTheme();

  const [maxRiskPct, setMaxRiskPct] = useState<number>(2.0);
  const [maxTradesPerDay, setMaxTradesPerDay] = useState<number>(5);
  const [dailyLossLimit, setDailyLossLimit] = useState<string>('500');
  const [minRiskReward, setMinRiskReward] = useState<number>(1.5);
  const [customStrategy, setCustomStrategy] = useState<string>('General Trend & Retest');

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && userId) {
      loadSettings();
    }
  }, [visible, userId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userAPI.getRiskSettings(userId);
      if (data) {
        setMaxRiskPct(data.max_risk_pct ?? 2.0);
        setMaxTradesPerDay(data.max_trades_per_day ?? 5);
        setDailyLossLimit(String(data.daily_loss_limit ?? 500));
        setMinRiskReward(data.min_risk_reward ?? 1.5);
        setCustomStrategy(data.custom_strategy || 'General Strategy');
      }
    } catch (err: any) {
      console.error('Failed to load risk settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSaveSuccess(false);

      const parsedLoss = parseFloat(dailyLossLimit) || 100;
      const payload: MobileRiskSettings = {
        max_risk_pct: maxRiskPct,
        max_trades_per_day: maxTradesPerDay,
        daily_loss_limit: parsedLoss,
        min_risk_reward: minRiskReward,
        custom_strategy: customStrategy.trim() || 'General Strategy',
      };

      await userAPI.updateRiskSettings(userId, payload);
      setSaveSuccess(true);
      if (onSaved) {
        onSaved(payload);
      }
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      setError(err?.message || 'Failed to update risk guardrails.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setMaxRiskPct(2.0);
    setMaxTradesPerDay(5);
    setDailyLossLimit(String(Math.round(currentBalance * 0.05)));
    setMinRiskReward(1.5);
    setCustomStrategy('General Trend & Risk Guardian');
  };

  const maxRiskAmount = (currentBalance * (maxRiskPct / 100)).toFixed(2);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: palette.card, borderColor: palette.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <View style={styles.titleRow}>
                <Ionicons name="options" size={20} color="#0284c7" />
                <Text style={[styles.title, { color: palette.text }]}>Custom Risk Guardrails</Text>
              </View>
              <Text style={[styles.subtitle, { color: palette.muted }]}>
                Personalize sizing rules, daily stop, and targets.
              </Text>
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: palette.inputBg }]}>
              <Ionicons name="close" size={18} color={palette.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#0284c7" size="large" />
              <Text style={[styles.loadingText, { color: palette.muted }]}>Loading profile...</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
              {/* Max Risk % Selector */}
              <View style={[styles.sectionBox, { backgroundColor: palette.inputBg, borderColor: palette.borderSoft }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionLabel, { color: palette.text }]}>Max Risk Per Trade</Text>
                  <Text style={[styles.sectionVal, { color: '#0284c7' }]}>
                    {maxRiskPct.toFixed(1)}% (Max: GHS {maxRiskAmount})
                  </Text>
                </View>
                <View style={styles.pillRow}>
                  {[1.0, 1.5, 2.0, 3.0, 5.0].map((val) => (
                    <Pressable
                      key={val}
                      onPress={() => setMaxRiskPct(val)}
                      style={[
                        styles.pillBtn,
                        {
                          backgroundColor: maxRiskPct === val ? '#0284c7' : palette.card,
                          borderColor: maxRiskPct === val ? '#0284c7' : palette.borderSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: maxRiskPct === val ? '#ffffff' : palette.text },
                        ]}
                      >
                        {val.toFixed(1)}%
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Daily Loss Stop */}
              <View style={[styles.sectionBox, { backgroundColor: palette.inputBg, borderColor: palette.borderSoft }]}>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>Daily Loss Stop (GHS)</Text>
                <Text style={[styles.helpText, { color: palette.muted }]}>
                  Halts further trade entry when today's losses exceed this amount.
                </Text>
                <TextInput
                  value={dailyLossLimit}
                  onChangeText={setDailyLossLimit}
                  keyboardType="numeric"
                  placeholder="500"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.inputField,
                    { backgroundColor: palette.card, borderColor: palette.borderSoft, color: palette.text },
                  ]}
                />
              </View>

              {/* Max Trades Per Day */}
              <View style={[styles.sectionBox, { backgroundColor: palette.inputBg, borderColor: palette.borderSoft }]}>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>Max Trades Per Day / Session</Text>
                <Text style={[styles.helpText, { color: palette.muted }]}>
                  Prevents revenge trading and over-exposure.
                </Text>
                <View style={styles.pillRow}>
                  {[3, 5, 8, 12].map((num) => (
                    <Pressable
                      key={num}
                      onPress={() => setMaxTradesPerDay(num)}
                      style={[
                        styles.pillBtn,
                        {
                          backgroundColor: maxTradesPerDay === num ? '#0284c7' : palette.card,
                          borderColor: maxTradesPerDay === num ? '#0284c7' : palette.borderSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: maxTradesPerDay === num ? '#ffffff' : palette.text },
                        ]}
                      >
                        {num} Trades
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Min Risk:Reward Ratio */}
              <View style={[styles.sectionBox, { backgroundColor: palette.inputBg, borderColor: palette.borderSoft }]}>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>Target Min Risk:Reward</Text>
                <View style={styles.pillRow}>
                  {[
                    { label: '1:1.0', val: 1.0 },
                    { label: '1:1.5', val: 1.5 },
                    { label: '1:2.0', val: 2.0 },
                    { label: '1:3.0', val: 3.0 },
                  ].map((item) => (
                    <Pressable
                      key={item.label}
                      onPress={() => setMinRiskReward(item.val)}
                      style={[
                        styles.pillBtn,
                        {
                          backgroundColor: minRiskReward === item.val ? '#10b981' : palette.card,
                          borderColor: minRiskReward === item.val ? '#10b981' : palette.borderSoft,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pillText,
                          { color: minRiskReward === item.val ? '#ffffff' : palette.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Custom Strategy Tag */}
              <View style={[styles.sectionBox, { backgroundColor: palette.inputBg, borderColor: palette.borderSoft }]}>
                <Text style={[styles.sectionLabel, { color: palette.text }]}>Primary Strategy Tag</Text>
                <TextInput
                  value={customStrategy}
                  onChangeText={setCustomStrategy}
                  placeholder="e.g. Breakout Retest, 15M EMA Trend"
                  placeholderTextColor={palette.muted}
                  style={[
                    styles.inputField,
                    { backgroundColor: palette.card, borderColor: palette.borderSoft, color: palette.text },
                  ]}
                />
              </View>

              {error && (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={16} color="#f43f5e" />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Footer Actions */}
              <View style={styles.footerRow}>
                <Pressable onPress={handleReset} style={styles.resetBtn}>
                  <Text style={[styles.resetText, { color: palette.muted }]}>Reset Defaults</Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={saving}
                  style={[
                    styles.saveBtn,
                    { backgroundColor: saveSuccess ? '#10b981' : '#0284c7' },
                  ]}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : saveSuccess ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Saved!</Text>
                    </View>
                  ) : (
                    <Text style={styles.saveBtnText}>Save Guardrails</Text>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 99,
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 24,
  },
  sectionBox: {
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionVal: {
    fontSize: 12,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 8,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  pillBtn: {
    flexBasis: '22%',
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  inputField: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
  },
  resetBtn: {
    padding: 8,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
});
