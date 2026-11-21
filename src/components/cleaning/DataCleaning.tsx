import React, { useState } from 'react';
import { toast } from 'sleek-toast';
import { Dataset, TransformationStep } from '../../types';
import { applyTransformation } from '../../utils/dataEngine';

interface DataCleaningProps {
  dataset: Dataset | null;
  onUpdateDataset: (updatedDataset: Dataset) => void;
}

export const DataCleaning: React.FC<DataCleaningProps> = ({ dataset, onUpdateDataset }) => {
  const [selectedAction, setSelectedAction] = useState<string>('impute_median');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [transformationHistory, setTransformationHistory] = useState<TransformationStep[]>([]);
  const [previousStates, setPreviousStates] = useState<Dataset[]>([]);

  if (!dataset) {
    return (
      <div className="py-20 text-center text-xs text-zinc-500">
        Select a dataset to build cleaning and transformation recipes.
      </div>
    );
  }

  const columns = dataset.columns;
  const currentTargetCol = selectedColumn || columns[0]?.name || '';

  const handleApplyStep = () => {
    const step: TransformationStep = {
      id: `step-${Date.now().toString(36)}`,
      action: selectedAction as any,
      column: selectedAction === 'drop_duplicates' ? undefined : currentTargetCol,
      description: `${selectedAction.replace(/_/g, ' ')} on ${selectedAction === 'drop_duplicates' ? 'all rows' : currentTargetCol}`,
      appliedAt: new Date().toISOString(),
      impactNote: '',
    };

    setPreviousStates([...previousStates, JSON.parse(JSON.stringify(dataset))]);

    const { updatedRows, updatedColumns, impactNote } = applyTransformation(
      dataset.rows,
      dataset.columns,
      step
    );

    step.impactNote = impactNote;
    const updatedHistory = [...transformationHistory, step];
    setTransformationHistory(updatedHistory);

    const updatedDataset: Dataset = {
      ...dataset,
      rowCount: updatedRows.length,
      columnCount: updatedColumns.length,
      rows: updatedRows,
      columns: updatedColumns,
      updatedAt: new Date().toISOString(),
    };

    onUpdateDataset(updatedDataset);
    toast.success(impactNote || 'Transformation applied');
  };

  const handleUndo = () => {
    if (previousStates.length === 0) return;
    const prevState = previousStates[previousStates.length - 1];
    setPreviousStates(previousStates.slice(0, -1));
    setTransformationHistory(transformationHistory.slice(0, -1));
    onUpdateDataset(prevState);
    toast.info('Reverted transformation');
  };

  const handleSaveAsVersion = () => {
    const nextVerTag = `v1.${dataset.versions.length}`;
    const newVersion = {
      versionId: `ver-${Date.now().toString(36)}`,
      versionTag: nextVerTag,
      description: `Applied ${transformationHistory.length} transformation steps: ${transformationHistory.map((s) => s.action).join(', ')}`,
      author: 'Engineer',
      createdAt: new Date().toISOString(),
      rowCount: dataset.rowCount,
      columnCount: dataset.columnCount,
      qualityScore: Math.min(100, dataset.qualityScore + 4),
      dataHash: `sha256:${Date.now().toString(16)}`,
      changesSummary: transformationHistory.map((s) => s.impactNote),
    };

    const updatedDataset: Dataset = {
      ...dataset,
      currentVersion: nextVerTag,
      versions: [newVersion, ...dataset.versions],
      qualityScore: Math.min(100, dataset.qualityScore + 4),
    };

    onUpdateDataset(updatedDataset);
    toast.success(`Saved snapshot ${nextVerTag}`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">Data Transformation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Build and apply transformation recipes</p>
        </div>

        <div className="flex items-center gap-2">
          {previousStates.length > 0 && (
            <button
              type="button"
              onClick={handleUndo}
              className="px-3 py-1.5 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
            >
              Undo ({previousStates.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveAsVersion}
            className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-mono transition-colors"
          >
            Save Snapshot
          </button>
        </div>
      </div>

      {/* Step Builder */}
      <div className="border border-zinc-200 p-5 space-y-4">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-black">
          Add Transformation
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">Action</label>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-black focus:outline-none focus:border-black cursor-pointer font-mono"
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
            <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">Target Column</label>
            <select
              disabled={selectedAction === 'drop_duplicates'}
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-zinc-300 text-xs text-black focus:outline-none focus:border-black cursor-pointer disabled:opacity-30 font-mono"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.type}) {c.nullable ? '· has nulls' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleApplyStep}
              className="w-full py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
            >
              Apply Step
            </button>
          </div>
        </div>
      </div>

      {/* Applied Steps Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-black">
            Transformation Ledger ({transformationHistory.length})
          </span>
          <span className="text-zinc-500">
            Shape: {dataset.rowCount} rows × {dataset.columnCount} cols
          </span>
        </div>

        {transformationHistory.length === 0 ? (
          <div className="py-8 text-center text-xs font-mono text-zinc-500 border border-zinc-200">
            No transformations applied yet. Select an action above to start.
          </div>
        ) : (
          <div className="border-t border-black divide-y divide-zinc-200">
            {transformationHistory.map((step, idx) => (
              <div
                key={step.id}
                className="py-3 flex items-center justify-between gap-4 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 w-5">{idx + 1}.</span>
                  <div>
                    <div className="font-semibold text-black capitalize">
                      {step.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-zinc-500">{step.impactNote}</div>
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
