import React, { useState, useEffect } from 'react';
import SleekToast, { toast } from 'sleek-toast';
import { Header } from './components/layout/Header';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { ProfileModal } from './components/layout/ProfileModal';
import { AuthModal } from './components/auth/AuthModal';
import { DatasetUpload } from './components/datasets/DatasetUpload';
import { DatasetViewer } from './components/datasets/DatasetViewer';
import { DataValidation } from './components/validation/DataValidation';
import { DataCleaning } from './components/cleaning/DataCleaning';
import { PipelineManager } from './components/pipelines/PipelineManager';
import { WarehouseExplorer } from './components/warehouse/WarehouseExplorer';
import { ExploratoryAnalysis } from './components/eda/ExploratoryAnalysis';
import { AnalyticsDashboard } from './components/dashboard/AnalyticsDashboard';
import { ModelStudio } from './components/ml/ModelStudio';
import { ModelEvaluation } from './components/ml/ModelEvaluation';
import { QualityMonitoring } from './components/quality/QualityMonitoring';
import { ExperimentReports } from './components/experiments/ExperimentReports';
import { Dataset, ExperimentRun, Pipeline, TrainedModel, User, UserRole } from './types';
import { INITIAL_DATASETS } from './data/sampleDatasets';
import { getBaselineTrainedModels } from './utils/mlEngine';

export function App() {
  // Authentication & Profile State
  const [user, setUser] = useState<User | null>({
    id: 'usr-admin-demo',
    name: 'Jordan Hayes',
    email: 'jordan.hayes@dataforge.io',
    organization: 'DataForge Engineering Lab',
    role: 'ML Engineer',
    createdAt: '2026-11-01T00:00:00Z',
  });

  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>('datasets');

  // Datasets State
  const [datasets, setDatasets] = useState<Dataset[]>(INITIAL_DATASETS);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(INITIAL_DATASETS[0].id);

  // Models State
  const [models, setModels] = useState<TrainedModel[]>(getBaselineTrainedModels());

  // Pipelines State
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRun[]>([
    {
      id: 'run-884',
      experimentName: 'Customer Retention Analysis',
      runName: 'rf_depth12_n150',
      modelId: 'mdl-baseline-rf',
      algorithm: 'Random Forest',
      metrics: { accuracy: 0.938, f1Score: 0.933, rocAuc: 0.962 },
      parameters: { nEstimators: 150, maxDepth: 12 },
      durationSec: 2.14,
      author: 'Data Scientist',
      createdAt: '2026-11-20T10:30:00Z',
      tag: 'Production',
    },
    {
      id: 'run-902',
      experimentName: 'Customer Retention Analysis',
      runName: 'gbm_depth6_lr0.05',
      modelId: 'mdl-baseline-gbm',
      algorithm: 'Gradient Boosting (GBM)',
      metrics: { accuracy: 0.952, f1Score: 0.952, rocAuc: 0.978 },
      parameters: { nEstimators: 200, maxDepth: 6, lr: 0.05 },
      durationSec: 3.42,
      author: 'Lead Engineer',
      createdAt: '2026-11-20T14:45:00Z',
      tag: 'Candidate',
    },
  ]);

  // Sync with backend on startup
  useEffect(() => {
    fetch('/api/datasets')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.datasets && data.datasets.length > 0) {
          const backendDatasets = data.datasets as Dataset[];
          const existingIds = new Set(INITIAL_DATASETS.map((d) => d.id));
          const additions = backendDatasets.filter((d) => !existingIds.has(d.id));
          if (additions.length > 0) {
            setDatasets([...INITIAL_DATASETS, ...additions]);
          }
        }
      })
      .catch(() => {});

    fetch('/api/pipelines')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.pipelines) {
          setPipelines(data.pipelines);
        }
      })
      .catch(() => {});
  }, []);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0] || null;

  const handleDatasetCreated = (newDataset: Dataset) => {
    setDatasets([newDataset, ...datasets]);
    setActiveDatasetId(newDataset.id);
    setActiveTab('datasets');
  };

  const handleUpdateDataset = (updated: Dataset) => {
    setDatasets(datasets.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleModelCreated = (newModel: TrainedModel) => {
    setModels([newModel, ...models]);
    const newExp: ExperimentRun = {
      id: `run-${Date.now().toString().slice(-4)}`,
      experimentName: `${newModel.datasetName} Benchmark`,
      runName: `${newModel.algorithm.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v1`,
      modelId: newModel.id,
      algorithm: newModel.algorithm,
      metrics: {
        accuracy: newModel.metrics.accuracy || 0,
        f1Score: newModel.metrics.f1Score || 0,
        rocAuc: newModel.metrics.rocAuc || 0,
      },
      parameters: newModel.hyperparameters,
      durationSec: newModel.metrics.trainingTimeSec,
      author: user?.name || 'Engineer',
      createdAt: new Date().toISOString(),
      tag: 'Candidate',
    };
    setExperiments([newExp, ...experiments]);
    setActiveTab('evaluation');
  };

  const handleUpdateRole = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
      toast.info(`Updated role: ${newRole}`);
    }
  };

  const handleLogout = () => {
    setUser(null);
    toast.info('Signed out of DataForge');
  };

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-black selection:text-white">
      <SleekToast position="top-right" />

      {/* Header */}
      <Header
        user={user}
        datasets={datasets}
        activeDataset={activeDataset}
        onSelectDataset={(id) => {
          setActiveDatasetId(id);
          const matched = datasets.find((d) => d.id === id);
          if (matched) toast.info(`Dataset switched to: ${matched.name}`);
        }}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          datasetCount={datasets.length}
        />

        {/* Content View */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
          {activeTab === 'datasets' && (
            <DatasetViewer
              dataset={activeDataset}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'upload' && (
            <DatasetUpload
              onDatasetCreated={handleDatasetCreated}
              onSelectDataset={(id) => {
                setActiveDatasetId(id);
                setActiveTab('datasets');
              }}
            />
          )}

          {activeTab === 'validation' && (
            <DataValidation
              dataset={activeDataset}
              onNavigateToCleaning={() => setActiveTab('cleaning')}
            />
          )}

          {activeTab === 'cleaning' && (
            <DataCleaning
              dataset={activeDataset}
              onUpdateDataset={handleUpdateDataset}
            />
          )}

          {activeTab === 'pipelines' && <PipelineManager pipelines={pipelines} />}

          {activeTab === 'warehouse' && <WarehouseExplorer />}

          {activeTab === 'eda' && <ExploratoryAnalysis dataset={activeDataset} />}

          {activeTab === 'dashboard' && <AnalyticsDashboard dataset={activeDataset} />}

          {activeTab === 'ml_studio' && (
            <ModelStudio
              dataset={activeDataset}
              onModelCreated={handleModelCreated}
              onNavigateToEvaluation={() => setActiveTab('evaluation')}
            />
          )}

          {activeTab === 'evaluation' && <ModelEvaluation models={models} />}

          {activeTab === 'quality' && <QualityMonitoring dataset={activeDataset} />}

          {activeTab === 'experiments' && (
            <ExperimentReports
              dataset={activeDataset}
              models={models}
              experiments={experiments}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={(newUser) => setUser(newUser)}
      />

      {user && (
        <ProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onUpdateRole={handleUpdateRole}
        />
      )}
    </div>
  );
}

export default App;
