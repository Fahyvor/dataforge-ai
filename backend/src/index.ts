import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { INITIAL_DATASETS } from './sampleData.js';
import { Dataset, Pipeline, TrainedModel, WarehouseConnection, ExperimentRun } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const publicPath = path.resolve(process.cwd(), 'public');

// In-memory persistent stores
let datasets: Dataset[] = [...INITIAL_DATASETS];
let trainedModels: TrainedModel[] = [
  {
    id: 'mdl-baseline-rf',
    name: 'Random Forest Churn Predictor',
    taskType: 'classification',
    algorithm: 'Random Forest',
    datasetId: 'ds-churn-enterprise',
    datasetName: 'Customer Churn & LTV Telemetry',
    targetFeature: 'Churn',
    predictorFeatures: ['TenureMonths', 'MonthlyCharges', 'SupportTickets', 'UsageHoursWeekly', 'Age'],
    hyperparameters: { nEstimators: 150, maxDepth: 12, testSplitRatio: 0.2, randomSeed: 42 },
    metrics: { accuracy: 0.938, precision: 0.921, recall: 0.945, f1Score: 0.933, rocAuc: 0.962, trainingTimeSec: 2.14, inferenceLatencyMs: 1.8 },
    confusionMatrix: { labels: ['Retained (0)', 'Churned (1)'], matrix: [[28, 2], [1, 14]] },
    featureImportance: [
      { feature: 'SupportTickets', importance: 0.384 },
      { feature: 'UsageHoursWeekly', importance: 0.265 },
      { feature: 'MonthlyCharges', importance: 0.178 },
      { feature: 'TenureMonths', importance: 0.112 },
      { feature: 'Age', importance: 0.061 }
    ],
    createdAt: '2026-11-20T10:30:00Z',
    status: 'deployed',
    version: '1.2.0'
  }
];

let pipelines: Pipeline[] = [
  {
    id: 'pipe-etl-churn-daily',
    name: 'Customer Telemetry & Retention ETL',
    description: 'Automated daily ingestion from Kafka -> Validation -> Missing Imputation -> Random Forest Scoring -> BigQuery Sync.',
    trigger: 'daily',
    cronSchedule: '0 0 * * *',
    status: 'idle',
    datasetId: 'ds-churn-enterprise',
    lastRunAt: '2026-11-20T00:00:00Z',
    lastRunDurationSec: 42.5,
    throughputRecsPerSec: 1420,
    steps: [
      { id: 'st-1', name: 'Kafka Batch Ingestion', type: 'source', status: 'success', config: { topic: 'customer.telemetry.events' } },
      { id: 'st-2', name: 'Schema Contract Validator', type: 'validator', status: 'success', config: { strictNullChecks: true } },
      { id: 'st-3', name: 'Imputation & Standard Scaling', type: 'cleaner', status: 'success', config: { strategy: 'median_zscore' } },
      { id: 'st-4', name: 'Feature Store Materialization', type: 'feature_store', status: 'success', config: { store: 'Redis + Feast' } },
      { id: 'st-5', name: 'Random Forest Churn Inference', type: 'trainer', status: 'success', config: { modelId: 'mdl-baseline-rf' } },
      { id: 'st-6', name: 'Warehouse Export to Snowflake', type: 'export', status: 'success', config: { targetTable: 'prod_marts.customer_risk' } }
    ],
    logs: [
      { timestamp: '2026-11-20T00:00:01Z', level: 'info', stepId: 'st-1', message: 'Pulling micro-batch from Kafka broker 10.0.4.12:9092' },
      { timestamp: '2026-11-20T00:00:08Z', level: 'info', stepId: 'st-2', message: 'Validating 1,200 records against JSONSchema v1.2' },
      { timestamp: '2026-11-20T00:00:15Z', level: 'info', stepId: 'st-3', message: 'Cleaned 12 null entries and scaled 5 continuous features' },
      { timestamp: '2026-11-20T00:00:26Z', level: 'info', stepId: 'st-4', message: 'Materialized 1,200 entities into low-latency feature cache' },
      { timestamp: '2026-11-20T00:00:35Z', level: 'info', stepId: 'st-5', message: 'Executed batch inference: 94 retained, 18 high-risk churners flagged' },
      { timestamp: '2026-11-20T00:00:42Z', level: 'success', stepId: 'st-6', message: 'Pipeline run completed successfully in 42.5s (1,420 recs/sec)' }
    ]
  }
];

let warehouseConnections: WarehouseConnection[] = [
  { id: 'conn-pg-prod', name: 'Primary PostgreSQL Replica', type: 'postgresql', host: 'pg-prod-replica.us-east.aws.internal', port: 5432, database: 'enterprise_data_lake', status: 'connected', latencyMs: 8.2, tablesCount: 48, storageGb: 320.4 },
  { id: 'conn-clickhouse-olap', name: 'ClickHouse High-Throughput OLAP', type: 'clickhouse', host: 'ch-cluster.internal.net', port: 8123, database: 'telemetry_analytics', status: 'connected', latencyMs: 3.4, tablesCount: 16, storageGb: 1840.0 },
  { id: 'conn-snowflake-corp', name: 'Snowflake Enterprise Warehouse', type: 'snowflake', host: 'xy12345.snowflakecomputing.com', port: 443, database: 'FINANCIAL_RISK_DB', status: 'connected', latencyMs: 24.1, tablesCount: 84, storageGb: 4200.5 },
  { id: 'conn-duckdb-local', name: 'Embedded DuckDB Vector Cache', type: 'duckdb', host: 'localhost:memory', port: 0, database: 'in_memory_scratchpad', status: 'connected', latencyMs: 0.4, tablesCount: 6, storageGb: 1.2 }
];

let experimentRuns: ExperimentRun[] = [
  { id: 'run-902', experimentName: 'Customer Churn Optimization', runName: 'gbm-depth6-lr0.05', modelId: 'mdl-baseline-gbm', algorithm: 'Gradient Boosting (GBM)', metrics: { accuracy: 0.952, f1Score: 0.952, rocAuc: 0.978 }, parameters: { nEstimators: 200, maxDepth: 6, lr: 0.05 }, durationSec: 3.42, author: 'Lead ML Engineer', createdAt: '2026-11-20T14:45:00Z', tag: 'Candidate' },
  { id: 'run-884', experimentName: 'Customer Churn Optimization', runName: 'rf-depth12-n150', modelId: 'mdl-baseline-rf', algorithm: 'Random Forest', metrics: { accuracy: 0.938, f1Score: 0.933, rocAuc: 0.962 }, parameters: { nEstimators: 150, maxDepth: 12 }, durationSec: 2.14, author: 'Data Scientist', createdAt: '2026-11-20T10:30:00Z', tag: 'Production' }
];

// Configure file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

// Middleware
app.use(cors());
app.use(express.json({ limit: '20mb' }));

console.log(`Starting DATAFORGE AI nub-stack server on port ${PORT} (${isProd ? 'production' : 'development'})`);

// 1. Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'DATAFORGE AI',
    version: '1.0.0',
    description: 'Intelligent Data Engineering and Machine Learning Platform',
    engine: 'Node.js Express + Nub-Stack',
    datasetsCount: datasets.length,
    modelsCount: trainedModels.length,
    pipelinesCount: pipelines.length,
    timestamp: new Date().toISOString()
  });
});

// 2. Datasets catalog
app.get('/api/datasets', (req, res) => {
  res.json({ success: true, count: datasets.length, datasets });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = datasets.find(d => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  res.json({ success: true, dataset: ds });
});

// Upload dataset
app.post('/api/datasets/upload', upload.single('file'), (req, res) => {
  try {
    let parsedRows: any[] = [];
    let format: 'csv' | 'json' | 'xlsx' = 'csv';
    let filename = 'uploaded_dataset.csv';

    if (req.file) {
      filename = req.file.originalname;
      const lower = filename.toLowerCase();

      if (lower.endsWith('.json')) {
        format = 'json';
        parsedRows = JSON.parse(req.file.buffer.toString('utf-8'));
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        format = 'xlsx';
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
      } else {
        // CSV
        format = 'csv';
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        parsedRows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName]);
      }
    } else if (req.body.rows) {
      parsedRows = req.body.rows;
      format = req.body.format || 'json';
      filename = req.body.name || 'custom_dataset.json';
    } else {
      return res.status(400).json({ success: false, error: 'No file or records provided' });
    }

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Dataset is empty or format could not be parsed' });
    }

    const keys = Object.keys(parsedRows[0]);
    const columns = keys.map(k => ({
      name: k,
      type: typeof parsedRows[0][k] === 'number' ? (Number.isInteger(parsedRows[0][k]) ? 'integer' : 'float') : 'string',
      nullable: false,
      sampleValues: parsedRows.slice(0, 3).map(r => r[k])
    })) as any;

    const newDataset: Dataset = {
      id: `ds-${Date.now().toString(36)}`,
      name: filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '),
      description: `Ingested ${format.toUpperCase()} dataset with ${parsedRows.length} rows and ${columns.length} columns.`,
      format,
      sizeBytes: req.file ? req.file.size : JSON.stringify(parsedRows).length,
      rowCount: parsedRows.length,
      columnCount: columns.length,
      columns,
      rows: parsedRows,
      currentVersion: 'v1.0',
      tags: ['Custom Ingestion', format.toUpperCase()],
      qualityScore: 95,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionId: `ver-${Date.now().toString(36)}`,
          versionTag: 'v1.0',
          description: 'Initial raw ingest upload',
          author: 'Data Engineer',
          createdAt: new Date().toISOString(),
          rowCount: parsedRows.length,
          columnCount: columns.length,
          qualityScore: 95,
          dataHash: `sha256:${Date.now()}`,
          changesSummary: ['File parsed', 'Schema automatically mapped']
        }
      ]
    };

    datasets.unshift(newDataset);
    res.json({ success: true, dataset: newDataset });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to process dataset file' });
  }
});

// 3. Automated Pipelines
app.get('/api/pipelines', (req, res) => {
  res.json({ success: true, pipelines });
});

app.post('/api/pipelines/:id/run', (req, res) => {
  const pipeline = pipelines.find(p => p.id === req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  pipeline.status = 'running';
  pipeline.lastRunAt = new Date().toISOString();
  
  // Simulate execution update
  setTimeout(() => {
    pipeline.status = 'completed';
    pipeline.lastRunDurationSec = Number((28 + Math.random() * 12).toFixed(1));
    pipeline.throughputRecsPerSec = Math.round(1200 + Math.random() * 600);
    pipeline.logs.push({
      timestamp: new Date().toISOString(),
      level: 'success',
      stepId: 'st-complete',
      message: `Triggered execution finished successfully: ${pipeline.throughputRecsPerSec} records/sec processed.`
    });
  }, 1000);

  res.json({ success: true, message: 'Pipeline execution initiated', pipeline });
});

// 4. Warehouse & SQL
app.get('/api/warehouse/connections', (req, res) => {
  res.json({ success: true, connections: warehouseConnections });
});

app.post('/api/warehouse/query', (req, res) => {
  const { query, connectionId } = req.body;
  if (!query) return res.status(400).json({ success: false, error: 'SQL query text is required' });

  const start = Date.now();
  const upper = String(query).toUpperCase();

  // Simple SQL simulation engine
  let columns = ['entity_id', 'metric_name', 'metric_value', 'created_at', 'status_flag'];
  let rows: any[][] = [
    ['ENT-001', 'daily_avg_latency', 14.8, '2026-11-20 00:00:00', 'NORMAL'],
    ['ENT-002', 'daily_avg_latency', 28.2, '2026-11-20 00:00:00', 'ELEVATED'],
    ['ENT-003', 'daily_avg_latency', 8.4, '2026-11-20 00:00:00', 'OPTIMAL'],
    ['ENT-004', 'daily_avg_latency', 12.1, '2026-11-20 00:00:00', 'NORMAL'],
    ['ENT-005', 'daily_avg_latency', 65.0, '2026-11-20 00:00:00', 'ALERT_THRESHOLD']
  ];

  if (upper.includes('CHURN') || upper.includes('CUSTOMER')) {
    columns = ['CustomerID', 'SubscriptionTier', 'MonthlyCharges', 'ChurnProbability', 'PredictedStatus'];
    rows = [
      ['CUST-1002', 'Starter', 49.0, 0.88, 'CHURN_RISK'],
      ['CUST-1004', 'Starter', 49.0, 0.79, 'CHURN_RISK'],
      ['CUST-1001', 'Professional', 129.0, 0.12, 'HEALTHY'],
      ['CUST-1003', 'Enterprise', 249.0, 0.05, 'LOYAL_VIP'],
      ['CUST-1005', 'Professional', 119.0, 0.14, 'HEALTHY']
    ];
  } else if (upper.includes('COUNT')) {
    columns = ['segment', 'total_count', 'mean_score'];
    rows = [
      ['Enterprise', 148, 94.2],
      ['Professional', 520, 88.5],
      ['Starter', 840, 72.1]
    ];
  }

  const duration = Date.now() - start + Math.round(15 + Math.random() * 30);
  res.json({
    success: true,
    result: {
      query,
      executionTimeMs: duration,
      rowsAffected: rows.length,
      columns,
      rows,
      bytesScannedKb: Math.round(240 + Math.random() * 500)
    }
  });
});

// 5. ML Models & Experiments
app.get('/api/models', (req, res) => {
  res.json({ success: true, models: trainedModels });
});

app.post('/api/models/train', (req, res) => {
  const { name, algorithm, datasetId, targetFeature, predictorFeatures, hyperparameters } = req.body;
  
  const newModel: TrainedModel = {
    id: `mdl-${Date.now().toString(36)}`,
    name: name || `${algorithm} Model`,
    taskType: 'classification',
    algorithm: algorithm || 'Random Forest',
    datasetId: datasetId || 'ds-churn-enterprise',
    datasetName: 'Customer Churn & LTV Telemetry',
    targetFeature: targetFeature || 'Churn',
    predictorFeatures: predictorFeatures || ['TenureMonths', 'MonthlyCharges'],
    hyperparameters: hyperparameters || { nEstimators: 100, testSplitRatio: 0.2, randomSeed: 42 },
    metrics: {
      accuracy: Number((0.92 + Math.random() * 0.06).toFixed(3)),
      precision: Number((0.90 + Math.random() * 0.07).toFixed(3)),
      recall: Number((0.91 + Math.random() * 0.07).toFixed(3)),
      f1Score: Number((0.92 + Math.random() * 0.05).toFixed(3)),
      rocAuc: Number((0.95 + Math.random() * 0.04).toFixed(3)),
      trainingTimeSec: Number((1.5 + Math.random() * 2).toFixed(2)),
      inferenceLatencyMs: Number((1.1 + Math.random() * 1.2).toFixed(1))
    },
    confusionMatrix: {
      labels: ['Negative', 'Positive'],
      matrix: [[28, 2], [1, 14]]
    },
    featureImportance: (predictorFeatures || ['TenureMonths', 'MonthlyCharges']).map((f: string, i: number) => ({
      feature: f,
      importance: Number((1 / (i + 1.5)).toFixed(3))
    })),
    createdAt: new Date().toISOString(),
    status: 'ready',
    version: '1.0.0'
  };

  trainedModels.unshift(newModel);
  res.json({ success: true, model: newModel });
});

app.get('/api/experiments', (req, res) => {
  res.json({ success: true, runs: experimentRuns });
});

// Production static file serving & SPA fallback
if (isProd) {
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));

    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(publicPath, 'index.html'));
    });
  } else {
    console.warn(`Public directory not found at ${publicPath}. Run 'pnpm run build' first.`);
  }
}

app.listen(PORT, () => {
  console.log(`DATAFORGE AI backend running at http://localhost:${PORT}`);
  if (isProd) {
    console.log(`Serving static frontend from: ${publicPath}`);
  }
});
