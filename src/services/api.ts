import {
  AnalyticsSummary,
  ApiKey,
  DataDriftMetric,
  Dataset,
  DatasetVersion,
  EdaReport,
  ExperimentRun,
  HealthResponse,
  MlAlgorithm,
  MlTaskType,
  ModelHyperparameters,
  Pipeline,
  SqlQueryResult,
  TrainedModel,
  TransformationStep,
  User,
  UserRole,
  ValidationResult,
  WarehouseConnection,
  WarehouseTable,
} from '../types';

export const TOKEN_STORAGE_KEY = 'dataforge_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data as T;
}

export const api = {
  health: {
    get: () => request<HealthResponse>('/api/health'),
    resetWorkspace: () => request<{ success: boolean }>('/api/workspace/reset', { method: 'POST' }),
  },

  auth: {
    register: (payload: {
      name: string;
      email: string;
      password: string;
      organization?: string;
      role: UserRole;
    }) =>
      request<{ success: boolean; user: User; token: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      request<{ success: boolean; user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    logout: () =>
      request<{ success: boolean }>('/api/auth/logout', { method: 'POST' }).catch(() => ({
        success: true,
      })),

    me: () => request<{ success: boolean; user: User }>('/api/auth/me'),

    updateRole: (role: UserRole) =>
      request<{ success: boolean; user: User }>('/api/auth/role', {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
  },

  keys: {
    list: () => request<{ success: boolean; keys: ApiKey[] }>('/api/keys'),
    create: (payload: { name: string; scope: ApiKey['scope'] }) =>
      request<{ success: boolean; key: ApiKey }>('/api/keys', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    revoke: (id: string) =>
      request<{ success: boolean }>(`/api/keys/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  datasets: {
    list: () => request<{ success: boolean; count: number; datasets: Dataset[] }>('/api/datasets'),

    get: (id: string) =>
      request<{ success: boolean; dataset: Dataset }>(`/api/datasets/${encodeURIComponent(id)}`),

    uploadFile: (file: File, name?: string, description?: string) => {
      const formData = new FormData();
      formData.append('file', file);
      if (name?.trim()) formData.append('name', name.trim());
      if (description?.trim()) formData.append('description', description.trim());
      return request<{ success: boolean; dataset: Dataset }>('/api/datasets/upload', {
        method: 'POST',
        body: formData,
      });
    },

    uploadRaw: (payload: {
      name: string;
      description?: string;
      format: 'csv' | 'json';
      rawText: string;
    }) =>
      request<{ success: boolean; dataset: Dataset }>('/api/datasets/upload', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    remove: (id: string) =>
      request<{ success: boolean }>(`/api/datasets/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),

    validation: (id: string) =>
      request<{ success: boolean; validation: ValidationResult }>(
        `/api/datasets/${encodeURIComponent(id)}/validation`
      ),

    eda: (id: string) =>
      request<{ success: boolean; report: EdaReport }>(
        `/api/datasets/${encodeURIComponent(id)}/eda`
      ),

    drift: (id: string) =>
      request<{ success: boolean; validation: ValidationResult; drift: DataDriftMetric[] }>(
        `/api/datasets/${encodeURIComponent(id)}/drift`
      ),

    analytics: (id: string) =>
      request<{ success: boolean; analytics: AnalyticsSummary }>(
        `/api/datasets/${encodeURIComponent(id)}/analytics`
      ),

    transform: (id: string, action: string, column?: string) =>
      request<{ success: boolean; dataset: Dataset; step: TransformationStep; undoCount: number }>(
        `/api/datasets/${encodeURIComponent(id)}/transform`,
        {
          method: 'POST',
          body: JSON.stringify({ action, column }),
        }
      ),

    undo: (id: string) =>
      request<{ success: boolean; dataset: Dataset; undoCount: number }>(
        `/api/datasets/${encodeURIComponent(id)}/undo`,
        { method: 'POST' }
      ),

    saveVersion: (id: string, description: string, changesSummary: string[]) =>
      request<{ success: boolean; dataset: Dataset; version: DatasetVersion }>(
        `/api/datasets/${encodeURIComponent(id)}/versions`,
        {
          method: 'POST',
          body: JSON.stringify({ description, changesSummary }),
        }
      ),
  },

  pipelines: {
    list: () => request<{ success: boolean; pipelines: Pipeline[] }>('/api/pipelines'),
    create: (payload: {
      name: string;
      description?: string;
      datasetId: string;
      trigger: Pipeline['trigger'];
      targetName?: string;
    }) =>
      request<{ success: boolean; pipeline: Pipeline }>('/api/pipelines', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    run: (id: string) =>
      request<{ success: boolean; pipeline: Pipeline }>(
        `/api/pipelines/${encodeURIComponent(id)}/run`,
        { method: 'POST' }
      ),
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/pipelines/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  warehouse: {
    listConnections: () =>
      request<{ success: boolean; connections: WarehouseConnection[] }>('/api/warehouse/connections'),
    createConnection: (payload: {
      name: string;
      type: WarehouseConnection['type'];
      host: string;
      port?: number;
      database: string;
    }) =>
      request<{ success: boolean; connection: WarehouseConnection }>('/api/warehouse/connections', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    removeConnection: (id: string) =>
      request<{ success: boolean }>(`/api/warehouse/connections/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    listTables: () =>
      request<{ success: boolean; tables: WarehouseTable[] }>('/api/warehouse/tables'),
    query: (query: string, connectionId?: string) =>
      request<{ success: boolean; result: SqlQueryResult }>('/api/warehouse/query', {
        method: 'POST',
        body: JSON.stringify({ query, connectionId }),
      }),
  },

  models: {
    list: () => request<{ success: boolean; models: TrainedModel[] }>('/api/models'),
    train: (payload: {
      name?: string;
      datasetId: string;
      taskType: MlTaskType;
      algorithm: MlAlgorithm;
      targetFeature: string;
      predictorFeatures: string[];
      hyperparameters: ModelHyperparameters;
    }) =>
      request<{ success: boolean; model: TrainedModel; experimentRun: ExperimentRun }>(
        '/api/models/train',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      ),
    updateStatus: (id: string, status: string) =>
      request<{ success: boolean; model: TrainedModel }>(
        `/api/models/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        }
      ),
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/models/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
    predict: (id: string, input: Record<string, any>) =>
      request<{ success: boolean; prediction: any; probability?: number; clusterId?: number; latencyMs: number }>(
        `/api/models/${encodeURIComponent(id)}/predict`,
        {
          method: 'POST',
          body: JSON.stringify({ input }),
        }
      ),
  },

  experiments: {
    list: () => request<{ success: boolean; runs: ExperimentRun[] }>('/api/experiments'),
    updateTag: (id: string, tag: string) =>
      request<{ success: boolean; run: ExperimentRun }>(
        `/api/experiments/${encodeURIComponent(id)}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ tag }),
        }
      ),
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/experiments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      }),
  },

  reports: {
    generate: (datasetId: string, modelId?: string) =>
      request<{ success: boolean; markdown: string; filename: string }>('/api/reports/generate', {
        method: 'POST',
        body: JSON.stringify({ datasetId, modelId }),
      }),
  },
};
