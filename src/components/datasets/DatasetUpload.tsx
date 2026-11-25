import React, { useState, useRef } from 'react';
import { FiUpload, FiFileText } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { Dataset } from '../../types';
import { api } from '../../services/api';

interface DatasetUploadProps {
  onDatasetCreated: (dataset: Dataset) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({ onDatasetCreated }) => {
  const [mode, setMode] = useState<'file' | 'raw'>('file');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');

  // Raw ingest state
  const [rawFormat, setRawFormat] = useState<'csv' | 'json'>('csv');
  const [rawText, setRawText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const res = await api.datasets.uploadFile(file, datasetName, datasetDescription);
      onDatasetCreated(res.dataset);
      toast.success(`Ingested '${res.dataset.name}' (${res.dataset.rowCount} rows)`);
      setDatasetName('');
      setDatasetDescription('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to ingest file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) {
      toast.warning('Paste CSV or JSON records first');
      return;
    }

    setIsProcessing(true);
    try {
      const name = datasetName.trim() || `custom_${rawFormat}_${Date.now().toString(36).slice(-4)}`;
      const res = await api.datasets.uploadRaw({
        name,
        description: datasetDescription.trim() || undefined,
        format: rawFormat,
        rawText: rawText.trim(),
      });
      onDatasetCreated(res.dataset);
      toast.success(`Created '${res.dataset.name}' (${res.dataset.rowCount} rows)`);
      setDatasetName('');
      setDatasetDescription('');
      setRawText('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to parse raw records');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Ingest Dataset</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Upload CSV, JSON, or Excel files, or paste structured records directly to the backend API.
          </p>
        </div>

        <div className="flex items-center gap-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${mode === 'file'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white'
              }`}
          >
            File Upload
          </button>
          <button
            type="button"
            onClick={() => setMode('raw')}
            className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${mode === 'raw'
                ? 'bg-blue-600 text-white font-medium shadow-xs'
                : 'border border-zinc-200 text-zinc-600 hover:border-zinc-300 bg-white'
              }`}
          >
            Paste CSV / JSON
          </button>
        </div>
      </div>

      {/* Metadata fields shared across both modes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
            Dataset Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. sensor_readings_q4"
            value={datasetName}
            onChange={(e) => setDatasetName(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
            Description (Optional)
          </label>
          <input
            type="text"
            placeholder="Source or schema notes"
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {mode === 'file' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer text-center space-y-3 ${isDragging
              ? 'border-blue-500 bg-blue-50/40 scale-[1.005]'
              : 'border-zinc-200 hover:border-blue-400 bg-white hover:bg-zinc-50/40'
            }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".csv,.json,.xlsx,.xls"
            className="hidden"
          />

          <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FiUpload className="w-5 h-5" />
          </div>

          <div className="text-xs font-mono font-medium text-zinc-900">
            {isProcessing
              ? 'Uploading & inferring schema on server...'
              : 'Drop CSV, JSON, or XLSX files here, or click to browse'}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">
            Supports up to 25MB · Schema and quality score calculated via POST /api/datasets/upload
          </p>
        </div>
      ) : (
        <form onSubmit={handleRawSubmit} className="space-y-4 border border-zinc-200 rounded-lg p-5 bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-900">
              <FiFileText className="text-blue-600" />
              <span>Raw Structured Input</span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-zinc-500">Format:</span>
              <select
                value={rawFormat}
                onChange={(e) => setRawFormat(e.target.value as 'csv' | 'json')}
                className="border border-zinc-200 rounded px-2 py-1 text-xs text-zinc-900 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="csv">CSV (header + rows)</option>
                <option value="json">JSON (array of objects)</option>
              </select>
            </div>
          </div>

          <textarea
            rows={9}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={
              rawFormat === 'csv'
                ? 'id,amount,category,churn\n1,120.5,pro,0\n2,45.0,starter,1'
                : '[\n  { "id": 1, "amount": 120.5, "category": "pro", "churn": 0 },\n  { "id": 2, "amount": 45.0, "category": "starter", "churn": 1 }\n]'
            }
            className="w-full p-3 rounded border border-zinc-200 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
            >
              {isProcessing ? 'Ingesting...' : 'Create Dataset'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
