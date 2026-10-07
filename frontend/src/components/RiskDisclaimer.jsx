import React from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';

export default function RiskDisclaimer() {
  return (
    <footer className="mt-12 py-6 border-t border-dark-800 text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        
        <div className="flex items-center space-x-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          <span>Delta Algo 24/7 Engine • VPS Autonomous Node</span>
        </div>

        <p className="max-w-2xl text-[11px] leading-relaxed text-slate-500">
          <strong>Risk Disclaimer:</strong> Cryptocurrency derivatives and futures trading involve substantial risk of capital loss. Past performance in backtests or paper simulations does not guarantee future results. Automated strategies must be monitored and configured with strict stop-losses. This software does not provide financial advice.
        </p>

      </div>
    </footer>
  );
}
