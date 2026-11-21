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
          <h1 className="text-xl font-bold tracking-tight text-black">Reports & Experiments</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Experiment parameter tracking and report generation</p>
        </div>

        <button
          type="button"
          onClick={handleGenerateReport}
          className="px-4 py-2 bg-black hover:bg-zinc-800 text-white font-mono text-xs transition-colors cursor-pointer"
        >
          Generate Report
        </button>
      </div>

      {/* Experiments Ledger */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Experiment Runs ({experiments.length})
        </div>

        <div className="border-t border-black overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-[11px]">
                <th className="py-2.5 px-3 font-medium text-black">Run ID</th>
                <th className="py-2.5 px-3 font-medium text-black">Experiment</th>
                <th className="py-2.5 px-3 font-medium text-black">Algorithm</th>
                <th className="py-2.5 px-3 font-medium text-black">Accuracy</th>
                <th className="py-2.5 px-3 font-medium text-black">F1</th>
                <th className="py-2.5 px-3 font-medium text-black">ROC-AUC</th>
                <th className="py-2.5 px-3 font-medium text-black">Duration</th>
                <th className="py-2.5 px-3 font-medium text-black">Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {experiments.map((exp) => (
                <tr key={exp.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="py-2 px-3 font-bold text-black">{exp.id}</td>
                  <td className="py-2 px-3 text-zinc-800">{exp.experimentName}</td>
                  <td className="py-2 px-3 text-zinc-500">{exp.algorithm}</td>
                  <td className="py-2 px-3 font-bold text-black">
                    {exp.metrics.accuracy ? `${(exp.metrics.accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-2 px-3 text-zinc-700">{exp.metrics.f1Score ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-700">{exp.metrics.rocAuc ?? '—'}</td>
                  <td className="py-2 px-3 text-zinc-400">{exp.durationSec}s</td>
                  <td className="py-2 px-3 uppercase text-[10px] text-zinc-600">
                    {exp.tag}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-3xl bg-white border border-zinc-300 shadow-xl p-6 text-zinc-900 max-h-[90vh] flex flex-col rounded-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="text-sm font-bold uppercase font-mono text-black">
                Technical Data Audit Report
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-2.5 py-1 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
                >
                  <FiCopy className="inline mr-1" /> Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 bg-black text-white hover:bg-zinc-800 text-xs font-mono transition-colors"
                >
                  <FiDownload className="inline mr-1" /> Download
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-2.5 py-1 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
                >
                  <FiPrinter className="inline mr-1" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 text-zinc-400 hover:text-black ml-1"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 border border-zinc-200 font-mono text-xs text-zinc-800 leading-relaxed whitespace-pre-wrap select-all">
              {reportMarkdown}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
