import React, { useState } from 'react';
import { toast } from 'sleek-toast';
import { SqlQueryResult, WarehouseConnection } from '../../types';

export const WarehouseExplorer: React.FC = () => {
  const [connections] = useState<WarehouseConnection[]>([
    {
      id: 'conn-pg',
      name: 'PostgreSQL Replica',
      type: 'postgresql',
      host: 'pg-prod-replica.aws.internal',
      port: 5432,
      database: 'enterprise_data_lake',
      status: 'connected',
      latencyMs: 7.8,
      tablesCount: 48,
      storageGb: 320.4,
    },
    {
      id: 'conn-ch',
      name: 'ClickHouse OLAP',
      type: 'clickhouse',
      host: 'ch-cluster.internal.net',
      port: 8123,
      database: 'telemetry_analytics',
      status: 'connected',
      latencyMs: 3.2,
      tablesCount: 16,
      storageGb: 1840.0,
    },
    {
      id: 'conn-sf',
      name: 'Snowflake Warehouse',
      type: 'snowflake',
      host: 'xy12345.snowflakecomputing.com',
      port: 443,
      database: 'FINANCIAL_RISK_DB',
      status: 'connected',
      latencyMs: 24.5,
      tablesCount: 84,
      storageGb: 4200.5,
    },
    {
      id: 'conn-duck',
      name: 'DuckDB Scratchpad',
      type: 'duckdb',
      host: 'localhost:memory',
      port: 0,
      database: 'in_memory_cache',
      status: 'connected',
      latencyMs: 0.4,
      tablesCount: 6,
      storageGb: 1.2,
    },
  ]);

  const [selectedConn, setSelectedConn] = useState<string>('conn-sf');
  const [queryText, setQueryText] = useState<string>(
    `SELECT \n  SubscriptionTier,\n  COUNT(*) AS TotalSubscribers,\n  ROUND(AVG(MonthlyCharges), 2) AS AvgMonthlyRevenue,\n  ROUND(AVG(UsageHoursWeekly), 1) AS AvgUsageHours,\n  SUM(Churn) AS ChurnedCount\nFROM prod_marts.customer_telemetry\nGROUP BY SubscriptionTier\nORDER BY AvgMonthlyRevenue DESC;`
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<SqlQueryResult>({
    query: '',
    executionTimeMs: 28,
    rowsAffected: 3,
    columns: ['SubscriptionTier', 'TotalSubscribers', 'AvgMonthlyRevenue', 'AvgUsageHours', 'ChurnedCount'],
    rows: [
      ['Enterprise', 1420, 264.5, 46.2, 38],
      ['Professional', 4890, 122.8, 29.4, 184],
      ['Starter', 9450, 51.2, 8.6, 1240],
    ],
    bytesScannedKb: 412,
  });

  const handleExecuteSql = async () => {
    setIsExecuting(true);
    await new Promise((res) => setTimeout(res, 350));

    const upper = queryText.toUpperCase();
    let cols = ['id', 'metric', 'value', 'timestamp'];
    let rows: any[][] = [
      ['MET-1', 'daily_active_users', 14200, '2026-11-20 00:00:00'],
      ['MET-2', 'arr_run_rate_usd', 4280000, '2026-11-20 00:00:00'],
      ['MET-3', 'churn_rate_pct', 2.14, '2026-11-20 00:00:00'],
    ];

    if (upper.includes('GROUP BY') || upper.includes('SUBSCRIPTIONTIER')) {
      cols = ['SubscriptionTier', 'TotalSubscribers', 'AvgMonthlyRevenue', 'AvgUsageHours', 'ChurnedCount'];
      rows = [
        ['Enterprise', 1420, 264.5, 46.2, 38],
        ['Professional', 4890, 122.8, 29.4, 184],
        ['Starter', 9450, 51.2, 8.6, 1240],
      ];
    } else if (upper.includes('WHERE') || upper.includes('CHURN')) {
      cols = ['CustomerID', 'TenureMonths', 'MonthlyCharges', 'SupportTickets', 'ChurnProbability'];
      rows = [
        ['CUST-1002', 3, 49.0, 6, 0.88],
        ['CUST-1004', 8, 49.0, 4, 0.79],
        ['CUST-1006', 2, 49.0, 7, 0.91],
        ['CUST-1011', 12, 240.0, 4, 0.65],
      ];
    }

    const duration = Math.round(18 + Math.random() * 25);
    setQueryResult({
      query: queryText,
      executionTimeMs: duration,
      rowsAffected: rows.length,
      columns: cols,
      rows,
      bytesScannedKb: Math.round(180 + Math.random() * 300),
    });

    setIsExecuting(false);
    toast.success(`Returned ${rows.length} rows in ${duration}ms`);
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-black">Data Warehouse & SQL</h1>
        <p className="text-xs text-zinc-500 mt-0.5">Database connectivity and query console</p>
      </div>

      {/* Connections List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {connections.map((conn) => (
          <div
            key={conn.id}
            onClick={() => setSelectedConn(conn.id)}
            className={`p-3 border text-xs cursor-pointer transition-colors space-y-1 ${
              selectedConn === conn.id
                ? 'border-black bg-white'
                : 'border-zinc-200 hover:border-zinc-400 bg-white'
            }`}
          >
            <div className="font-semibold text-black">{conn.name}</div>
            <div className="text-[11px] font-mono text-zinc-400 truncate">{conn.host}</div>
            <div className="pt-2 text-[10px] font-mono text-zinc-500 flex justify-between">
              <span className="uppercase font-semibold">{conn.type}</span>
              <span>{conn.latencyMs}ms</span>
            </div>
          </div>
        ))}
      </div>

      {/* SQL Editor */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-semibold uppercase tracking-wider text-black">
            Query Editor
          </span>
          <span className="text-zinc-500">
            Latency: {queryResult.executionTimeMs}ms · Scanned: {queryResult.bytesScannedKb}KB
          </span>
        </div>

        <textarea
          rows={5}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
          placeholder="SELECT * FROM table..."
          className="w-full p-3 border border-zinc-300 text-xs font-mono text-black placeholder-zinc-400 focus:outline-none focus:border-black resize-y"
        />

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isExecuting}
            onClick={handleExecuteSql}
            className="px-4 py-1.5 bg-black hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-mono font-medium transition-colors cursor-pointer"
          >
            {isExecuting ? 'Running...' : 'Execute Query'}
          </button>
        </div>
      </div>

      {/* Query Results */}
      <div className="space-y-2">
        <div className="text-xs font-mono uppercase tracking-wider text-black font-semibold">
          Results ({queryResult.rows.length} rows)
        </div>

        <div className="border-t border-black overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-zinc-200 text-zinc-500 text-[11px]">
                {queryResult.columns.map((col) => (
                  <th key={col} className="py-2 px-3 font-medium text-black">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-[11px]">
              {queryResult.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                  {row.map((val: any, cIdx: number) => (
                    <td key={cIdx} className="py-2 px-3 text-zinc-800">
                      {String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
