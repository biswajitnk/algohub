import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, Shield, Circle } from 'lucide-react';

export default function LiveLogs({ logs, onClear }) {
  const terminalBottomRef = useRef(null);

  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700/80 overflow-hidden shadow-sm flex flex-col h-[550px]">
      {/* Terminal Header */}
      <div className="px-4 py-3 bg-dark-900/80 border-b border-dark-700/80 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-brand-400" />
          <h3 className="font-semibold text-white text-sm">Live Algo Terminal & Engine Stream</h3>
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] bg-dark-700 text-emerald-400">
            <Circle className="w-2 h-2 fill-emerald-400 animate-ping" />
            <span>STREAMING 24/7</span>
          </span>
        </div>

        <button
          onClick={onClear}
          className="p-1 rounded bg-dark-700 hover:bg-dark-600 text-slate-400 hover:text-white transition-all text-xs flex items-center space-x-1"
          title="Clear console"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Terminal Output Area */}
      <div className="flex-1 p-4 bg-dark-900/95 font-mono text-xs overflow-y-auto space-y-2 select-text">
        {logs && logs.length > 0 ? (
          logs.map((log, index) => {
            const timeStr = log.timestamp 
              ? new Date(log.timestamp).toLocaleTimeString() 
              : new Date().toLocaleTimeString();

            let colorClass = 'text-slate-300';
            if (log.type === 'TRADE_OPEN' || log.type === 'TRADE_CLOSE') colorClass = 'text-emerald-400 font-semibold';
            if (log.type === 'SYSTEM_ALERT' || log.type === 'ENGINE_ERROR') colorClass = 'text-rose-400 font-semibold';
            if (log.type === 'BOT_TICK') colorClass = 'text-sky-300';

            return (
              <div key={index} className="leading-relaxed hover:bg-dark-800/40 p-1 rounded transition-colors">
                <span className="text-slate-500 mr-2">[{timeStr}]</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold mr-2 uppercase ${
                  log.type.includes('TRADE') ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  log.type.includes('ALERT') || log.type.includes('ERROR') ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                  'bg-dark-700 text-slate-300'
                }`}>
                  {log.type}
                </span>
                <span className={colorClass}>
                  {typeof log.data === 'object' ? JSON.stringify(log.data, null, 1) : String(log.data || log.message || '')}
                </span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-slate-600">
            Waiting for algorithmic signals and VPS ticks...
          </div>
        )}
        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
}
