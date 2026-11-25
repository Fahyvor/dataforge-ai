import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiTrash2, FiPlay } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { TrainedModel } from '../../types';
import { api } from '../../services/api';

interface ModelEvaluationProps {
  models: TrainedModel[];
  onModelUpdated: (model: TrainedModel) => void;
  onModelDeleted: (id: string) => void;
}

export const ModelEvaluation: React.FC<ModelEvaluationProps> = ({
  models,
  onModelUpdated,
  onModelDeleted,
}) => {
  const [selectedModelId, setSelectedModelId] = useState<string>(models[0]?.id || '');
  const [inferenceInputs, setInferenceInputs] = useState<Record<string, string>>({});
  const [predictionOutput, setPredictionOutput] = useState<{
    prediction: any;
    probability?: number;
    latencyMs: number;
  } | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  const selectedModel = models.find((m) => m.id === selectedModelId) || models[0];

  useEffect(() => {
    if (!selectedModel) return;
    const init: Record<string, string> = {};
    selectedModel.predictorFeatures.forEach((f) => {
      init[f] = inferenceInputs[f] ?? '';
    });
    setInferenceInputs(init);
    setPredictionOutput(null);
  }, [selectedModel?.id]);

  if (!selectedModel) {
    return (
      <div className="py-20 text-center space-y-3">
        <h3 className="text-sm font-semibold text-zinc-900">No Trained Models Yet</h3>
        <p className="text-xs font-mono text-zinc-500">
          Configure and train a statistical model in Model Studio to evaluate benchmarks and run inference.
        </p>
        <Link
          to="/models"
          className="inline-block px-3.5 py-1.5 rounded bg-blue-600 text-white text-xs font-mono hover:bg-blue-700"
        >
          Open Model Studio
        </Link>
      </div>
    );
  }

  const { metrics, confusionMatrix, featureImportance } = selectedModel;

  const handleToggleDeploy = async () => {
    const nextStatus = selectedModel.status === 'deployed' ? 'ready' : 'deployed';
    try {
      const res = await api.models.updateStatus(selectedModel.id, nextStatus);
      onModelUpdated(res.model);
      toast.success(`Model status updated to '${nextStatus}'`);
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleDeleteModel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.models.remove(id);
      onModelDeleted(id);
      toast.info('Model deleted');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleRunPredict = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPredicting(true);
    try {
      const payload: Record<string, any> = {};
      Object.entries(inferenceInputs).forEach(([k, v]) => {
        const num = Number(v);
        payload[k] = v !== '' && !isNaN(num) ? num : v;
      });
      const res = await api.models.predict(selectedModel.id, payload);
      setPredictionOutput({
        prediction: res.prediction,
        probability: res.probability,
        latencyMs: res.latencyMs,
      });
    } catch (err: any) {
      toast.error(err.message || 'Inference failed');
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">
            Model Evaluation & Inference
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Held-out test split diagnostics, feature importance, and live prediction endpoint
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleDeploy}
            className={`px-3.5 py-1.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${selectedModel.status === 'deployed'
                ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
              }`}
          >
            {selectedModel.status === 'deployed' ? 'Deployed ✓' : 'Deploy Model'}
          </button>
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Model Comparison Leaderboard ({models.length})
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Model</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Algorithm</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Primary Score</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Precision</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Recall</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">ROC-AUC</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Latency</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Status</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {models.map((mdl) => {
                const isSelected = mdl.id === selectedModel.id;
                const score =
                  mdl.metrics.accuracy ?? mdl.metrics.r2Score ?? mdl.metrics.silhouetteScore ?? 0;
                return (
                  <tr
                    key={mdl.id}
                    onClick={() => setSelectedModelId(mdl.id)}
                    className={`cursor-pointer transition-colors ${isSelected
                        ? 'bg-blue-50/50 font-semibold text-zinc-900 border-l-2 border-l-blue-600'
                        : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                  >
                    <td className="py-2 px-3">{mdl.name}</td>
                    <td className="py-2 px-3 text-zinc-500">{mdl.algorithm}</td>
                    <td className="py-2 px-3 font-bold text-emerald-600">
                      {mdl.metrics.accuracy !== undefined
                        ? `${(score * 100).toFixed(1)}%`
                        : score}
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.precision !== undefined
                        ? `${(mdl.metrics.precision * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-2 px-3">
                      {mdl.metrics.recall !== undefined
                        ? `${(mdl.metrics.recall * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold">
                      {mdl.metrics.rocAuc ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-zinc-500">{mdl.metrics.inferenceLatencyMs}ms</td>
                    <td className="py-2 px-3">
                      <span
                        className={`uppercase text-[9px] font-semibold px-1.5 py-0.5 rounded border font-mono ${mdl.status === 'deployed'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                          }`}
                      >
                        {mdl.status}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteModel(mdl.id, e)}
                        className="text-zinc-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete model"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
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
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
            {metrics.accuracy !== undefined ? 'Accuracy' : metrics.r2Score !== undefined ? 'R2 Score' : 'Silhouette'}
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {metrics.accuracy !== undefined
              ? `${(metrics.accuracy * 100).toFixed(1)}%`
              : metrics.r2Score ?? metrics.silhouetteScore ?? 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
            {metrics.precision !== undefined ? 'Precision' : 'MAE'}
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
            {metrics.precision !== undefined
              ? `${(metrics.precision * 100).toFixed(1)}%`
              : metrics.mae ?? 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
            {metrics.recall !== undefined ? 'Recall' : 'RMSE'}
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {metrics.recall !== undefined
              ? `${(metrics.recall * 100).toFixed(1)}%`
              : metrics.rmse ?? 'N/A'}
          </div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">F1 Score</div>
          <div className="text-2xl font-bold font-mono text-violet-600 mt-1">
            {metrics.f1Score !== undefined ? metrics.f1Score.toFixed(3) : 'N/A'}
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
              Confusion Matrix ({confusionMatrix.labels.join(' vs ')})
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
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Live Inference Form */}
      <form
        onSubmit={handleRunPredict}
        className="border border-zinc-200 rounded-lg p-5 space-y-4 bg-zinc-50/30"
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
              Live Inference Endpoint
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">
              POST /api/models/{selectedModel.id}/predict
            </p>
          </div>

          <button
            type="submit"
            disabled={isPredicting}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium cursor-pointer"
          >
            <FiPlay className="w-3 h-3" />
            <span>{isPredicting ? 'Scoring...' : 'Predict'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {selectedModel.predictorFeatures.map((feat) => (
            <div key={feat}>
              <label className="text-[10px] font-mono uppercase text-zinc-500 block mb-1 truncate">
                {feat}
              </label>
              <input
                type="text"
                placeholder="Value"
                value={inferenceInputs[feat] || ''}
                onChange={(e) =>
                  setInferenceInputs((prev) => ({ ...prev, [feat]: e.target.value }))
                }
                className="w-full px-2.5 py-1.5 rounded border border-zinc-200 bg-white text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          ))}
        </div>

        {predictionOutput && (
          <div className="p-3 rounded border border-emerald-200 bg-emerald-50/50 flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-zinc-600">Predicted Output ({selectedModel.targetFeature || 'Cluster'}): </span>
              <strong className="text-emerald-700 text-sm">{String(predictionOutput.prediction)}</strong>
            </div>
            <div className="text-zinc-500">
              {predictionOutput.probability !== undefined && (
                <span className="mr-3">
                  Confidence: <strong className="text-blue-700">{(predictionOutput.probability * 100).toFixed(1)}%</strong>
                </span>
              )}
              <span>{predictionOutput.latencyMs}ms</span>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};
