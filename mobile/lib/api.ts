import Constants from 'expo-constants';

function extractHost(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^[a-zA-Z]+:\/\//, '');
  const withoutPath = withoutProtocol.split('/')[0] || '';
  const host = (withoutPath.split(':')[0] || '').trim();

  return host || null;
}

function normalizeApiBase(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const host = extractHost(parsed.host);
    if (!host) return null;
    const port = parsed.port ? `:${parsed.port}` : '';
    return `${parsed.protocol}//${host}${port}`;
  } catch {
    return null;
  }
}

function resolveExpoHostIp(): string | null {
  const fromExpoConfig = Constants.expoConfig?.hostUri;
  const fromManifest2 = (Constants as any)?.manifest2?.extra?.expoGo?.debuggerHost;
  const fromManifest = (Constants as any)?.manifest?.debuggerHost;
  const hostUri = fromExpoConfig || fromManifest2 || fromManifest;

  if (!hostUri) return null;
  return extractHost(String(hostUri));
}

function resolveApiBase(): string {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  const expoHostIp = resolveExpoHostIp();

  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';

      // On physical devices, localhost points to the phone, not this laptop.
      if (isLocalhost && expoHostIp) {
        const port = parsed.port || '8000';
        return `${parsed.protocol}//${expoHostIp}:${port}`;
      }

      return normalizeApiBase(configured) || configured;
    } catch {
      return normalizeApiBase(configured) || configured;
    }
  }

  if (expoHostIp) {
    return `http://${expoHostIp}:8000`;
  }

  return 'http://localhost:8000';
}

function buildApiBaseCandidates(): string[] {
  const configured = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  const expoHostIp = resolveExpoHostIp();
  const candidates: string[] = [];

  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalhost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      const port = parsed.port || '8000';
      const expoFallback = expoHostIp ? normalizeApiBase(`${parsed.protocol}//${expoHostIp}:${port}`) : null;

      // Prefer LAN host when config points at localhost on physical devices.
      if (isLocalhost && expoFallback) {
        candidates.push(expoFallback);
      }

      const normalizedConfigured = normalizeApiBase(configured);
      if (normalizedConfigured) {
        candidates.push(normalizedConfigured);
      }

      // If configured host is stale, Expo host fallback can still recover.
      if (!isLocalhost && expoFallback) {
        candidates.push(expoFallback);
      }
    } catch {
      const normalizedConfigured = normalizeApiBase(configured);
      if (normalizedConfigured) {
        candidates.push(normalizedConfigured);
      }
    }
  }

  if (expoHostIp) {
    const normalizedFallback = normalizeApiBase(`http://${expoHostIp}:8000`);
    if (normalizedFallback) {
      candidates.push(normalizedFallback);
    }
  }

  const resolvedBase = normalizeApiBase(resolveApiBase());
  if (resolvedBase) {
    candidates.push(resolvedBase);
  }

  return [...new Set(candidates.filter(Boolean))];
}

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const apiBases = buildApiBaseCandidates();
  let lastNetworkError: unknown = null;

  for (const apiBase of apiBases) {
    let response: Response;
    try {
      response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
    } catch (error) {
      lastNetworkError = error;
      continue;
    }

    if (!response.ok) {
      let detail: any = null;
      try {
        detail = await response.json();
      } catch {
        detail = await response.text().catch(() => '');
      }

      const error: any = new Error(
        detail?.detail?.message || detail?.detail || detail || `API Error: ${response.status} (base: ${apiBase})`
      );
      error.status = response.status;
      error.detail = detail?.detail ?? detail ?? null;
      throw error;
    }

    return response.json();
  }

  const errorMessage = lastNetworkError instanceof Error ? lastNetworkError.message : 'Unknown network error';
  throw new Error(
    `Network request failed. Tried API bases: ${apiBases.join(', ')}. Details: ${errorMessage}`
  );
}

export const userAPI = {
  getUser: (userId: number) => apiCall(`/api/users/${userId}`),
  getRiskSettings: (userId: number) => apiCall(`/api/users/${userId}/risk-settings`),
  updateRiskSettings: (userId: number, data: any) =>
    apiCall(`/api/users/${userId}/risk-settings`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    apiCall('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  register: (data: { username: string; email: string; password: string }) =>
    apiCall('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const positionAPI = {
  open: (data: any) =>
    apiCall('/api/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPositions: (userId: number) => apiCall(`/api/positions/${userId}`),
  close: (positionId: number, reason: string = 'MANUAL') =>
    apiCall(`/api/positions/${positionId}/close?closing_reason=${encodeURIComponent(reason)}`, {
      method: 'POST',
    }),
};

export const portfolioAPI = {
  getPortfolio: (userId: number) => apiCall(`/api/portfolio/${userId}`),
  getTrades: (userId: number) => apiCall(`/api/trades/${userId}`),
};

export const marketAPI = {
  getPrice: (instrument: string) => apiCall(`/api/market/price/${instrument}`),
  getAllPrices: () => apiCall('/api/market/prices'),
  updatePrices: () => apiCall('/api/market/update-prices', { method: 'POST' }),
};

export const sentimentAPI = {
  getSentiment: (instrument: string) => apiCall(`/api/sentiment/${instrument}`),
  updateSentiments: () => apiCall('/api/sentiment/update', { method: 'POST' }),
};

export const riskAPI = {
  validate: (params: Record<string, string | number>) => {
    const query = new URLSearchParams(
      Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      }, {})
    ).toString();

    return apiCall(`/api/risk/validate?${query}`, {
      method: 'POST',
    });
  },
  pretradeAssess: (data: any) =>
    apiCall('/api/risk/pretrade-assess', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  suggestTrade: (data: any) =>
    apiCall('/api/risk/suggest-trade', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export const coachAPI = {
  getEvents: (userId: number) => apiCall(`/api/coach/events/${userId}`),
  getAnalytics: (userId: number) => apiCall(`/api/analytics/${userId}`),
  getBrokerDemoConfig: () => apiCall('/api/broker/demo-config'),
};

export const healthAPI = {
  check: () => apiCall('/health'),
};
