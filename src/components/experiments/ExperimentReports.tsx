import React, { useState } from 'react';
import { FiCopy, FiDownload, FiPrinter, FiX } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { Dataset, ExperimentRun, TrainedModel } from '../../types';
import { downloadBlob, generateMarkdownReport } from '../../utils/exportUtils';
import { generateEdaReport } from '../../utils/dataEngine';

interface ExperimentReportsProps {
  dataset: Dataset | null;
  models: TrainedModel[];
  experiments: ExperimentRun[];
}

export const ExperimentReports: React.FC<ExperimentReportsProps> = ({
  dataset,
  models,
  experiments: initialExperiments,
}) => {
  const [experiments] = useState<ExperimentRun[]>([
    ...initialExperiments,
    {
      id: 'run-914',
      experimentName: 'Customer Retention Analysis',
      runName: 'rf_depth14_estimators250',
      modelId: 'mdl-baseline-rf',
      algorithm: 'Random Forest',
      metrics: { accuracy: 0.944, f1Score: 0.941, rocAuc: 0.968 },
      parameters: { nEstimators: 250, maxDepth: 14, testSplit: 0.2 },
      durationSec: 3.1,
      author: 'Lead Engineer',
      createdAt: '2026-11-20T16:00:00Z',
      tag: 'Candidate',
    },
    {
      id: 'run-905',
      experimentName: 'Customer Retention Analysis',
      runName: 'mlp_epochs100_lr0.01',
      modelId: 'mdl-mlp',
      algorithm: 'Multi-Layer Perceptron (MLP)',
      metrics: { accuracy: 0.912, f1Score: 0.908, rocAuc: 0.935 },
      parameters: { hiddenLayers: [128, 64], lr: 0.01 },
      durationSec: 5.8,
      author: 'Data Scientist',
      createdAt: '2026-11-19T14:20:00Z',
      tag: 'Baseline',
    },
  ]);

  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  const handleGenerateReport = () => {
    if (!dataset) {
      toast.warning('Select a dataset first');
      return;
    }

    const eda = generateEdaReport(dataset.id, dataset.rows, dataset.columns);
    const topModel = models[0] || null;
    const md = generateMarkdownReport(dataset, eda, topModel);
    setReportMarkdown(md);
    setShowReportModal(true);
    toast.success('Generated report');
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(reportMarkdown);
    toast.success('Copied to clipboard');
  };

  const handleDownloadMarkdown = () => {
    if (!dataset) return;
    downloadBlob(
      reportMarkdown,
      `dataforge_${dataset.name.toLowerCase().replace(/\s+/g, '_')}_report.md`,
      'text/markdown'
    );
    toast.success('Downloaded report');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Reports & Experiments</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Statistical experiment tracking, model promotion, and technical audits</p>
        </div>

        <button
          type="button"
          onClick={handleGenerateReport}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-medium transition-colors cursor-pointer shadow-xs"
        >
          Generate Audit Report
        </button>
      </div>

      {/* Experiments Ledger */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Experiment Runs ({experiments.length})
        </div>

        <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Run ID</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Experiment</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Algorithm</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Accuracy</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">F1</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">ROC-AUC</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Duration</th>
                <th className="py-2.5 px-3 font-semibold text-zinc-900">Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-2 px-3 font-bold text-zinc-900">{exp.id}</td>
                  <td className="py-2 px-3 text-zinc-800">{exp.experimentName}</td>
                  <td className="py-2 px-3 text-zinc-500">{exp.algorithm}</td>
                  <td className="py-2 px-3 font-bold text-emerald-600">
                    {exp.metrics.accuracy ? `${(exp.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 px-3 text-zinc-700">{exp.metrics.f1Score ?? '—'}</td>
                  <td className="py-2 px-3 text-indigo-600 font-semibold">{exp.metrics.rocAuc ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-500">{exp.durationSec}s</td>
                  <td className="py-2 px-3">
                    <span
                      className={`uppercase text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
                        exp.tag === 'Production'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : exp.tag === 'Candidate'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      {exp.tag}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white border border-zinc-200 shadow-2xl p-6 text-zinc-900 max-h-[90vh] flex flex-col rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="text-sm font-bold uppercase font-mono text-zinc-900 flex items-center gap-2">
                <span>Technical Data Audit Report</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-2.5 py-1 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-mono transition-colors bg-white hover:bg-zinc-50"
                >
                  <FiCopy className="inline mr-1 text-zinc-500" /> Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-mono font-medium transition-colors shadow-xs"
                >
                  <FiDownload className="inline mr-1" /> Download
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-2.5 py-1 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-mono transition-colors bg-white hover:bg-zinc-50"
                >
                  <FiPrinter className="inline mr-1 text-zinc-500" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 ml-1 transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 rounded border border-zinc-200 bg-zinc-50/50 font-mono text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap select-all">
              {reportMarkdown}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
