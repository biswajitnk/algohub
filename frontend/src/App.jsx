import React, { useState, useEffect, useCallback } from 'react';
import { 
  DollarSign, TrendingUp, TrendingDown, Activity, Bot, 
  ShieldCheck, AlertOctagon, Terminal, RefreshCw, BarChart3, Layers
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

import Header from './components/Header';
import MetricCard from './components/MetricCard';
import PositionsTable from './components/PositionsTable';
import BotsManager from './components/BotsManager';
import TradesTable from './components/TradesTable';
import LiveLogs from './components/LiveLogs';
import SettingsModal from './components/SettingsModal';
import BacktestModal from './components/BacktestModal';
import RiskDisclaimer from './components/RiskDisclaimer';
import TradingViewWidget from './components/TradingViewWidget';
import Watchlist from './components/Watchlist';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const [loading, setLoading] = useState(true);
  const [tradingMode, setTradingMode] = useState(() => {
    try {
      return localStorage.getItem('delta_algo_mode') || 'LIVE';
    } catch (_) {
      return 'LIVE';
    }
  });

  // Core Data State
  const [stats, setStats] = useState(null);
  const [bots, setBots] = useState([]);
  const [positions, setPositions] = useState([]);
  const [trades, setTrades] = useState([]);
  const [equityData, setEquityData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chartSymbol, setChartSymbol] = useState('NVDAXUSD');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBacktestOpen, setIsBacktestOpen] = useState(false);
  const [backtestPrefill, setBacktestPrefill] = useState({});

  const handleModeChange = (newMode) => {
    setTradingMode(newMode);
    try {
      localStorage.setItem('delta_algo_mode', newMode);
    } catch (_) {}
  };

  // Fetch all initial data
  const loadData = useCallback(async (modeToUse = tradingMode) => {
    try {
      const [statsData, botsData, openTrades, closedTrades, equityHistory] = await Promise.all([
        api.getStats(modeToUse).catch(() => null),
        api.getBots().catch(() => []),
        api.getOpenTrades(modeToUse).catch(() => []),
        api.getTrades(null, modeToUse).catch(() => []),
        api.getEquityCurve(7).catch(() => [])
      ]);

      if (statsData) setStats(statsData);
      setBots(botsData || []);
      setPositions(openTrades || []);
      setTrades(closedTrades || []);

      if (equityHistory && equityHistory.length > 0) {
        setEquityData(equityHistory.map(item => ({
          time: new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
          balance: item.total_balance
        })));
      } else if (statsData) {
        // Fallback baseline point
        setEquityData([
          { time: 'Baseline', balance: statsData.total_balance }
        ]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(tradingMode);

    // Connect WebSocket
    const cleanupWs = api.connectWebSocket(
      (message) => {
        // Append log
        setLogs(prev => [...prev.slice(-150), message]);

        // Real-time reactive updates
        if (message.type === 'TRADE_OPEN' || message.type === 'TRADE_CLOSE') {
          // Re-fetch open positions and dashboard stats
          api.getOpenTrades(tradingMode).then(setPositions).catch(() => {});
          api.getTrades(null, tradingMode).then(setTrades).catch(() => {});
          api.getStats(tradingMode).then(setStats).catch(() => {});
        }
      },
      (status) => setWsStatus(status)
    );

    // Auto polling fallback every 15s
    const pollInterval = setInterval(() => {
      loadData(tradingMode);
    }, 15000);

    return () => {
      cleanupWs();
      clearInterval(pollInterval);
    };
  }, [tradingMode, loadData]);

  // Actions
  const handleToggleBot = async (botId) => {
    try {
      await api.toggleBot(botId);
      const updatedBots = await api.getBots();
      setBots(updatedBots);
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err) {
      alert('Failed to toggle bot: ' + err.message);
    }
  };

  const handleCreateBot = async (botData) => {
    try {
      await api.createBot(botData);
      const updatedBots = await api.getBots();
      setBots(updatedBots);
      const updatedStats = await api.getStats();
      setStats(updatedStats);
    } catch (err) {
      alert('Failed to create bot: ' + err.message);
    }
  };

  const handleDeleteBot = async (botId) => {
    try {
      await api.deleteBot(botId);
      setBots(prev => prev.filter(b => b.id !== botId));
    } catch (err) {
      alert('Failed to delete bot: ' + err.message);
    }
  };

  const handleClosePosition = async (tradeId) => {
    try {
      await api.closeTrade(tradeId);
      const openTrades = await api.getOpenTrades();
      setPositions(openTrades);
      loadData();
    } catch (err) {
      alert('Failed to close position: ' + err.message);
    }
  };

  const handleKillSwitch = async () => {
    if (confirm("EMERGENCY KILL SWITCH: Are you sure you want to stop ALL bots and close ALL open trades immediately?")) {
      try {
        await api.triggerKillSwitch();
        alert("Emergency Kill Switch executed: All algos halted.");
        loadData();
      } catch (err) {
        alert("Kill switch error: " + err.message);
      }
    }
  };

  const handleOpenBacktest = (symbol = 'BTCUSD', strategy = 'Supertrend', timeframe = '15m') => {
    setBacktestPrefill({ symbol, strategy, timeframe });
    setIsBacktestOpen(true);
  };

  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Header */}
      <Header 
        stats={stats}
        wsStatus={wsStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onKillSwitch={handleKillSwitch}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        tradingMode={tradingMode}
        onModeChange={handleModeChange}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* Mode Banner & Quick Switch */}
            <div className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-all shadow-sm ${
              tradingMode === 'LIVE'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center space-x-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${tradingMode === 'LIVE' ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}></span>
                <div>
                  <span className="uppercase font-extrabold tracking-wide">
                    {tradingMode === 'LIVE' ? '🟢 Live Real Trading Mode' : '🟡 Paper Virtual Simulation Mode'}
                  </span>
                  <span className="text-slate-300 ml-2 hidden md:inline">
                    {tradingMode === 'LIVE' 
                      ? '• Direct real execution on Delta Exchange India with real capital.' 
                      : '• Zero real financial risk. 100% simulated orders & PnL.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto">
                <span className="text-[11px] text-slate-400">Active Mode:</span>
                <div className="flex items-center bg-dark-900 p-0.5 rounded-lg border border-dark-700">
                  <button
                    onClick={() => handleModeChange('LIVE')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      tradingMode === 'LIVE' 
                        ? 'bg-emerald-500 text-black shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    LIVE
                  </button>
                  <button
                    onClick={() => handleModeChange('PAPER')}
                    className={`px-2.5 py-1 rounded text-xs font-bold transition-all ${
                      tradingMode === 'PAPER' 
                        ? 'bg-amber-400 text-black shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    PAPER
                  </button>
                </div>
              </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <MetricCard
                title={tradingMode === 'LIVE' ? "Live Balance" : "Paper Balance"}
                value={`$${(stats?.total_balance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                subtext={
                  tradingMode === 'LIVE'
                    ? (stats?.exchange_connected ? `Live Delta India (Avail: $${(stats?.available_balance ?? 0).toFixed(2)})` : "Live Delta Account")
                    : `Virtual Simulation (Avail: $${(stats?.available_balance ?? 0).toFixed(2)})`
                }
                icon={DollarSign}
                badge={tradingMode}
                badgeColor={tradingMode === 'LIVE' ? 'emerald' : 'amber'}
              />
              <MetricCard
                title="Today's PnL"
                value={`${(stats?.today_pnl || 0) >= 0 ? '+' : ''}$${(stats?.today_pnl || 0).toFixed(2)}`}
                trendValue={stats?.today_pnl_pct || 0}
                trend={(stats?.today_pnl || 0) >= 0 ? 'up' : 'down'}
                subtext={`${tradingMode} 24h performance`}
                icon={(stats?.today_pnl || 0) >= 0 ? TrendingUp : TrendingDown}
              />
              <MetricCard
                title="Win Rate"
                value={`${stats?.win_rate || 0}%`}
                subtext={`${stats?.win_trades || 0} Wins / ${stats?.loss_trades || 0} Losses (${tradingMode})`}
                icon={Activity}
              />
              <MetricCard
                title="Active Algos"
                value={`${stats?.active_bots || 0} / ${stats?.total_bots || 0}`}
                subtext={`${stats?.open_positions_count || 0} ${tradingMode} Positions`}
                icon={Bot}
              />
            </div>

            {/* TradingView Live Chart & Market Watchlist */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <div className="lg:col-span-3">
                <TradingViewWidget symbol={chartSymbol} defaultTimeframe="D" />
              </div>
              <div className="lg:col-span-1">
                <Watchlist 
                  selectedSymbol={chartSymbol} 
                  onSelectSymbol={(sym) => setChartSymbol(sym)}
                  openPositions={positions}
                />
              </div>
            </div>

            {/* Performance Chart & Active Positions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Equity Curve Chart */}
              <div className="lg:col-span-2 bg-dark-800 rounded-xl p-4 sm:p-5 border border-dark-700/80 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-white text-sm sm:text-base">Equity Growth Curve</h3>
                    <p className="text-xs text-slate-400">Portfolio value over time</p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-dark-700 text-brand-400 font-mono">
                    24/7 VPS History
                  </span>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#4b5563" fontSize={11} tickLine={false} />
                      <YAxis stroke="#4b5563" fontSize={11} domain={['auto', 'auto']} tickLine={false} tickFormatter={(val) => `$${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
                        itemStyle={{ color: '#22c55e' }}
                        formatter={(value) => [`$${value}`, 'Balance']}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#balanceGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Bot Status Widget */}
              <div className="bg-dark-800 rounded-xl p-4 sm:p-5 border border-dark-700/80 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white text-sm">Strategy Engine</h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">RUNNING</span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">
                    Strategies continuously scan candles from <strong>Delta Exchange India</strong> and execute automatic entries and exits.
                  </p>

                  <div className="space-y-2.5">
                    {bots.slice(0, 3).map(b => (
                      <div key={b.id} className="flex items-center justify-between p-2.5 rounded-lg bg-dark-900/60 border border-dark-700/60 text-xs">
                        <div>
                          <span className="font-semibold text-white block">{b.name}</span>
                          <span className="text-slate-400">
                            {b.symbol.startsWith('CATEGORY_') ? 'Basket Scanner' : b.symbol} • {b.risk_pct || 2}% Risk • {b.strategy_name === 'RSI_EMA_Breakout' ? 'RSI & 20 EMA' : b.strategy_name}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-dark-700 text-slate-400'
                        }`}>
                          {b.is_active ? 'ACTIVE' : 'IDLE'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setActiveTab('bots')}
                  className="mt-4 w-full py-2 rounded-lg bg-dark-700 hover:bg-dark-600 text-slate-200 text-xs font-semibold transition-all text-center"
                >
                  Manage All Bots →
                </button>
              </div>

            </div>

            {/* Active Positions Table */}
            <PositionsTable 
              positions={positions} 
              onCloseTrade={handleClosePosition}
              onRefresh={loadData}
              loading={loading}
            />

          </div>
        )}

        {/* TAB 2: BOTS & ALGOS */}
        {activeTab === 'bots' && (
          <BotsManager
            bots={bots}
            tradingMode={tradingMode}
            onToggleBot={handleToggleBot}
            onCreateBot={handleCreateBot}
            onDeleteBot={handleDeleteBot}
            onOpenBacktest={handleOpenBacktest}
          />
        )}

        {/* TAB 3: TRADE HISTORY */}
        {activeTab === 'trades' && (
          <TradesTable trades={trades} initialMode={tradingMode} />
        )}

        {/* TAB 4: LIVE LOGS */}
        {activeTab === 'terminal' && (
          <LiveLogs logs={logs} onClear={() => setLogs([])} />
        )}

      </main>

      {/* Compliance Risk Disclaimer */}
      <RiskDisclaimer />

      {/* Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsUpdated={loadData}
      />

      <BacktestModal
        isOpen={isBacktestOpen}
        onClose={() => setIsBacktestOpen(false)}
        initialSymbol={backtestPrefill.symbol || 'BTCUSD'}
        initialStrategy={backtestPrefill.strategy || 'Supertrend'}
        initialTimeframe={backtestPrefill.timeframe || '15m'}
      />

    </div>
  );
}
