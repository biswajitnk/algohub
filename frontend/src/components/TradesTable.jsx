import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, CheckCircle, XCircle, AlertCircle, Filter } from 'lucide-react';

export default function TradesTable({ trades, initialMode = 'ALL' }) {
  const [filterMode, setFilterMode] = useState(initialMode || 'ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  useEffect(() => {
    if (initialMode && (initialMode === 'LIVE' || initialMode === 'PAPER')) {
      setFilterMode(initialMode);
    }
  }, [initialMode]);

  const filteredTrades = (trades || []).filter(t => {
    if (filterMode !== 'ALL' && t.mode !== filterMode) return false;
    if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700/80 overflow-hidden shadow-sm">
      {/* Header with Filters */}
      <div className="px-4 py-3 sm:px-6 border-b border-dark-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-white text-sm sm:text-base">Trade Journal & Execution History</h3>
          <p className="text-xs text-slate-400">Complete audit trail of all algorithmic entries and exits</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <select
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Modes</option>
            <option value="PAPER">Paper Only</option>
            <option value="LIVE">Live Only</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-dark-900 border border-dark-700 rounded-lg px-2.5 py-1.5 text-slate-300 focus:outline-none focus:border-brand-500"
          >
            <option value="ALL">All Status</option>
            <option value="CLOSED">Closed Only</option>
            <option value="OPEN">Open Only</option>
          </select>
        </div>
      </div>

      {filteredTrades.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-dark-900/60 text-slate-400 font-medium border-b border-dark-700">
              <tr>
                <th className="py-2.5 px-4">Date / Time</th>
                <th className="py-2.5 px-3">Symbol / Strategy</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Exit Price</th>
                <th className="py-2.5 px-3">Realized PnL</th>
                <th className="py-2.5 px-3">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60">
              {filteredTrades.map((t) => {
                const isWin = t.pnl > 0;
                const isLoss = t.pnl < 0;
                const isLong = t.side.toLowerCase() === 'buy';

                return (
                  <tr key={t.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3 px-4 text-xs text-slate-400 font-mono">
                      {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-white">{t.symbol}</div>
                      <div className="text-xs text-slate-400">{t.strategy_name}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center space-x-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                        isLong ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{isLong ? 'BUY' : 'SELL'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        t.mode === 'LIVE' ? 'bg-amber-950 text-amber-400' : 'bg-blue-950 text-blue-400'
                      }`}>
                        {t.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      ${t.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-300">
                      {t.exit_price ? `$${t.exit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                    <td className="py-3 px-3">
                      {t.status === 'CLOSED' ? (
                        <span className={`font-mono font-bold text-xs sm:text-sm ${
                          isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                        }`}>
                          {isWin ? '+' : ''}${t.pnl.toFixed(2)} ({isWin ? '+' : ''}{t.pnl_pct.toFixed(2)}%)
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-amber-400 animate-pulse">RUNNING...</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-dark-700/80 text-slate-300 border border-dark-600/60">
                        {t.exit_reason || t.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-12 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-sm">No recorded trades match the selected filter.</p>
        </div>
      )}
    </div>
  );
}
