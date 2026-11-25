import React, { useState } from 'react';
import { FiCopy, FiDownload, FiPrinter, FiX, FiTrash2 } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { Dataset, ExperimentRun, TrainedModel } from '../../types';
import { downloadBlob } from '../../utils/exportUtils';
import { api } from '../../services/api';

interface ExperimentReportsProps {
  dataset: Dataset | null;
  models: TrainedModel[];
  experiments: ExperimentRun[];
  onExperimentUpdated: (run: ExperimentRun) => void;
  onExperimentDeleted: (id: string) => void;
}

export const ExperimentReports: React.FC<ExperimentReportsProps> = ({
  dataset,
  models,
  experiments,
  onExperimentUpdated,
  onExperimentDeleted,
}) => {
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [reportFilename, setReportFilename] = useState<string>('dataforge_report.md');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleGenerateReport = async () => {
    if (!dataset) {
      toast.warning('Upload or select a dataset first');
      return;
    }

    setIsGenerating(true);
    try {
      const topModel = models.find((m) => m.datasetId === dataset.id) || models[0];
      const res = await api.reports.generate(dataset.id, topModel?.id);
      setReportMarkdown(res.markdown);
      setReportFilename(res.filename);
      setShowReportModal(true);
      toast.success('Generated audit report via API');
    } catch (err: any) {
      toast.error(err.message || 'Report generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTagChange = async (id: string, tag: string) => {
    try {
      const res = await api.experiments.updateTag(id, tag);
      onExperimentUpdated(res.run);
      toast.success(`Updated run tag to '${tag}'`);
    } catch (err: any) {
      toast.error(err.message || 'Tag update failed');
    }
  };

  const handleDeleteRun = async (id: string) => {
    try {
      await api.experiments.remove(id);
      onExperimentDeleted(id);
      toast.info('Removed experiment run');
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(reportMarkdown);
    toast.success('Copied to clipboard');
  };

  const handleDownloadMarkdown = () => {
    downloadBlob(reportMarkdown, reportFilename, 'text/markdown');
    toast.success('Downloaded report');
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Reports & Experiments</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Track real training runs and generate server-side technical audit reports
          </p>
        </div>

        <button
          type="button"
          disabled={isGenerating}
          onClick={handleGenerateReport}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-mono text-xs font-medium transition-colors cursor-pointer shadow-xs"
        >
          {isGenerating ? 'Compiling Report...' : 'Generate Audit Report'}
        </button>
      </div>

      {/* Experiments Ledger */}
      <div className="space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
          Experiment Runs ({experiments.length})
        </div>

        {experiments.length === 0 ? (
          <div className="py-12 text-center text-xs font-mono text-zinc-500 border border-zinc-200 rounded">
            No experiment runs recorded yet. Train a model in Model Studio to record metrics automatically.
          </div>
        ) : (
          <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Run ID</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Experiment</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Algorithm</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Score</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">F1 / MAE</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">AUC / RMSE</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Duration</th>
                  <th className="py-2.5 px-3 font-semibold text-zinc-900">Tag</th>
                  <th className="py-2.5 px-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {experiments.map((exp) => (
                  <tr key={exp.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-3 font-bold text-zinc-900">{exp.id}</td>
                    <td className="py-2 px-3 text-zinc-800">{exp.experimentName}</td>
                    <td className="py-2 px-3 text-zinc-500">{exp.algorithm}</td>
                    <td className="py-2 px-3 font-bold text-emerald-600">
                      {exp.metrics.accuracy !== undefined
                        ? `${(exp.metrics.accuracy * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td className="py-2 px-3 text-zinc-700">{exp.metrics.f1Score ?? '—'}</td>
                    <td className="py-2 px-3 text-indigo-600 font-semibold">
                      {exp.metrics.rocAuc ?? '—'}
                    </td>
                    <td className="py-2 px-3 text-zinc-500">{exp.durationSec}s</td>
                    <td className="py-2 px-3">
                      <select
                        value={exp.tag}
                        onChange={(e) => handleTagChange(exp.id, e.target.value)}
                        className={`uppercase text-[10px] font-semibold px-1.5 py-0.5 rounded border cursor-pointer focus:outline-none ${exp.tag === 'Production'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : exp.tag === 'Candidate'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                          }`}
                      >
                        <option value="Production">Production</option>
                        <option value="Candidate">Candidate</option>
                        <option value="Baseline">Baseline</option>
                        <option value="Archived">Archived</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteRun(exp.id)}
                        className="text-zinc-300 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete run"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full w-full bg-white border border-zinc-200 shadow-2xl p-6 text-zinc-900 max-h-[90vh] flex flex-col rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4">
              <h3 className="text-sm font-bold uppercase font-mono text-zinc-900 flex items-center gap-2">
                <span>Technical Data Audit Report</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-2.5 py-1 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-mono transition-colors bg-white hover:bg-zinc-50 cursor-pointer"
                >
                  <FiCopy className="inline mr-1 text-zinc-500" /> Copy
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs font-mono font-medium transition-colors shadow-xs cursor-pointer"
                >
                  <FiDownload className="inline mr-1" /> Download
                </button>
                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="px-2.5 py-1 rounded border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-xs font-mono transition-colors bg-white hover:bg-zinc-50 cursor-pointer"
                >
                  <FiPrinter className="inline mr-1 text-zinc-500" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 ml-1 transition-colors cursor-pointer"
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
