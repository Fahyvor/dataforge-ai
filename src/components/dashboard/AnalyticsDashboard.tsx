import React, { useState } from 'react';
import { Dataset } from '../../types';

interface AnalyticsDashboardProps {
  dataset: Dataset | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ dataset }) => {
  const [timeRange, setTimeRange] = useState<'7D' | '30D' | '90D' | '1Y'>('30D');

  if (!dataset) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Select a dataset to view analytics.
      </div>
    );
  }

  const catCounts: Record<string, number> = {};
  dataset.rows.forEach((r) => {
    const tier = r.SubscriptionTier || r.HomeOwnership || r.TurbineID || 'Segment A';
    catCounts[tier] = (catCounts[tier] || 0) + 1;
  });

  const categories = Object.entries(catCounts);
  const maxCategoryCount = Math.max(...categories.map((c) => c[1]), 1);

  const timeSeriesPoints = [
    { label: 'Nov 01', val: 78 },
    { label: 'Nov 05', val: 82 },
    { label: 'Nov 10', val: 89 },
    { label: 'Nov 14', val: 85 },
    { label: 'Nov 17', val: 92 },
    { label: 'Nov 20', val: 96 },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Analytics & Ingestion</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Real-time throughput metrics and distribution telemetry</p>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono">
          {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white font-medium shadow-xs'
                  : 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 bg-white'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Total Rows</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 mt-1">{dataset.rowCount.toLocaleString()}</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium flex items-center gap-1.5">
            Quality Score
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{dataset.qualityScore}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Schema Columns</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">{dataset.columnCount}</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Throughput</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">1.45k <span className="text-xs font-normal text-zinc-500">recs/s</span></div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Time Series */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
              Ingestion Trend ({timeRange})
            </div>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              Avg +9.4%
            </span>
          </div>

          <div className="h-44 w-full flex items-end justify-between pt-4 pb-1 border-b border-zinc-200">
            {timeSeriesPoints.map((pt, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end group">
                <span className="text-[10px] font-mono text-blue-600 opacity-80 group-hover:opacity-100 font-medium transition-opacity">
                  {pt.val}%
                </span>
                <div
                  style={{ height: `${pt.val}%` }}
                  className="w-5 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t group-hover:from-blue-500 group-hover:to-indigo-400 transition-all"
                />
                <span className="text-[9px] text-zinc-500 font-mono mt-1">{pt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            Segment Distribution
          </div>

          <div className="space-y-3 pt-2">
            {categories.slice(0, 5).map(([cat, count], idx) => {
              const pct = Math.round((count / dataset.rowCount) * 100);
              const palette = [
                'bg-blue-600',
                'bg-indigo-600',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-teal-500',
              ];
              const barColor = palette[idx % palette.length];
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-700">{cat}</span>
                    <span className="font-semibold text-zinc-900">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      className={`h-full ${barColor} rounded-full transition-all`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
