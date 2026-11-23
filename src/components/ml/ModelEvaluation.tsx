import React, { useState } from 'react';
import { TrainedModel } from '../../types';

interface ModelEvaluationProps {
  models: TrainedModel[];
  onSelectModel?: (model: TrainedModel) => void;
}

export const ModelEvaluation: React.FC<ModelEvaluationProps> = ({ models }) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(
    models[0]?.id || ''
  );

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  if (!selectedModel) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        No trained models found. Train a model in Model Studio first.
      </div>
    );
  }

  const { metrics, confusionMatrix, featureImportance } = selectedModel;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-black">Model Evaluation & Leaderboard</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Benchmark metrics, diagnostics, and feature importance</p>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Model Comparison Leaderboard
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Model</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Algorithm</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Accuracy</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Precision</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Recall</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">ROC-AUC</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Latency</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {models.map((mdl) => {
                const isSelected = mdl.id === selectedModel.id;
                const score = mdl.metrics.accuracy || mdl.metrics.r2Score || 0;
                return (
                  <tr
                    key={mdl.id}
                    onClick={() => setSelectedModelId(mdl.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/50 font-semibold text-zinc-900 border-l-2 border-l-blue-600'
                        : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <td className="py-2 px-3">{mdl.name}</td>
                    <td className="py-2 px-3 text-zinc-500">{mdl.algorithm}</td>
                    <td className="py-2 px-3 font-bold text-emerald-600">
                      {(score * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.precision ? `${(mdl.metrics.precision * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.recall ? `${(mdl.metrics.recall * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold">{mdl.metrics.rocAuc ?? '—'}</td>
                    <td className="py-2 px-3 text-zinc-500">{mdl.metrics.inferenceLatencyMs}ms</td>
                    <td className="py-2 px-3">
                      <span className="uppercase text-[9px] font-semibold px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 font-mono">
                        {mdl.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Accuracy</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : `${metrics.r2Score}`}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Precision</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {metrics.precision ? `${(metrics.precision * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Recall</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {metrics.recall ? `${(metrics.recall * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">F1 Score</div>
          <div className="text-2xl font-bold font-mono text-violet-600 mt-1">
            {metrics.f1Score ? metrics.f1Score.toFixed(3) : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Latency</div>
          <div className="text-2xl font-bold font-mono text-zinc-700 mt-1">
            {metrics.inferenceLatencyMs}ms
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        {confusionMatrix && (
          <div className="space-y-3 font-mono">
            <div className="text-xs uppercase tracking-wider text-zinc-900 font-semibold">
              Confusion Matrix
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-4 rounded border border-emerald-200/80 bg-emerald-50/30">
                <div className="text-emerald-700 text-[10px] uppercase font-semibold">True Negative</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
                  {confusionMatrix.matrix[0][0]}
                </div>
              </div>

              <div className="p-4 rounded border border-amber-200/80 bg-amber-50/30">
                <div className="text-amber-700 text-[10px] uppercase font-semibold">False Positive</div>
                <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
                  {confusionMatrix.matrix[0][1]}
                </div>
              </div>

              <div className="p-4 rounded border border-amber-200/80 bg-amber-50/30">
                <div className="text-amber-700 text-[10px] uppercase font-semibold">False Negative</div>
                <div className="text-2xl font-bold text-amber-900 mt-1 font-mono">
                  {confusionMatrix.matrix[1][0]}
                </div>
              </div>

              <div className="p-4 rounded border border-emerald-200/80 bg-emerald-50/30">
                <div className="text-emerald-700 text-[10px] uppercase font-semibold">True Positive</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1 font-mono">
                  {confusionMatrix.matrix[1][1]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Importance */}
        <div className="space-y-3 font-mono">
          <div className="text-xs uppercase tracking-wider text-zinc-900 font-semibold">
            Feature Importance
          </div>

          <div className="space-y-3 pt-1">
            {featureImportance.slice(0, 5).map((fi) => {
              const pct = Math.round(fi.importance * 100);
              return (
                <div key={fi.feature} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700">{fi.feature}</span>
                    <span className="text-blue-600 font-bold">{pct}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div style={{ width: `${pct}%` }} className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all" />
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
