import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { Dataset, ValidationResult } from '../../types';
import { api } from '../../services/api';

interface DataValidationProps {
  dataset: Dataset | null;
  onNavigateToCleaning: () => void;
}

export const DataValidation: React.FC<DataValidationProps> = ({
  dataset,
  onNavigateToCleaning,
}) => {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runValidation = useCallback(async () => {
    if (!dataset) return;
    setIsLoading(true);
    try {
      const res = await api.datasets.validation(dataset.id);
      setValidationResult(res.validation);
    } catch (err: any) {
      toast.error(err.message || 'Validation check failed');
    } finally {
      setIsLoading(false);
    }
  }, [dataset?.id, dataset?.updatedAt]);

  useEffect(() => {
    if (!dataset) {
      setValidationResult(null);
      return;
    }
    runValidation();
  }, [runValidation, dataset]);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">Upload or select a dataset to run validation checks.</p>
        <Link
          to="/upload"
          className="inline-block px-3.5 py-1.5 rounded bg-blue-600 text-white text-xs font-mono hover:bg-blue-700"
        >
          Upload Dataset
        </Link>
      </div>
    );
  }

  if (isLoading && !validationResult) {
    return (
      <div className="py-20 text-center text-xs font-mono text-zinc-400">
        Running constraint validation via API...
      </div>
    );
  }

  if (!validationResult) return null;

  const { issues, qualityScore, completenessRatio, validityRatio, uniquenessRatio } = validationResult;
  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Data Validation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Schema integrity and constraint findings for {dataset.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              runValidation();
              toast.success('Validation refreshed');
            }}
            className="px-3 py-1.5 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 text-xs font-mono transition-colors bg-white cursor-pointer"
          >
            {isLoading ? 'Checking...' : 'Re-validate'}
          </button>
          <button
            type="button"
            onClick={onNavigateToCleaning}
            className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium transition-colors shadow-xs cursor-pointer"
          >
            Open Transformation
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Health Score</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">{qualityScore}/100</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Completeness</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {(completenessRatio * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Validity</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {(validityRatio * 100).toFixed(1)}%
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Uniqueness</div>
          <div className="text-2xl font-bold font-mono text-teal-600 mt-1">
            {(uniquenessRatio * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-zinc-900">
            Findings ({issues.length})
          </span>
          <span className="text-zinc-500">
            <span className="text-rose-600 font-bold">{errorCount}</span> errors ·{' '}
            <span className="text-amber-600 font-bold">{warningCount}</span> warnings
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-emerald-700 bg-emerald-50/50 border border-emerald-200/60 rounded">
            All schema constraints passed. Zero anomalies detected.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded divide-y divide-zinc-100 overflow-hidden">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs hover:bg-zinc-50/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded border ${issue.severity === 'error'
                          ? 'bg-rose-50 border-rose-200 text-rose-700'
                          : issue.severity === 'warning'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-blue-50 border-blue-200 text-blue-700'
                        }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-semibold text-zinc-900">{issue.column}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 text-[11px]">{issue.type}</span>
                  </div>
                  <div className="text-zinc-700">{issue.message}</div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    Suggested action:{' '}
                    <span className="text-blue-700 font-medium">{issue.suggestedFix}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToCleaning}
                  className="px-2.5 py-1 rounded border border-zinc-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 text-zinc-700 text-xs font-mono shrink-0 self-start md:self-center transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
