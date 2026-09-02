export const productRoadmap = [
  {
    phase: 'Done',
    title: 'TradeDNA Core & Security',
    items: [
      'Pre-trade behavior scoring',
      'AI Coach dynamic trade suggestions',
      'Pre-trade "What-If" simulator',
      'Post-trade mistake review engine',
      'Database cooldown persistence',
      'Broker API-key authentication',
      'Cross-platform Next.js & Expo mobile',
    ],
  },
  {
    phase: 'Next',
    title: 'Journaling & Security',
    items: [
      'Export trade journal (CSV/PDF)',
      'Password hashing + secure sessions',
      'User-custom risk guardrails',
      'Shareable performance cards',
    ],
  },
  {
    phase: 'Soon',
    title: 'Coaching Depth',
    items: [
      'Tick-by-tick stored trade replay',
      'Interactive risk & drawdown charts',
      'Time-of-day edge analysis',
      'Playbook setup library',
    ],
  },
  {
    phase: 'B2B',
    title: 'Broker Platform Mode',
    items: [
      'Multi-tenant broker isolation',
      'Broker compliance dashboard',
      'Intervention audit logs export',
    ],
  },
] as const;
