import React, { useState } from 'react';
import { 
  Play, Pause, Plus, Trash2, Sliders, BarChart2, Shield, 
  AlertTriangle, CheckCircle2, TrendingUp, Sparkles, Layers, Search 
} from 'lucide-react';
import CategoryScreenerModal from './CategoryScreenerModal';

const CATEGORY_MAP = {
  'MegaCap': [
    { symbol: 'NVDAXUSD', name: 'NVIDIA Corporation' },
    { symbol: 'AMZNXUSD', name: 'Amazon.com Inc.' },
    { symbol: 'TSLAXUSD', name: 'Tesla Inc.' },
    { symbol: 'AAPLXUSD', name: 'Apple Inc.' },
    { symbol: 'METAXUSD', name: 'Meta Platforms' },
    { symbol: 'GOOGLXUSD', name: 'Alphabet Inc.' }
  ],
  'Semis & AI': [
    { symbol: 'AMDBUSD', name: 'Advanced Micro Devices' },
    { symbol: 'ARMBUSD', name: 'ARM Holdings' },
    { symbol: 'INTCBUSD', name: 'Intel Corporation' },
    { symbol: 'MUBUSD', name: 'Micron Technology' },
    { symbol: 'MRVLBUSD', name: 'Marvell Technology' },
    { symbol: 'TSMBUSD', name: 'Taiwan Semiconductor' },
    { symbol: 'SKHYBUSD', name: 'SK Hynix' },
    { symbol: 'WDCBUSD', name: 'Western Digital' },
    { symbol: 'SNDKBUSD', name: 'SanDisk' },
    { symbol: 'LITEBUSD', name: 'Lumentum Holdings' },
    { symbol: 'NBISBUSD', name: 'Nebius AI Cloud' },
    { symbol: 'CBRSBUSD', name: 'Cerebras Systems' }
  ],
  'Growth & Tech': [
    { symbol: 'PLTRBUSD', name: 'Palantir Technologies' },
    { symbol: 'MSTRBUSD', name: 'MicroStrategy' },
    { symbol: 'COINXUSD', name: 'Coinbase Global' },
    { symbol: 'HOODBUSD', name: 'Robinhood Markets' },
    { symbol: 'CRCLXUSD', name: 'Circle Financial' },
    { symbol: 'RKLBBUSD', name: 'Rocket Lab USA' },
    { symbol: 'SPCXXUSD', name: 'SpaceX Token' },
    { symbol: 'BABABUSD', name: 'Alibaba Group' }
  ]
};

export default function BotsManager({ 
  bots, 
  onToggleBot, 
  onCreateBot, 
  onDeleteBot, 
  onOpenBacktest,
  tradingMode = 'LIVE'
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScreenerModal, setShowScreenerModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [newBotData, setNewBotData] = useState({
    name: 'Semis & AI Basket Breakout Bot',
    symbol: 'CATEGORY_SEMIS_AI',
    strategy_name: 'RSI_EMA_Breakout',
    timeframe: '1d',
    mode: tradingMode || 'LIVE',
    risk_pct: 2.0,
    allocation_pct: 10.0,
    allocation_usd: 100.0,
    leverage: 5,
    target_rr_ratio: '2',
    stop_loss_mode: 'rsi_or_candle_low',
    sl_reference: 'timeframe_low',
    min_today_gain_pct: 2.0,
    sl_buffer_pct: 0.2,
    stop_loss_pct: '',
    take_profit_pct: '',
    params: '{"rsi_period": 14, "ema_period": 20, "past_dip_window": 6, "min_today_gain_pct": 2.0, "target_rr_ratio": 2.0, "stop_loss_mode": "rsi_or_candle_low", "sl_reference": "timeframe_low", "sl_buffer_pct": 0.2}'
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    let parsedParams = {};
    try {
      parsedParams = JSON.parse(newBotData.params || '{}');
    } catch (_) {}
    parsedParams.timeframe = newBotData.timeframe || '1d';
    parsedParams.sl_reference = newBotData.sl_reference || 'timeframe_low';
    parsedParams.min_today_gain_pct = parseFloat(newBotData.min_today_gain_pct) !== undefined ? parseFloat(newBotData.min_today_gain_pct) : 2.0;
    parsedParams.target_rr_ratio = isNaN(Number(newBotData.target_rr_ratio)) ? newBotData.target_rr_ratio : (parseFloat(newBotData.target_rr_ratio) || 2.0);
    parsedParams.stop_loss_mode = newBotData.stop_loss_mode || 'rsi_or_candle_low';
    parsedParams.sl_buffer_pct = parseFloat(newBotData.sl_buffer_pct) !== undefined ? parseFloat(newBotData.sl_buffer_pct) : 0.2;

    const payload = {
      ...newBotData,
      risk_pct: parseFloat(newBotData.risk_pct) || 2.0,
      allocation_pct: 10.0,
      allocation_usd: 100.0,
      leverage: parseInt(newBotData.leverage) || 5,
      stop_loss_pct: newBotData.stop_loss_pct !== '' && !isNaN(parseFloat(newBotData.stop_loss_pct)) ? parseFloat(newBotData.stop_loss_pct) : null,
      take_profit_pct: newBotData.take_profit_pct !== '' && !isNaN(parseFloat(newBotData.take_profit_pct)) ? parseFloat(newBotData.take_profit_pct) : null,
      params: JSON.stringify(parsedParams)
    };

    await onCreateBot(payload);
    setShowCreateModal(false);
  };

  const handleSelectFromScreener = (symbol, name, category, timeframe = '1d') => {
    const cleanSym = symbol.replace('XUSD', '').replace('BUSD', '');
    const tfLabel = timeframe === '1d' ? 'Daily' : timeframe.toUpperCase();
    const defaultGains = { '15m': 0.3, '30m': 0.5, '1h': 0.7, '4h': 1.0, '1d': 2.0, '1w': 3.0 };
    const gain = defaultGains[timeframe] || 2.0;
    setNewBotData(prev => ({
      ...prev,
      name: `${cleanSym} ${tfLabel} Breakout Bot`,
      symbol: symbol,
      strategy_name: 'RSI_EMA_Breakout',
      timeframe: timeframe,
      min_today_gain_pct: gain,
      sl_reference: 'timeframe_low',
      risk_pct: 2.0,
      target_rr_ratio: 2.0,
      stop_loss_pct: '',
      take_profit_pct: '',
      params: JSON.stringify({
        rsi_period: 14,
        ema_period: 20,
        past_dip_window: 6,
        timeframe: timeframe,
        min_today_gain_pct: gain,
        target_rr_ratio: 2.0,
        stop_loss_mode: 'rsi_or_candle_low',
        sl_reference: 'timeframe_low',
        sl_buffer_pct: 0.2
      })
    }));
    setShowCreateModal(true);
  };

  const getSymbolDisplay = (symbol) => {
    switch (symbol) {
      case 'CATEGORY_MEGACAP':
        return { label: 'MegaCap Tech Basket', count: '8 Stocks', isBasket: true };
      case 'CATEGORY_SEMIS_AI':
        return { label: 'Semis & AI Basket', count: '14 Stocks', isBasket: true };
      case 'CATEGORY_GROWTH_TECH':
        return { label: 'Growth & Tech Basket', count: '8 Stocks', isBasket: true };
      case 'CATEGORY_ALL':
        return { label: 'All US Tokens Basket', count: '35 Stocks', isBasket: true };
      default:
        return { label: symbol, count: null, isBasket: false };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Algorithmic Strategies</h2>
          <p className="text-xs text-slate-400">Bots run continuously 24/7 on your VPS server even when your phone or browser is off.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Screener Radar Button */}
          <button
            onClick={() => setShowScreenerModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 hover:text-white hover:bg-emerald-600/40 border border-emerald-500/40 text-xs sm:text-sm font-semibold transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Category Radar &amp; Screener</span>
          </button>

          <button
            onClick={() => onOpenBacktest()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-dark-700 text-slate-200 hover:text-white hover:bg-dark-600 border border-dark-600 text-xs sm:text-sm font-medium transition-all"
          >
            <BarChart2 className="w-4 h-4 text-emerald-400" />
            <span>Backtest Simulator</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-black text-xs sm:text-sm font-bold transition-all shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>New Strategy Bot</span>
          </button>
        </div>
      </div>

      {/* Bot Mode Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-dark-700/80 pb-2">
        <span className="text-xs text-slate-400 font-medium mr-1">Filter Bots:</span>
        {[
          { id: 'ALL', label: 'All Bots' },
          { id: 'LIVE', label: '🟢 Live Bots' },
          { id: 'PAPER', label: '🟡 Paper Bots' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setModeFilter(f.id)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              modeFilter === f.id
                ? 'bg-dark-700 text-white border border-dark-600 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-dark-800'
            }`}
          >
            {f.label} ({bots.filter(b => f.id === 'ALL' || b.mode === f.id).length})
          </button>
        ))}
      </div>

      {/* Bots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bots && bots.filter(b => modeFilter === 'ALL' || b.mode === modeFilter).map(bot => {
          const isLive = bot.mode === 'LIVE';
          const symInfo = getSymbolDisplay(bot.symbol);

          return (
            <div 
              key={bot.id} 
              className={`bg-dark-800 rounded-xl p-5 border transition-all ${
                bot.is_active 
                  ? 'border-emerald-600/50 shadow-md shadow-emerald-950/20' 
                  : 'border-dark-700/80 opacity-80'
              }`}
            >
              {/* Bot Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white text-base">{bot.name}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                      isLive ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-blue-950 text-blue-400'
                    }`}>
                      {bot.mode}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    {symInfo.isBasket ? (
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[11px] font-bold">
                        <Layers className="w-3 h-3 text-purple-400" />
                        <span>{symInfo.label} ({symInfo.count})</span>
                      </span>
                    ) : (
                      <span className="font-mono text-xs text-brand-400 font-semibold">{bot.symbol}</span>
                    )}
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs text-slate-400">{bot.timeframe}</span>
                    <span className="text-slate-500">&bull;</span>
                    <span className="text-xs text-slate-300 font-medium">
                      {bot.strategy_name === 'RSI_EMA_Breakout' ? 'RSI & 20 EMA Breakout' : bot.strategy_name}
                    </span>
                  </div>
                </div>

                {/* Status Dot */}
                <div className="flex items-center space-x-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${bot.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  <span className="text-xs text-slate-400">{bot.is_active ? 'RUNNING 24/7' : 'STOPPED'}</span>
                </div>
              </div>

              {/* Bot Parameters Summary */}
              <div className="grid grid-cols-2 gap-2 my-4 p-3 rounded-lg bg-dark-900/60 border border-dark-700/60 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Risk Per Trade</span>
                  <span className="font-semibold text-rose-400">
                    {bot.risk_pct || 2}% <span className="font-normal text-slate-300">({bot.leverage}x lev)</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">Size auto-scales to SL</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Target Rules</span>
                  {bot.strategy_name === 'RSI_EMA_Breakout' ? (
                    <span className="font-semibold text-emerald-400 text-[11px] block truncate" title={`Candle Low SL • 1:${(() => {
                      try {
                        const p = JSON.parse(bot.params || '{}');
                        return p.target_rr_ratio || 2;
                      } catch (_) { return 2; }
                    })()} Breakeven${bot.take_profit_pct ? ` • TP +${bot.take_profit_pct}%` : ''}`}>
                      Low SL &bull; 1:{(() => {
                        try {
                          const p = JSON.parse(bot.params || '{}');
                          return p.target_rr_ratio || 2;
                        } catch (_) { return 2; }
                      })()} BE
                      {bot.take_profit_pct ? ` &bull; +${bot.take_profit_pct}%` : ''}
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-200">
                      {bot.stop_loss_pct ? <span className="text-rose-400">-{bot.stop_loss_pct}%</span> : <span className="text-slate-400">Low SL</span>}
                      {' / '}
                      {bot.take_profit_pct ? <span className="text-emerald-400">+{bot.take_profit_pct}%</span> : <span className="text-slate-400">Trend TP</span>}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2 border-t border-dark-700/60">
                <button
                  onClick={() => onToggleBot(bot.id)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    bot.is_active
                      ? 'bg-amber-600/20 text-amber-300 hover:bg-amber-600 hover:text-white border border-amber-500/30'
                      : 'bg-brand-600 text-black hover:bg-brand-500'
                  }`}
                >
                  {bot.is_active ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>PAUSE BOT</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>START 24/7</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => onOpenBacktest(bot.symbol, bot.strategy_name, bot.timeframe)}
                  className="p-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 hover:text-white transition-all text-xs"
                  title="Test on historical data"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`Delete bot ${bot.name}?`)) onDeleteBot(bot.id);
                  }}
                  className="p-2 rounded-lg bg-dark-700 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-all text-xs"
                  title="Delete bot"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Create Bot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark-800 rounded-2xl max-w-lg w-full border border-dark-700 shadow-2xl p-6 max-h-[95vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-1">Create Algorithmic Trading Bot</h3>
            <p className="text-xs text-slate-400 mb-4">Configure automated strategy logic for Delta Exchange India.</p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Bot Name</label>
                <input
                  type="text"
                  required
                  value={newBotData.name}
                  onChange={(e) => setNewBotData({ ...newBotData, name: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Target Symbol (Category or Individual Token) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>Target Symbol or Basket</span>
                  <span className="text-[10px] text-brand-400 font-semibold">Track whole category at once!</span>
                </label>
                <select
                  value={newBotData.symbol}
                  onChange={(e) => {
                    const sym = e.target.value;
                    let defaultName = newBotData.name;
                    if (sym === 'CATEGORY_SEMIS_AI') defaultName = 'Semis & AI Basket Breakout Bot';
                    else if (sym === 'CATEGORY_MEGACAP') defaultName = 'MegaCap Tech Basket Breakout Bot';
                    else if (sym === 'CATEGORY_GROWTH_TECH') defaultName = 'Growth & Tech Basket Breakout Bot';
                    else if (sym === 'CATEGORY_ALL') defaultName = 'All US Tokens Basket Scanner Bot';
                    else {
                      const cleanSym = sym.replace('XUSD', '').replace('BUSD', '');
                      defaultName = `${cleanSym} Daily Breakout Bot`;
                    }
                    setNewBotData({ ...newBotData, symbol: sym, name: defaultName });
                  }}
                  className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                >
                  <optgroup label="🌟 WHOLE CATEGORY BASKETS (Auto-Scans All Stocks)">
                    <option value="CATEGORY_SEMIS_AI">⚡ WHOLE CATEGORY: Semis &amp; AI (Auto-scan 14 stocks)</option>
                    <option value="CATEGORY_MEGACAP">🔥 WHOLE CATEGORY: MegaCap US Tech (Auto-scan 8 stocks)</option>
                    <option value="CATEGORY_GROWTH_TECH">🚀 WHOLE CATEGORY: Growth &amp; Tech (Auto-scan 8 stocks)</option>
                    <option value="CATEGORY_ALL">🌐 ALL US STOCK TOKENS (Full 35-Stock Basket Scanner)</option>
                  </optgroup>

                  <optgroup label="MegaCap US Tech (Single Tokens)">
                    <option value="NVDAXUSD">NVDAXUSD (NVIDIA Corporation)</option>
                    <option value="AMZNXUSD">AMZNXUSD (Amazon.com Inc.)</option>
                    <option value="TSLAXUSD">TSLAXUSD (Tesla Inc.)</option>
                    <option value="AAPLXUSD">AAPLXUSD (Apple Inc.)</option>
                    <option value="METAXUSD">METAXUSD (Meta Platforms)</option>
                    <option value="GOOGLXUSD">GOOGLXUSD (Alphabet Inc.)</option>
                  </optgroup>

                  <optgroup label="AI, Semiconductors & Hardware (Single Tokens)">
                    <option value="AMDBUSD">AMDBUSD (Advanced Micro Devices)</option>
                    <option value="ARMBUSD">ARMBUSD (ARM Holdings)</option>
                    <option value="INTCBUSD">INTCBUSD (Intel Corporation)</option>
                    <option value="MUBUSD">MUBUSD (Micron Technology)</option>
                    <option value="MRVLBUSD">MRVLBUSD (Marvell Technology)</option>
                    <option value="TSMBUSD">TSMBUSD (Taiwan Semiconductor)</option>
                    <option value="SKHYBUSD">SKHYBUSD (SK Hynix)</option>
                    <option value="WDCBUSD">WDCBUSD (Western Digital)</option>
                    <option value="SNDKBUSD">SNDKBUSD (SanDisk)</option>
                    <option value="LITEBUSD">LITEBUSD (Lumentum Holdings)</option>
                    <option value="NBISBUSD">NBISBUSD (Nebius AI Cloud)</option>
                    <option value="CBRSBUSD">CBRSBUSD (Cerebras Systems)</option>
                  </optgroup>

                  <optgroup label="Growth, Fintech & Defense (Single Tokens)">
                    <option value="PLTRBUSD">PLTRBUSD (Palantir Technologies)</option>
                    <option value="MSTRBUSD">MSTRBUSD (MicroStrategy)</option>
                    <option value="COINXUSD">COINXUSD (Coinbase Global)</option>
                    <option value="HOODBUSD">HOODBUSD (Robinhood Markets)</option>
                    <option value="CRCLXUSD">CRCLXUSD (Circle Financial)</option>
                    <option value="RKLBBUSD">RKLBBUSD (Rocket Lab USA)</option>
                    <option value="SPCXXUSD">SPCXXUSD (SpaceX Token)</option>
                    <option value="BABABUSD">BABABUSD (Alibaba Group)</option>
                  </optgroup>
                </select>
              </div>

              {/* Strategy & Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Strategy</label>
                  <select
                    value={newBotData.strategy_name}
                    onChange={(e) => {
                      const s = e.target.value;
                      setNewBotData(prev => ({ 
                        ...prev, 
                        strategy_name: s 
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="RSI_EMA_Breakout">RSI &amp; 20 EMA Daily Breakout (1:2 Breakeven)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Execution Mode</label>
                  <select
                    value={newBotData.mode}
                    onChange={(e) => setNewBotData({ ...newBotData, mode: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="PAPER">PAPER (Zero-risk Simulation)</option>
                    <option value="LIVE">LIVE (Real Delta India Account)</option>
                  </select>
                </div>
              </div>

              {/* Strategy Rules Explanation Card */}
              {newBotData.strategy_name === 'RSI_EMA_Breakout' && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-xs space-y-1.5">
                  <div className="font-bold text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>RSI &amp; 20 EMA Breakout Rules (Daily Timeframe)</span>
                  </div>
                  <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                    <li><strong className="text-white">Past 6D RSI Dip:</strong> RSI 14 was &lt; 50 at least once in the past 6 Daily candles.</li>
                    <li><strong className="text-white">Bullish Cross:</strong> Current RSI crosses above 50 &amp; Price crosses above 20 EMA.</li>
                    <li><strong className="text-white">Breakout:</strong> Today's candle crosses above Yesterday's high with &gt; 2.0% day gain.</li>
                    <li><strong className="text-white">Stop Loss:</strong> Initial SL set to Entry Candle Low.</li>
                    <li><strong className="text-emerald-400">1:{parseFloat(newBotData.target_rr_ratio) || '2'} Breakeven Rule:</strong> When price hits 1:{parseFloat(newBotData.target_rr_ratio) || '2'} Risk/Reward, SL moves to Breakeven (Entry Price) and RSI &lt; 50 exit is removed!</li>
                  </ul>
                </div>
              )}

              {/* Allocation (%) and Leverage */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Risk Per Trade (%)</span>
                    <span className="text-[10px] text-rose-400 font-semibold">Risk-Based Sizing</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.5"
                      max="20"
                      step="0.5"
                      value={newBotData.risk_pct}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 2.0;
                        setNewBotData({ ...newBotData, risk_pct: val });
                      }}
                      className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 pr-8 text-sm text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                    <span className="absolute right-3 top-2 text-xs text-rose-400 font-bold">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Exact max loss if SL (Candle Low) hits. Position size auto-scales!
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Leverage (x)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newBotData.leverage}
                    onChange={(e) => setNewBotData({ ...newBotData, leverage: parseInt(e.target.value) })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Perpetual futures multiplier
                  </span>
                </div>
              </div>

              {/* Candle Timeframe & Breakeven Target (R:R) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Candle Timeframe</span>
                    <span className="text-[10px] text-brand-400 font-bold">Dynamic Candles</span>
                  </label>
                  <select
                    value={newBotData.timeframe}
                    onChange={(e) => {
                      const tf = e.target.value;
                      const defaultGains = { '15m': 0.3, '30m': 0.5, '1h': 0.7, '4h': 1.0, '1d': 2.0, '1w': 3.0 };
                      const gain = defaultGains[tf] || 1.0;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.timeframe = tf;
                      parsed.min_today_gain_pct = gain;
                      setNewBotData(prev => ({
                        ...prev,
                        timeframe: tf,
                        min_today_gain_pct: gain,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-semibold"
                  >
                    <option value="1d">1 Day (Daily - Recommended)</option>
                    <option value="4h">4 Hours (Intraday Swing)</option>
                    <option value="1h">1 Hour (Intraday Momentum)</option>
                    <option value="30m">30 Minutes</option>
                    <option value="15m">15 Minutes (Fast Scalp)</option>
                    <option value="1w">1 Week (Weekly Macro)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Breakeven Target (R:R)</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Auto Breakeven Lock</span>
                  </label>
                  <select
                    value={newBotData.target_rr_ratio.toString()}
                    onChange={(e) => {
                      const val = e.target.value;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.target_rr_ratio = isNaN(Number(val)) ? val : parseFloat(val);
                      setNewBotData(prev => ({
                        ...prev,
                        target_rr_ratio: val,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-emerald-300 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <optgroup label="📉 Indicator Exit Targets">
                      <option value="20_ema">⚡ 20 EMA Cross Below (Exit when Price &lt; 20 EMA)</option>
                      <option value="rsi_50">⚡ RSI 50 Cross Below (Exit when RSI 14 &lt; 50)</option>
                      <option value="both_cross">⚡ 20 EMA or RSI 50 Cross Below</option>
                    </optgroup>
                    <optgroup label="🎯 Risk:Reward Breakeven Targets">
                      <option value="1.5">1:1.5 Risk-to-Reward (Quick Lock)</option>
                      <option value="2">1:2.0 Risk-to-Reward (Standard - Recommended)</option>
                      <option value="2.5">1:2.5 Risk-to-Reward</option>
                      <option value="3">1:3.0 Risk-to-Reward (High Reward)</option>
                      <option value="4">1:4.0 Risk-to-Reward (Trend Runner)</option>
                      <option value="5">1:5.0 Risk-to-Reward (Big Trend Runner)</option>
                    </optgroup>
                    <optgroup label="🚀 Hybrid: 1:R Lock + Trailing Indicator Exit">
                      <option value="2_and_ema">1:2 R:R Lock &bull; Exit on 20 EMA Cross Below</option>
                      <option value="2_and_rsi">1:2 R:R Lock &bull; Exit on RSI 50 Cross Below</option>
                      <option value="4_and_ema">1:4 R:R Lock &bull; Exit on 20 EMA Cross Below</option>
                      <option value="4_and_rsi">1:4 R:R Lock &bull; Exit on RSI 50 Cross Below</option>
                    </optgroup>
                    <optgroup label="Disabled">
                      <option value="0">Disabled (No Breakeven Move)</option>
                    </optgroup>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {newBotData.target_rr_ratio === '20_ema'
                      ? 'Exit position as soon as a candle closes below 20 EMA.'
                      : newBotData.target_rr_ratio === 'rsi_50'
                      ? 'Exit position as soon as RSI drops below 50.'
                      : parseFloat(newBotData.target_rr_ratio) > 0
                      ? `Hits 1:${newBotData.target_rr_ratio} → SL moves to Entry to lock breakeven.`
                      : 'Breakeven lock disabled.'}
                  </span>
                </div>
              </div>

              {/* Stop Loss Reference Level (Timeframe Low vs Daily Low) & Min Candle Surge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Stop Loss Reference Level</span>
                    <span className="text-[10px] text-amber-400 font-semibold">Low Anchor</span>
                  </label>
                  <select
                    value={newBotData.sl_reference || 'timeframe_low'}
                    onChange={(e) => {
                      const ref = e.target.value;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.sl_reference = ref;
                      setNewBotData(prev => ({
                        ...prev,
                        sl_reference: ref,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-amber-300 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="timeframe_low">
                      ⚡ {newBotData.timeframe === '1d' ? '1D Daily Candle Low' : `${newBotData.timeframe.toUpperCase()} Entry Candle Low`} (Tight SL)
                    </option>
                    <option value="daily_low">
                      🛡️ 1D Daily Candle Low / Day's Low (Wide / Safe SL)
                    </option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {newBotData.sl_reference === 'daily_low'
                      ? "Uses the full Day's lowest low (LOD) as stop loss. Protects against 4h/1h intraday wicks."
                      : `Sets stop loss directly at the low of the triggering ${newBotData.timeframe.toUpperCase()} candle.`}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Min Candle Surge Gain (%)</span>
                    <span className="text-[10px] text-brand-400 font-normal">{newBotData.timeframe.toUpperCase()} Momentum</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={newBotData.min_today_gain_pct ?? 1.0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 1.0;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.min_today_gain_pct = val;
                      setNewBotData(prev => ({
                        ...prev,
                        min_today_gain_pct: val,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Breakout candle must gain at least this % (auto-tuned for {newBotData.timeframe.toUpperCase()}).
                  </span>
                </div>
              </div>

              {/* Stop Loss Method and Buffer */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Stop Loss Method</span>
                    <span className="text-[10px] text-rose-400 font-semibold">Risk Defense</span>
                  </label>
                  <select
                    value={newBotData.stop_loss_mode}
                    onChange={(e) => {
                      const mode = e.target.value;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.stop_loss_mode = mode;
                      setNewBotData(prev => ({
                        ...prev,
                        stop_loss_mode: mode,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-rose-300 font-semibold focus:outline-none focus:border-brand-500 cursor-pointer"
                  >
                    <option value="rsi_or_candle_low">⚡ RSI 50 OR Candle Low Buffer (Whichever First)</option>
                    <option value="candle_low_buffer">🛡️ Entry Candle Low with Buffer (Hold RSI Dips)</option>
                    <option value="rsi_50">📉 RSI 50 Cross Below Only</option>
                    <option value="ema_or_candle_low">⚡ 20 EMA OR Candle Low Buffer</option>
                    <option value="any_of_three">🔥 Any of 3 (RSI &lt; 50, 20 EMA, or Low Buffer)</option>
                    <option value="candle_low">🛑 Strict Candle Low (0% Buffer)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {newBotData.stop_loss_mode === 'candle_low_buffer'
                      ? 'Holds through temporary RSI dips; only physical SL hit exits.'
                      : newBotData.stop_loss_mode === 'rsi_or_candle_low'
                      ? 'Exits if RSI drops below 50 OR candle low buffer is hit (whichever first).'
                      : newBotData.stop_loss_mode === 'rsi_50'
                      ? 'Exits immediately as soon as RSI 14 crosses below 50.'
                      : newBotData.stop_loss_mode === 'ema_or_candle_low'
                      ? 'Exits if price crosses below 20 EMA OR candle low buffer is hit.'
                      : newBotData.stop_loss_mode === 'any_of_three'
                      ? 'Exits if RSI < 50 OR Price < 20 EMA OR candle low buffer is hit.'
                      : 'Exits strictly at the exact entry candle low price.'}
                  </span>
                </div>

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
                    value={newBotData.sl_buffer_pct}
                    onChange={(e) => {
                      const buf = parseFloat(e.target.value) || 0;
                      let parsed = {};
                      try { parsed = JSON.parse(newBotData.params || '{}'); } catch (_) {}
                      parsed.sl_buffer_pct = buf;
                      setNewBotData(prev => ({
                        ...prev,
                        sl_buffer_pct: buf,
                        params: JSON.stringify(parsed)
                      }));
                    }}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
                    placeholder="0.2"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    e.g. 0.2% below candle low to avoid stop-hunting wicks.
                  </span>
                </div>
              </div>

              {/* Optional Fallback SL and Optional Take Profit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Fallback SL (%)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="None (Candle low SL)"
                    value={newBotData.stop_loss_pct}
                    onChange={(e) => setNewBotData({ ...newBotData, stop_loss_pct: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Primary SL is Entry Candle Low
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                    <span>Take Profit (%)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    placeholder="None (Ride trend)"
                    value={newBotData.take_profit_pct}
                    onChange={(e) => setNewBotData({ ...newBotData, take_profit_pct: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Optional cap (otherwise rides with Breakeven)
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-dark-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-300 text-sm font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-black text-sm font-bold transition-all shadow-md"
                >
                  Create &amp; Save Bot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Screener Modal */}
      <CategoryScreenerModal
        isOpen={showScreenerModal}
        onClose={() => setShowScreenerModal(false)}
        onSelectStockForBot={handleSelectFromScreener}
      />
    </div>
  );
}
