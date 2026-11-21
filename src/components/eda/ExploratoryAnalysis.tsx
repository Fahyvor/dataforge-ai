import React, { useState, useMemo } from 'react';
import { Dataset } from '../../types';
import { generateEdaReport } from '../../utils/dataEngine';

interface ExploratoryAnalysisProps {
  dataset: Dataset | null;
}

export const ExploratoryAnalysis: React.FC<ExploratoryAnalysisProps> = ({ dataset }) => {
  const [corrThreshold, setCorrThreshold] = useState<number>(0.2);

  const edaReport = useMemo(() => {
    if (!dataset) return null;
    return generateEdaReport(dataset.id, dataset.rows, dataset.columns);
  }, [dataset]);

  if (!dataset || !edaReport) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Select a dataset to view exploratory statistical analysis.
      </div>
    );
  }

  const { summaryStats, correlations, aiExecutiveSummary, keyFindings, recommendedActions } =
    edaReport;

  const filteredCorrelations = correlations.filter(
    (c) => Math.abs(c.coefficient) >= corrThreshold
  );

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-black">Exploratory Data Analysis</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Distribution statistics, parametric moments, and correlations</p>
      </div>

      {/* Statistical Summary Box */}
      <div className="border border-zinc-200 p-5 space-y-4">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-bold">
          Summary & Observations
        </div>
        <p className="text-xs text-zinc-700 leading-relaxed font-sans">{aiExecutiveSummary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-zinc-100 text-xs">
          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-2 font-medium">
              Key Findings
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-zinc-700">
              {keyFindings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-[11px] font-mono uppercase text-zinc-400 mb-2 font-medium">
              Recommended Preprocessing
            </div>
            <ul className="space-y-1.5 font-mono text-[11px] text-zinc-700">
              {recommendedActions.map((action, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-zinc-400">·</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Statistical Moments Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Statistical Moments & Cardinality
        </div>

        <div className="border-t border-black overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-medium text-black">Feature</th>
                <th className="py-2.5 px-3 font-medium text-black">Type</th>
                <th className="py-2.5 px-3 font-medium text-black">Count</th>
                <th className="py-2.5 px-3 font-medium text-black">Missing %</th>
                <th className="py-2.5 px-3 font-medium text-black">Mean</th>
                <th className="py-2.5 px-3 font-medium text-black">Median</th>
                <th className="py-2.5 px-3 font-medium text-black">Std Dev</th>
                <th className="py-2.5 px-3 font-medium text-black">Min</th>
                <th className="py-2.5 px-3 font-medium text-black">Max</th>
                <th className="py-2.5 px-3 font-medium text-black">Skewness</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {summaryStats.map((st) => (
                <tr key={st.column} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-2 px-3 font-semibold text-black">{st.column}</td>
                  <td className="py-2 px-3 text-zinc-400 text-[10px]">{st.type}</td>
                  <td className="py-2 px-3 text-zinc-700">{st.count}</td>
                  <td className={`py-2 px-3 ${st.missingPercentage > 0 ? 'text-black font-bold' : 'text-zinc-400'}`}>
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
          <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
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
              className="w-20 accent-black cursor-pointer"
            />
            <span className="font-semibold text-black">≥ {corrThreshold.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 font-mono text-xs">
          {filteredCorrelations
            .filter((c) => c.colA !== c.colB)
            .slice(0, 12)
            .map((cell, idx) => (
              <div
                key={idx}
                className="p-2.5 border border-zinc-200 flex items-center justify-between"
              >
                <div className="truncate mr-2">
                  <div className="font-medium text-black text-[11px] truncate">{cell.colA}</div>
                  <div className="text-[10px] text-zinc-400 truncate">× {cell.colB}</div>
                </div>
                <span className="font-bold text-black text-xs">
                  {cell.coefficient > 0 ? `+${cell.coefficient}` : cell.coefficient}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};
