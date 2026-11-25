import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { DataDriftMetric, Dataset, ValidationResult } from '../../types';
import { api } from '../../services/api';

interface QualityMonitoringProps {
  dataset: Dataset | null;
}

export const QualityMonitoring: React.FC<QualityMonitoringProps> = ({ dataset }) => {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [drift, setDrift] = useState<DataDriftMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dataset) {
      setValidation(null);
      setDrift([]);
      return;
    }

    setIsLoading(true);
    api.datasets
      .drift(dataset.id)
      .then((res) => {
        setValidation(res.validation);
        setDrift(res.drift);
      })
      .catch((err) => toast.error(err.message || 'Failed to compute quality drift metrics'))
      .finally(() => setIsLoading(false));
  }, [dataset?.id, dataset?.updatedAt]);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">
          Select or upload a dataset to monitor drift and version lineage.
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

  if (isLoading && !validation) {
    return (
      <div className="py-20 text-center text-xs font-mono text-zinc-400">
        Calculating Population Stability Index (PSI) via API...
      </div>
    );
  }

  if (!validation) return null;

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Quality & Lineage</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Covariate drift index (PSI) and immutable snapshot provenance for {dataset.name}
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Quality Index</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {validation.qualityScore}/100
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Completeness</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {(validation.completenessRatio * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Validity</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {(validation.validityRatio * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Active Snapshot</div>
          <div className="text-2xl font-bold font-mono text-zinc-900 mt-1">{dataset.currentVersion}</div>
        </div>
      </div>

      {/* Covariate Drift */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Feature Drift (Population Stability Index)
        </div>

        {drift.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-zinc-200 rounded">
            Need at least 4 numeric rows to compare split distributions for drift.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 font-mono text-xs">
            {drift.slice(0, 6).map((item) => {
              const isStable = item.status === 'stable';
              const isModerate = item.status === 'moderate_drift';
              return (
                <div
                  key={item.feature}
                  className={`p-3.5 rounded border space-y-1.5 transition-colors ${isStable
                      ? 'border-emerald-200/80 bg-emerald-50/20'
                      : isModerate
                        ? 'border-amber-200/80 bg-amber-50/20'
                        : 'border-rose-200/80 bg-rose-50/20'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900">{item.feature}</span>
                    <span
                      className={`text-[9px] uppercase font-semibold px-1.5 py-0.5 rounded border ${isStable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isModerate
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                      {item.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-zinc-600 text-[11px]">
                    PSI Score:{' '}
                    <strong
                      className={
                        isStable ? 'text-emerald-700' : isModerate ? 'text-amber-700' : 'text-rose-700'
                      }
                    >
                      {item.psiScore}
                    </strong>
                  </div>
                  <div className="text-[10px] text-zinc-400 flex justify-between pt-1 border-t border-zinc-100">
                    <span>Baseline: {item.baselineMean}</span>
                    <span>Current: {item.currentMean}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Version Lineage */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Version Lineage & Provenance
        </div>

        <div className="border border-zinc-200 rounded divide-y divide-zinc-100 overflow-hidden">
          {dataset.versions.map((ver) => (
            <div
              key={ver.versionId}
              className="p-3.5 flex items-center justify-between text-xs font-mono hover:bg-zinc-50/60 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 text-[10px]">
                    {ver.versionTag}
                  </span>
                  <span className="text-zinc-900 font-medium">{ver.description}</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Author: <span className="text-zinc-600">{ver.author}</span> ·{' '}
                  {new Date(ver.createdAt).toLocaleDateString()} · {ver.dataHash}
                </div>
              </div>

              <div className="text-right text-[11px] text-zinc-600">
                Quality: <strong className="text-emerald-600">{ver.qualityScore}%</strong> ·{' '}
                {ver.rowCount.toLocaleString()} rows
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
