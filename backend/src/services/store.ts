import fs from 'node:fs';
import path from 'node:path';
import {
  ApiKey,
  Dataset,
  ExperimentRun,
  Pipeline,
  StoredUser,
  TrainedModel,
  WarehouseConnection,
} from '../types.js';

export interface FittedModelArtifact {
  modelId: string;
  taskType: string;
  algorithm: string;
  targetFeature: string;
  predictorFeatures: string[];
  /** For numeric/encoded preprocessing */
  featureStats: Record<
    string,
    {
      isNumeric: boolean;
      mean: number;
      std: number;
      categories?: string[];
    }
  >;
  /** For classification/regression linear weights or tree thresholds */
  weights?: number[];
  bias?: number;
  classes?: string[];
  classWeights?: Record<string, { weights: number[]; bias: number }>;
  centroids?: number[][];
  featureMeans?: number[];
  featureStds?: number[];
}

export interface WorkspaceStore {
  users: StoredUser[];
  sessions: Record<string, string>;
  apiKeys: ApiKey[];
  datasets: Dataset[];
  datasetSnapshots: Record<string, Dataset[]>;
  pipelines: Pipeline[];
  warehouseConnections: WarehouseConnection[];
  trainedModels: TrainedModel[];
  experimentRuns: ExperimentRun[];
  fittedModels: Record<string, FittedModelArtifact>;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const STORE_FILE = path.join(DATA_DIR, 'workspace.json');

function createEmptyStore(): WorkspaceStore {
  return {
    users: [],
    sessions: {},
    apiKeys: [],
    datasets: [],
    datasetSnapshots: {},
    pipelines: [],
    warehouseConnections: [],
    trainedModels: [],
    experimentRuns: [],
    fittedModels: {},
  };
}

function loadStore(): WorkspaceStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        ...createEmptyStore(),
        ...parsed,
      };
    }
  } catch (err) {
    console.warn('Could not load runtime workspace store, starting fresh:', err);
  }
  return createEmptyStore();
}

export const store: WorkspaceStore = loadStore();

export function persistStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist workspace store:', err);
  }
}

export function resetStore(): void {
  const empty = createEmptyStore();
  store.users = empty.users;
  store.sessions = empty.sessions;
  store.apiKeys = empty.apiKeys;
  store.datasets = empty.datasets;
  store.datasetSnapshots = empty.datasetSnapshots;
  store.pipelines = empty.pipelines;
  store.warehouseConnections = empty.warehouseConnections;
  store.trainedModels = empty.trainedModels;
  store.experimentRuns = empty.experimentRuns;
  store.fittedModels = empty.fittedModels;

  try {
    if (fs.existsSync(STORE_FILE)) {
      fs.unlinkSync(STORE_FILE);
    }
  } catch (err) {
    console.warn('Failed to remove store file on reset:', err);
  }
}
