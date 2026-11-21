import React, { useState } from 'react';
import { FiSearch, FiDownload } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { Dataset } from '../../types';
import { exportDatasetToCsv, exportDatasetToJson } from '../../utils/exportUtils';

interface DatasetViewerProps {
  dataset: Dataset | null;
  onNavigateTab?: (tab: any) => void;
}

export const DatasetViewer: React.FC<DatasetViewerProps> = ({ dataset, onNavigateTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumnFilter, setSelectedColumnFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  if (!dataset) {
    return (
      <div className="py-20 text-center">
        <h3 className="text-sm font-semibold text-black">No Dataset Selected</h3>
        <p className="text-xs text-zinc-500 mt-1">Select a dataset from the top navigation to view records.</p>
      </div>
    );
  }

  const filteredRows = dataset.rows.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    if (selectedColumnFilter !== 'ALL') {
      const val = row[selectedColumnFilter];
      return String(val ?? '').toLowerCase().includes(term);
    }
    return Object.values(row).some((val) => String(val ?? '').toLowerCase().includes(term));
  });

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCsv = () => {
    exportDatasetToCsv(dataset);
    toast.success(`Exported CSV`);
  };

  const handleExportJson = () => {
    exportDatasetToJson(dataset);
    toast.success(`Exported JSON`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Bar */}
      <div className="border-b border-zinc-200 pb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-black">{dataset.name}</h1>
            <span className="text-[11px] font-mono px-1.5 py-0.5 border border-zinc-300 text-zinc-700 uppercase">
              {dataset.format}
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              {dataset.currentVersion}
            </span>
          </div>
          <p className="text-xs text-zinc-600 mt-1 max-w-2xl">{dataset.description}</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-zinc-400">Rows:</span>{' '}
            <span className="font-bold text-black">{dataset.rowCount}</span>
          </div>
          <div>
            <span className="text-zinc-400">Columns:</span>{' '}
            <span className="font-bold text-black">{dataset.columnCount}</span>
          </div>
          <div>
            <span className="text-zinc-400">Quality:</span>{' '}
            <span className="font-bold text-black">{dataset.qualityScore}%</span>
          </div>

          <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-200">
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-2.5 py-1 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
            >
              CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="px-2.5 py-1 border border-zinc-300 hover:border-black text-black text-xs font-mono transition-colors"
            >
              JSON
            </button>
          </div>
        </div>
      </div>

      {/* Schema Columns */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider shrink-0">Schema:</span>
        {dataset.columns.map((col) => (
          <div
            key={col.name}
            className="flex items-center gap-1 px-2 py-0.5 border border-zinc-200 text-[11px] shrink-0 font-mono text-zinc-700"
          >
            <span className="font-medium text-black">{col.name}</span>
            <span className="text-zinc-400">({col.type})</span>
            {col.nullable && <span className="text-zinc-400">*</span>}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <FiSearch className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 border border-zinc-300 text-xs text-black placeholder-zinc-400 focus:outline-none focus:border-black"
            />
          </div>

          <select
            value={selectedColumnFilter}
            onChange={(e) => {
              setSelectedColumnFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-zinc-300 text-zinc-700 text-xs px-2 py-1.5 focus:outline-none focus:border-black cursor-pointer font-mono"
          >
            <option value="ALL">All Columns</option>
            {dataset.columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-zinc-500">
          <span>
            {filteredRows.length} of {dataset.rowCount}
          </span>
          <div className="flex items-center gap-1 border-l border-zinc-200 pl-3">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border border-zinc-300 hover:border-black disabled:opacity-30 cursor-pointer text-black"
            >
              Prev
            </button>
            <span className="px-1 text-black">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2 py-1 border border-zinc-300 hover:border-black disabled:opacity-30 cursor-pointer text-black"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Ruled Data Table */}
      <div className="border-t border-black overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 font-mono text-[11px]">
              <th className="py-2.5 px-3 font-normal text-zinc-400 w-10 text-center">#</th>
              {dataset.columns.map((col) => (
                <th key={col.name} className="py-2.5 px-3 font-medium text-black whitespace-nowrap">
                  <span>{col.name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-mono text-[11px]">
            {paginatedRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-zinc-50 transition-colors">
                <td className="py-2 px-3 text-zinc-400 text-center text-[10px]">
                  {(currentPage - 1) * pageSize + rIdx + 1}
                </td>
                {dataset.columns.map((col) => {
                  const val = row[col.name];
                  const isNull = val === null || val === undefined || val === '';
                  return (
                    <td
                      key={col.name}
                      className={`py-2 px-3 whitespace-nowrap ${
                        isNull ? 'text-zinc-400 italic' : 'text-zinc-800'
                      }`}
                    >
                      {isNull ? 'null' : String(val)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
