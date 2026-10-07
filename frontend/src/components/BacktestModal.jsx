import React, { useState, useEffect } from 'react';
import { 
  BarChart2, Play, RefreshCw, X, TrendingUp, TrendingDown, 
  CheckCircle, AlertCircle, Layers, Sparkles, Shield, ArrowUpRight 
} from 'lucide-react';
import { api } from '../services/api';

export default function BacktestModal({ 
  isOpen, 
  onClose, 
  initialSymbol = 'CATEGORY_SEMIS_AI', 
  initialStrategy = 'RSI_EMA_Breakout', 
  initialTimeframe = '1d' 
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const [params, setParams] = useState({
    symbol: initialSymbol || 'CATEGORY_SEMIS_AI',
    strategy_name: initialStrategy || 'RSI_EMA_Breakout',
    timeframe: initialTimeframe || '1d',
    candles_count: 100,
    sizing_mode: 'risk_pct',
    total_capital: 10000,
    risk_pct: 2.0,
    allocation_usd: 100,
    leverage: 5,
    target_rr_ratio: 2.0,
    stop_loss_mode: 'rsi_or_candle_low',
    sl_buffer_pct: 0.2
  });

  useEffect(() => {
    if (isOpen) {
      setParams(prev => ({
        ...prev,
        symbol: initialSymbol || 'CATEGORY_SEMIS_AI',
        strategy_name: initialStrategy || 'RSI_EMA_Breakout',
        timeframe: initialTimeframe || '1d'
      }));
      setResult(null);
      setError(null);
    }
  }, [isOpen, initialSymbol, initialStrategy, initialTimeframe]);

  const isBasket = params.symbol.startsWith('CATEGORY_');

  const runSimulation = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        symbol: params.symbol,
        strategy_name: params.strategy_name,
        timeframe: params.timeframe,
        candles_count: params.candles_count,
        sizing_mode: params.sizing_mode,
        total_capital: parseFloat(params.total_capital) || 10000,
        risk_pct: parseFloat(params.risk_pct) || 2.0,
        allocation_usd: parseFloat(params.allocation_usd) || 100,
        leverage: params.leverage,
        params: {
          target_rr_ratio: isNaN(Number(params.target_rr_ratio)) ? params.target_rr_ratio : parseFloat(params.target_rr_ratio),
          stop_loss_mode: params.stop_loss_mode || 'rsi_or_candle_low',
          sl_buffer_pct: parseFloat(params.sl_buffer_pct) !== undefined ? parseFloat(params.sl_buffer_pct) : 0.2
        }
      };
      const data = await api.runBacktest(payload);
      setResult(data);
    } catch (err) {
      setError(err.message || 'Backtest failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const profitableStocksCount = result?.stock_breakdown 
    ? result.stock_breakdown.filter(s => s.pnl_usd > 0).length 
    : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-dark-800 rounded-2xl max-w-4xl w-full border border-dark-700 shadow-2xl p-5 sm:p-6 my-6 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-dark-700/80 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 border border-brand-500/30 text-brand-400">
              <BarChart2 className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>Strategy Backtest Simulator</span>
                {isBasket && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Basket Portfolio Mode
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Simulate algorithmic performance using historical candlestick data directly from Delta Exchange India.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-dark-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-4 my-3">
          
          {/* Basket Indicator Card */}
          {isBasket && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-dark-900 border border-emerald-500/30 flex items-start space-x-2.5 text-xs">
              <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="font-semibold text-emerald-300">Basket Portfolio Backtest Active:</span>
                <span className="text-slate-300 ml-1">
                  This test will download real historical candles and evaluate entry/exit rules across <strong>all stocks in this basket</strong> simultaneously, showing total portfolio PnL and individual stock performance.
                </span>
              </div>
            </div>
          )}

          {/* Form controls */}
          <form onSubmit={runSimulation} className="bg-dark-900/70 p-4 rounded-xl border border-dark-700/70">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              
              {/* Symbol / Basket Selector */}
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Target Asset / Basket</span>
                  {isBasket && <span className="text-[10px] text-emerald-400 font-bold">Multi-Stock</span>}
                </label>
                <select
                  value={params.symbol}
                  onChange={(e) => setParams({ ...params, symbol: e.target.value })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-medium"
                >
                  <optgroup label="🌟 WHOLE CATEGORY BASKETS (Multi-Stock Simulation)" className="bg-dark-900 text-white">
                    <option value="CATEGORY_SEMIS_AI" className="bg-dark-900 text-white">⚡ WHOLE CATEGORY: Semis &amp; AI (12 Stocks)</option>
                    <option value="CATEGORY_MEGACAP" className="bg-dark-900 text-white">🔥 WHOLE CATEGORY: MegaCap US Tech (6 Stocks)</option>
                    <option value="CATEGORY_GROWTH_TECH" className="bg-dark-900 text-white">🚀 WHOLE CATEGORY: Growth &amp; Tech (8 Stocks)</option>
                    <option value="CATEGORY_ETFS" className="bg-dark-900 text-white">📈 WHOLE CATEGORY: ETFs &amp; Funds (5 Tokens)</option>
                    <option value="CATEGORY_COMMODITIES" className="bg-dark-900 text-white">🥇 WHOLE CATEGORY: Commodities (4 Tokens)</option>
                    <option value="CATEGORY_ALL" className="bg-dark-900 text-white">🌐 ALL US STOCK TOKENS (Full 35-Stock Basket)</option>
                  </optgroup>

                  <optgroup label="MegaCap US Tech (Single Tokens)" className="bg-dark-900 text-white">
                    <option value="NVDAXUSD" className="bg-dark-900 text-white">NVDAXUSD (NVIDIA Corporation)</option>
                    <option value="AMZNXUSD" className="bg-dark-900 text-white">AMZNXUSD (Amazon.com Inc.)</option>
                    <option value="TSLAXUSD" className="bg-dark-900 text-white">TSLAXUSD (Tesla Inc.)</option>
                    <option value="AAPLXUSD" className="bg-dark-900 text-white">AAPLXUSD (Apple Inc.)</option>
                    <option value="METAXUSD" className="bg-dark-900 text-white">METAXUSD (Meta Platforms)</option>
                    <option value="GOOGLXUSD" className="bg-dark-900 text-white">GOOGLXUSD (Alphabet Inc.)</option>
                  </optgroup>

                  <optgroup label="AI, Semiconductors & Hardware (Single Tokens)" className="bg-dark-900 text-white">
                    <option value="AMDBUSD" className="bg-dark-900 text-white">AMDBUSD (Advanced Micro Devices)</option>
                    <option value="ARMBUSD" className="bg-dark-900 text-white">ARMBUSD (ARM Holdings)</option>
                    <option value="INTCBUSD" className="bg-dark-900 text-white">INTCBUSD (Intel Corporation)</option>
                    <option value="MUBUSD" className="bg-dark-900 text-white">MUBUSD (Micron Technology)</option>
                    <option value="MRVLBUSD" className="bg-dark-900 text-white">MRVLBUSD (Marvell Technology)</option>
                    <option value="TSMBUSD" className="bg-dark-900 text-white">TSMBUSD (Taiwan Semiconductor)</option>
                    <option value="SKHYBUSD" className="bg-dark-900 text-white">SKHYBUSD (SK Hynix)</option>
                    <option value="WDCBUSD" className="bg-dark-900 text-white">WDCBUSD (Western Digital)</option>
                    <option value="SNDKBUSD" className="bg-dark-900 text-white">SNDKBUSD (SanDisk)</option>
                    <option value="LITEBUSD" className="bg-dark-900 text-white">LITEBUSD (Lumentum Holdings)</option>
                    <option value="NBISBUSD" className="bg-dark-900 text-white">NBISBUSD (Nebius AI Cloud)</option>
                    <option value="CBRSBUSD" className="bg-dark-900 text-white">CBRSBUSD (Cerebras Systems)</option>
                  </optgroup>

                  <optgroup label="Growth, Fintech & Defense (Single Tokens)" className="bg-dark-900 text-white">
                    <option value="PLTRBUSD" className="bg-dark-900 text-white">PLTRBUSD (Palantir Technologies)</option>
                    <option value="MSTRBUSD" className="bg-dark-900 text-white">MSTRBUSD (MicroStrategy)</option>
                    <option value="COINXUSD" className="bg-dark-900 text-white">COINXUSD (Coinbase Global)</option>
                    <option value="HOODBUSD" className="bg-dark-900 text-white">HOODBUSD (Robinhood Markets)</option>
                    <option value="CRCLXUSD" className="bg-dark-900 text-white">CRCLXUSD (Circle Financial)</option>
                    <option value="RKLBBUSD" className="bg-dark-900 text-white">RKLBBUSD (Rocket Lab USA)</option>
                    <option value="SPCXXUSD" className="bg-dark-900 text-white">SPCXXUSD (SpaceX Token)</option>
                    <option value="BABABUSD" className="bg-dark-900 text-white">BABABUSD (Alibaba Group)</option>
                  </optgroup>

                  <optgroup label="ETFs & Commodities (Single Tokens)" className="bg-dark-900 text-white">
                    <option value="SPYXUSD" className="bg-dark-900 text-white">SPYXUSD (S&P 500 Index ETF)</option>
                    <option value="QQQXUSD" className="bg-dark-900 text-white">QQQXUSD (Nasdaq 100 Index ETF)</option>
                    <option value="SOXLBUSD" className="bg-dark-900 text-white">SOXLBUSD (Semi Bull 3X ETF)</option>
                    <option value="DRAMBUSD" className="bg-dark-900 text-white">DRAMBUSD (Roundhill Memory ETF)</option>
                    <option value="EWYBUSD" className="bg-dark-900 text-white">EWYBUSD (iShares MSCI S. Korea)</option>
                    <option value="OILUSD" className="bg-dark-900 text-white">OILUSD (US Oil Fund)</option>
                    <option value="SLVONUSD" className="bg-dark-900 text-white">SLVONUSD (iShares Silver Trust)</option>
                    <option value="PAXGUSD" className="bg-dark-900 text-white">PAXGUSD (PAX Gold Token)</option>
                    <option value="XAUTUSD" className="bg-dark-900 text-white">XAUTUSD (Tether Gold Token)</option>
                  </optgroup>
                </select>
              </div>

              {/* Strategy */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Strategy</label>
                <select
                  value={params.strategy_name}
                  onChange={(e) => setParams({ ...params, strategy_name: e.target.value })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="RSI_EMA_Breakout" className="bg-dark-900 text-white">RSI &amp; 20 EMA Daily Breakout (1:2 Breakeven)</option>
                  <option value="Supertrend" className="bg-dark-900 text-white">Supertrend (ATR Trend Follower)</option>
                  <option value="EMA_Crossover" className="bg-dark-900 text-white">EMA Crossover (9 / 21)</option>
                  <option value="RSI_Scalper" className="bg-dark-900 text-white">RSI Scalper</option>
                </select>
              </div>

              {/* Timeframe */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Candle Timeframe</label>
                <select
                  value={params.timeframe}
                  onChange={(e) => setParams({ ...params, timeframe: e.target.value })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="1d" className="bg-dark-900 text-white">1 Day (Daily - Recommended)</option>
                  <option value="1w" className="bg-dark-900 text-white">1 Week (Weekly)</option>
                  <option value="4h" className="bg-dark-900 text-white">4 Hours</option>
                  <option value="1h" className="bg-dark-900 text-white">1 Hour</option>
                  <option value="15m" className="bg-dark-900 text-white">15 Minutes</option>
                </select>
              </div>

              {/* Candles Count */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Sample Size</label>
                <select
                  value={params.candles_count}
                  onChange={(e) => setParams({ ...params, candles_count: parseInt(e.target.value) })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="60" className="bg-dark-900 text-white">Last 60 Candles (2 Months)</option>
                  <option value="120" className="bg-dark-900 text-white">Last 120 Candles (4 Months)</option>
                  <option value="200" className="bg-dark-900 text-white">Last 200 Candles (~7 Months)</option>
                  <option value="300" className="bg-dark-900 text-white">Last 300 Candles (~10 Months)</option>
                </select>
              </div>

              {/* Leverage */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Leverage (x)</label>
                <input
                  type="number"
                  min="1"
                  max="25"
                  value={params.leverage}
                  onChange={(e) => setParams({ ...params, leverage: parseInt(e.target.value) || 5 })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>

              {/* Breakeven R:R / Indicator Exit */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Target &amp; Exit Method</span>
                  <span className="text-[10px] text-emerald-400 font-bold">EMA &bull; RSI &bull; R:R</span>
                </label>
                <select
                  value={params.target_rr_ratio.toString()}
                  onChange={(e) => setParams({ ...params, target_rr_ratio: e.target.value })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                >
                  <optgroup label="📉 Indicator Exit Targets" className="bg-dark-900 text-white">
                    <option value="20_ema" className="bg-dark-900 text-white">⚡ 20 EMA Cross Below (Exit when Price &lt; 20 EMA)</option>
                    <option value="rsi_50" className="bg-dark-900 text-white">⚡ RSI 50 Cross Below (Exit when RSI 14 &lt; 50)</option>
                    <option value="both_cross" className="bg-dark-900 text-white">⚡ 20 EMA or RSI 50 Cross Below (Either Occurs)</option>
                  </optgroup>

                  <optgroup label="🎯 Risk:Reward Breakeven Targets" className="bg-dark-900 text-white">
                    <option value="1.5" className="bg-dark-900 text-white">1 : 1.5 R:R Breakeven Lock</option>
                    <option value="2" className="bg-dark-900 text-white">1 : 2.0 R:R Breakeven Lock (Standard)</option>
                    <option value="2.5" className="bg-dark-900 text-white">1 : 2.5 R:R Breakeven Lock</option>
                    <option value="3" className="bg-dark-900 text-white">1 : 3.0 R:R Breakeven Lock (High Reward)</option>
                    <option value="3.5" className="bg-dark-900 text-white">1 : 3.5 R:R Breakeven Lock</option>
                    <option value="4" className="bg-dark-900 text-white">1 : 4.0 R:R Breakeven Lock (Trend Runner)</option>
                    <option value="5" className="bg-dark-900 text-white">1 : 5.0 R:R Breakeven Lock (Big Trend Runner)</option>
                    <option value="6" className="bg-dark-900 text-white">1 : 6.0 R:R Breakeven Lock</option>
                    <option value="8" className="bg-dark-900 text-white">1 : 8.0 R:R Breakeven Lock</option>
                    <option value="10" className="bg-dark-900 text-white">1 : 10.0 R:R Breakeven Lock</option>
                  </optgroup>

                  <optgroup label="🚀 Hybrid: 1:R Breakeven Lock + Trailing Indicator Exit" className="bg-dark-900 text-white">
                    <option value="2_and_ema" className="bg-dark-900 text-white">1:2 R:R Lock &bull; Exit on 20 EMA Cross Below</option>
                    <option value="2_and_rsi" className="bg-dark-900 text-white">1:2 R:R Lock &bull; Exit on RSI 50 Cross Below</option>
                    <option value="4_and_ema" className="bg-dark-900 text-white">1:4 R:R Lock &bull; Exit on 20 EMA Cross Below</option>
                    <option value="4_and_rsi" className="bg-dark-900 text-white">1:4 R:R Lock &bull; Exit on RSI 50 Cross Below</option>
                    <option value="5_and_ema" className="bg-dark-900 text-white">1:5 R:R Lock &bull; Exit on 20 EMA Cross Below</option>
                    <option value="5_and_rsi" className="bg-dark-900 text-white">1:5 R:R Lock &bull; Exit on RSI 50 Cross Below</option>
                  </optgroup>

                  <optgroup label="Disabled" className="bg-dark-900 text-white">
                    <option value="0" className="bg-dark-900 text-white">Disabled (Initial SL Only)</option>
                  </optgroup>
                </select>
              </div>

              {/* Stop Loss Method */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Stop Loss Method</span>
                  <span className="text-[10px] text-rose-400 font-bold">Capital Defense</span>
                </label>
                <select
                  value={params.stop_loss_mode}
                  onChange={(e) => setParams({ ...params, stop_loss_mode: e.target.value })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                >
                  <option value="rsi_or_candle_low" className="bg-dark-900 text-white">
                    ⚡ RSI 50 OR Candle Low Buffer (Whichever First)
                  </option>
                  <option value="candle_low_buffer" className="bg-dark-900 text-white">
                    🛡️ Candle Low with Buffer (Hold RSI Dips)
                  </option>
                  <option value="rsi_50" className="bg-dark-900 text-white">
                    📉 RSI 50 Cross Below Only
                  </option>
                  <option value="ema_or_candle_low" className="bg-dark-900 text-white">
                    ⚡ 20 EMA OR Candle Low Buffer
                  </option>
                  <option value="any_of_three" className="bg-dark-900 text-white">
                    🔥 Any of 3 (RSI &lt; 50, 20 EMA, or Low Buffer)
                  </option>
                  <option value="candle_low" className="bg-dark-900 text-white">
                    🛑 Strict Candle Low (0% Buffer)
                  </option>
                </select>
              </div>

              {/* SL Buffer below Low (%) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>SL Buffer below Low (%)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Wick Buffer</span>
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="5"
                  value={params.sl_buffer_pct}
                  onChange={(e) => setParams({ ...params, sl_buffer_pct: parseFloat(e.target.value) || 0 })}
                  style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                  placeholder="0.2"
                />
              </div>

              {/* Position Sizing & Capital Management Container */}
              <div className="sm:col-span-2 lg:col-span-3 bg-dark-950/70 p-3 rounded-xl border border-dark-700/70">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-2.5 border-b border-dark-800 gap-2">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Position Sizing &amp; Account Risk</span>
                    <span className="text-[10px] text-slate-400 hidden sm:inline">&bull; Dynamic contract sizing based on Stop Loss distance</span>
                  </div>
                  <div className="flex items-center bg-dark-900 rounded-lg p-0.5 border border-dark-700 text-[11px] self-start sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, sizing_mode: 'risk_pct' })}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        params.sizing_mode === 'risk_pct'
                          ? 'bg-emerald-500 text-black font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🛡️ Risk % of Capital
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams({ ...params, sizing_mode: 'fixed' })}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        params.sizing_mode === 'fixed'
                          ? 'bg-emerald-500 text-black font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      💵 Fixed Margin ($)
                    </button>
                  </div>
                </div>

                {params.sizing_mode === 'risk_pct' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Total Portfolio Capital ($)</label>
                        <span className="text-[10px] text-emerald-400 font-mono font-medium">Starting Account Size</span>
                      </div>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={params.total_capital}
                        onChange={(e) => setParams({ ...params, total_capital: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                        placeholder="e.g. 1700"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-slate-300">Risk % Per Trade</label>
                        <span className="text-[10px] font-bold text-amber-400 font-mono">
                          Max Loss on SL = ${((Number(params.total_capital) || 0) * (Number(params.risk_pct) || 0) / 100).toFixed(0)} ({params.risk_pct || 0}%)
                        </span>
                      </div>
                      <input
                        type="number"
                        min="0.01"
                        max="100"
                        step="any"
                        value={params.risk_pct}
                        onChange={(e) => setParams({ ...params, risk_pct: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                        style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                        className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                        placeholder="e.g. 0.75"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Fixed Margin Allocation ($ per trade)</label>
                      <span className="text-[10px] text-slate-400 font-mono">Position Notional = ${((Number(params.allocation_usd) || 0) * params.leverage).toFixed(0)}</span>
                    </div>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      value={params.allocation_usd}
                      onChange={(e) => setParams({ ...params, allocation_usd: e.target.value === '' ? '' : parseFloat(e.target.value) })}
                      style={{ backgroundColor: '#0b0f19', color: '#ffffff' }}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                      placeholder="e.g. 100"
                    />
                  </div>
                )}
              </div>

            </div>

            <div className="mt-4 flex items-center justify-between pt-2 border-t border-dark-800">
              <span className="text-[11px] text-slate-400">
                {isBasket ? 'Simulates trades across all category components simultaneously' : 'Historical backtesting on official Delta Exchange India candlesticks'}
              </span>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md flex items-center space-x-1.5 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{loading ? (isBasket ? 'Scanning Basket Candles...' : 'Running Backtest...') : (isBasket ? 'Simulate Whole Basket' : 'Execute Backtest')}</span>
              </button>
            </div>
          </form>

          {error && (
            <div className="p-3 rounded-lg bg-rose-950/80 text-rose-300 border border-rose-800 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Results display */}
          {result && (
            <div className="space-y-4 pt-1">
              
              {/* Basket Banner */}
              {result.is_basket && (
                <div className="p-3 rounded-xl bg-dark-900 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold text-white">{result.basket_name}</span>
                      <span className="text-[11px] text-slate-400 block">
                        {result.analyzed_stocks_count} of {result.stocks_count} stocks analyzed &bull; {result.candles_analyzed} total candle bars processed
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Profitable Stocks</span>
                    <span className="text-xs font-bold text-emerald-400">
                      {profitableStocksCount} / {result.analyzed_stocks_count} ({Math.round((profitableStocksCount / (result.analyzed_stocks_count || 1)) * 100)}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Core Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Ending Balance / Capital */}
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700/60">
                  <span className="text-[11px] text-slate-400 block">Ending Capital</span>
                  <span className="text-base font-bold font-mono text-white">
                    ${(result.ending_balance_usd ?? ((result.total_capital || 10000) + result.total_pnl_usd)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Starting: ${(result.total_capital || 10000).toLocaleString()}
                  </span>
                </div>

                {/* Total Portfolio PnL & RoC */}
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700/60">
                  <span className="text-[11px] text-slate-400 block">Total Portfolio PnL</span>
                  <span className={`text-base font-bold font-mono ${result.total_pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.total_pnl_usd >= 0 ? '+' : ''}${result.total_pnl_usd.toFixed(2)}
                  </span>
                  <span className={`text-[10px] font-bold block ${result.total_pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result.return_on_capital_pct !== undefined ? `${result.return_on_capital_pct >= 0 ? '+' : ''}${result.return_on_capital_pct}% RoC` : ''}
                  </span>
                </div>

                {/* Portfolio Win Rate */}
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700/60">
                  <span className="text-[11px] text-slate-400 block">Portfolio Win Rate</span>
                  <span className="text-base font-bold text-white font-mono">
                    {result.win_rate_pct}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {result.winning_trades}W / {result.losing_trades}L
                  </span>
                </div>

                {/* Total Trades & Sizing */}
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700/60">
                  <span className="text-[11px] text-slate-400 block">Total Trades</span>
                  <span className="text-base font-bold text-white font-mono">
                    {result.total_trades}
                  </span>
                  <span className="text-[10px] text-amber-400 font-medium block">
                    {result.sizing_mode === 'fixed' ? 'Fixed Margin' : `${result.risk_pct || 2}% Risk / Trade`}
                  </span>
                </div>

                {/* Sample / Basket Size */}
                <div className="bg-dark-900 p-3 rounded-xl border border-dark-700/60 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-400 block">{result.is_basket ? 'Basket Size' : 'Candles Tested'}</span>
                  <span className="text-base font-bold text-slate-300 font-mono">
                    {result.is_basket ? `${result.analyzed_stocks_count} Tokens` : result.candles_analyzed}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {result.timeframe.toUpperCase()} Candles
                  </span>
                </div>
              </div>

              {/* Stock-by-Stock Breakdown (For Baskets) */}
              {result.is_basket && result.stock_breakdown && (
                <div className="rounded-xl border border-dark-700/60 bg-dark-900/60 p-3 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-dark-800">
                    <span className="text-xs font-bold text-white flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Stock-by-Stock Performance Breakdown</span>
                    </span>
                    <span className="text-[11px] text-slate-400">Sorted by highest PnL</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                    {result.stock_breakdown.map((stock) => (
                      <div 
                        key={stock.symbol}
                        className="p-2 rounded-lg bg-dark-900 border border-dark-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-white block">{stock.symbol}</span>
                          <span className="text-[10px] text-slate-400">
                            {stock.total_trades} trades &bull; {stock.win_rate_pct}% WR
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`font-mono font-bold block ${stock.pnl_usd >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {stock.pnl_usd >= 0 ? '+' : ''}${stock.pnl_usd.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {stock.winning_trades}W / {stock.losing_trades}L
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulated Trades Log Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Simulated Trades Log {result.trades ? `(${result.trades.length} trades)` : ''}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Chronological order &bull; <span className="text-emerald-400 font-medium">Dates in UTC (cross-check on TradingView)</span>
                  </span>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-dark-700/60 bg-dark-900/60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-dark-800 text-slate-400 font-medium sticky top-0">
                      <tr>
                        {result.is_basket && <th className="py-2 px-3">Symbol</th>}
                        <th className="py-2 px-3">Side</th>
                        <th className="py-2 px-3">Entry (Date &amp; Price)</th>
                        <th className="py-2 px-3">Exit (Date &amp; Price)</th>
                        <th className="py-2 px-3">Margin / Pos</th>
                        <th className="py-2 px-3 text-right">PnL ($)</th>
                        <th className="py-2 px-3">Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-800">
                      {result.trades && result.trades.length > 0 ? (
                        result.trades.map((t, idx) => {
                          const formatDateStr = (timeVal, dateStr) => {
                            if (dateStr) return dateStr;
                            if (!timeVal) return '-';
                            if (typeof timeVal === 'string' && timeVal.includes('-')) return timeVal;
                            try {
                              const ts = Number(timeVal);
                              if (isNaN(ts) || ts <= 0) return String(timeVal);
                              const ms = ts > 1e14 ? ts / 1000 : (ts > 1e11 ? ts : ts * 1000);
                              const d = new Date(ms);
                              const yyyy = d.getUTCFullYear();
                              const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
                              const dd = String(d.getUTCDate()).padStart(2, '0');
                              const hh = String(d.getUTCHours()).padStart(2, '0');
                              const min = String(d.getUTCMinutes()).padStart(2, '0');
                              if (hh === '00' && min === '00') {
                                return `${yyyy}-${mm}-${dd}`;
                              }
                              return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
                            } catch {
                              return String(timeVal);
                            }
                          };

                          return (
                            <tr key={idx} className="hover:bg-dark-800/40">
                              {result.is_basket && (
                                <td className="py-1.5 px-3 font-bold text-brand-400">
                                  {t.symbol}
                                </td>
                              )}
                              <td className="py-1.5 px-3 uppercase font-semibold text-slate-300">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${t.side === 'buy' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                  {t.side}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-mono whitespace-nowrap">
                                <span className="text-white font-medium block text-[11px]">
                                  {formatDateStr(t.entry_time, t.entry_date)}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  @ ${t.entry_price.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-mono whitespace-nowrap">
                                <span className="text-white font-medium block text-[11px]">
                                  {formatDateStr(t.exit_time, t.exit_date)}
                                </span>
                                <span className="text-slate-400 text-[10px]">
                                  @ ${t.exit_price.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 font-mono text-slate-400 text-[11px]">
                                {t.allocation_usd ? `$${t.allocation_usd.toFixed(0)} ($${(t.notional_usd || (t.allocation_usd * params.leverage)).toFixed(0)})` : '-'}
                              </td>
                              <td className={`py-1.5 px-3 font-mono font-bold text-right ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)} ({t.pnl_pct.toFixed(1)}%)
                              </td>
                              <td className="py-1.5 px-3 text-[10px] text-slate-400">
                                {t.reason || 'STRATEGY_EXIT'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={result.is_basket ? 7 : 6} className="py-4 text-center text-slate-500 text-xs">
                            No trades triggered under current strategy criteria for this sample.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
