const API_BASE = '/api/v1';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    let errMessage = `Error ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errMessage = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch (_) {}
    throw new Error(errMessage);
  }
  return response.json();
}

export const api = {
  // Dashboard
  getStats: (mode = null) => request('/dashboard/stats' + (mode ? `?mode=${mode}` : '')),
  getEquityCurve: (days = 7) => request(`/dashboard/equity-curve?days=${days}`),

  // Bots
  getBots: () => request('/bots'),
  createBot: (data) => request('/bots', { method: 'POST', body: JSON.stringify(data) }),
  updateBot: (id, data) => request(`/bots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBot: (id) => request(`/bots/${id}`, { method: 'DELETE' }),
  toggleBot: (id) => request(`/bots/${id}/toggle`, { method: 'POST' }),
  runBacktest: (data) => request('/bots/backtest', { method: 'POST', body: JSON.stringify(data) }),

  // Trades
  getTrades: (status = null, mode = null, limit = 50) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (status) params.append('status', status);
    if (mode) params.append('mode', mode);
    return request(`/trades?${params.toString()}`);
  },
  getOpenTrades: (mode = null) => request('/trades/open' + (mode ? `?mode=${mode}` : '')),
  closeTrade: (tradeId, reason = 'MANUAL_CLOSE') => 
    request('/trades/close', { method: 'POST', body: JSON.stringify({ trade_id: tradeId, reason }) }),

  // Market
  getProducts: () => request('/market/products'),
  getUsTokens: () => request('/market/us-tokens'),
  getTicker: (symbol) => request(`/market/ticker/${symbol}`),
  getBatchTickers: (symbols = '') => 
    request(`/market/tickers/batch${symbols ? `?symbols=${encodeURIComponent(symbols)}` : ''}`),
  getCandles: (symbol, resolution = '15m', count = 60) => 
    request(`/market/candles/${symbol}?resolution=${resolution}&count=${count}`),
  scanCategory: (category = 'ALL') => 
    request(`/market/scan-category?category=${encodeURIComponent(category)}`),

  // Settings & Risk
  getSettings: () => request('/settings'),
  updateSettings: (data) => request('/settings', { method: 'POST', body: JSON.stringify(data) }),
  testTelegram: (message) => request('/settings/test-telegram', { method: 'POST', body: JSON.stringify({ message }) }),
  testDelta: (data = {}) => request('/settings/test-delta', { method: 'POST', body: JSON.stringify(data) }),
  triggerKillSwitch: () => request('/settings/kill-switch', { method: 'POST' }),

  // Real-time WebSocket connection
  connectWebSocket: (onMessage, onStatusChange) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws = null;
    let reconnectTimeout = null;

    const connect = () => {
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (onStatusChange) onStatusChange('connected');
          // send keepalive ping every 25 seconds
          const interval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send('ping');
            } else {
              clearInterval(interval);
            }
          }, 25000);
        };

        ws.onmessage = (event) => {
          if (event.data === 'pong') return;
          try {
            const data = JSON.parse(event.data);
            if (onMessage) onMessage(data);
          } catch (e) {
            console.error('WS Parse Error', e);
          }
        };

        ws.onclose = () => {
          if (onStatusChange) onStatusChange('disconnected');
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('WS error', err);
          if (onStatusChange) onStatusChange('error');
          ws.close();
        };
      } catch (e) {
        console.error('WS Init Error', e);
        reconnectTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }
};
