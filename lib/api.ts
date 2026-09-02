const API_BASE = '/api/proxy';

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const responseText = await response.text();
  let data: any = null;
  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    const error: any = new Error(
      data?.detail?.message || data?.detail || data?.error || (typeof data === 'string' ? data : `API Error: ${response.status}`)
    );
    error.status = response.status;
    error.detail = data?.detail ?? null;
    throw error;
  }

  return data;
}

// User endpoints
export const userAPI = {
  register: (data: any) => apiCall('/api/users/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  login: (data: any) => apiCall('/api/users/login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getUser: (userId: number) => apiCall(`/api/users/${userId}`),
  getRiskSettings: (userId: number) => apiCall(`/api/users/${userId}/risk-settings`),
  updateRiskSettings: (userId: number, data: any) => apiCall(`/api/users/${userId}/risk-settings`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};

// Position endpoints
export const positionAPI = {
  open: (data: any) => apiCall('/api/positions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getPositions: (userId: number) => apiCall(`/api/positions/${userId}`),
  close: (positionId: number, reason: string = 'MANUAL') => 
    apiCall(`/api/positions/${positionId}/close?closing_reason=${reason}`, {
      method: 'POST',
    }),
};

// Market endpoints
export const marketAPI = {
  getPrice: (instrument: string) => apiCall(`/api/market/price/${instrument}`),
  getAllPrices: () => apiCall('/api/market/prices'),
  updatePrices: () => apiCall('/api/market/update-prices', { method: 'POST' }),
};

// Sentiment endpoints
export const sentimentAPI = {
  getSentiment: (instrument: string) => apiCall(`/api/sentiment/${instrument}`),
  updateSentiments: () => apiCall('/api/sentiment/update', { method: 'POST' }),
};

// Risk validation
export const riskAPI = {
  validate: (params: any) => {
    const query = new URLSearchParams(params).toString();
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

// Portfolio endpoints
export const portfolioAPI = {
  getPortfolio: (userId: number) => apiCall(`/api/portfolio/${userId}`),
  getTrades: (userId: number) => apiCall(`/api/trades/${userId}`),
};

export const coachAPI = {
  getEvents: (userId: number) => apiCall(`/api/coach/events/${userId}`),
  getAnalytics: (userId: number) => apiCall(`/api/analytics/${userId}`),
  getBrokerDemoConfig: () => apiCall('/api/broker/demo-config'),
};

// Health check
export const healthAPI = {
  check: () => apiCall('/health'),
};
