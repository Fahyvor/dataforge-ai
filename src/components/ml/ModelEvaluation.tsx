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

        <div className="border-t border-black overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-medium text-black">Model</th>
                <th className="py-2.5 px-3 font-medium text-black">Algorithm</th>
                <th className="py-2.5 px-3 font-medium text-black">Accuracy</th>
                <th className="py-2.5 px-3 font-medium text-black">Precision</th>
                <th className="py-2.5 px-3 font-medium text-black">Recall</th>
                <th className="py-2.5 px-3 font-medium text-black">ROC-AUC</th>
                <th className="py-2.5 px-3 font-medium text-black">Latency</th>
                <th className="py-2.5 px-3 font-medium text-black">Status</th>
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
                        ? 'bg-zinc-100 font-semibold text-black'
                        : 'hover:bg-zinc-50 text-zinc-700'
                    }`}
                  >
                    <td className="py-2 px-3">{mdl.name}</td>
                    <td className="py-2 px-3 text-zinc-500">{mdl.algorithm}</td>
                    <td className="py-2 px-3 font-bold text-black">
                      {(score * 100).toFixed(1)}%
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.precision ? `${(mdl.metrics.precision * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.recall ? `${(mdl.metrics.recall * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2 px-3">{mdl.metrics.rocAuc ?? '—'}</td>
                    <td className="py-2 px-3 text-zinc-400">{mdl.metrics.inferenceLatencyMs}ms</td>
                    <td className="py-2 px-3 uppercase text-[10px] text-zinc-600 font-mono">
                      {mdl.status}
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
          <div className="text-[11px] font-mono uppercase text-zinc-400">Accuracy</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {metrics.accuracy ? `${(metrics.accuracy * 100).toFixed(1)}%` : `${metrics.r2Score}`}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Precision</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {metrics.precision ? `${(metrics.precision * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Recall</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {metrics.recall ? `${(metrics.recall * 100).toFixed(1)}%` : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">F1 Score</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {metrics.f1Score ? metrics.f1Score.toFixed(3) : 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-400">Latency</div>
          <div className="text-2xl font-bold font-mono text-black mt-1">
            {metrics.inferenceLatencyMs}ms
          </div>
        </div>
      </div>

      {/* Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Confusion Matrix */}
        {confusionMatrix && (
          <div className="space-y-3 font-mono">
            <div className="text-xs uppercase tracking-wider text-black font-semibold">
              Confusion Matrix
            </div>

            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-4 border border-zinc-200">
                <div className="text-zinc-400 text-[10px] uppercase">True Negative</div>
                <div className="text-2xl font-bold text-black mt-1 font-mono">
                  {confusionMatrix.matrix[0][0]}
                </div>
              </div>

              <div className="p-4 border border-zinc-200">
                <div className="text-zinc-400 text-[10px] uppercase">False Positive</div>
                <div className="text-2xl font-bold text-black mt-1 font-mono">
                  {confusionMatrix.matrix[0][1]}
                </div>
              </div>

              <div className="p-4 border border-zinc-200">
                <div className="text-zinc-400 text-[10px] uppercase">False Negative</div>
                <div className="text-2xl font-bold text-black mt-1 font-mono">
                  {confusionMatrix.matrix[1][0]}
                </div>
              </div>

              <div className="p-4 border border-zinc-200">
                <div className="text-zinc-400 text-[10px] uppercase">True Positive</div>
                <div className="text-2xl font-bold text-black mt-1 font-mono">
                  {confusionMatrix.matrix[1][1]}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Feature Importance */}
        <div className="space-y-3 font-mono">
          <div className="text-xs uppercase tracking-wider text-black font-semibold">
            Feature Importance
          </div>

          <div className="space-y-3 pt-1">
            {featureImportance.slice(0, 5).map((fi) => {
              const pct = Math.round(fi.importance * 100);
              return (
                <div key={fi.feature} className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-700">{fi.feature}</span>
                    <span className="text-black font-bold">{pct}%</span>
                  </div>
                  <div className="h-1 bg-zinc-100">
                    <div style={{ width: `${pct}%` }} className="h-full bg-black" />
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
