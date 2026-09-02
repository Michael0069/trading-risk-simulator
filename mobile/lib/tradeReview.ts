export type MistakeCategory =
  | 'CLEAN_EXECUTION'
  | 'MARKET_VARIANCE'
  | 'EMOTIONAL_FOMO'
  | 'OVERLEVERAGE'
  | 'PLAN_DEVIATION';

export interface MobileTradeReview {
  category: MistakeCategory;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  headline: string;
  diagnosis: string;
  takeaway: string;
  factors: {
    sizing: 'Good' | 'Warning' | 'Excessive';
    psychology: 'Disciplined' | 'Cautious' | 'Impulsive';
    execution: 'Followed Plan' | 'Acceptable' | 'Deviated';
  };
}

export function analyzeMobileTrade(
  trade: {
    id: number;
    instrument: string;
    entry_price: number;
    exit_price: number;
    quantity: number;
    side: string;
    pnl: number;
    pnl_percentage?: number;
    closed_at: string;
  },
  coachEvents: Array<{
    id: number;
    event_type: string;
    instrument?: string;
    risk_score?: number;
    intervention?: string;
    reasons?: string;
    notes?: string;
    created_at: string;
  }> = [],
  isDark: boolean = true
): MobileTradeReview {
  const isProfit = trade.pnl >= 0;
  const pnlPct = trade.pnl_percentage || 0;

  // Find most relevant coach event for this trade
  const tradeTime = new Date(trade.closed_at).getTime();
  const matchingEvent =
    coachEvents.find((e) => {
      if (e.instrument && e.instrument !== trade.instrument) return false;
      const eventTime = new Date(e.created_at).getTime();
      return eventTime <= tradeTime + 60000 && tradeTime - eventTime < 86400000;
    }) || coachEvents[0];

  const reasonsText = (matchingEvent?.reasons || '').toLowerCase();
  const score = matchingEvent?.risk_score || 0;
  const intervention = matchingEvent?.intervention || 'ALLOW';

  // 1. Emotional / FOMO Check (Revenge trading / Impulsive)
  const hasChasing = reasonsText.includes('chasing losses') || reasonsText.includes('loss streak');
  const hasImpulsive =
    reasonsText.includes('low confidence') ||
    reasonsText.includes('impulsive') ||
    reasonsText.includes('late-night');
  const hasEmotionalFlags = hasChasing || hasImpulsive || (score >= 55 && reasonsText.includes('fatigue'));

  if (!isProfit && (hasEmotionalFlags || intervention === 'WARN')) {
    return {
      category: 'EMOTIONAL_FOMO',
      label: 'Emotional / FOMO',
      badgeBg: isDark ? 'rgba(245, 158, 11, 0.18)' : '#fef3c7',
      badgeText: isDark ? '#fde68a' : '#b45309',
      badgeBorder: isDark ? '#b45309' : '#fcd34d',
      headline: 'Rushed or Emotional Entry',
      diagnosis: hasChasing
        ? 'You entered this trade while on a losing streak or tried to quickly make back lost money (Revenge Trading).'
        : 'You entered with low confidence, rushed into the market (FOMO), or traded while mentally fatigued.',
      takeaway: 'Step away from the screen for 10 minutes after a loss. Trade when you have a clear plan, not when you are feeling emotional.',
      factors: {
        sizing: 'Good',
        psychology: 'Impulsive',
        execution: 'Deviated',
      },
    };
  }

  // 2. Overleverage / Sizing Check
  const hasSizingRisk = reasonsText.includes('risk size is elevated') || Math.abs(pnlPct) > 10;
  if (hasSizingRisk) {
    return {
      category: 'OVERLEVERAGE',
      label: 'Oversized Risk',
      badgeBg: isDark ? 'rgba(239, 68, 68, 0.18)' : '#fee2e2',
      badgeText: isDark ? '#fca5a5' : '#b91c1c',
      badgeBorder: isDark ? '#b91c1c' : '#fca5a5',
      headline: 'Position Size Was Too Big',
      diagnosis: 'You risked too much of your total account balance on this single trade.',
      takeaway: 'Never risk more than 1% to 2% of your account on one trade. Protecting your money is rule #1 in trading.',
      factors: {
        sizing: 'Excessive',
        psychology: 'Cautious',
        execution: 'Acceptable',
      },
    };
  }

  // 3. Plan / Checklist Deviation Check
  const hasStrategyDeviation =
    reasonsText.includes('does not follow your strategy') ||
    reasonsText.includes('too short') ||
    reasonsText.includes('clarify setup');
  if (!isProfit && hasStrategyDeviation) {
    return {
      category: 'PLAN_DEVIATION',
      label: 'Bypassed Strategy',
      badgeBg: isDark ? 'rgba(168, 85, 247, 0.18)' : '#f3e8ff',
      badgeText: isDark ? '#d8b4fe' : '#7e22ce',
      badgeBorder: isDark ? '#7e22ce' : '#d8b4fe',
      headline: 'Trade Did Not Follow Your Checklist',
      diagnosis: 'You entered without verifying your strategy rules or did not have a clear reason to trade.',
      takeaway: 'Only take trades that match your pre-planned rules. If there is no clear setup, do not trade.',
      factors: {
        sizing: 'Good',
        psychology: 'Cautious',
        execution: 'Deviated',
      },
    };
  }

  // 4. Normal Market Variance Check (Clean loss)
  if (!isProfit) {
    return {
      category: 'MARKET_VARIANCE',
      label: 'Normal Market Loss',
      badgeBg: isDark ? 'rgba(56, 189, 248, 0.18)' : '#e0f2fe',
      badgeText: isDark ? '#7dd3fc' : '#0369a1',
      badgeBorder: isDark ? '#0284c7' : '#bae6fd',
      headline: 'Good Plan, Normal Market Loss',
      diagnosis: 'You did everything right! You followed your strategy, kept risk small, and used a stop-loss. The market just turned, which happens to every trader.',
      takeaway: 'Losses are a normal business expense in trading. Keep executing good setups and your long-term results will follow.',
      factors: {
        sizing: 'Good',
        psychology: 'Disciplined',
        execution: 'Followed Plan',
      },
    };
  }

  // 5. Clean Execution (Profitable disciplined trade)
  return {
    category: 'CLEAN_EXECUTION',
    label: 'Great Execution',
    badgeBg: isDark ? 'rgba(16, 185, 129, 0.18)' : '#dcfce7',
    badgeText: isDark ? '#86efac' : '#15803d',
    badgeBorder: isDark ? '#15803d' : '#86efac',
    headline: 'Well-Disciplined Win',
    diagnosis: 'You followed your trading rules, kept risk safe, and hit your profit target cleanly.',
    takeaway: 'Save this setup in your playbook! Repeating this exact disciplined process is how winning traders build consistency.',
    factors: {
      sizing: 'Good',
      psychology: 'Disciplined',
      execution: 'Followed Plan',
    },
  };
}
