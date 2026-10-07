import React from 'react';
import { Activity, ShieldAlert, Settings, Terminal, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function Header({ 
  stats, 
  wsStatus, 
  onOpenSettings, 
  onKillSwitch,
  activeTab,
  setActiveTab,
  tradingMode = 'LIVE',
  onModeChange
}) {
  return (
    <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-40 backdrop-blur-md bg-opacity-90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Exchange Info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Zap className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-white tracking-tight">Delta Algo</span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase tracking-wider">
                  {stats?.exchange_type || 'India'}
                </span>
                <span className="hidden sm:inline-flex items-center space-x-1 px-2 py-0.5 text-xs font-medium rounded-full bg-dark-700 text-slate-300">
                  <span className={`w-2 h-2 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{wsStatus === 'connected' ? '24/7 VPS Active' : 'Connecting...'}</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Automated Crypto Derivatives Engine</p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-dark-900/60 p-1 rounded-xl border border-dark-700/60">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'bots', label: 'Bots & Algos' },
              { id: 'trades', label: 'Trade History' },
              { id: 'terminal', label: 'Live Logs' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-black font-semibold shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-dark-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Mode Switcher: LIVE vs PAPER */}
          {onModeChange && (
            <div className="flex items-center bg-dark-900/90 p-1 rounded-xl border border-dark-700/80 shadow-inner">
              <button
                onClick={() => onModeChange('LIVE')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all ${
                  tradingMode === 'LIVE'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-dark-750'
                }`}
                title="Switch to Real Delta India Live Trading"
              >
                <span className={`w-2 h-2 rounded-full ${tradingMode === 'LIVE' ? 'bg-black animate-pulse' : 'bg-emerald-500'}`}></span>
                <span>LIVE</span>
              </button>

              <button
                onClick={() => onModeChange('PAPER')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-wide transition-all ${
                  tradingMode === 'PAPER'
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/30'
                    : 'text-slate-400 hover:text-white hover:bg-dark-750'
                }`}
                title="Switch to Risk-Free Virtual Simulation Paper Mode"
              >
                <span className={`w-2 h-2 rounded-full ${tradingMode === 'PAPER' ? 'bg-black' : 'bg-amber-400'}`}></span>
                <span>PAPER</span>
              </button>
            </div>
          )}

          {/* Actions: Kill Switch & Settings */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={onKillSwitch}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-xs sm:text-sm font-semibold transition-all shadow-sm"
              title="Emergency Kill Switch: liquidate all positions and stop bots"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>KILL SWITCH</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-2 rounded-lg bg-dark-700 text-slate-300 hover:text-white hover:bg-dark-600 border border-dark-600 transition-all"
              title="API Keys & Risk Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-t border-dark-700/60 py-2 space-x-1 overflow-x-auto">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'bots', label: 'Bots' },
            { id: 'trades', label: 'Trades' },
            { id: 'terminal', label: 'Logs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium text-center whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-black font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

      </div>
    </header>
  );
}
