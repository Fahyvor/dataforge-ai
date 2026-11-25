import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2, FiDatabase } from 'react-icons/fi';
import { toast } from 'sleek-toast';
import { SqlQueryResult, WarehouseConnection, WarehouseTable } from '../../types';
import { api } from '../../services/api';

export const WarehouseExplorer: React.FC = () => {
  const [connections, setConnections] = useState<WarehouseConnection[]>([]);
  const [tables, setTables] = useState<WarehouseTable[]>([]);
  const [selectedConn, setSelectedConn] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Add connection form
  const [connName, setConnName] = useState('');
  const [connType, setConnType] = useState<WarehouseConnection['type']>('duckdb');
  const [connHost, setConnHost] = useState('localhost');
  const [connDatabase, setConnDatabase] = useState('workspace_db');

  // SQL query state
  const [queryText, setQueryText] = useState<string>('SHOW TABLES;');
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.warehouse.listConnections(), api.warehouse.listTables()])
      .then(([connRes, tblRes]) => {
        setConnections(connRes.connections);
        setTables(tblRes.tables);
        if (connRes.connections.length > 0) {
          setSelectedConn(connRes.connections[0].id);
        } else {
          setShowAddForm(true);
        }
        if (tblRes.tables.length > 0) {
          setQueryText(`SELECT * FROM ${tblRes.tables[0].tableName} LIMIT 25;`);
        }
      })
      .catch((err) => toast.error(err.message || 'Failed to load warehouse state'));
  }, []);

  const handleAddConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connName.trim() || !connDatabase.trim()) {
      toast.warning('Provide a connection name and database');
      return;
    }

    try {
      const res = await api.warehouse.createConnection({
        name: connName.trim(),
        type: connType,
        host: connHost.trim() || 'localhost',
        database: connDatabase.trim(),
      });
      setConnections([res.connection, ...connections]);
      setSelectedConn(res.connection.id);
      setShowAddForm(false);
      setConnName('');
      toast.success(`Registered connection '${res.connection.name}'`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to add connection');
    }
  };

  const handleDeleteConnection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.warehouse.removeConnection(id);
      const next = connections.filter((c) => c.id !== id);
      setConnections(next);
      if (selectedConn === id) setSelectedConn(next[0]?.id || '');
      toast.info('Connection removed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove connection');
    }
  };

  const handleExecuteSql = async () => {
    setIsExecuting(true);
    setQueryError(null);
    try {
      const res = await api.warehouse.query(queryText, selectedConn || undefined);
      setQueryResult(res.result);
      toast.success(`Returned ${res.result.rowsAffected} rows in ${res.result.executionTimeMs}ms`);
    } catch (err: any) {
      setQueryError(err.message || 'Query execution error');
      toast.error(err.message || 'SQL execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900">Data Warehouse & SQL</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Register SQL targets and query your uploaded datasets directly via /api/warehouse/query
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
        >
          <FiPlus className="w-3.5 h-3.5" />
          <span>{showAddForm && connections.length > 0 ? 'Close' : 'Add Connection'}</span>
        </button>
      </div>

      {/* Add Connection Form */}
      {(showAddForm || connections.length === 0) && (
        <form onSubmit={handleAddConnection} className="border border-zinc-200 rounded-lg p-5 space-y-4 bg-white">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-900">
            Configure SQL Engine Connection
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                Connection Label
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Local Analytics"
                value={connName}
                onChange={(e) => setConnName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                Engine Type
              </label>
              <select
                value={connType}
                onChange={(e) => setConnType(e.target.value as WarehouseConnection['type'])}
                className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-none focus:border-blue-500 font-mono cursor-pointer"
              >
                <option value="duckdb">DuckDB (In-Memory)</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="clickhouse">ClickHouse</option>
                <option value="snowflake">Snowflake</option>
                <option value="bigquery">BigQuery</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                Host / Endpoint
              </label>
              <input
                type="text"
                value={connHost}
                onChange={(e) => setConnHost(e.target.value)}
                placeholder="localhost"
                className="w-full px-2.5 py-1.5 rounded border border-zinc-200 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-mono uppercase text-zinc-500 block mb-1">
                Database Name
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={connDatabase}
                  onChange={(e) => setConnDatabase(e.target.value)}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded border border-zinc-200 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-mono font-medium cursor-pointer shrink-0"
                >
                  Connect
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Connections List */}
      {connections.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {connections.map((conn) => (
            <div
              key={conn.id}
              onClick={() => setSelectedConn(conn.id)}
              className={`p-3.5 rounded border text-xs cursor-pointer transition-all space-y-1.5 relative group ${selectedConn === conn.id
                  ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/40 shadow-xs'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-zinc-900 truncate">{conn.name}</span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Connected" />
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConnection(conn.id, e)}
                    className="text-zinc-300 hover:text-rose-600 transition-colors cursor-pointer"
                    title="Remove connection"
                  >
                    <FiTrash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="text-[11px] font-mono text-zinc-500 truncate">
                {conn.host} · {conn.database}
              </div>
              <div className="pt-1 text-[10px] font-mono text-zinc-500 flex justify-between border-t border-zinc-100">
                <span className="uppercase font-semibold text-blue-700">{conn.type}</span>
                <span className="text-emerald-600 font-semibold">{conn.latencyMs}ms</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Registered Queryable Tables */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold flex items-center gap-1.5">
            <FiDatabase className="text-blue-600" />
            <span>Queryable Tables ({tables.length})</span>
          </div>
          {tables.length === 0 && (
            <Link to="/upload" className="text-xs font-mono text-blue-600 hover:underline">
              + Upload Dataset to Expose SQL Table
            </Link>
          )}
        </div>

        {tables.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tables.map((tbl) => (
              <button
                key={tbl.id}
                type="button"
                onClick={() => setQueryText(`SELECT * FROM ${tbl.tableName} LIMIT 25;`)}
                className="px-2.5 py-1.5 rounded border border-zinc-200 hover:border-blue-400 bg-zinc-50/70 hover:bg-blue-50/40 text-xs font-mono text-zinc-800 cursor-pointer transition-colors"
              >
                <span className="font-semibold text-blue-700">{tbl.tableName}</span>{' '}
                <span className="text-zinc-400 text-[10px]">
                  ({tbl.rowCount} rows · {tbl.columns.length} cols)
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* SQL Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-zinc-900">Query Editor</span>
          {queryResult && (
            <span className="text-zinc-500">
              Latency: <strong className="text-emerald-600">{queryResult.executionTimeMs}ms</strong> ·
              Scanned: <strong className="text-blue-600">{queryResult.bytesScannedKb}KB</strong>
            </span>
          )}
        </div>

        <textarea
          rows={5}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="SELECT * FROM your_table_name WHERE ... ORDER BY ... LIMIT 25;"
          className="w-full p-3 rounded border border-zinc-200 text-xs font-mono text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-y bg-white"
        />

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isExecuting}
            onClick={handleExecuteSql}
            className="px-4 py-1.5 rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-mono font-medium transition-colors cursor-pointer shadow-xs"
          >
            {isExecuting ? 'Executing Query...' : 'Execute Query'}
          </button>
        </div>
      </div>

      {queryError && (
        <div className="p-3.5 rounded border border-rose-200 bg-rose-50/50 text-xs font-mono text-rose-700">
          {queryError}
        </div>
      )}

      {/* Query Results */}
      {queryResult && !queryError && (
        <div className="space-y-2">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-900 font-semibold">
            Results ({queryResult.rows.length} rows)
          </div>

          <div className="border border-zinc-200 rounded overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/80 text-zinc-500 text-[11px]">
                  {queryResult.columns.map((col) => (
                    <th key={col} className="py-2.5 px-3 font-semibold text-zinc-900 whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-[11px]">
                {queryResult.rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(1, queryResult.columns.length)}
                      className="py-6 text-center text-zinc-400"
                    >
                      Query matched 0 rows.
                    </td>
                  </tr>
                ) : (
                  queryResult.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                      {row.map((val: any, cIdx: number) => (
                        <td key={cIdx} className="py-2 px-3 text-zinc-800 whitespace-nowrap">
                          {val === null || val === undefined ? (
                            <span className="text-amber-600 italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
