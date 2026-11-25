import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { Dataset, EdaReport } from '../../types';
import { api } from '../../services/api';

interface ExploratoryAnalysisProps {
  dataset: Dataset | null;
}

export const ExploratoryAnalysis: React.FC<ExploratoryAnalysisProps> = ({ dataset }) => {
  const [corrThreshold, setCorrThreshold] = useState<number>(0.2);
  const [edaReport, setEdaReport] = useState<EdaReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!dataset) {
      setEdaReport(null);
      return;
    }

    setIsLoading(true);
    api.datasets
      .eda(dataset.id)
      .then((res) => setEdaReport(res.report))
      .catch((err) => toast.error(err.message || 'Failed to run statistical analysis'))
      .finally(() => setIsLoading(false));
  }, [dataset?.id, dataset?.updatedAt]);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">
          Select or upload a dataset to view exploratory statistical analysis.
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

  if (isLoading && !edaReport) {
    return (
      <div className="py-20 text-center text-xs font-mono text-zinc-400">
        Computing parametric moments and correlation coefficients...
      </div>
    );
  }

  if (!edaReport) return null;

  const { summaryStats, correlations, executiveSummary, keyFindings, recommendedActions } = edaReport;

  const filteredCorrelations = correlations.filter(
    (c) => Math.abs(c.coefficient) >= corrThreshold
  );

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900">Exploratory Data Analysis</h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Distribution statistics, parametric moments, and correlation matrix for {dataset.name}
        </p>
      </div>

      {/* Statistical Summary Box */}
      <div className="border border-zinc-200 rounded p-5 space-y-4 bg-white">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold flex items-center gap-2">
          <span>Statistical Profile Summary</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
        </div>
        <p className="text-xs text-zinc-700 leading-relaxed font-sans">{executiveSummary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-zinc-100 text-xs">
          <div>
            <div className="text-[11px] font-mono uppercase text-blue-700 mb-2 font-medium">
              Key Findings
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-zinc-700">
              {keyFindings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">›</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase text-emerald-700 mb-2 font-medium">
              Recommended Preprocessing
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-zinc-700">
              {recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold">›</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Statistical Moments Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Statistical Moments & Cardinality
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Feature</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Type</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Count</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Missing %</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Mean</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Median</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Std Dev</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Min</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Max</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Skewness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {summaryStats.map((st) => (
                <tr key={st.column} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-2 px-3 font-semibold text-zinc-900">{st.column}</td>
                  <td className="py-2 px-3 text-blue-600 font-medium text-[10px]">{st.type}</td>
                  <td className="py-2 px-3 text-zinc-700">{st.count}</td>
                  <td
                    className={`py-2 px-3 ${st.missingPercentage > 0 ? 'text-amber-600 font-bold bg-amber-50/40' : 'text-zinc-400'
                      }`}
                  >
                    {st.missingPercentage}%
                  </td>
                  <td className="py-2 px-3 text-zinc-800">{st.mean ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-800">{st.median ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-600">{st.stdDev ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-600">{st.min ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-600">{st.max ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-600">{st.skewness ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correlation Coefficients */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            Correlation Coefficients
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
            <span>Threshold:</span>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.05"
              value={corrThreshold}
              onChange={(e) => setCorrThreshold(Number(e.target.value))}
              className="w-20 accent-blue-600 cursor-pointer"
            />
            <span className="font-semibold text-blue-600">≥ {corrThreshold.toFixed(2)}</span>
          </div>
        </div>

        {filteredCorrelations.filter((c) => c.colA !== c.colB).length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-zinc-400 border border-zinc-200 rounded">
            No numeric feature pairs satisfy threshold ≥ {corrThreshold.toFixed(2)}.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 font-mono text-xs">
            {filteredCorrelations
              .filter((c) => c.colA !== c.colB)
              .slice(0, 12)
              .map((cell, idx) => {
                const isPos = cell.coefficient > 0;
                const isHigh = Math.abs(cell.coefficient) >= 0.5;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border flex items-center justify-between transition-colors ${isPos
                        ? isHigh
                          ? 'bg-blue-50/70 border-blue-200/80 text-blue-900'
                          : 'bg-white border-zinc-200 text-zinc-900'
                        : isHigh
                          ? 'bg-rose-50/70 border-rose-200/80 text-rose-900'
                          : 'bg-white border-zinc-200 text-zinc-900'
                      }`}
                  >
                    <div className="truncate mr-2">
                      <div className="font-medium text-[11px] truncate">{cell.colA}</div>
                      <div className="text-[10px] text-zinc-400 truncate">× {cell.colB}</div>
                    </div>
                    <span className={`font-bold text-xs ${isPos ? 'text-blue-600' : 'text-rose-600'}`}>
                      {isPos ? `+${cell.coefficient}` : cell.coefficient}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
