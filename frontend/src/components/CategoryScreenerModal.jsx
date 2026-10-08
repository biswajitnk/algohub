import React, { useState, useEffect } from 'react';
import { 
  X, RefreshCw, CheckCircle2, XCircle, AlertCircle, TrendingUp, 
  Shield, Zap, Sparkles, Plus, ExternalLink, Filter, BarChart2, Clock 
} from 'lucide-react';
import { api } from '../services/api';

const CATEGORIES = [
  { id: 'ALL', name: 'All US Tokens (35)', label: 'All 35 Tokens' },
  { id: 'MegaCap', name: 'MegaCap (8)', label: 'MegaCap US Tech' },
  { id: 'Semis & AI', name: 'Semis & AI (14)', label: 'Semis & AI Ecosystem' },
  { id: 'Growth & Tech', name: 'Growth & Tech (8)', label: 'Growth, Fintech & Defense' }
];

const TIMEFRAMES = [
  { id: '15m', label: '15m Intraday', short: '15m' },
  { id: '30m', label: '30m Intraday', short: '30m' },
  { id: '1h', label: '1 Hour Swing', short: '1h' },
  { id: '4h', label: '4 Hours Trend', short: '4h' },
  { id: '1d', label: '1 Day (Daily)', short: '1d' }
];

export default function CategoryScreenerModal({ isOpen, onClose, onSelectStockForBot }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1d');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [filterMatchesOnly, setFilterMatchesOnly] = useState(false);

  const fetchScan = async (cat = activeCategory, tf = selectedTimeframe) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.scanCategory(cat, tf);
      setResults(data || []);
    } catch (err) {
      console.error('Failed to scan category:', err);
      setError('Unable to fetch live scanner data. Please check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchScan(activeCategory, selectedTimeframe);
    }
  }, [isOpen, activeCategory, selectedTimeframe]);

  if (!isOpen) return null;

  const totalScanned = results.length;
  const fullMatches = results.filter(r => r.is_match || r.criteria_met_count === 5);
  const nearMatches = results.filter(r => r.criteria_met_count >= 3 && r.criteria_met_count < 5);

  const displayedResults = filterMatchesOnly 
    ? results.filter(r => r.criteria_met_count >= 3)
    : results;

  const currentMinGain = results[0]?.min_gain_pct ?? (
    selectedTimeframe === '1d' ? 2.0 : 
    selectedTimeframe === '4h' ? 1.5 : 
    selectedTimeframe === '1h' ? 0.7 : 
    selectedTimeframe === '30m' ? 0.5 : 0.3
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-dark-900 rounded-2xl w-full max-w-6xl border border-dark-700 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-dark-800 bg-dark-850 flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                US Stock Token Category Radar &amp; Screener
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Real-time {selectedTimeframe === '1d' ? 'Daily' : selectedTimeframe.toUpperCase()} evaluation of RSI 14 past-dip, 20 EMA, {selectedTimeframe === '1d' ? 'yesterday' : 'previous candle'} breakout &amp; 1:2 R:R Breakeven rules.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchScan(activeCategory, selectedTimeframe)}
              disabled={loading}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-200 text-xs font-semibold border border-dark-650 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Scan</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Category Tabs & Stats Banner */}
        <div className="p-4 bg-dark-800/80 border-b border-dark-700/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeCategory === cat.id
                      ? 'bg-brand-600 text-black shadow-md shadow-brand-500/20'
                      : 'bg-dark-900 text-slate-300 hover:text-white hover:bg-dark-750 border border-dark-700'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Timeframe Selector & Filter Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-1 bg-dark-900 p-1 rounded-xl border border-dark-700">
                <span className="text-[11px] font-semibold text-slate-400 px-1.5 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-brand-400" />
                  <span className="hidden md:inline">Timeframe:</span>
                </span>
                {TIMEFRAMES.map(tf => (
                  <button
                    key={tf.id}
                    onClick={() => setSelectedTimeframe(tf.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      selectedTimeframe === tf.id
                        ? 'bg-brand-500 text-black shadow-sm font-extrabold'
                        : 'text-slate-400 hover:text-white hover:bg-dark-800'
                    }`}
                    title={tf.label}
                  >
                    {tf.short}
                  </button>
                ))}
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setFilterMatchesOnly(!filterMatchesOnly)}
                className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  filterMatchesOnly
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-dark-900 text-slate-400 border-dark-750 hover:text-slate-200'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Show Hot (&ge; 3/5)</span>
              </button>
            </div>
          </div>

          {/* KPI Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
            <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750 flex items-center justify-between">
              <span className="text-slate-400">Total Scanned:</span>
              <span className="font-bold text-white font-mono">{totalScanned} Stocks</span>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex items-center justify-between">
              <span className="text-emerald-300 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>5/5 Entry Ready:</span>
              </span>
              <span className="font-bold text-emerald-400 font-mono text-sm">{fullMatches.length} Stocks</span>
            </div>
            <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
              <span className="text-amber-300 flex items-center space-x-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Near Breakout (3-4/5):</span>
              </span>
              <span className="font-bold text-amber-400 font-mono text-sm">{nearMatches.length} Stocks</span>
            </div>
            <div className="p-2.5 rounded-lg bg-dark-900 border border-dark-750 flex items-center justify-between">
              <span className="text-slate-400">Risk-to-Reward:</span>
              <span className="font-bold text-white font-mono">1:2 Breakeven SL</span>
            </div>
          </div>
        </div>

        {/* Screener Results Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loading && results.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-brand-400" />
              <p className="text-sm font-semibold text-slate-300">Scanning US Stock Tokens across Delta Exchange...</p>
              <p className="text-xs text-slate-500">Calculating RSI 14, 20 EMA, 6D Dip, and Yesterday breakout levels</p>
            </div>
          ) : displayedResults.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              No stocks currently meet &ge; 3 criteria in this category. Toggle filter or scan another category.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-dark-750 shadow-inner">
              <table className="w-full text-left text-xs whitespace-nowrap">
                <thead className="bg-dark-850 text-slate-400 border-b border-dark-700 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Stock Token</th>
                    <th className="py-3 px-3">Price &amp; 24h</th>
                    <th className="py-3 px-2 text-center" title={`Condition 1: RSI 14 dipped below 50 in past 6 candles (${selectedTimeframe})`}>
                      1. {selectedTimeframe === '1d' ? '6D' : selectedTimeframe === '1h' ? '6H' : '6-Bar'} Dip &lt;50
                    </th>
                    <th className="py-3 px-2 text-center" title="Condition 2: Current RSI 14 crosses above 50">
                      2. RSI &ge;50
                    </th>
                    <th className="py-3 px-2 text-center" title="Condition 3: Price crosses above 20 EMA">
                      3. &gt;20 EMA
                    </th>
                    <th className="py-3 px-2 text-center" title={`Condition 4: Price breaks above ${selectedTimeframe === '1d' ? "yesterday's" : "previous candle's"} High`}>
                      4. &gt;{selectedTimeframe === '1d' ? 'Yday' : 'Prev'} High
                    </th>
                    <th className="py-3 px-2 text-center" title="Condition 5: Candle gain exceeds threshold">
                      5. Gain &gt;{currentMinGain}%
                    </th>
                    <th className="py-3 px-3 text-center">Score</th>
                    <th className="py-3 px-3 text-right">SL &bull; 1:2 Target</th>
                    <th className="py-3 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800 bg-dark-900/90">
                  {displayedResults.map(item => {
                    const ind = item.indicators || {};
                    const is5of5 = item.criteria_met_count === 5;
                    const isNear = item.criteria_met_count >= 3 && !is5of5;

                    return (
                      <tr 
                        key={item.symbol} 
                        className={`hover:bg-dark-800/60 transition-colors ${
                          is5of5 ? 'bg-emerald-950/20' : isNear ? 'bg-amber-950/10' : ''
                        }`}
                      >
                        {/* Token Name & Category */}
                        <td className="py-3 px-3">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="font-bold text-white text-sm font-mono flex items-center space-x-1.5 flex-wrap">
                                <span>{item.symbol}</span>
                                {is5of5 && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-black text-[9px] font-extrabold uppercase animate-pulse">
                                    BUY
                                  </span>
                                )}
                                {!is5of5 && ind.triggered_yesterday && (
                                  <span className="px-1.5 py-0.5 rounded bg-dark-750 text-slate-400 border border-dark-650 text-[9px] font-semibold" title="Breakout was yesterday. Late entry prohibited.">
                                    Missed (Yesterday)
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[150px] sm:max-w-[200px]">
                                {item.name}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Price & Today Gain */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-white font-mono text-xs">
                            ${Number(item.price).toFixed(2)}
                          </div>
                          <div className={`text-[11px] font-semibold flex items-center space-x-0.5 ${
                            (ind.today_gain_pct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            <span>{(ind.today_gain_pct || 0) >= 0 ? '+' : ''}{Number(ind.today_gain_pct || 0).toFixed(2)}%</span>
                          </div>
                        </td>

                        {/* 1. Past 6D Dip < 50 */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center">
                            {ind.c1_rsi_dip ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              min {ind.min_past_rsi_6d || '--'}
                            </span>
                          </div>
                        </td>

                        {/* 2. Current RSI >= 50 */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center">
                            {ind.c2_rsi_above_50 ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {ind.rsi ? `${ind.rsi}` : '--'}
                            </span>
                          </div>
                        </td>

                        {/* 3. > 20 EMA Cross */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center">
                            {ind.c3_ema_cross ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {ind.ema20 ? `$${ind.ema20}` : '--'}
                            </span>
                          </div>
                        </td>

                        {/* 4. > Yesterday High */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center">
                            {ind.c4_yesterday_cross ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {ind.yesterday_high ? `$${ind.yesterday_high}` : '--'}
                            </span>
                          </div>
                        </td>

                        {/* 5. Today Gain > 2% */}
                        <td className="py-3 px-2 text-center">
                          <div className="flex flex-col items-center">
                            {ind.c5_today_gain ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <XCircle className="w-4 h-4 text-slate-600" />
                            )}
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {ind.today_gain_pct ? `${Number(ind.today_gain_pct).toFixed(2)}%` : '--'}
                            </span>
                          </div>
                        </td>

                        {/* Score Badge */}
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold font-mono ${
                            is5of5 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                              : isNear
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-dark-800 text-slate-400'
                          }`}>
                            {item.criteria_met_count} / 5
                          </span>
                        </td>

                        {/* Suggested SL & 1:2 TP */}
                        <td className="py-3 px-3 text-right font-mono">
                          {item.suggested_sl ? (
                            <div>
                              <div className="text-[11px] text-rose-400 font-semibold">
                                SL: ${Number(item.suggested_sl).toFixed(2)}
                              </div>
                              <div className="text-[10px] text-emerald-400">
                                1:2: ${Number(item.target_1_2).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Quick Action Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              onSelectStockForBot(item.symbol, item.name, item.category, selectedTimeframe);
                              onClose();
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 mx-auto ${
                              is5of5
                                ? 'bg-brand-600 hover:bg-brand-500 text-black shadow-md'
                                : 'bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white border border-dark-700'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            <span>Launch Bot</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-dark-800 bg-dark-850 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>
              Risk-based position sizing per trade with automated Risk-to-Reward Breakeven lock.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-dark-750 hover:bg-dark-700 text-slate-200 text-xs font-semibold transition-all"
          >
            Close Radar
          </button>
        </div>

      </div>
    </div>
  );
}
