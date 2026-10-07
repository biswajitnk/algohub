// Mobile API Service to interact with the VPS Backend

let VPS_URL = 'http://127.0.0.1:8000'; // Default, user can update in Settings screen

export const setVpsUrl = (url) => {
  // Strip trailing slashes
  VPS_URL = url.replace(/\/+$/, '');
};

export const getVpsUrl = () => VPS_URL;

async function request(endpoint, options = {}) {
  const url = `${VPS_URL}/api/v1${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server returned ${response.status}: ${errorText}`);
  }
  return response.json();
}

export const mobileApi = {
  getStats: () => request('/dashboard/stats'),
  getOpenTrades: () => request('/trades/open'),
  getTrades: () => request('/trades?limit=30'),
  getBots: () => request('/bots'),
  toggleBot: (id) => request(`/bots/${id}/toggle`, { method: 'POST' }),
  closeTrade: (id) => request('/trades/close', { method: 'POST', body: JSON.stringify({ trade_id: id, reason: 'MOBILE_MANUAL_CLOSE' }) }),
  triggerKillSwitch: () => request('/settings/kill-switch', { method: 'POST' })
};
