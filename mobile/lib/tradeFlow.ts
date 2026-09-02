export interface BehavioralRiskResult {
  score: number;
  risk_level: string;
  intervention: 'ALLOW' | 'WARN' | 'BLOCK' | string;
  cooldown_minutes: number;
  reasons: string[];
  coaching_prompt: string;
}

export interface RiskValidationResult {
  allowed: boolean;
  amount_at_risk: number;
  risk_percentage: number;
  potential_reward: number;
  risk_reward_ratio: number;
  warnings: string[];
}

export function canOpenTrade(
  validation: RiskValidationResult | null | undefined,
  behavior: BehavioralRiskResult | null | undefined,
  confirmHighRisk: boolean,
): boolean {
  if (!validation?.allowed) {
    return false;
  }

  if (behavior?.intervention === 'BLOCK') {
    return false;
  }

  if (behavior?.intervention === 'WARN' && !confirmHighRisk) {
    return false;
  }

  return true;
}

export function parseTradeOpenError(error: any): {
  message: string;
  behavior?: BehavioralRiskResult;
  requiresConfirmation?: boolean;
} {
  const detail = error?.detail;

  if (detail?.requires_confirmation) {
    return {
      message: 'TradeDNA requires confirmation for this high-risk trade.',
      behavior: detail.behavior,
      requiresConfirmation: true,
    };
  }

  if (detail?.behavior) {
    return {
      message: detail.message || 'Trade blocked by behavioral guardrails.',
      behavior: detail.behavior,
    };
  }

  if (typeof detail === 'string') {
    return { message: detail };
  }

  if (detail?.message) {
    return { message: detail.message };
  }

  return { message: error?.message || 'Failed to open position.' };
}

export function interventionTone(intervention?: string) {
  if (intervention === 'BLOCK') {
    return 'danger' as const;
  }

  if (intervention === 'WARN') {
    return 'caution' as const;
  }

  return 'success' as const;
}
