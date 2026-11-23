import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SleekToast, { toast } from 'sleek-toast';
import { useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { ProfileModal } from './components/layout/ProfileModal';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
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
import { Dataset, ExperimentRun, Pipeline, TrainedModel } from './types';
import { INITIAL_DATASETS } from './data/sampleDatasets';
import { getBaselineTrainedModels } from './utils/mlEngine';

export function App() {
  const { user, logout, updateRole } = useAuth();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);

  // Datasets State
  const [datasets, setDatasets] = useState<Dataset[]>(INITIAL_DATASETS);
  const [activeDatasetId, setActiveDatasetId] = useState<string>(INITIAL_DATASETS[0].id);

  // Models State
  const [models, setModels] = useState<TrainedModel[]>(getBaselineTrainedModels());

  // Pipelines & Experiments State
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
    navigate('/');
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
    navigate('/evaluation');
  };

  const handleLogout = () => {
    logout();
    toast.info('Signed out');
  };

  return (
    <>
      <SleekToast position="top-right" />

      <Routes>
        {/* Full-Page Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Platform Workspace Shell */}
        <Route
          path="/*"
          element={
            <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
              <Header
                user={user}
                datasets={datasets}
                activeDataset={activeDataset}
                onSelectDataset={(id) => {
                  setActiveDatasetId(id);
                  const matched = datasets.find((d) => d.id === id);
                  if (matched) toast.info(`Switched dataset: ${matched.name}`);
                }}
                onOpenProfile={() => setIsProfileOpen(true)}
                onLogout={handleLogout}
              />

              <div className="flex-1 flex overflow-hidden">
                <Sidebar datasetCount={datasets.length} />

                <main className="flex-1 overflow-y-auto p-6 sm:p-8 bg-white">
                  <Routes>
                    <Route
                      path="/"
                      element={<DatasetViewer dataset={activeDataset} onNavigateTab={(tab) => navigate(tab === 'datasets' ? '/' : `/${tab}`)} />}
                    />
                    <Route
                      path="/datasets"
                      element={<Navigate to="/" replace />}
                    />
                    <Route
                      path="/upload"
                      element={
                        <DatasetUpload
                          onDatasetCreated={handleDatasetCreated}
                          onSelectDataset={(id) => {
                            setActiveDatasetId(id);
                            navigate('/');
                          }}
                        />
                      }
                    />
                    <Route
                      path="/validation"
                      element={
                        <DataValidation
                          dataset={activeDataset}
                          onNavigateToCleaning={() => navigate('/cleaning')}
                        />
                      }
                    />
                    <Route
                      path="/cleaning"
                      element={
                        <DataCleaning
                          dataset={activeDataset}
                          onUpdateDataset={handleUpdateDataset}
                        />
                      }
                    />
                    <Route
                      path="/pipelines"
                      element={<PipelineManager pipelines={pipelines} />}
                    />
                    <Route
                      path="/warehouse"
                      element={<WarehouseExplorer />}
                    />
                    <Route
                      path="/eda"
                      element={<ExploratoryAnalysis dataset={activeDataset} />}
                    />
                    <Route
                      path="/dashboard"
                      element={<AnalyticsDashboard dataset={activeDataset} />}
                    />
                    <Route
                      path="/models"
                      element={
                        <ModelStudio
                          dataset={activeDataset}
                          onModelCreated={handleModelCreated}
                          onNavigateToEvaluation={() => navigate('/evaluation')}
                        />
                      }
                    />
                    <Route
                      path="/evaluation"
                      element={<ModelEvaluation models={models} />}
                    />
                    <Route
                      path="/quality"
                      element={<QualityMonitoring dataset={activeDataset} />}
                    />
                    <Route
                      path="/reports"
                      element={
                        <ExperimentReports
                          dataset={activeDataset}
                          models={models}
                          experiments={experiments}
                        />
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>

              {/* Profile & API Tokens Modal */}
              {user && (
                <ProfileModal
                  isOpen={isProfileOpen}
                  onClose={() => setIsProfileOpen(false)}
                  user={user}
                  onUpdateRole={(newRole) => {
                    updateRole(newRole);
                    toast.info(`Updated role: ${newRole}`);
                  }}
                />
              )}
            </div>
          }
        />
      </Routes>
    </>
  );
}

export default App;
