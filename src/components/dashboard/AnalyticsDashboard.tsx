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
        <h1 className="text-xl font-bold tracking-tight text-black">Dashboards</h1>

        <div className="flex items-center gap-1 text-xs font-mono">
          {(['7D', '30D', '90D', '1Y'] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`px-2.5 py-1 border transition-colors ${
                timeRange === range
                  ? 'border-black bg-black text-white'
                  : 'border-zinc-200 text-zinc-600 hover:border-black'
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
          <div className="text-[11px] font-mono uppercase text-zinc-400">Total Rows</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{dataset.rowCount}</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Quality Score</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{dataset.qualityScore}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Columns</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{dataset.columnCount}</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Throughput</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">1.45k <span className="text-xs font-normal text-zinc-400">recs/s</span></div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Time Series */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
            Ingestion Trend ({timeRange})
          </div>

          <div className="h-44 w-full flex items-end justify-between pt-4 pb-1 border-b border-black">
            {timeSeriesPoints.map((pt, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end">
                <span className="text-[10px] font-mono text-zinc-500">{pt.val}%</span>
                <div
                  style={{ height: `${pt.val}%` }}
                  className="w-5 bg-black"
                />
                <span className="text-[9px] text-zinc-400 font-mono mt-1">{pt.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
            Segment Distribution
          </div>

          <div className="space-y-3 pt-2">
            {categories.slice(0, 5).map(([cat, count]) => {
              const pct = Math.round((count / dataset.rowCount) * 100);
              return (
                <div key={cat} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-800">{cat}</span>
                    <span className="font-semibold text-black">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100">
                    <div
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                      className="h-full bg-black"
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
