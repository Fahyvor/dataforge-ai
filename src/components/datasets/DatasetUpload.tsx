import React, { useState, useRef } from 'react';
import { FiUpload, FiArrowRight } from 'react-icons/fi';
import * as XLSX from 'xlsx';
import { toast } from 'sleek-toast';
import { Dataset } from '../../types';
import { inferSchema, validateDataset } from '../../utils/dataEngine';
import { INITIAL_DATASETS } from '../../data/sampleDatasets';

interface DatasetUploadProps {
  onDatasetCreated: (dataset: Dataset) => void;
  onSelectDataset: (id: string) => void;
}

export const DatasetUpload: React.FC<DatasetUploadProps> = ({
  onDatasetCreated,
  onSelectDataset,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setIsProcessing(true);
    const filename = file.name;
    const lower = filename.toLowerCase();

    try {
      let format: 'csv' | 'json' | 'xlsx' = 'csv';
      let rows: any[] = [];

      if (lower.endsWith('.json')) {
        format = 'json';
        const text = await file.text();
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        format = 'xlsx';
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      } else {
        format = 'csv';
        const text = await file.text();
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      }

      if (!rows || rows.length === 0) {
        toast.error('The uploaded file contains no readable records');
        setIsProcessing(false);
        return;
      }

      const columns = inferSchema(rows);
      const dsId = `ds-${Date.now().toString(36)}`;
      const validation = validateDataset(dsId, rows, columns);

      const name = datasetName.trim() || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const newDataset: Dataset = {
        id: dsId,
        name,
        description: datasetDescription.trim() || `Uploaded ${format.toUpperCase()} dataset with ${rows.length} records.`,
        format,
        sizeBytes: file.size,
        rowCount: rows.length,
        columnCount: columns.length,
        columns,
        rows,
        currentVersion: 'v1.0',
        tags: ['Uploaded', format.toUpperCase()],
        qualityScore: validation.qualityScore,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        versions: [
          {
            versionId: `ver-${Date.now().toString(36)}`,
            versionTag: 'v1.0',
            description: 'Raw ingested file upload',
            author: 'Engineer',
            createdAt: new Date().toISOString(),
            rowCount: rows.length,
            columnCount: columns.length,
            qualityScore: validation.qualityScore,
            dataHash: `sha256:${Date.now().toString(16)}`,
            changesSummary: [`Ingested ${rows.length} rows`, `Inferred ${columns.length} columns`],
          },
        ],
      };

      onDatasetCreated(newDataset);
      toast.success(`Uploaded: ${newDataset.name} (${rows.length} rows)`);
      setDatasetName('');
      setDatasetDescription('');
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message || 'Check file format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-black">Upload Dataset</h1>
        <p className="text-xs text-zinc-500 mt-1">
          Supports CSV, JSON, and Excel (.xlsx) formats. Schemas are inferred automatically.
        </p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-12 border-2 border-dashed rounded-lg transition-all cursor-pointer text-center space-y-3 ${
          isDragging
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
          {isProcessing ? 'Processing records and inferring schema...' : 'Drop files here or click to browse'}
        </div>
        <p className="text-[11px] text-zinc-500 font-mono">
          CSV, JSON, XLSX up to 50MB
        </p>
      </div>

      {/* Optional Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <div>
          <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
            Dataset Name (Optional)
          </label>
          <input
            type="text"
            placeholder="Dataset Name"
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
            placeholder="Description or Source"
            value={datasetDescription}
            onChange={(e) => setDatasetDescription(e.target.value)}
            className="w-full px-3 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Sample Datasets */}
      <div className="space-y-3 pt-6 border-t border-zinc-200">
        <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-bold">
          Sample Datasets
        </div>

        <div className="border border-zinc-200 rounded divide-y divide-zinc-100 overflow-hidden">
          {INITIAL_DATASETS.map((ds) => (
            <div
              key={ds.id}
              className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50/70 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900">{ds.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-blue-200 bg-blue-50 text-blue-700 uppercase font-medium">
                    {ds.format}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                  {ds.rowCount} rows · {ds.columnCount} columns · Quality: <span className="text-emerald-600 font-semibold">{ds.qualityScore}%</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onSelectDataset(ds.id)}
                className="px-3 py-1 rounded border border-zinc-200 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50/50 text-zinc-700 text-xs font-mono transition-colors"
              >
                Load
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
