import React from 'react';
import { ShieldAlert, Settings, Zap, LogOut, User, Activity } from 'lucide-react';

export default function Header({ 
  stats, 
  wsStatus, 
  onOpenSettings, 
  onKillSwitch,
  activeTab,
  setActiveTab,
  tradingMode = 'LIVE',
  onModeChange,
  user,
  onSignOut
}) {
  return (
    <header className="bg-dark-800/95 border-b border-dark-700/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-4">
          
          {/* 1. Left: Brand & Status */}
          <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
              <Zap className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  AlgoHub
                </span>
                <span className="px-1.5 py-0.2 sm:px-2 sm:py-0.5 text-[10px] sm:text-xs font-bold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase">
                  {stats?.exchange_type || 'India'}
                </span>
                <span className="hidden xl:inline-flex items-center space-x-1 px-2 py-0.5 text-[11px] font-medium rounded-full bg-dark-700 text-slate-300">
                  <span className={`w-1.5 h-1.5 rounded-full ${wsStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{wsStatus === 'connected' ? '24/7 VPS' : 'Connecting...'}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">Delta Derivatives Terminal</p>
            </div>
          </div>

          {/* 2. Center: Navigation Tabs (Desktop / Large Screens) */}
          <nav className="hidden lg:flex items-center space-x-1 bg-dark-900/80 p-1 rounded-xl border border-dark-700/60 flex-shrink-0">
            {[
              { id: 'dashboard', label: 'Dashboard' },
              { id: 'bots', label: 'Bots & Algos' },
              { id: 'trades', label: 'Trade History' },
              { id: 'terminal', label: 'Live Logs' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-brand-600 text-black shadow-md'
                    : 'text-slate-300 hover:text-white hover:bg-dark-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* 3. Right: Mode Switcher, Kill Switch, Settings & Auth Profile */}
          <div className="flex items-center space-x-1.5 sm:space-x-2.5 flex-shrink-0">
            
            {/* Mode Switcher (LIVE vs PAPER) */}
            {onModeChange && (
              <div className="flex items-center bg-dark-900/90 p-0.5 sm:p-1 rounded-xl border border-dark-700 shadow-inner">
                <button
                  onClick={() => onModeChange('LIVE')}
                  className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                    tradingMode === 'LIVE'
                      ? 'bg-emerald-500 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Real Live Trading"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tradingMode === 'LIVE' ? 'bg-black animate-pulse' : 'bg-emerald-500'}`}></span>
                  <span>LIVE</span>
                </button>

                <button
                  onClick={() => onModeChange('PAPER')}
                  className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-extrabold transition-all cursor-pointer ${
                    tradingMode === 'PAPER'
                      ? 'bg-amber-400 text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Switch to Risk-Free Virtual Paper Trading"
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${tradingMode === 'PAPER' ? 'bg-black' : 'bg-amber-400'}`}></span>
                  <span>PAPER</span>
                </button>
              </div>
            )}

            {/* Kill Switch Button */}
            <button
              onClick={onKillSwitch}
              className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-[11px] sm:text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Emergency Kill Switch: Stop all bots & close open positions"
            >
              <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
              <span className="hidden sm:inline">KILL SWITCH</span>
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettings}
              className="p-1.5 sm:p-2 rounded-lg bg-dark-700 text-slate-300 hover:text-white hover:bg-dark-600 border border-dark-600 transition-all cursor-pointer"
              title="API Keys & Risk Settings"
            >
              <Settings className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </button>

            {/* Admin User Profile & Sign Out */}
            {user && (
              <div className="flex items-center space-x-1.5 pl-1.5 sm:pl-2 border-l border-dark-700">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-[11px] font-semibold text-white max-w-[110px] truncate" title={user.email}>
                    {user.email}
                  </span>
                  <span className="text-[9px] text-emerald-400 font-mono">
                    Admin
                  </span>
                </div>
                <button
                  onClick={onSignOut}
                  className="p-1.5 sm:p-2 rounded-lg bg-dark-700/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-dark-600 transition-all cursor-pointer"
                  title={`Sign out (${user.email})`}
                >
                  <LogOut className="w-4 h-4 text-slate-300 hover:text-rose-400" />
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Mobile & Tablet Navigation Sub-Bar (< 1024px) */}
        <div className="flex lg:hidden border-t border-dark-700/60 py-1.5 space-x-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'bots', label: 'Bots & Algos' },
            { id: 'trades', label: 'Trades' },
            { id: 'terminal', label: 'Live Logs' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-1 px-2.5 rounded-lg text-xs font-semibold text-center whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-brand-600 text-black shadow-sm'
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
