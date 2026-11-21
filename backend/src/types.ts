export type UserRole = 'Data Engineer' | 'ML Engineer' | 'Data Analyst' | 'Platform Admin';

export interface User {
  id: string;
  name: string;
  email: string;
  organization: string;
  role: UserRole;
  createdAt: string;
  avatarUrl?: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  fullKey?: string;
  scope: 'read' | 'write' | 'admin' | 'ml_deploy';
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ColumnSchema {
  name: string;
  type: 'integer' | 'float' | 'string' | 'categorical' | 'boolean' | 'datetime';
  nullable: boolean;
  sampleValues: any[];
}

export interface DatasetVersion {
  versionId: string;
  versionTag: string;
  description: string;
  author: string;
  createdAt: string;
  rowCount: number;
  columnCount: number;
  qualityScore: number;
  dataHash: string;
  changesSummary: string[];
}

export interface Dataset {
  id: string;
  name: string;
  description: string;
  format: 'csv' | 'json' | 'xlsx';
  sizeBytes: number;
  rowCount: number;
  columnCount: number;
  columns: ColumnSchema[];
  rows: Record<string, any>[];
  createdAt: string;
  updatedAt: string;
  currentVersion: string;
  versions: DatasetVersion[];
  tags: string[];
  qualityScore: number;
}

export interface ValidationIssue {
  column: string;
  severity: 'error' | 'warning' | 'info';
  type: 'missing_values' | 'outlier' | 'type_mismatch' | 'unique_violation' | 'range_breach';
  message: string;
  affectedCount: number;
  affectedRatio: number;
  suggestedFix: string;
}

export interface ValidationResult {
  datasetId: string;
  totalChecks: number;
  passedChecks: number;
  qualityScore: number;
  issues: ValidationIssue[];
  completenessRatio: number;
  validityRatio: number;
  uniquenessRatio: number;
  timestamp: string;
}

export interface TransformationStep {
  id: string;
  action: string;
  column?: string;
  parameters?: Record<string, any>;
  description: string;
  appliedAt: string;
  impactNote: string;
}

export interface PipelineStepNode {
  id: string;
  name: string;
  type: 'source' | 'validator' | 'cleaner' | 'feature_store' | 'trainer' | 'export';
  status: 'idle' | 'running' | 'success' | 'failed';
  config: Record<string, any>;
}

export interface PipelineExecutionLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  stepId: string;
  message: string;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string;
  trigger: 'manual' | 'hourly' | 'daily' | 'webhook';
  cronSchedule?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  steps: PipelineStepNode[];
  lastRunAt: string | null;
  lastRunDurationSec?: number;
  throughputRecsPerSec?: number;
  datasetId: string;
  logs: PipelineExecutionLog[];
}

export interface WarehouseConnection {
  id: string;
  name: string;
  type: 'postgresql' | 'clickhouse' | 'snowflake' | 'bigquery' | 'duckdb';
  host: string;
  port: number;
  database: string;
  status: 'connected' | 'disconnected' | 'latency_high';
  latencyMs: number;
  tablesCount: number;
  storageGb: number;
}

export interface WarehouseTable {
  id: string;
  connectionId: string;
  name: string;
  schema: string;
  rowCount: number;
  sizeMb: number;
  columns: { name: string; type: string; isPrimary: boolean; isNullable: boolean }[];
  lastSyncedAt: string;
}

export interface SqlQueryResult {
  query: string;
  executionTimeMs: number;
  rowsAffected: number;
  columns: string[];
  rows: any[][];
  bytesScannedKb: number;
  error?: string;
}

export interface TrainedModel {
  id: string;
  name: string;
  taskType: string;
  algorithm: string;
  datasetId: string;
  datasetName: string;
  targetFeature: string;
  predictorFeatures: string[];
  hyperparameters: Record<string, any>;
  metrics: Record<string, any>;
  confusionMatrix?: { labels: string[]; matrix: number[][] };
  rocCurve?: { falsePositiveRate: number; truePositiveRate: number }[];
  featureImportance: { feature: string; importance: number }[];
  createdAt: string;
  status: string;
  version: string;
}

export interface ExperimentRun {
  id: string;
  experimentName: string;
  runName: string;
  modelId: string;
  algorithm: string;
  metrics: Record<string, number>;
  parameters: Record<string, any>;
  durationSec: number;
  author: string;
  createdAt: string;
  tag: string;
}
