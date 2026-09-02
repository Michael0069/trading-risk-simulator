import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { useTheme, type Palette } from '../lib/theme-context';
import { analyzeMobileTrade } from '../lib/tradeReview';

interface Trade {
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

interface MobilePerformanceStatementModalProps {
  visible: boolean;
  onClose: () => void;
  trades: Trade[];
  coachEvents?: CoachEvent[];
  startingBalance?: number;
  currentBalance?: number;
  username?: string;
}

export default function MobilePerformanceStatementModal({
  visible,
  onClose,
  trades,
  coachEvents = [],
  startingBalance = 10000,
  currentBalance,
  username = 'Demo Trader',
}: MobilePerformanceStatementModalProps) {
  const { palette: p, isDark } = useTheme();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!visible) return null;

  const winCount = trades.filter((t) => t.pnl > 0).length;
  const lossCount = trades.filter((t) => t.pnl < 0).length;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0';
  const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0);
  const avgPnL = trades.length > 0 ? (totalPnL / trades.length).toFixed(2) : '0';
  const bestWin = trades.reduce((max, t) => (t.pnl > max ? t.pnl : max), 0);

  const grossProfit = trades.filter((t) => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 'MAX' : '0.00';

  const cleanTrades = trades.filter((t) => {
    const rev = analyzeMobileTrade(t, coachEvents);
    return rev.category === 'CLEAN_EXECUTION' || rev.category === 'MARKET_VARIANCE';
  }).length;
  const disciplineScore = trades.length > 0 ? Math.round((cleanTrades / trades.length) * 100) : 100;

  const traderRank =
    disciplineScore >= 85 && parseFloat(winRate) >= 55
      ? 'Master Prop Trader (Elite)'
      : disciplineScore >= 70
      ? 'Disciplined Operator (Verified)'
      : 'Developing Trader (In-Training)';

  const finalBalance = currentBalance ?? (startingBalance + totalPnL);
  const returnOnCapital = startingBalance > 0 ? ((totalPnL / startingBalance) * 100).toFixed(2) : '0.00';

  const generateHTML = () => {
    const tradeRows = trades
      .map((t) => {
        const rev = analyzeMobileTrade(t, coachEvents);
        const pnlFormatted = `${t.pnl >= 0 ? '+' : ''}GHS ${t.pnl.toFixed(2)}`;
        const pnlColor = t.pnl >= 0 ? '#166534' : '#991b1b';
        return `
          <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
            <td style="padding: 6px 8px; font-weight: 600; color: #475569;">#${t.id}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: #1e293b;">${t.instrument}</td>
            <td style="padding: 6px 8px; color: ${t.side === 'BUY' ? '#166534' : '#991b1b'}; font-weight: 700;">${t.side}</td>
            <td style="padding: 6px 8px; color: #334155;">${t.quantity}</td>
            <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${t.entry_price.toFixed(t.instrument.includes('USD') ? 4 : 2)}</td>
            <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${t.exit_price.toFixed(t.instrument.includes('USD') ? 4 : 2)}</td>
            <td style="padding: 6px 8px; font-weight: 700; color: ${pnlColor}; font-family: monospace;">${pnlFormatted}</td>
            <td style="padding: 6px 8px; color: #64748b;">${rev.label}</td>
            <td style="padding: 6px 8px; color: #64748b;">${new Date(t.closed_at).toLocaleDateString()}</td>
          </tr>
        `;
      })
      .join('');

    const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    const targetFilename = `TradeDNA_Statement_${cleanUsername}_${dateStr}.pdf`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <title>${targetFilename}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 20px; background: #ffffff; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 3px; }
          .badge { display: inline-block; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 10px; font-weight: 700; }
          .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
          .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; text-align: center; }
          .metric-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.5px; }
          .metric-value { font-size: 16px; font-weight: 800; margin-top: 3px; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; text-align: left; margin-top: 8px; }
          th { background: #f1f5f9; color: #475569; padding: 6px 8px; font-size: 9px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
          .footer { margin-top: 25px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 9px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">TradeDNA Performance Statement</h1>
            <p class="subtitle">Audited Mobile Paper Trading Record &bull; Risk Report</p>
            <p style="font-size: 11px; margin-top: 5px; color: #475569;">Trader: <strong style="color: #0f172a;">${username}</strong> &bull; Date: <strong>${new Date().toLocaleDateString()}</strong></p>
          </div>
          <div style="text-align: right;">
            <div class="badge">${traderRank}</div>
            <p style="font-size: 10px; color: #475569; font-weight: 600; margin-top: 5px;">TradeDNA Verified</p>
          </div>
        </div>

        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Win Rate</div>
            <div class="metric-value" style="color: #166534;">${winRate}%</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${winCount}W / ${lossCount}L</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Total P&L</div>
            <div class="metric-value" style="color: ${totalPnL >= 0 ? '#166534' : '#991b1b'};">
              ${totalPnL >= 0 ? '+' : ''}GHS ${totalPnL.toFixed(2)}
            </div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${returnOnCapital}% Return</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Plan Adherence</div>
            <div class="metric-value" style="color: #334155;">${disciplineScore}%</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">${cleanTrades}/${trades.length} Clean</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Profit Factor</div>
            <div class="metric-value" style="color: #334155;">${profitFactor}</div>
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">Avg GHS ${avgPnL}</div>
          </div>
        </div>

        <h3 style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: #334155;">Trade Audit Log (${trades.length} Closed Trades)</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Asset</th>
              <th>Side</th>
              <th>Qty</th>
              <th>Entry</th>
              <th>Exit</th>
              <th>P&L</th>
              <th>Review</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${tradeRows}
          </tbody>
        </table>

        <div class="footer">
          <p>TradeDNA Risk Guardian &bull; Starting: GHS ${startingBalance.toFixed(2)} &bull; Ending: GHS ${finalBalance.toFixed(2)}</p>
        </div>
      </body>
      </html>
    `;
  };

  const handleGenerateAndSharePDF = async () => {
    try {
      setGeneratingPdf(true);
      const cleanUsername = username.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      const targetFilename = `TradeDNA_Statement_${cleanUsername}_${dateStr}.pdf`;

      const html = generateHTML();
      const { uri: tempUri } = await Print.printToFileAsync({ html });

      const targetUri = `${FileSystem.documentDirectory || ''}${targetFilename}`;
      await FileSystem.copyAsync({
        from: tempUri,
        to: targetUri,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(targetUri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: targetFilename,
        });
      } else {
        await Share.share({
          title: targetFilename,
          message: `Check out my TradeDNA Trading Statement for ${username}: Win Rate ${winRate}%, Net P&L: GHS ${totalPnL.toFixed(2)}, Plan Adherence: ${disciplineScore}%.`,
        });
      }
    } catch {
      // Fallback
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleTextShare = async () => {
    const text = [
      `📊 TradeDNA Verified Trading Statement for ${username}`,
      `• Win Rate: ${winRate}% (${winCount}W / ${lossCount}L)`,
      `• Total P&L: ${totalPnL >= 0 ? '+' : ''}GHS ${totalPnL.toFixed(2)} (${returnOnCapital}% Return)`,
      `• Plan Adherence: ${disciplineScore}%`,
      `• Profit Factor: ${profitFactor}`,
      `• Rank: ${traderRank}`,
      `Verified via TradeDNA Risk Guardian`,
    ].join('\n');

    await Share.share({
      title: `TradeDNA Performance Statement - ${username}`,
      message: text,
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const styles = createStyles(p, isDark);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Sheet Header */}
          <View style={styles.sheetHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <View style={styles.headerIcon}>
                <Ionicons name="document-text" size={20} color="#0284c7" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Performance Statement</Text>
                <Text style={styles.sheetSub}>PDF statement &amp; shareable scorecard</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={p.muted} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Scorecard Preview */}
            <View style={styles.cardPreview}>
              <View style={styles.cardTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#38bdf8" />
                  <Text style={styles.cardVerified}>TRADEDNA VERIFIED</Text>
                </View>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankBadgeText}>{traderRank}</Text>
                </View>
              </View>

              <Text style={styles.cardTrader}>{username}</Text>

              <View style={styles.grid}>
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>WIN RATE</Text>
                  <Text style={[styles.gridValue, { color: '#4ade80' }]}>{winRate}%</Text>
                  <Text style={styles.gridSub}>{winCount}W / {lossCount}L</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>TOTAL P&amp;L</Text>
                  <Text style={[styles.gridValue, { color: totalPnL >= 0 ? '#4ade80' : '#f87171' }]}>
                    {totalPnL >= 0 ? '+' : ''}GHS {totalPnL.toFixed(0)}
                  </Text>
                  <Text style={styles.gridSub}>{returnOnCapital}% Return</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>DISCIPLINE</Text>
                  <Text style={[styles.gridValue, { color: '#38bdf8' }]}>{disciplineScore}%</Text>
                  <Text style={styles.gridSub}>{cleanTrades}/{trades.length} Clean</Text>
                </View>
                <View style={styles.gridCell}>
                  <Text style={styles.gridLabel}>PROFIT FACTOR</Text>
                  <Text style={[styles.gridValue, { color: '#fbbf24' }]}>{profitFactor}</Text>
                  <Text style={styles.gridSub}>Avg GHS {avgPnL}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>Starting: GHS {startingBalance.toFixed(2)}</Text>
                <Text style={styles.cardFooterText}>Current: GHS {finalBalance.toFixed(2)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={{ gap: 10, marginTop: 18 }}>
              <Pressable
                onPress={handleGenerateAndSharePDF}
                disabled={generatingPdf}
                style={[styles.primaryBtn, generatingPdf && { opacity: 0.7 }]}
              >
                {generatingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="print-outline" size={18} color="#ffffff" />
                )}
                <Text style={styles.primaryBtnText}>
                  {generatingPdf ? 'Generating PDF...' : 'Download / Share PDF Statement'}
                </Text>
              </Pressable>

              <Pressable onPress={handleTextShare} style={styles.secondaryBtn}>
                <Ionicons name="share-social-outline" size={18} color="#0284c7" />
                <Text style={styles.secondaryBtnText}>
                  {copied ? 'Shared / Copied!' : 'Share Scorecard Summary'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(p: Palette, isDark: boolean) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: p.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      maxHeight: '88%',
      borderTopWidth: 1,
      borderColor: p.border,
      paddingBottom: 24,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderColor: p.borderSoft,
    },
    headerIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: isDark ? 'rgba(2, 132, 199, 0.18)' : '#e0f2fe',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: p.text,
    },
    sheetSub: {
      fontSize: 11,
      color: p.muted,
      marginTop: 1,
    },
    closeBtn: {
      padding: 6,
      borderRadius: 99,
    },
    body: {
      padding: 20,
    },
    cardPreview: {
      backgroundColor: '#090d16',
      borderRadius: 20,
      padding: 16,
      borderWidth: 1,
      borderColor: 'rgba(56, 189, 248, 0.25)',
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      paddingBottom: 10,
    },
    cardVerified: {
      fontSize: 10,
      fontWeight: '800',
      color: '#38bdf8',
      letterSpacing: 1,
    },
    rankBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.2)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 99,
    },
    rankBadgeText: {
      fontSize: 9,
      fontWeight: '700',
      color: '#34d399',
    },
    cardTrader: {
      fontSize: 17,
      fontWeight: '900',
      color: '#ffffff',
      marginTop: 10,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 12,
    },
    gridCell: {
      flexBasis: '47%',
      flexGrow: 1,
      backgroundColor: 'rgba(30, 41, 59, 0.6)',
      padding: 10,
      borderRadius: 12,
      alignItems: 'center',
    },
    gridLabel: {
      fontSize: 9,
      fontWeight: '700',
      color: '#94a3b8',
    },
    gridValue: {
      fontSize: 18,
      fontWeight: '900',
      marginTop: 2,
    },
    gridSub: {
      fontSize: 9,
      color: '#64748b',
      marginTop: 1,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.08)',
      paddingTop: 10,
      marginTop: 12,
    },
    cardFooterText: {
      fontSize: 10,
      color: '#94a3b8',
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: '#0284c7',
      paddingVertical: 14,
      borderRadius: 16,
    },
    primaryBtnText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
    },
    secondaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: p.inputBg,
      borderWidth: 1,
      borderColor: p.borderSoft,
      paddingVertical: 13,
      borderRadius: 16,
    },
    secondaryBtnText: {
      color: '#0284c7',
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
