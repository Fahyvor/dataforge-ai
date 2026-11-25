import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { Dataset, ExperimentRun, MlAlgorithm, MlTaskType, TrainedModel } from '../../types';
import { api } from '../../services/api';

interface ModelStudioProps {
  dataset: Dataset | null;
  onModelCreated: (model: TrainedModel, experimentRun: ExperimentRun) => void;
  onNavigateToEvaluation: () => void;
}

export const ModelStudio: React.FC<ModelStudioProps> = ({
  dataset,
  onModelCreated,
  onNavigateToEvaluation,
}) => {
  const [taskType, setTaskType] = useState<MlTaskType>('classification');
  const [algorithm, setAlgorithm] = useState<MlAlgorithm>('Logistic Regression');
  const [targetCol, setTargetCol] = useState<string>('');
  const [selectedPredictors, setSelectedPredictors] = useState<string[]>([]);
  const [nEstimators, setNEstimators] = useState<number>(150);
  const [maxDepth, setMaxDepth] = useState<number>(8);
  const [learningRate, setLearningRate] = useState<number>(0.08);
  const [testSplit, setTestSplit] = useState<number>(0.2);

  const [isTraining, setIsTraining] = useState<boolean>(false);

  useEffect(() => {
    if (!dataset || dataset.columns.length === 0) {
      setTargetCol('');
      setSelectedPredictors([]);
      return;
    }
    const defaultTarget = dataset.columns[dataset.columns.length - 1].name;
    setTargetCol(defaultTarget);
    setSelectedPredictors(
      dataset.columns.filter((c) => c.name !== defaultTarget).slice(0, 6).map((c) => c.name)
    );
  }, [dataset?.id]);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">
          Select or upload a dataset to train statistical models via API.
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

  const columns = dataset.columns;
  const effectiveTarget = targetCol || columns[columns.length - 1]?.name || '';
  const availableFeatures = columns.filter((c) => c.name !== effectiveTarget);

  const handleTogglePredictor = (colName: string) => {
    if (selectedPredictors.includes(colName)) {
      setSelectedPredictors(selectedPredictors.filter((c) => c !== colName));
    } else {
      setSelectedPredictors([...selectedPredictors, colName]);
    }
  };

  const handleSelectAllFeatures = () => {
    setSelectedPredictors(availableFeatures.map((c) => c.name));
  };

  const handleStartTraining = async () => {
    const predictors =
      selectedPredictors.length > 0
        ? selectedPredictors.filter((p) => p !== effectiveTarget)
        : availableFeatures.slice(0, 4).map((c) => c.name);

    if (predictors.length === 0) {
      toast.warning('Select at least one predictor feature');
      return;
    }

    setIsTraining(true);
    try {
      const res = await api.models.train({
        datasetId: dataset.id,
        taskType,
        algorithm,
        targetFeature: effectiveTarget,
        predictorFeatures: predictors,
        hyperparameters: {
          nEstimators,
          maxDepth,
          learningRate,
          testSplitRatio: testSplit,
          randomSeed: 42,
        },
      });

      onModelCreated(res.model, res.experimentRun);
      const primaryMetric =
        res.model.metrics.accuracy !== undefined
          ? `Accuracy: ${(res.model.metrics.accuracy * 100).toFixed(1)}%`
          : res.model.metrics.r2Score !== undefined
            ? `R2: ${res.model.metrics.r2Score}`
            : `Silhouette: ${res.model.metrics.silhouetteScore}`;
      toast.success(`Trained model cleanly (${primaryMetric})`);
    } catch (err: any) {
      toast.error(err.message || 'Model training failed');
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Model Studio</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Configure statistical training jobs on {dataset.name} ({dataset.rowCount} rows)
          </p>
        </div>

        <button
          type="button"
          onClick={onNavigateToEvaluation}
          className="px-3 py-1.5 rounded border border-zinc-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/40 text-zinc-700 text-xs font-mono transition-colors cursor-pointer"
        >
          Leaderboard →
        </button>
      </div>

      {/* Task & Algorithm Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            1. Learning Formulation
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {(
              [
                { id: 'classification', label: 'Classification' },
                { id: 'regression', label: 'Regression' },
                { id: 'clustering', label: 'Clustering' },
                { id: 'anomaly_detection', label: 'Anomaly' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTaskType(t.id)}
                className={`p-2.5 rounded border text-left cursor-pointer transition-all ${taskType === t.id
                    ? 'border-blue-600 bg-blue-50/70 text-blue-900 font-medium ring-1 ring-blue-600/30'
                    : 'border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 bg-white'
                  }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            2. Algorithm
          </div>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value as MlAlgorithm)}
            className="w-full px-2.5 py-2 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono bg-white"
          >
            <option value="Logistic Regression">Logistic Regression (L2)</option>
            <option value="Linear Regression">Ridge / Linear Regression</option>
            <option value="Gradient Boosting (GBM)">Gradient Boosting (GBM)</option>
            <option value="Random Forest">Random Forest</option>
            <option value="K-Means Clustering">K-Means Clustering</option>
          </select>
        </div>
      </div>

      {/* Target & Features */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-zinc-900">
            3. Target & Predictor Features
          </span>
          <button
            type="button"
            onClick={handleSelectAllFeatures}
            className="text-blue-600 hover:text-blue-700 cursor-pointer font-medium"
          >
            Select All
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
              Target Column
            </label>
            <select
              disabled={taskType === 'clustering' || taskType === 'anomaly_detection'}
              value={effectiveTarget}
              onChange={(e) => {
                setTargetCol(e.target.value);
                setSelectedPredictors((prev) => prev.filter((p) => p !== e.target.value));
              }}
              className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono bg-white disabled:opacity-40"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
              Predictors ({selectedPredictors.length} selected)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded border border-zinc-200 bg-zinc-50/40">
              {availableFeatures.map((feat) => {
                const isSelected = selectedPredictors.includes(feat.name);
                return (
                  <button
                    key={feat.name}
                    type="button"
                    onClick={() => handleTogglePredictor(feat.name)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer transition-all border ${isSelected
                        ? 'border-blue-600 bg-blue-600 text-white font-medium shadow-xs'
                        : 'border-zinc-200 bg-white text-zinc-700 hover:border-blue-300 hover:text-blue-600'
                      }`}
                  >
                    {feat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Hyperparameters */}
      <div className="space-y-4 pt-2">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          4. Hyperparameters
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
          <div className="space-y-1">
            <div className="flex justify-between text-zinc-500">
              <span>Iterations:</span>
              <span className="text-blue-600 font-bold">{nEstimators}</span>
            </div>
            <input
              type="range"
              min="50"
              max="400"
              step="25"
              value={nEstimators}
              onChange={(e) => setNEstimators(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-500">
              <span>Max Depth:</span>
              <span className="text-blue-600 font-bold">{maxDepth}</span>
            </div>
            <input
              type="range"
              min="2"
              max="24"
              value={maxDepth}
              onChange={(e) => setMaxDepth(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-500">
              <span>Learning Rate:</span>
              <span className="text-blue-600 font-bold">{learningRate.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.01"
              max="0.3"
              step="0.01"
              value={learningRate}
              onChange={(e) => setLearningRate(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-zinc-500">
              <span>Test Split:</span>
              <span className="text-blue-600 font-bold">{Math.round(testSplit * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSplit}
              onChange={(e) => setTestSplit(Number(e.target.value))}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="pt-4 border-t border-zinc-200 flex items-center justify-between">
        <div className="text-xs font-mono text-zinc-500">
          Partition: {Math.round((1 - testSplit) * 100)}% Train / {Math.round(testSplit * 100)}% Test
        </div>
        <button
          type="button"
          disabled={isTraining}
          onClick={handleStartTraining}
          className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-medium transition-colors cursor-pointer shadow-xs"
        >
          {isTraining ? 'Fitting Model on Server...' : 'Train Model'}
        </button>
      </div>
    </div>
  );
};
