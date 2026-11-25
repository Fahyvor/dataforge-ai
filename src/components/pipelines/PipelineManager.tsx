import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiPlay, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { Dataset, Pipeline } from '../../types';
import { api } from '../../services/api';

interface PipelineManagerProps {
  pipelines: Pipeline[];
  datasets: Dataset[];
  onPipelineCreated: (pipeline: Pipeline) => void;
  onPipelineUpdated: (pipeline: Pipeline) => void;
  onPipelineDeleted: (id: string) => void;
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({
  pipelines,
  datasets,
  onPipelineCreated,
  onPipelineUpdated,
  onPipelineDeleted,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(pipelines.length === 0);
  const [isCreating, setIsCreating] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // New pipeline form
  const [name, setName] = useState('');
  const [datasetId, setDatasetId] = useState(datasets[0]?.id || '');
  const [trigger, setTrigger] = useState<Pipeline['trigger']>('manual');
  const [targetName, setTargetName] = useState('Warehouse Mart');

  const activePipeline =
    pipelines.find((p) => p.id === selectedId) || pipelines[0] || null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetDsId = datasetId || datasets[0]?.id;
    if (!targetDsId) {
      toast.warning('Upload a dataset before creating a pipeline');
      return;
    }
    if (!name.trim()) {
      toast.warning('Provide a pipeline name');
      return;
    }

    setIsCreating(true);
    try {
      const res = await api.pipelines.create({
        name: name.trim(),
        datasetId: targetDsId,
        trigger,
        targetName: targetName.trim() || 'Catalog Store',
      });
      onPipelineCreated(res.pipeline);
      setSelectedId(res.pipeline.id);
      setShowCreateForm(false);
      setName('');
      toast.success(`Created pipeline '${res.pipeline.name}'`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create pipeline');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRunPipeline = async () => {
    if (!activePipeline) return;
    setIsRunning(true);
    try {
      const res = await api.pipelines.run(activePipeline.id);
      onPipelineUpdated(res.pipeline);
      toast.success(`Pipeline completed in ${res.pipeline.lastRunDurationSec}s`);
    } catch (err: any) {
      toast.error(err.message || 'Pipeline execution failed');
    } finally {
      setIsRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.pipelines.remove(id);
      onPipelineDeleted(id);
      if (selectedId === id) setSelectedId('');
      toast.info('Deleted pipeline');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete pipeline');
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Pipeline Automation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Create and execute DAG workflows against your ingested datasets
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>{showCreateForm && pipelines.length > 0 ? 'Cancel' : 'New Pipeline'}</span>
        </button>
      </div>

      {/* Create Form */}
      {(showCreateForm || pipelines.length === 0) && (
        <form onSubmit={handleCreate} className="border border-zinc-200 rounded-lg p-5 space-y-4 bg-white">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            Create New Pipeline
          </div>

          {datasets.length === 0 ? (
            <div className="p-4 rounded border border-amber-200 bg-amber-50/40 text-xs font-mono text-amber-800 flex items-center justify-between">
              <span>Ingest at least one dataset before defining a pipeline.</span>
              <Link
                to="/upload"
                className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Upload Dataset
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                  Pipeline Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Daily Cleaning DAG"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                  Source Dataset
                </label>
                <select
                  value={datasetId || datasets[0]?.id || ''}
                  onChange={(e) => setDatasetId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                >
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.rowCount}r)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                  Trigger Schedule
                </label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as Pipeline['trigger'])}
                  className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
                >
                  <option value="manual">Manual Trigger</option>
                  <option value="hourly">Hourly (0 * * * *)</option>
                  <option value="daily">Daily (0 0 * * *)</option>
                  <option value="webhook">Webhook Event</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                  Destination Sink
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="Catalog Store"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium cursor-pointer shrink-0"
                  >
                    {isCreating ? '...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Existing Pipelines Tabs */}
      {pipelines.length > 0 && activePipeline && (
        <>
          {pipelines.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {pipelines.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedId(p.id)}
                  className={`px-3 py-1.5 rounded text-xs font-mono border cursor-pointer transition-colors ${p.id === activePipeline.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                    }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Selected Pipeline Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-zinc-50/60 border border-zinc-200 rounded-lg p-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-zinc-900">{activePipeline.name}</h2>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-zinc-200 text-zinc-600">
                  {activePipeline.cronSchedule || activePipeline.trigger}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">{activePipeline.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isRunning}
                onClick={handleRunPipeline}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
              >
                <FiPlay className="w-3 h-3" />
                <span>{isRunning ? 'Executing DAG...' : 'Execute Now'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleDelete(activePipeline.id)}
                className="p-1.5 rounded border border-zinc-200 hover:border-rose-400 hover:text-rose-600 bg-white text-zinc-400 cursor-pointer transition-colors"
                title="Delete Pipeline"
              >
                <FiTrash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
            <div>
              <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium flex items-center gap-1.5">
                Status
                <span
                  className={`w-1.5 h-1.5 rounded-full ${activePipeline.status === 'completed'
                      ? 'bg-emerald-500'
                      : activePipeline.status === 'failed'
                        ? 'bg-rose-500'
                        : activePipeline.status === 'running'
                          ? 'bg-blue-600 animate-pulse'
                          : 'bg-zinc-300'
                    }`}
                />
              </div>
              <div className="text-2xl font-bold font-mono text-zinc-900 mt-1 capitalize">
                {activePipeline.status}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Duration</div>
              <div className="text-2xl font-bold font-mono text-blue-600 mt-1">
                {activePipeline.lastRunDurationSec !== undefined
                  ? `${activePipeline.lastRunDurationSec}s`
                  : '—'}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
                Throughput
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">
                {activePipeline.throughputRecsPerSec !== undefined ? (
                  <>
                    {activePipeline.throughputRecsPerSec.toLocaleString()}{' '}
                    <span className="text-xs font-normal text-zinc-500">recs/s</span>
                  </>
                ) : (
                  '—'
                )}
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">
                Sink Target
              </div>
              <div className="text-sm font-bold font-mono text-emerald-600 mt-2">
                {activePipeline.targetName || 'Catalog Store'}
              </div>
            </div>
          </div>

          {/* Stages Flow */}
          <div className="space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
              Pipeline Stages ({activePipeline.steps.length})
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {activePipeline.steps.map((st, idx) => {
                const isRunningStage = st.status === 'running';
                const isSuccess = st.status === 'success';
                return (
                  <div
                    key={st.id}
                    className={`p-3 rounded border text-xs flex flex-col justify-between space-y-2 transition-all ${isRunningStage
                        ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/40 text-blue-900'
                        : isSuccess
                          ? 'border-emerald-200/80 bg-emerald-50/30 text-zinc-900'
                          : 'border-zinc-200 text-zinc-500 bg-white'
                      }`}
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-zinc-500 font-medium">Stage {idx + 1}</span>
                        {isSuccess && <span className="text-emerald-600 font-bold">✓</span>}
                        {isRunningStage && <span className="text-blue-600 animate-spin">●</span>}
                      </div>
                      <div className="font-semibold text-zinc-900 text-[11px] mt-1 leading-tight">
                        {st.name}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono uppercase text-zinc-500">{st.type}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Execution Console */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
              Execution Log
            </div>

            <div className="h-44 overflow-y-auto space-y-1.5 font-mono text-[11px] p-3 rounded border border-zinc-200 bg-zinc-50/60">
              {activePipeline.logs.length === 0 ? (
                <div className="text-zinc-400">Pipeline ready. Click Execute Now to run stages against live data.</div>
              ) : (
                activePipeline.logs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-zinc-400 shrink-0 text-[10px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 uppercase text-[9px] font-semibold px-1 py-0.2 rounded border ${log.level === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.level === 'warn'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : log.level === 'error'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                    >
                      {log.level}
                    </span>
                    <span className="text-zinc-800">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
