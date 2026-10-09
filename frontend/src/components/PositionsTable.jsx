import React, { useState } from 'react';
import { TrendingUp, TrendingDown, XCircle, Shield, AlertCircle, RefreshCw } from 'lucide-react';

export default function PositionsTable({ positions, onCloseTrade, onRefresh, loading, onSelectSymbol }) {
  const [closingId, setClosingId] = useState(null);

  const handleClose = async (tradeId) => {
    if (confirm("Are you sure you want to market close this open position immediately?")) {
      setClosingId(tradeId);
      try {
        await onCloseTrade(tradeId);
      } finally {
        setClosingId(null);
      }
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700/80 overflow-hidden shadow-sm">
      <div className="px-4 py-3 sm:px-6 border-b border-dark-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h3 className="font-semibold text-white text-sm sm:text-base">Active Positions</h3>
          <span className="px-2 py-0.5 text-xs rounded-full bg-dark-700 text-slate-300 font-medium">
            {positions?.length || 0} Open
          </span>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-1.5 rounded-lg bg-dark-700 text-slate-300 hover:text-white hover:bg-dark-600 transition-all text-xs flex items-center space-x-1"
          title="Refresh positions"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {positions && positions.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-dark-900/60 text-slate-400 font-medium border-b border-dark-700">
              <tr>
                <th className="py-2.5 px-4">Symbol</th>
                <th className="py-2.5 px-3">Running Algo</th>
                <th className="py-2.5 px-3">Side</th>
                <th className="py-2.5 px-3">Mode</th>
                <th className="py-2.5 px-3">Entry Price</th>
                <th className="py-2.5 px-3">Delta Live Price</th>
                <th className="py-2.5 px-3">Size / Lev</th>
                <th className="py-2.5 px-3">Stop Loss</th>
                <th className="py-2.5 px-3">Take Profit</th>
                <th className="py-2.5 px-3">Unrealized PnL</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/60">
              {positions.map((pos) => {
                const isLong = pos.side.toLowerCase() === 'buy';
                const isWin = (pos.pnl || 0) >= 0;
                const livePrice = pos.current_price || pos.entry_price;
                const priceDiffPct = pos.entry_price > 0 ? ((livePrice - pos.entry_price) / pos.entry_price) * 100 : 0;
                const isPriceUp = isLong ? priceDiffPct >= 0 : priceDiffPct <= 0;

                return (
                  <tr key={pos.id} className="hover:bg-dark-700/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-white font-mono text-sm">
                      <button
                        onClick={() => onSelectSymbol && onSelectSymbol(pos.symbol)}
                        className="text-white hover:text-brand-400 hover:underline flex items-center space-x-1 group"
                        title="Click to view TradingView chart"
                      >
                        <span>{pos.symbol}</span>
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-dark-900 border border-emerald-800/50 text-emerald-400 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>{pos.strategy_name || 'Delta Live'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        isLong ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                      }`}>
                        {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        <span>{isLong ? 'LONG' : 'SHORT'}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        pos.mode === 'LIVE' ? 'bg-amber-950 text-amber-400 border border-amber-800/60' : 'bg-blue-950 text-blue-400'
                      }`}>
                        {pos.mode}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-200">
                      ${pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {pos.current_price ? (
                        <div className="flex items-center space-x-1.5">
                          <span className={`font-semibold ${isPriceUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${pos.current_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                          <span className={`text-[10px] px-1 py-0.5 rounded font-mono ${
                            isPriceUp ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                          }`}>
                            {priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(2)}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Fetching...</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      ${pos.size.toFixed(0)} <span className="text-xs text-slate-400 font-mono">({pos.leverage}x)</span>
                    </td>
                    <td className="py-3 px-3 text-rose-400 font-mono text-xs">
                      {pos.stop_loss ? `$${pos.stop_loss.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-mono text-xs">
                      {pos.take_profit ? `$${pos.take_profit.toLocaleString()}` : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono font-semibold">
                      <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                        {isWin ? '+' : ''}${Number(pos.pnl || 0).toFixed(2)} ({isWin ? '+' : ''}{Number(pos.pnl_pct || 0).toFixed(2)}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleClose(pos.id)}
                        disabled={closingId === pos.id}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 text-xs font-medium transition-all"
                      >
                        {closingId === pos.id ? 'Closing...' : 'Close Market'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-10 text-center text-slate-400">
          <AlertCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
          <p className="text-sm">No active positions open right now.</p>
          <p className="text-xs text-slate-500 mt-1">Active algos will automatically trigger trades based on market signals.</p>
        </div>
      )}
    </div>
  );
}
