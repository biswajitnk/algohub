import React, { useEffect, useRef, useState } from 'react';
import { BarChart3, Clock } from 'lucide-react';

// Exact mapping from Delta Exchange US Stock & TradFi Tokens to official NASDAQ / NYSE / AMEX tickers
const US_STOCK_SYMBOL_MAP = {
  // Mega-Caps
  'NVDAXUSD': 'NASDAQ:NVDA',
  'AMZNXUSD': 'NASDAQ:AMZN',
  'TSLAXUSD': 'NASDAQ:TSLA',
  'AAPLXUSD': 'NASDAQ:AAPL',
  'METAXUSD': 'NASDAQ:META',
  'GOOGLXUSD': 'NASDAQ:GOOGL',
  // AI, Semis & Hardware
  'AMDBUSD': 'NASDAQ:AMD',
  'ARMBUSD': 'NASDAQ:ARM',
  'INTCBUSD': 'NASDAQ:INTC',
  'MUBUSD': 'NASDAQ:MU',
  'MRVLBUSD': 'NASDAQ:MRVL',
  'TSMBUSD': 'NYSE:TSM',
  'SKHYBUSD': 'KRX:000660',
  'WDCBUSD': 'NASDAQ:WDC',
  'SNDKBUSD': 'NASDAQ:WDC',
  'LITEBUSD': 'NASDAQ:LITE',
  'NBISBUSD': 'NASDAQ:NBIS',
  'CBRSBUSD': 'NASDAQ:NVDA',
  // Growth, Fintech & Enterprise
  'PLTRBUSD': 'NYSE:PLTR',
  'MSTRBUSD': 'NASDAQ:MSTR',
  'COINXUSD': 'NASDAQ:COIN',
  'HOODBUSD': 'NASDAQ:HOOD',
  'CRCLXUSD': 'NASDAQ:COIN',
  'RKLBBUSD': 'NASDAQ:RKLB',
  'SPCXXUSD': 'NASDAQ:RKLB',
  'BABABUSD': 'NYSE:BABA',
  // ETFs & Indices
  'SPYXUSD': 'AMEX:SPY',
  'QQQXUSD': 'NASDAQ:QQQ',
  'SOXLBUSD': 'AMEX:SOXL',
  'DRAMBUSD': 'NASDAQ:MU',
  'EWYBUSD': 'AMEX:EWY',
  // Commodities & Metals
  'OILUSD': 'AMEX:USO',
  'SLVONUSD': 'AMEX:SLV',
  'PAXGUSD': 'OANDA:XAUUSD',
  'XAUTUSD': 'OANDA:XAUUSD'
};

const TIMEFRAMES = [
  { label: 'Daily (1D)', value: 'D' },
  { label: 'Weekly (1W)', value: 'W' },
  { label: 'Monthly (1M)', value: 'M' },
  { label: '4 Hours', value: '240' },
  { label: '1 Hour', value: '60' }
];

export default function TradingViewWidget({ symbol = 'NVDAXUSD', defaultTimeframe = 'D' }) {
  const containerRef = useRef(null);
  const [selectedTf, setSelectedTf] = useState(defaultTimeframe);

  const cleanSym = symbol ? symbol.toUpperCase() : 'NVDAXUSD';
  const tvSymbol = US_STOCK_SYMBOL_MAP[cleanSym] || `NASDAQ:${cleanSym.replace(/XUSD|BUSD|USD/g, '')}`;

  useEffect(() => {
    const containerId = `tv_chart_${Math.random().toString(36).substring(7)}`;
    
    if (containerRef.current) {
      containerRef.current.innerHTML = `<div id="${containerId}" style="height: 100%; width: 100%;"></div>`;
    }

    const loadWidget = () => {
      if (window.TradingView && document.getElementById(containerId)) {
        new window.TradingView.widget({
          autosize: true,
          symbol: tvSymbol,
          interval: selectedTf, // Daily 'D' or Weekly 'W'
          timezone: "America/New_York",
          theme: "dark",
          style: "1", // Candlesticks
          locale: "en",
          toolbar_bg: "#111827",
          enable_publishing: false,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          container_id: containerId,
          studies: [
            "MASimple@tv-basicstudies",
            "RSI@tv-basicstudies"
          ],
          disabled_features: ["header_screenshot", "header_compare"],
          overrides: {
            "paneProperties.background": "#0b0f19",
            "paneProperties.backgroundType": "solid",
            "scalesProperties.backgroundColor": "#0b0f19"
          }
        });
      }
    };

    if (!window.TradingView) {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = loadWidget;
      document.head.appendChild(script);
    } else {
      loadWidget();
    }
  }, [tvSymbol, selectedTf]);

  return (
    <div className="w-full h-full min-h-[500px] bg-dark-800 rounded-xl overflow-hidden border border-dark-700/80 shadow-sm flex flex-col">
      {/* Chart Toolbar with Timeframe Switcher */}
      <div className="px-4 py-2.5 bg-dark-900/90 border-b border-dark-700/80 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-brand-400" />
          <span className="font-bold text-white text-xs font-mono tracking-wide">{symbol}</span>
          <span className="text-slate-500 text-xs">•</span>
          <span className="text-xs px-2 py-0.5 rounded bg-dark-700 font-mono text-emerald-400 font-semibold">{tvSymbol}</span>
        </div>

        {/* Quick Timeframe Buttons */}
        <div className="flex items-center space-x-1 bg-dark-800 p-0.5 rounded-lg border border-dark-700/60">
          <span className="px-2 text-[10px] text-slate-400 font-medium hidden md:inline flex items-center">
            <Clock className="w-3 h-3 mr-1 inline" /> Timeframe:
          </span>
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              onClick={() => setSelectedTf(tf.value)}
              className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                selectedTf === tf.value
                  ? 'bg-brand-600 text-black shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 w-full min-h-[460px] relative">
        <div ref={containerRef} className="w-full h-full min-h-[460px]" />
      </div>
    </div>
  );
}
