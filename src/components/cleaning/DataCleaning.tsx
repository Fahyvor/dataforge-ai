import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sleek-toast';
import { Dataset, TransformationStep } from '../../types';
import { api } from '../../services/api';

interface DataCleaningProps {
  dataset: Dataset | null;
  onUpdateDataset: (updatedDataset: Dataset) => void;
}

export const DataCleaning: React.FC<DataCleaningProps> = ({ dataset, onUpdateDataset }) => {
  const [selectedAction, setSelectedAction] = useState<string>('impute_median');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [transformationHistory, setTransformationHistory] = useState<TransformationStep[]>([]);
  const [undoCount, setUndoCount] = useState<number>(0);
  const [isApplying, setIsApplying] = useState(false);

  if (!dataset) {
    return (
      <div className="py-20 text-center space-y-3">
        <p className="text-xs font-mono text-zinc-500">
          Select or upload a dataset to build cleaning and transformation recipes.
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
  const currentTargetCol = selectedColumn || columns[0]?.name || '';

  const handleApplyStep = async () => {
    setIsApplying(true);
    try {
      const res = await api.datasets.transform(
        dataset.id,
        selectedAction,
        selectedAction === 'drop_duplicates' ? undefined : currentTargetCol
      );
      setTransformationHistory([res.step, ...transformationHistory]);
      setUndoCount(res.undoCount);
      onUpdateDataset(res.dataset);
      toast.success(res.step.impactNote || 'Transformation applied');
    } catch (err: any) {
      toast.error(err.message || 'Failed to apply transformation');
    } finally {
      setIsApplying(false);
    }
  };

  const handleUndo = async () => {
    if (undoCount === 0) return;
    setIsApplying(true);
    try {
      const res = await api.datasets.undo(dataset.id);
      setUndoCount(res.undoCount);
      setTransformationHistory(transformationHistory.slice(1));
      onUpdateDataset(res.dataset);
      toast.info('Reverted transformation');
    } catch (err: any) {
      toast.error(err.message || 'Undo failed');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveAsVersion = async () => {
    setIsApplying(true);
    try {
      const summary =
        transformationHistory.length > 0
          ? transformationHistory.map((s) => s.impactNote)
          : ['Manual version snapshot'];
      const description =
        transformationHistory.length > 0
          ? `Applied ${transformationHistory.length} steps: ${transformationHistory.map((s) => s.action).join(', ')}`
          : `Snapshot at ${dataset.rowCount} rows`;
      const res = await api.datasets.saveVersion(dataset.id, description, summary);
      onUpdateDataset(res.dataset);
      toast.success(`Saved snapshot ${res.version.versionTag}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save snapshot');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Data Transformation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Execute schema and value transformations on {dataset.name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {undoCount > 0 && (
            <button
              type="button"
              disabled={isApplying}
              onClick={handleUndo}
              className="px-3 py-1.5 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 hover:text-zinc-900 text-xs font-mono transition-colors bg-white cursor-pointer"
            >
              Undo ({undoCount})
            </button>
          )}

          <button
            type="button"
            disabled={isApplying}
            onClick={handleSaveAsVersion}
            className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium transition-colors shadow-xs cursor-pointer"
          >
            Save Snapshot
          </button>
        </div>
      </div>

      {/* Step Builder */}
      <div className="border border-zinc-200 rounded p-5 space-y-4 bg-white">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
          Add Transformation
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono bg-white"
            >
              <optgroup label="Missing Values">
                <option value="impute_median">Impute with Column Median</option>
                <option value="impute_mean">Impute with Column Mean</option>
                <option value="drop_missing">Drop Rows with Nulls</option>
              </optgroup>
              <optgroup label="Deduplication & Normalize">
                <option value="drop_duplicates">Remove Duplicate Rows</option>
                <option value="lowercase_strings">Normalize Strings to Lowercase</option>
              </optgroup>
              <optgroup label="Feature Scaling">
                <option value="scale_standard">StandardScaler (Mean=0, Std=1)</option>
                <option value="scale_minmax">MinMaxScaler [0.0, 1.0]</option>
              </optgroup>
              <optgroup label="Columns">
                <option value="one_hot_encode">One-Hot Encode Column</option>
                <option value="drop_column">Drop Column</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
              Target Column
            </label>
            <select
              disabled={selectedAction === 'drop_duplicates'}
              value={currentTargetCol}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer font-mono bg-white disabled:opacity-40"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={isApplying}
              onClick={handleApplyStep}
              className="w-full px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isApplying ? 'Applying...' : 'Apply Step'}
            </button>
          </div>
        </div>
      </div>

      {/* Applied Steps Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-zinc-900">
            Session Transformation Ledger ({transformationHistory.length})
          </span>
          <span className="text-zinc-500">
            Shape: {dataset.rowCount} rows × {dataset.columnCount} cols
          </span>
        </div>

        {transformationHistory.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-zinc-200 rounded">
            No transformations executed in this session yet.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded divide-y divide-zinc-100 overflow-hidden">
            {transformationHistory.map((step, idx) => (
              <div
                key={step.id}
                className="p-3.5 flex items-center justify-between gap-4 text-xs font-mono hover:bg-zinc-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                    {transformationHistory.length - idx}
                  </span>
                  <div>
                    <div className="font-semibold text-zinc-900 capitalize">
                      {step.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">{step.impactNote}</div>
                  </div>
                </div>

                <div className="text-zinc-400 text-[11px]">
                  {new Date(step.appliedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
