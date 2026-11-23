import React, { useState } from 'react';
import { toast } from 'sleek-toast';
import { Pipeline, PipelineExecutionLog } from '../../types';

interface PipelineManagerProps {
  pipelines: Pipeline[];
}

export const PipelineManager: React.FC<PipelineManagerProps> = ({ pipelines: initialPipelines }) => {
  const [pipeline, setPipeline] = useState<Pipeline>(
    initialPipelines[0] || {
      id: 'pipe-etl-default',
      name: 'Telemetry Ingest & Mart ETL',
      description: 'Stream ingestion -> Validation -> Imputation -> Inference -> Warehouse Export',
      trigger: 'daily',
      cronSchedule: '0 0 * * *',
      status: 'idle',
      datasetId: 'ds-churn-enterprise',
      lastRunAt: '2026-11-20T00:00:00Z',
      lastRunDurationSec: 38.4,
      throughputRecsPerSec: 1450,
      steps: [
        { id: 'st-1', name: 'Micro-Batch Ingest', type: 'source', status: 'success', config: {} },
        { id: 'st-2', name: 'Schema Validator', type: 'validator', status: 'success', config: {} },
        { id: 'st-3', name: 'Feature Imputation', type: 'cleaner', status: 'success', config: {} },
        { id: 'st-4', name: 'Feature Store Sync', type: 'feature_store', status: 'success', config: {} },
        { id: 'st-5', name: 'Batch Inference', type: 'trainer', status: 'success', config: {} },
        { id: 'st-6', name: 'Warehouse Export', type: 'export', status: 'success', config: {} },
      ],
      logs: [
        { timestamp: '2026-11-20T00:00:01Z', level: 'info', stepId: 'st-1', message: 'Pulling micro-batch events from Kafka broker' },
        { timestamp: '2026-11-20T00:00:08Z', level: 'info', stepId: 'st-2', message: 'Validating 1,200 entities against schema contract' },
        { timestamp: '2026-11-20T00:00:16Z', level: 'info', stepId: 'st-3', message: 'Imputed 14 nulls and applied Standard Z-Score scaling' },
        { timestamp: '2026-11-20T00:00:25Z', level: 'info', stepId: 'st-4', message: 'Synced feature vectors to cache' },
        { timestamp: '2026-11-20T00:00:32Z', level: 'info', stepId: 'st-5', message: 'Batch scored with Random Forest: 18 high-risk items flagged' },
        { timestamp: '2026-11-20T00:00:38Z', level: 'success', stepId: 'st-6', message: 'Pipeline succeeded in 38.4s (1,450 records/sec)' },
      ],
    }
  );

  const [isRunning, setIsRunning] = useState(false);
  const [activeLogs, setActiveLogs] = useState<PipelineExecutionLog[]>(pipeline.logs);

  const handleRunPipeline = async () => {
    setIsRunning(true);
    toast.info('Triggered pipeline execution');

    const stepsToRun = [...pipeline.steps];
    stepsToRun.forEach((s) => (s.status = 'idle'));
    setPipeline((p) => ({ ...p, status: 'running', steps: [...stepsToRun] }));

    const newLogs: PipelineExecutionLog[] = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: 'st-start',
        message: 'Initiating pipeline execution DAG...',
      },
    ];
    setActiveLogs([...newLogs]);

    for (let i = 0; i < stepsToRun.length; i++) {
      stepsToRun[i].status = 'running';
      setPipeline((p) => ({ ...p, steps: [...stepsToRun] }));

      await new Promise((res) => setTimeout(res, 400));

      stepsToRun[i].status = 'success';
      const logEntry: PipelineExecutionLog = {
        timestamp: new Date().toISOString(),
        level: i === stepsToRun.length - 1 ? 'success' : 'info',
        stepId: stepsToRun[i].id,
        message: `Step [${stepsToRun[i].name}] completed. Processed 1,200 records.`,
      };
      newLogs.push(logEntry);
      setActiveLogs([...newLogs]);
      setPipeline((p) => ({ ...p, steps: [...stepsToRun] }));
    }

    const duration = Number((28 + Math.random() * 8).toFixed(1));
    const throughput = Math.round(1350 + Math.random() * 300);

    setPipeline((p) => ({
      ...p,
      status: 'completed',
      lastRunAt: new Date().toISOString(),
      lastRunDurationSec: duration,
      throughputRecsPerSec: throughput,
      logs: newLogs,
    }));

    setIsRunning(false);
    toast.success(`Pipeline completed in ${duration}s`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Pipeline Automation</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Orchestration DAGs and workflow schedules</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-zinc-500">Cron: Daily @ 00:00 UTC</span>
          <button
            type="button"
            disabled={isRunning}
            onClick={handleRunPipeline}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
          >
            {isRunning ? 'Executing DAG...' : 'Execute Now'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-zinc-200 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium flex items-center gap-1.5">
            Status
            <span className={`w-1.5 h-1.5 rounded-full ${pipeline.status === 'completed' || pipeline.status === 'idle' ? 'bg-emerald-500' : 'bg-blue-600 animate-pulse'}`} />
          </div>
          <div className="text-2xl font-bold font-mono text-zinc-900 mt-1 capitalize">{pipeline.status}</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Duration</div>
          <div className="text-2xl font-bold font-mono text-blue-600 mt-1">{pipeline.lastRunDurationSec}s</div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Throughput</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1">{pipeline.throughputRecsPerSec} <span className="text-xs font-normal text-zinc-500">recs/s</span></div>
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase text-zinc-500 font-medium">Sink Target</div>
          <div className="text-sm font-bold font-mono text-emerald-600 mt-2">Snowflake Mart</div>
        </div>
      </div>

      {/* Stages Flow */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Pipeline Stages (6)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {pipeline.steps.map((st, idx) => {
            const isRunningStage = st.status === 'running';
            const isSuccess = st.status === 'success';
            return (
              <div
                key={st.id}
                className={`p-3 rounded border text-xs flex flex-col justify-between space-y-2 transition-all ${
                  isRunningStage
                    ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/40 text-blue-900'
                    : isSuccess
                    ? 'border-emerald-200/80 bg-emerald-50/30 text-zinc-900'
                    : 'border-zinc-200 text-zinc-400 bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-zinc-500 font-medium">Stage {idx + 1}</span>
                    {isSuccess && <span className="text-emerald-600 font-bold">✓</span>}
                    {isRunningStage && <span className="text-blue-600 animate-spin">●</span>}
                  </div>
                  <div className="font-semibold text-zinc-900 text-[11px] mt-1 leading-tight">{st.name}</div>
                </div>
                <div className="text-[10px] font-mono uppercase text-zinc-500">
                  {st.type}
                </div>
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
          {activeLogs.map((log, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-zinc-400 shrink-0 text-[10px]">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span
                className={`shrink-0 uppercase text-[9px] font-semibold px-1 py-0.2 rounded border ${
                  log.level === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : log.level === 'warn'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {log.level}
              </span>
              <span className="text-zinc-800">{log.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
