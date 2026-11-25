import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { AnalyticsSummary, Dataset } from '../../types';
import { api } from '../../services/api';

interface AnalyticsDashboardProps {
  dataset: Dataset | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ dataset }) => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dataset) {
      setAnalytics(null);
      return;
    }

    setIsLoading(true);
    api.datasets
      .analytics(dataset.id)
      .then((res) => setAnalytics(res.analytics))
      .catch((err) => toast.error(err.message || 'Failed to compute analytics'))
      .finally(() => setIsLoading(false));
  }, [dataset?.id, dataset?.updatedAt]);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">
          Upload or select a dataset to inspect telemetry analytics.
        </p>
        <Link
          to="/upload"
          className="inline-block px-3.5 py-1.5 rounded bg-blue-600 text-white text-xs font-mono hover:bg-blue-700"
        >
          Upload Dataset
        </Link>
      </div>
    );
  }

  if (isLoading && !analytics) {
    return (
      <div className="py-20 text-center text-xs font-mono text-zinc-400">
        Aggregating real dataset distributions...
      </div>
    );
  }

  if (!analytics) return null;

  const maxSegmentCount = Math.max(...analytics.segments.map((s) => s.count), 1);

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Analytics Overview</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Live dataset partition completeness and empirical feature distribution for {dataset.name}
          </p>
        </div>

        <span className="text-[11px] font-mono px-2.5 py-1 rounded border border-blue-200 bg-blue-50 text-blue-700">
          {dataset.currentVersion}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Total Rows</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 mt-1">
            {analytics.rowCount.toLocaleString()}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium flex items-center gap-1.5">
            Quality Score
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {analytics.qualityScore}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Completeness</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {analytics.completenessPct}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
            Pipeline Throughput
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {analytics.throughputRecsPerSec > 0 ? (
              <>
                {analytics.throughputRecsPerSec.toLocaleString()}{' '}
                <span className="text-xs font-normal text-zinc-500">recs/s</span>
              </>
            ) : (
              <span className="text-sm font-normal text-zinc-400">No runs yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Partition Completeness */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
              Partition Completeness
            </div>
            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
              {analytics.batchHealth.length} Slices
            </span>
          </div>

          <div className="h-44 w-full flex items-end justify-between pt-4 pb-1 border-b border-zinc-200">
            {analytics.batchHealth.map((pt, idx) => (
              <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 h-full justify-end group">
                <span className="text-[10px] font-mono text-blue-600 opacity-80 group-hover:opacity-100 font-medium transition-opacity">
                  {pt.score}%
                </span>
                <div
                  style={{ height: `${Math.max(4, pt.score)}%` }}
                  className="w-5 bg-gradient-to-t from-blue-600 to-indigo-500 rounded-t group-hover:from-blue-500 group-hover:to-indigo-400 transition-all"
                />
                <span className="text-[9px] text-zinc-500 font-mono mt-1 truncate max-w-[64px]">
                  {pt.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Category / Schema Distribution */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            {analytics.segmentLabel}
          </div>

          <div className="space-y-3 pt-2">
            {analytics.segments.map((seg, idx) => {
              const palette = [
                'bg-blue-600',
                'bg-indigo-600',
                'bg-emerald-500',
                'bg-amber-500',
                'bg-teal-500',
              ];
              const barColor = palette[idx % palette.length];
              return (
                <div key={seg.name} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-zinc-700 truncate max-w-[200px]">{seg.name}</span>
                    <span className="font-semibold text-zinc-900">
                      {seg.count} ({seg.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${(seg.count / maxSegmentCount) * 100}%` }}
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
