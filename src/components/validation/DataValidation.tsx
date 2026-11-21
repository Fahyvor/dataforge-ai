import React, { useMemo } from 'react';
import { toast } from 'sleek-toast';
import { Dataset } from '../../types';
import { validateDataset } from '../../utils/dataEngine';

interface DataValidationProps {
  dataset: Dataset | null;
  onNavigateToCleaning: () => void;
}

export const DataValidation: React.FC<DataValidationProps> = ({
  dataset,
  onNavigateToCleaning,
}) => {
  const validationResult = useMemo(() => {
    if (!dataset) return null;
    return validateDataset(dataset.id, dataset.rows, dataset.columns);
  }, [dataset]);

  if (!dataset || !validationResult) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Select a dataset to run validation.
      </div>
    );
  }

  const { issues, qualityScore, completenessRatio, validityRatio, uniquenessRatio } =
    validationResult;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">Data Validation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Schema integrity and constraint findings</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toast.success('Validation refreshed')}
            className="px-3 py-1.5 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
          >
            Re-validate
          </button>
          <button
            type="button"
            onClick={onNavigateToCleaning}
            className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-mono transition-colors"
          >
            Open Transformation
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Health Score</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{qualityScore}/100</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Completeness</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{(completenessRatio * 100).toFixed(1)}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Validity</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{(validityRatio * 100).toFixed(1)}%</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Uniqueness</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">{(uniquenessRatio * 100).toFixed(1)}%</div>
        </div>
      </div>

      {/* Findings Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-black">
            Findings ({issues.length})
          </span>
          <span className="text-zinc-500">
            {errorCount} errors · {warningCount} warnings
          </span>
        </div>

        {issues.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-zinc-200">
            All schema constraints passed. No issues detected.
          </div>
        ) : (
          <div className="border-t border-black divide-y divide-zinc-200">
            {issues.map((issue, idx) => (
              <div
                key={idx}
                className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-mono">
                    <span
                      className={`text-[10px] uppercase font-semibold px-1 ${
                        issue.severity === 'error'
                          ? 'bg-black text-white'
                          : 'bg-zinc-200 text-black'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-semibold text-black">{issue.column}</span>
                    <span className="text-zinc-400">·</span>
                    <span className="text-zinc-500 text-[11px]">{issue.type}</span>
                  </div>
                  <div className="text-zinc-700">{issue.message}</div>
                  <div className="text-[11px] font-mono text-zinc-500">
                    Suggested action: {issue.suggestedFix}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onNavigateToCleaning}
                  className="px-2.5 py-1 border border-zinc-300 hover:border-black text-black text-xs font-mono shrink-0 self-start md:self-center"
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
