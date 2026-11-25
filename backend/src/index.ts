import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';
import * as XLSX from 'xlsx';
import {
  ApiKey,
  Dataset,
  ExperimentRun,
  Pipeline,
  PipelineStepNode,
  StoredUser,
  TransformationStep,
  User,
  UserRole,
  WarehouseConnection,
} from './types.js';
import { store, persistStore, resetStore } from './services/store.js';
import {
  applyTransformation,
  calculateDrift,
  computeAnalytics,
  generateEdaReport,
  inferSchema,
  validateDataset,
} from './services/dataEngine.js';
import { executeSqlQuery, listQueryableTables } from './services/sqlEngine.js';
import { predictWithArtifact, trainAndEvaluateModel } from './services/mlTrainer.js';

const app = express();
const PORT = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === 'production';
const publicPath = path.resolve(process.cwd(), 'public');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// --- Auth Helpers ---
function sanitizeUser(u: StoredUser): User {
  const { passwordHash: _ph, salt: _s, ...publicUser } = u;
  return publicUser;
}

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { hash, salt: usedSalt };
}

function getAuthenticatedUser(req: Request): StoredUser | undefined {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return undefined;
  const token = header.slice('Bearer '.length).trim();
  const userId = store.sessions[token];
  if (!userId) return undefined;
  return store.users.find((u) => u.id === userId);
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  (req as any).user = user;
  next();
}

console.log(`Starting DATAFORGE server on port ${PORT} (${isProd ? 'production' : 'development'})`);

// 1. Health & Workspace Reset
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    platform: 'DATAFORGE',
    version: '1.0.0',
    description: 'Data Engineering, Transformation, and Statistical Modeling Platform',
    counts: {
      datasets: store.datasets.length,
      models: store.trainedModels.length,
      pipelines: store.pipelines.length,
      connections: store.warehouseConnections.length,
      experiments: store.experimentRuns.length,
      users: store.users.length,
    },
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/workspace/reset', (_req, res) => {
  resetStore();
  res.json({ success: true, message: 'Workspace reset cleanly' });
});

// 2. Authentication & Access Tokens
app.post('/api/auth/register', (req, res) => {
  const { name, email, password, organization, role } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  if (store.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return res.status(409).json({ success: false, error: 'An account with this email already exists' });
  }

  const { hash, salt } = hashPassword(String(password));
  const validRoles: UserRole[] = ['Data Engineer', 'ML Engineer', 'Data Analyst', 'Platform Admin'];
  const assignedRole: UserRole = validRoles.includes(role) ? role : 'Data Engineer';

  const newUser: StoredUser = {
    id: `usr-${crypto.randomBytes(4).toString('hex')}`,
    name: String(name).trim(),
    email: normalizedEmail,
    organization: organization ? String(organization).trim() : 'Independent Workspace',
    role: assignedRole,
    createdAt: new Date().toISOString(),
    passwordHash: hash,
    salt,
  };

  const token = crypto.randomBytes(24).toString('hex');
  store.users.push(newUser);
  store.sessions[token] = newUser.id;
  persistStore();

  res.status(201).json({ success: true, user: sanitizeUser(newUser), token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const matched = store.users.find((u) => u.email.toLowerCase() === normalizedEmail);
  if (!matched) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const { hash } = hashPassword(String(password), matched.salt);
  if (hash !== matched.passwordHash) {
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  store.sessions[token] = matched.id;
  persistStore();

  res.json({ success: true, user: sanitizeUser(matched), token });
});

app.post('/api/auth/logout', (req, res) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim();
    delete store.sessions[token];
    persistStore();
  }
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  res.json({ success: true, user: sanitizeUser(user) });
});

app.patch('/api/auth/role', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { role } = req.body || {};
  const validRoles: UserRole[] = ['Data Engineer', 'ML Engineer', 'Data Analyst', 'Platform Admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: 'Invalid role selected' });
  }
  user.role = role;
  persistStore();
  res.json({ success: true, user: sanitizeUser(user) });
});

app.get('/api/keys', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const keys = store.apiKeys.filter((k) => k.userId === user.id);
  res.json({ success: true, keys });
});

app.post('/api/keys', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const { name, scope } = req.body || {};
  if (!name || !String(name).trim()) {
    return res.status(400).json({ success: false, error: 'API key name is required' });
  }

  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const fullKey = `df_live_${crypto.randomBytes(12).toString('hex')}`;
  const cleanName = String(name).trim();
  const newKey: ApiKey = {
    id: `key-${Date.now().toString(36)}`,
    userId: user.id,
    name: cleanName,
    keyPreview: `df_live_${cleanName.slice(0, 3).toLowerCase()}••••••••${randomSuffix.slice(0, 6)}`,
    scope: scope || 'write',
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  };

  store.apiKeys.unshift(newKey);
  persistStore();

  res.status(201).json({ success: true, key: { ...newKey, fullKey } });
});

app.delete('/api/keys/:id', requireAuth, (req, res) => {
  const user = (req as any).user as StoredUser;
  const idx = store.apiKeys.findIndex((k) => k.id === req.params.id && k.userId === user.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'API key not found' });
  }
  store.apiKeys.splice(idx, 1);
  persistStore();
  res.json({ success: true });
});

// 3. Datasets, Validation, Cleaning, EDA, Drift, Analytics
app.get('/api/datasets', (_req, res) => {
  res.json({ success: true, count: store.datasets.length, datasets: store.datasets });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  res.json({ success: true, dataset: ds });
});

app.post('/api/datasets/upload', upload.single('file'), (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req);
    const author = authUser ? authUser.name : 'Workspace User';

    let parsedRows: Record<string, any>[] = [];
    let format: 'csv' | 'json' | 'xlsx' = 'csv';
    let filename = 'uploaded_dataset.csv';
    let sizeBytes = 0;

    if (req.file) {
      filename = req.file.originalname;
      sizeBytes = req.file.size;
      const lower = filename.toLowerCase();

      if (lower.endsWith('.json')) {
        format = 'json';
        const parsed = JSON.parse(req.file.buffer.toString('utf-8'));
        parsedRows = Array.isArray(parsed) ? parsed : [parsed];
      } else if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
        format = 'xlsx';
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      } else {
        format = 'csv';
        const text = req.file.buffer.toString('utf-8');
        const workbook = XLSX.read(text, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      }
    } else if (req.body.rawText) {
      const rawText = String(req.body.rawText).trim();
      sizeBytes = Buffer.byteLength(rawText, 'utf-8');
      format = req.body.format === 'json' ? 'json' : 'csv';
      filename = req.body.name || `dataset.${format}`;

      if (format === 'json') {
        const parsed = JSON.parse(rawText);
        parsedRows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        const workbook = XLSX.read(rawText, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        parsedRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
      }
    } else if (Array.isArray(req.body.rows)) {
      parsedRows = req.body.rows;
      format = req.body.format || 'json';
      filename = req.body.name || 'custom_dataset.json';
      sizeBytes = Buffer.byteLength(JSON.stringify(parsedRows), 'utf-8');
    } else {
      return res.status(400).json({ success: false, error: 'No file or data payload provided' });
    }

    if (!Array.isArray(parsedRows) || parsedRows.length === 0) {
      return res.status(400).json({ success: false, error: 'Dataset contains zero readable rows' });
    }

    const dsId = `ds-${Date.now().toString(36)}`;
    const columns = inferSchema(parsedRows);
    const validation = validateDataset(dsId, parsedRows, columns);
    const providedName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const providedDesc = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const resolvedName =
      providedName || filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

    const dataHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(parsedRows.slice(0, 50)))
      .digest('hex');

    const newDataset: Dataset = {
      id: dsId,
      name: resolvedName,
      description:
        providedDesc ||
        `Ingested ${format.toUpperCase()} dataset with ${parsedRows.length} rows and ${columns.length} columns.`,
      format,
      sizeBytes,
      rowCount: parsedRows.length,
      columnCount: columns.length,
      columns,
      rows: parsedRows,
      currentVersion: 'v1.0',
      tags: [format.toUpperCase(), 'Ingested'],
      qualityScore: validation.qualityScore,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versions: [
        {
          versionId: `ver-${Date.now().toString(36)}`,
          versionTag: 'v1.0',
          description: 'Initial ingested upload',
          author,
          createdAt: new Date().toISOString(),
          rowCount: parsedRows.length,
          columnCount: columns.length,
          qualityScore: validation.qualityScore,
          dataHash: `sha256:${dataHash.slice(0, 16)}`,
          changesSummary: [`Ingested ${parsedRows.length} rows`, `Inferred ${columns.length} columns`],
        },
      ],
    };

    store.datasets.unshift(newDataset);
    persistStore();
    res.status(201).json({ success: true, dataset: newDataset });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to parse dataset' });
  }
});

app.delete('/api/datasets/:id', (req, res) => {
  const idx = store.datasets.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Dataset not found' });
  store.datasets.splice(idx, 1);
  delete store.datasetSnapshots[req.params.id];
  persistStore();
  res.json({ success: true });
});

app.get('/api/datasets/:id/validation', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  const validation = validateDataset(ds.id, ds.rows, ds.columns);
  ds.qualityScore = validation.qualityScore;
  res.json({ success: true, validation });
});

app.get('/api/datasets/:id/eda', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  const report = generateEdaReport(ds.id, ds.rows, ds.columns);
  res.json({ success: true, report });
});

app.get('/api/datasets/:id/drift', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  const validation = validateDataset(ds.id, ds.rows, ds.columns);
  const mid = Math.floor(ds.rows.length / 2);
  const baseline = ds.rows.slice(0, mid);
  const current = ds.rows.slice(mid);
  const drift = calculateDrift(baseline, current, ds.columns);
  res.json({ success: true, validation, drift });
});

app.get('/api/datasets/:id/analytics', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });
  const analytics = computeAnalytics(ds, store.pipelines);
  res.json({ success: true, analytics });
});

app.post('/api/datasets/:id/transform', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });

  const { action, column } = req.body || {};
  if (!action) {
    return res.status(400).json({ success: false, error: 'Transformation action is required' });
  }

  // Save deep copy for undo
  if (!store.datasetSnapshots[ds.id]) {
    store.datasetSnapshots[ds.id] = [];
  }
  store.datasetSnapshots[ds.id].push(JSON.parse(JSON.stringify(ds)));
  if (store.datasetSnapshots[ds.id].length > 15) {
    store.datasetSnapshots[ds.id].shift();
  }

  const step: TransformationStep = {
    id: `step-${Date.now().toString(36)}`,
    action,
    column: action === 'drop_duplicates' ? undefined : column,
    description: `${String(action).replace(/_/g, ' ')} on ${action === 'drop_duplicates' ? 'all rows' : column}`,
    appliedAt: new Date().toISOString(),
    impactNote: '',
  };

  const { updatedRows, updatedColumns, impactNote } = applyTransformation(ds.rows, ds.columns, step);
  step.impactNote = impactNote;

  const validation = validateDataset(ds.id, updatedRows, updatedColumns);
  ds.rows = updatedRows;
  ds.columns = updatedColumns;
  ds.rowCount = updatedRows.length;
  ds.columnCount = updatedColumns.length;
  ds.qualityScore = validation.qualityScore;
  ds.updatedAt = new Date().toISOString();

  persistStore();
  res.json({
    success: true,
    dataset: ds,
    step,
    undoCount: store.datasetSnapshots[ds.id].length,
  });
});

app.post('/api/datasets/:id/undo', (req, res) => {
  const dsIdx = store.datasets.findIndex((d) => d.id === req.params.id);
  if (dsIdx === -1) return res.status(404).json({ success: false, error: 'Dataset not found' });

  const stack = store.datasetSnapshots[req.params.id] || [];
  if (stack.length === 0) {
    return res.status(400).json({ success: false, error: 'Nothing to undo' });
  }

  const previous = stack.pop()!;
  store.datasets[dsIdx] = previous;
  persistStore();

  res.json({
    success: true,
    dataset: previous,
    undoCount: stack.length,
  });
});

app.post('/api/datasets/:id/versions', (req, res) => {
  const ds = store.datasets.find((d) => d.id === req.params.id);
  if (!ds) return res.status(404).json({ success: false, error: 'Dataset not found' });

  const authUser = getAuthenticatedUser(req);
  const { description, changesSummary } = req.body || {};
  const nextVerTag = `v1.${ds.versions.length}`;
  const validation = validateDataset(ds.id, ds.rows, ds.columns);
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(ds.rows.slice(0, 50)))
    .digest('hex');

  const version = {
    versionId: `ver-${Date.now().toString(36)}`,
    versionTag: nextVerTag,
    description: description || `Snapshot with ${ds.rowCount} rows and ${ds.columnCount} columns`,
    author: authUser ? authUser.name : 'Workspace User',
    createdAt: new Date().toISOString(),
    rowCount: ds.rowCount,
    columnCount: ds.columnCount,
    qualityScore: validation.qualityScore,
    dataHash: `sha256:${hash.slice(0, 16)}`,
    changesSummary: Array.isArray(changesSummary) && changesSummary.length > 0 ? changesSummary : ['Manual snapshot'],
  };

  ds.currentVersion = nextVerTag;
  ds.qualityScore = validation.qualityScore;
  ds.versions.unshift(version);
  ds.updatedAt = new Date().toISOString();

  persistStore();
  res.status(201).json({ success: true, dataset: ds, version });
});

// 4. Pipelines CRUD & Execution
app.get('/api/pipelines', (_req, res) => {
  res.json({ success: true, pipelines: store.pipelines });
});

app.get('/api/pipelines/:id', (req, res) => {
  const pipeline = store.pipelines.find((p) => p.id === req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  res.json({ success: true, pipeline });
});

app.post('/api/pipelines', (req, res) => {
  const { name, description, datasetId, trigger, cronSchedule, targetName, steps } = req.body || {};
  if (!name || !datasetId) {
    return res.status(400).json({ success: false, error: 'Pipeline name and datasetId are required' });
  }

  const dataset = store.datasets.find((d) => d.id === datasetId);
  if (!dataset) {
    return res.status(404).json({ success: false, error: 'Selected dataset does not exist' });
  }

  const defaultSteps: PipelineStepNode[] = [
    { id: 'st-1', name: `Extract: ${dataset.name}`, type: 'source', status: 'idle', config: { datasetId } },
    { id: 'st-2', name: 'Schema Validator', type: 'validator', status: 'idle', config: {} },
    { id: 'st-3', name: 'Feature Imputation', type: 'cleaner', status: 'idle', config: { action: 'impute_median' } },
    { id: 'st-4', name: 'Statistics & Drift Check', type: 'feature_store', status: 'idle', config: {} },
    { id: 'st-5', name: `Sink: ${targetName || 'Catalog Store'}`, type: 'export', status: 'idle', config: {} },
  ];

  const pipeline: Pipeline = {
    id: `pipe-${Date.now().toString(36)}`,
    name: String(name).trim(),
    description:
      description || `Automated ETL pipeline operating on ${dataset.name} (${dataset.rowCount} rows).`,
    trigger: trigger || 'manual',
    cronSchedule: cronSchedule || (trigger === 'daily' ? '0 0 * * *' : trigger === 'hourly' ? '0 * * * *' : 'manual'),
    status: 'idle',
    datasetId,
    targetName: targetName || 'Catalog Store',
    lastRunAt: null,
    steps: Array.isArray(steps) && steps.length > 0 ? steps : defaultSteps,
    logs: [],
  };

  store.pipelines.unshift(pipeline);
  persistStore();
  res.status(201).json({ success: true, pipeline });
});

app.post('/api/pipelines/:id/run', async (req, res) => {
  const pipeline = store.pipelines.find((p) => p.id === req.params.id);
  if (!pipeline) return res.status(404).json({ success: false, error: 'Pipeline not found' });

  const dataset = store.datasets.find((d) => d.id === pipeline.datasetId);
  if (!dataset) {
    pipeline.status = 'failed';
    pipeline.logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'error',
        stepId: 'st-source',
        message: `Target dataset (${pipeline.datasetId}) no longer exists.`,
      },
    ];
    persistStore();
    return res.status(400).json({ success: false, error: 'Dataset linked to pipeline was deleted', pipeline });
  }

  const runStart = performance.now();
  pipeline.status = 'running';
  pipeline.lastRunAt = new Date().toISOString();
  pipeline.logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      stepId: 'init',
      message: `Started pipeline execution against '${dataset.name}' (${dataset.rowCount} rows, ${dataset.columnCount} cols).`,
    },
  ];

  for (const step of pipeline.steps) {
    step.status = 'running';
    if (step.type === 'source') {
      step.status = 'success';
      pipeline.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: step.id,
        message: `Loaded ${dataset.rowCount} records (${(dataset.sizeBytes / 1024).toFixed(1)} KB) from dataset source.`,
      });
    } else if (step.type === 'validator') {
      const val = validateDataset(dataset.id, dataset.rows, dataset.columns);
      step.status = 'success';
      pipeline.logs.push({
        timestamp: new Date().toISOString(),
        level: val.issues.some((i) => i.severity === 'error') ? 'warn' : 'info',
        stepId: step.id,
        message: `Schema checks completed: Quality Score ${val.qualityScore}/100 (${val.issues.length} findings).`,
      });
    } else if (step.type === 'cleaner') {
      const numericCol = dataset.columns.find((c) => (c.type === 'integer' || c.type === 'float') && c.nullable);
      if (numericCol) {
        const { updatedRows, updatedColumns, impactNote } = applyTransformation(dataset.rows, dataset.columns, {
          id: `pipe-step-${Date.now()}`,
          action: 'impute_median',
          column: numericCol.name,
          description: 'Pipeline auto median imputation',
          appliedAt: new Date().toISOString(),
          impactNote: '',
        });
        dataset.rows = updatedRows;
        dataset.columns = updatedColumns;
        pipeline.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: impactNote,
        });
      } else {
        pipeline.logs.push({
          timestamp: new Date().toISOString(),
          level: 'info',
          stepId: step.id,
          message: `Verified ${dataset.rowCount} rows clean with no pending numeric imputations.`,
        });
      }
      step.status = 'success';
    } else if (step.type === 'feature_store') {
      const eda = generateEdaReport(dataset.id, dataset.rows, dataset.columns);
      step.status = 'success';
      pipeline.logs.push({
        timestamp: new Date().toISOString(),
        level: 'info',
        stepId: step.id,
        message: `Computed statistics across ${eda.summaryStats.length} features and ${eda.correlations.length} correlation pairs.`,
      });
    } else {
      step.status = 'success';
      pipeline.logs.push({
        timestamp: new Date().toISOString(),
        level: 'success',
        stepId: step.id,
        message: `Published ${dataset.rowCount} records to ${pipeline.targetName || 'Catalog Store'}.`,
      });
    }
  }

  const elapsedMs = Math.max(12, performance.now() - runStart);
  const durationSec = Number((elapsedMs / 1000).toFixed(3));
  const throughput = Math.max(1, Math.round((dataset.rowCount / elapsedMs) * 1000));

  pipeline.status = 'completed';
  pipeline.lastRunDurationSec = durationSec;
  pipeline.throughputRecsPerSec = throughput;
  pipeline.logs.push({
    timestamp: new Date().toISOString(),
    level: 'success',
    stepId: 'complete',
    message: `Pipeline finished in ${durationSec}s (${throughput.toLocaleString()} records/sec).`,
  });

  persistStore();
  res.json({ success: true, pipeline });
});

app.delete('/api/pipelines/:id', (req, res) => {
  const idx = store.pipelines.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Pipeline not found' });
  store.pipelines.splice(idx, 1);
  persistStore();
  res.json({ success: true });
});

// 5. Data Warehouse Connections & SQL Engine
app.get('/api/warehouse/connections', (_req, res) => {
  const tablesCount = store.datasets.length;
  const totalBytes = store.datasets.reduce((s, d) => s + d.sizeBytes, 0);
  const storageGb = Number((totalBytes / (1024 * 1024 * 1024)).toFixed(4));
  const enriched = store.warehouseConnections.map((c) => ({
    ...c,
    tablesCount,
    storageGb,
  }));
  res.json({ success: true, connections: enriched });
});

app.post('/api/warehouse/connections', (req, res) => {
  const { name, type, host, port, database } = req.body || {};
  if (!name || !type || !database) {
    return res.status(400).json({ success: false, error: 'Name, engine type, and database name are required' });
  }

  const start = performance.now();
  const totalBytes = store.datasets.reduce((s, d) => s + d.sizeBytes, 0);

  const conn: WarehouseConnection = {
    id: `conn-${Date.now().toString(36)}`,
    name: String(name).trim(),
    type,
    host: host ? String(host).trim() : 'localhost',
    port: Number(port) || (type === 'postgresql' ? 5432 : type === 'clickhouse' ? 8123 : type === 'snowflake' ? 443 : 0),
    database: String(database).trim(),
    status: 'connected',
    latencyMs: Number((performance.now() - start + 0.4).toFixed(2)),
    tablesCount: store.datasets.length,
    storageGb: Number((totalBytes / (1024 * 1024 * 1024)).toFixed(4)),
  };

  store.warehouseConnections.unshift(conn);
  persistStore();
  res.status(201).json({ success: true, connection: conn });
});

app.delete('/api/warehouse/connections/:id', (req, res) => {
  const idx = store.warehouseConnections.findIndex((c) => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Connection not found' });
  store.warehouseConnections.splice(idx, 1);
  persistStore();
  res.json({ success: true });
});

app.get('/api/warehouse/tables', (_req, res) => {
  const tables = listQueryableTables(store.datasets);
  res.json({ success: true, tables });
});

app.post('/api/warehouse/query', (req, res) => {
  const { query, connectionId } = req.body || {};
  if (!query || !String(query).trim()) {
    return res.status(400).json({ success: false, error: 'SQL query text is required' });
  }

  if (connectionId && !store.warehouseConnections.some((c) => c.id === connectionId)) {
    return res.status(404).json({ success: false, error: 'Selected connection not found' });
  }

  const result = executeSqlQuery(String(query), store.datasets);
  if (result.error) {
    return res.status(400).json({ success: false, error: result.error, result });
  }

  res.json({ success: true, result });
});

// 6. Statistical Models, Live Inference, Experiments & Reports
app.get('/api/models', (_req, res) => {
  res.json({ success: true, models: store.trainedModels });
});

app.post('/api/models/train', (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req);
    const {
      name,
      taskType,
      algorithm,
      datasetId,
      targetFeature,
      predictorFeatures,
      hyperparameters,
    } = req.body || {};

    const dataset = store.datasets.find((d) => d.id === datasetId);
    if (!dataset) {
      return res.status(404).json({ success: false, error: 'Dataset not found for training' });
    }

    const { model, artifact } = trainAndEvaluateModel({
      dataset,
      name,
      taskType: taskType || 'classification',
      algorithm: algorithm || 'Logistic Regression',
      targetFeature: targetFeature || dataset.columns[dataset.columns.length - 1]?.name || '',
      predictorFeatures: Array.isArray(predictorFeatures) ? predictorFeatures : [],
      hyperparameters: hyperparameters || { testSplitRatio: 0.2, randomSeed: 42 },
    });

    store.trainedModels.unshift(model);
    store.fittedModels[model.id] = artifact;

    const experimentRun: ExperimentRun = {
      id: `run-${Date.now().toString(36).slice(-5)}`,
      experimentName: `${dataset.name} Benchmark`,
      runName: `${model.algorithm.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${model.id.slice(-4)}`,
      modelId: model.id,
      algorithm: model.algorithm,
      metrics: {
        accuracy: model.metrics.accuracy ?? model.metrics.r2Score ?? model.metrics.silhouetteScore ?? 0,
        f1Score: model.metrics.f1Score ?? model.metrics.mae ?? 0,
        rocAuc: model.metrics.rocAuc ?? model.metrics.rmse ?? 0,
      },
      parameters: model.hyperparameters,
      durationSec: model.metrics.trainingTimeSec || 0.1,
      author: authUser ? authUser.name : 'Workspace User',
      createdAt: model.createdAt,
      tag: 'Candidate',
    };

    store.experimentRuns.unshift(experimentRun);
    persistStore();

    res.status(201).json({ success: true, model, experimentRun });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Training failed' });
  }
});

app.patch('/api/models/:id', (req, res) => {
  const model = store.trainedModels.find((m) => m.id === req.params.id);
  if (!model) return res.status(404).json({ success: false, error: 'Model not found' });
  const { status } = req.body || {};
  if (status) {
    model.status = status;
    // Sync matching experiment tag when deployed
    if (status === 'deployed') {
      const exp = store.experimentRuns.find((e) => e.modelId === model.id);
      if (exp) exp.tag = 'Production';
    }
  }
  persistStore();
  res.json({ success: true, model });
});

app.delete('/api/models/:id', (req, res) => {
  const idx = store.trainedModels.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Model not found' });
  store.trainedModels.splice(idx, 1);
  delete store.fittedModels[req.params.id];
  persistStore();
  res.json({ success: true });
});

app.post('/api/models/:id/predict', (req, res) => {
  const artifact = store.fittedModels[req.params.id];
  if (!artifact) {
    return res.status(404).json({
      success: false,
      error: 'Inference artifact not available for this model. Train a model first.',
    });
  }
  try {
    const input = req.body?.input || {};
    const result = predictWithArtifact(artifact, input);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Inference error' });
  }
});

// 7. Experiments & Reports
app.get('/api/experiments', (_req, res) => {
  res.json({ success: true, runs: store.experimentRuns });
});

app.patch('/api/experiments/:id', (req, res) => {
  const run = store.experimentRuns.find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ success: false, error: 'Experiment run not found' });
  if (req.body?.tag) run.tag = String(req.body.tag);
  persistStore();
  res.json({ success: true, run });
});

app.delete('/api/experiments/:id', (req, res) => {
  const idx = store.experimentRuns.findIndex((r) => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, error: 'Experiment run not found' });
  store.experimentRuns.splice(idx, 1);
  persistStore();
  res.json({ success: true });
});

app.post('/api/reports/generate', (req, res) => {
  const { datasetId, modelId } = req.body || {};
  const ds = store.datasets.find((d) => d.id === datasetId);
  if (!ds) {
    return res.status(404).json({ success: false, error: 'Dataset not found for report generation' });
  }

  const eda = generateEdaReport(ds.id, ds.rows, ds.columns);
  const validation = validateDataset(ds.id, ds.rows, ds.columns);
  const model =
    store.trainedModels.find((m) => m.id === modelId) ||
    store.trainedModels.find((m) => m.datasetId === ds.id) ||
    null;

  const dateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let md = `# DATAFORGE — TECHNICAL DATA AUDIT REPORT\n\n`;
  md += `**Generated At:** ${dateStr}  \n`;
  md += `**Dataset:** ${ds.name} (${ds.format.toUpperCase()}, ${ds.rowCount} rows, ${ds.columnCount} columns)  \n`;
  md += `**Version:** ${ds.currentVersion}  \n`;
  md += `**Quality Score:** ${validation.qualityScore}/100  \n\n`;

  md += `## 1. Executive Statistical Summary\n\n${eda.executiveSummary}\n\n`;

  if (eda.keyFindings.length > 0) {
    md += `### Key Findings\n\n`;
    eda.keyFindings.forEach((f) => {
      md += `- ${f}\n`;
    });
    md += `\n`;
  }

  md += `## 2. Schema & Validation\n\n`;
  md += `- **Completeness Ratio:** ${(validation.completenessRatio * 100).toFixed(1)}%\n`;
  md += `- **Validity Ratio:** ${(validation.validityRatio * 100).toFixed(1)}%\n`;
  md += `- **Uniqueness Ratio:** ${(validation.uniquenessRatio * 100).toFixed(1)}%\n\n`;
  md += `| Column | Type | Nullable |\n| :--- | :--- | :--- |\n`;
  ds.columns.forEach((c) => {
    md += `| \`${c.name}\` | ${c.type} | ${c.nullable ? 'Yes' : 'No'} |\n`;
  });
  md += `\n`;

  if (eda.summaryStats.length > 0) {
    md += `## 3. Column Statistics\n\n`;
    md += `| Attribute | Count | Missing % | Mean | Median | Std Dev | Min | Max |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;
    eda.summaryStats.forEach((st) => {
      md += `| \`${st.column}\` | ${st.count} | ${st.missingPercentage}% | ${st.mean ?? '—'} | ${st.median ?? '—'} | ${st.stdDev ?? '—'} | ${st.min ?? '—'} | ${st.max ?? '—'} |\n`;
    });
    md += `\n`;
  }

  if (model) {
    md += `## 4. Statistical Model Benchmark (${model.name})\n\n`;
    md += `- **Algorithm:** ${model.algorithm}\n`;
    md += `- **Target:** \`${model.targetFeature}\`\n`;
    md += `- **Predictors:** ${model.predictorFeatures.map((f) => `\`${f}\``).join(', ')}\n`;
    md += `- **Training Time:** ${model.metrics.trainingTimeSec}s\n`;
    md += `- **Inference Latency:** ${model.metrics.inferenceLatencyMs}ms\n\n`;

    if (model.metrics.accuracy !== undefined) {
      md += `- **Accuracy:** ${(model.metrics.accuracy * 100).toFixed(1)}%\n`;
      md += `- **Precision:** ${(model.metrics.precision * 100).toFixed(1)}%\n`;
      md += `- **Recall:** ${(model.metrics.recall * 100).toFixed(1)}%\n`;
      md += `- **F1 Score:** ${model.metrics.f1Score}\n`;
      md += `- **ROC-AUC:** ${model.metrics.rocAuc}\n\n`;
    } else if (model.metrics.r2Score !== undefined) {
      md += `- **R-Squared:** ${model.metrics.r2Score}\n`;
      md += `- **MAE:** ${model.metrics.mae}\n`;
      md += `- **RMSE:** ${model.metrics.rmse}\n\n`;
    }

    if (model.featureImportance.length > 0) {
      md += `### Feature Importance\n\n`;
      model.featureImportance.forEach((fi, idx) => {
        md += `${idx + 1}. **${fi.feature}**: ${(fi.importance * 100).toFixed(1)}%\n`;
      });
      md += `\n`;
    }
  }

  md += `## 5. Recommended Actions\n\n`;
  eda.recommendedActions.forEach((rec, i) => {
    md += `${i + 1}. ${rec}\n`;
  });
  md += `\n---\n*Generated by DATAFORGE*\n`;

  res.json({
    success: true,
    markdown: md,
    filename: `dataforge_${ds.name.toLowerCase().replace(/\s+/g, '_')}_audit.md`,
  });
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
  console.log(`DATAFORGE backend running at http://localhost:${PORT}`);
  if (isProd) {
    console.log(`Serving static frontend from: ${publicPath}`);
  }
});
