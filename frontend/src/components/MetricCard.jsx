import React from 'react';

export default function MetricCard({ title, value, subtext, icon: Icon, trend, trendValue, color = "emerald", badge, badgeColor = "emerald" }) {
  const isPositive = trend === 'up' || (typeof trendValue === 'number' && trendValue >= 0);

  return (
    <div className="bg-dark-800 rounded-xl p-4 sm:p-5 border border-dark-700/80 shadow-sm relative overflow-hidden group hover:border-dark-600 transition-all">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
          {badge && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider ${
              badgeColor === 'amber'
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {badge}
            </span>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-dark-700/70 text-slate-300 group-hover:text-white transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className="text-xl sm:text-2xl font-bold tracking-tight text-white">{value}</span>
        {trendValue !== undefined && (
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            isPositive ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
          }`}>
            {isPositive ? '+' : ''}{trendValue}%
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-1 text-xs text-slate-400">{subtext}</p>
      )}
    </div>
  );
}
