import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, TrendingDown, Eye, CheckCircle2, RefreshCw, Layers } from 'lucide-react';
import { api } from '../services/api';

// Complete list of all 35 US Stock & TradFi Tokens available on Delta Exchange India
export const ALL_DELTA_US_TOKENS = [
  // Mega-Caps
  { symbol: 'NVDAXUSD', name: 'NVIDIA Corporation', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:NVDA', price: 239.55, change: -0.39 },
  { symbol: 'AMZNXUSD', name: 'Amazon.com Inc.', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:AMZN', price: 258.02, change: +1.96 },
  { symbol: 'TSLAXUSD', name: 'Tesla Inc.', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:TSLA', price: 379.70, change: -0.62 },
  { symbol: 'AAPLXUSD', name: 'Apple Inc.', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:AAPL', price: 334.95, change: +0.33 },
  { symbol: 'METAXUSD', name: 'Meta Platforms (Facebook)', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:META', price: 742.65, change: -0.68 },
  { symbol: 'GOOGLXUSD', name: 'Alphabet Inc. (Google)', category: 'MegaCap', tag: 'xStock', tvSymbol: 'NASDAQ:GOOGL', price: 348.55, change: -0.06 },

  // AI, Semis & Hardware
  { symbol: 'AMDBUSD', name: 'Advanced Micro Devices (AMD)', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:AMD', price: 646.65, change: +2.26 },
  { symbol: 'ARMBUSD', name: 'ARM Holdings', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:ARM', price: 298.99, change: -1.00 },
  { symbol: 'INTCBUSD', name: 'Intel Corporation', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:INTC', price: 115.50, change: -0.66 },
  { symbol: 'MUBUSD', name: 'Micron Technology', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:MU', price: 1037.40, change: -2.08 },
  { symbol: 'MRVLBUSD', name: 'Marvell Technology', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:MRVL', price: 285.48, change: +5.05 },
  { symbol: 'TSMBUSD', name: 'Taiwan Semiconductor (TSMC)', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NYSE:TSM', price: 477.03, change: -1.58 },
  { symbol: 'SKHYBUSD', name: 'SK Hynix', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'KRX:000660', price: 182.47, change: -4.02 },
  { symbol: 'WDCBUSD', name: 'Western Digital', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:WDC', price: 408.90, change: -6.37 },
  { symbol: 'SNDKBUSD', name: 'SanDisk Corporation', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:WDC', price: 1636.61, change: -3.36 },
  { symbol: 'LITEBUSD', name: 'Lumentum Holdings', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:LITE', price: 1115.35, change: +2.13 },
  { symbol: 'NBISBUSD', name: 'Nebius Group (AI Cloud)', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:NBIS', price: 246.25, change: +5.18 },
  { symbol: 'CBRSBUSD', name: 'Cerebras Systems (AI Chips)', category: 'Semis & AI', tag: 'bStocks', tvSymbol: 'NASDAQ:NVDA', price: 176.11, change: -3.51 },

  // Growth, Fintech & Enterprise
  { symbol: 'PLTRBUSD', name: 'Palantir Technologies', category: 'Growth & Tech', tag: 'bStocks', tvSymbol: 'NYSE:PLTR', price: 191.95, change: +0.97 },
  { symbol: 'MSTRBUSD', name: 'MicroStrategy Inc.', category: 'Growth & Tech', tag: 'bStocks', tvSymbol: 'NASDAQ:MSTR', price: 160.05, change: -2.88 },
  { symbol: 'COINXUSD', name: 'Coinbase Global', category: 'Growth & Tech', tag: 'xStock', tvSymbol: 'NASDAQ:COIN', price: 182.70, change: -3.19 },
  { symbol: 'HOODBUSD', name: 'Robinhood Markets', category: 'Growth & Tech', tag: 'bStocks', tvSymbol: 'NASDAQ:HOOD', price: 110.97, change: -3.45 },
  { symbol: 'CRCLXUSD', name: 'Circle Internet Financial', category: 'Growth & Tech', tag: 'xStock', tvSymbol: 'NASDAQ:COIN', price: 82.70, change: -1.25 },
  { symbol: 'RKLBBUSD', name: 'Rocket Lab USA', category: 'Growth & Tech', tag: 'bStocks', tvSymbol: 'NASDAQ:RKLB', price: 74.24, change: +1.64 },
  { symbol: 'SPCXXUSD', name: 'SpaceX Token', category: 'Growth & Tech', tag: 'xStock', tvSymbol: 'NASDAQ:RKLB', price: 168.95, change: -2.22 },
  { symbol: 'BABABUSD', name: 'Alibaba Group', category: 'Growth & Tech', tag: 'bStocks', tvSymbol: 'NYSE:BABA', price: 107.65, change: -2.48 },

  // ETFs & Indices
  { symbol: 'SPYXUSD', name: 'S&P 500 Index ETF', category: 'ETFs & Funds', tag: 'xStock', tvSymbol: 'AMEX:SPY', price: 776.82, change: +0.38 },
  { symbol: 'QQQXUSD', name: 'Nasdaq 100 Index ETF', category: 'ETFs & Funds', tag: 'xStock', tvSymbol: 'NASDAQ:QQQ', price: 756.49, change: +0.16 },
  { symbol: 'SOXLBUSD', name: 'Direxion Semi Bull 3X ETF', category: 'ETFs & Funds', tag: 'bStocks', tvSymbol: 'AMEX:SOXL', price: 161.70, change: -1.49 },
  { symbol: 'DRAMBUSD', name: 'Roundhill Memory ETF', category: 'ETFs & Funds', tag: 'bStocks', tvSymbol: 'NASDAQ:MU', price: 59.33, change: -2.65 },
  { symbol: 'EWYBUSD', name: 'iShares MSCI South Korea ETF', category: 'ETFs & Funds', tag: 'bStocks', tvSymbol: 'AMEX:EWY', price: 185.50, change: -2.19 },

  // Commodities & Metals
  { symbol: 'OILUSD', name: 'US Oil Fund (USO)', category: 'Commodities', tag: 'ONDO', tvSymbol: 'AMEX:USO', price: 143.90, change: +1.36 },
  { symbol: 'SLVONUSD', name: 'iShares Silver Trust (SLV)', category: 'Commodities', tag: 'ONDO', tvSymbol: 'AMEX:SLV', price: 54.85, change: -1.08 },
  { symbol: 'PAXGUSD', name: 'PAX Gold Token (Gold)', category: 'Commodities', tag: 'Metal', tvSymbol: 'OANDA:XAUUSD', price: 2715.00, change: +0.42 },
  { symbol: 'XAUTUSD', name: 'Tether Gold Token (Gold)', category: 'Commodities', tag: 'Metal', tvSymbol: 'OANDA:XAUUSD', price: 2712.50, change: +0.39 }
];

const CATEGORIES = ['All', 'MegaCap', 'Semis & AI', 'Growth & Tech', 'ETFs & Funds', 'Commodities'];

export default function Watchlist({ selectedSymbol, onSelectSymbol, openPositions = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [items, setItems] = useState(ALL_DELTA_US_TOKENS);
  const [loading, setLoading] = useState(false);

  // Set of symbols where user currently has an open position
  const activePositionSymbols = new Set((openPositions || []).map(p => p.symbol?.toUpperCase()));

  const fetchLiveTickers = async () => {
    setLoading(true);
    try {
      const batch = await api.getBatchTickers();
      if (batch && typeof batch === 'object') {
        setItems(prevItems =>
          prevItems.map(item => {
            const live = batch[item.symbol.toUpperCase()];
            if (live && (live.price > 0 || live.close || live.mark_price)) {
              const livePrice = live.price || parseFloat(live.close || live.mark_price || item.price);
              const liveChange = typeof live.change === 'number' ? live.change : parseFloat(live.change || item.change);
              return {
                ...item,
                price: !isNaN(livePrice) ? livePrice : item.price,
                change: !isNaN(liveChange) ? liveChange : item.change
              };
            }
            return item;
          })
        );
      }
    } catch (_) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTickers();
    const interval = setInterval(fetchLiveTickers, 20000); // 20s auto poll
    return () => clearInterval(interval);
  }, []);

  const filtered = items.filter(i => {
    const matchesSearch = 
      i.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700/80 overflow-hidden shadow-sm flex flex-col h-full min-h-[550px]">
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-700/80 flex items-center justify-between bg-dark-900/60">
        <div className="flex items-center space-x-2">
          <Eye className="w-4 h-4 text-emerald-400" />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-white text-sm">Delta US Stock Tokens</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/30">
                {items.length} Active
              </span>
            </div>
            <span className="text-[10px] text-slate-400">bStocks, xStocks & US Funds (24/7)</span>
          </div>
        </div>
        <button
          onClick={fetchLiveTickers}
          disabled={loading}
          className="p-1 rounded hover:bg-dark-700 text-slate-400 hover:text-white transition-all text-xs"
          title="Refresh prices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Category Tabs */}
      <div className="px-3 pt-2.5 pb-1 flex items-center space-x-1.5 overflow-x-auto no-scrollbar border-b border-dark-700/40">
        {CATEGORIES.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 py-0.8 rounded text-[11px] whitespace-nowrap font-medium transition-all ${
                isActive
                  ? 'bg-brand-500 text-black font-semibold'
                  : 'bg-dark-900/80 text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-dark-700/60">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search symbol or company (e.g. NVDA, PLTR, MSTR)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-dark-900 border border-dark-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Stock Token List */}
      <div className="flex-1 overflow-y-auto divide-y divide-dark-700/40 max-h-[440px]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No tokens match your search filter.
          </div>
        ) : (
          filtered.map(item => {
            const isSelected = selectedSymbol?.toUpperCase() === item.symbol.toUpperCase();
            const hasPosition = activePositionSymbols.has(item.symbol.toUpperCase());
            const isPositive = item.change >= 0;

            return (
              <div
                key={item.symbol}
                onClick={() => onSelectSymbol(item.symbol)}
                className={`p-2.5 sm:p-3 flex items-center justify-between cursor-pointer transition-all ${
                  isSelected 
                    ? 'bg-brand-600/15 border-l-2 border-brand-500' 
                    : 'hover:bg-dark-700/30'
                }`}
              >
                <div>
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white text-xs font-mono">{item.symbol}</span>
                    <span className="px-1 py-0.2 rounded text-[8px] font-semibold bg-dark-700 text-slate-300">
                      {item.tag}
                    </span>
                    {hasPosition && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
                        OPEN POS
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400 block line-clamp-1">{item.name}</span>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <span className="font-mono text-xs font-semibold text-white block">
                    ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className={`inline-flex items-center text-[10px] font-semibold ${
                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {isPositive ? '+' : ''}{item.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-2 bg-dark-900/60 border-t border-dark-700/60 flex items-center justify-between text-[11px] text-slate-400">
        <span>Showing {filtered.length} of {items.length} tokens</span>
        <span className="text-emerald-400 font-medium">Daily & Weekly charts</span>
      </div>

    </div>
  );
}
