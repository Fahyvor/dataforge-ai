import React, { useMemo } from 'react';
import { Dataset } from '../../types';
import { calculateDrift, validateDataset } from '../../utils/dataEngine';

interface QualityMonitoringProps {
  dataset: Dataset | null;
}

export const QualityMonitoring: React.FC<QualityMonitoringProps> = ({ dataset }) => {
  const qualityData = useMemo(() => {
    if (!dataset) return null;
    const validation = validateDataset(dataset.id, dataset.rows, dataset.columns);
    const baseline = dataset.rows.slice(0, Math.floor(dataset.rows.length / 2));
    const current = dataset.rows.slice(Math.floor(dataset.rows.length / 2));
    const drift = calculateDrift(baseline, current, dataset.columns);
    return { validation, drift };
  }, [dataset]);

  if (!dataset || !qualityData) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Select a dataset to view quality and drift monitoring.
      </div>
    );
  }

  const { validation, drift } = qualityData;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-black">Quality & Lineage</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Covariate drift index and version control history</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Quality Index</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{dataset.qualityScore}/100</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Completeness</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{(validation.completenessRatio * 100).toFixed(1)}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Validity</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{(validation.validityRatio * 100).toFixed(1)}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Snapshot</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{dataset.currentVersion}</div>
        </div>
      </div>

      {/* Covariate Drift */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Feature Drift (PSI)
        </div>

        {drift.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-zinc-200">
            Insufficient variance to calculate drift.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {drift.slice(0, 6).map((item) => (
              <div key={item.feature} className="p-3 border border-zinc-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-black">{item.feature}</span>
                  <span className="text-[10px] uppercase text-zinc-500">
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-zinc-500 text-[11px]">
                  PSI Score: <strong className="text-black">{item.psiScore}</strong>
                </div>
                <div className="text-[10px] text-zinc-400 flex justify-between">
                  <span>Base: {item.baselineMean}</span>
                  <span>Curr: {item.currentMean}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Version Lineage */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Version Lineage
        </div>

        <div className="border-t border-black divide-y divide-zinc-200">
          {dataset.versions.map((ver) => (
            <div key={ver.versionId} className="py-3 flex items-center justify-between text-xs font-mono">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-black">{ver.versionTag}</span>
                  <span className="text-zinc-700">{ver.description}</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Author: {ver.author} · {new Date(ver.createdAt).toLocaleDateString()} · {ver.dataHash.slice(0, 16)}...
                </div>
              </div>

              <div className="text-right text-[11px] text-zinc-600">
                Quality: {ver.qualityScore}% · {ver.rowCount} rows
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
