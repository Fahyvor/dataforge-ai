import React, { useState, useEffect, useCallback } from 'react';
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
import { api } from './services/api';

export function App() {
  const { user, logout, updateRole } = useAuth();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState<boolean>(false);
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState<boolean>(true);

  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [activeDatasetId, setActiveDatasetId] = useState<string>('');
  const [models, setModels] = useState<TrainedModel[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [experiments, setExperiments] = useState<ExperimentRun[]>([]);

  const loadWorkspaceData = useCallback(async () => {
    setIsLoadingWorkspace(true);
    try {
      const [dsRes, pipeRes, mdlRes, expRes] = await Promise.all([
        api.datasets.list(),
        api.pipelines.list(),
        api.models.list(),
        api.experiments.list(),
      ]);

      setDatasets(dsRes.datasets);
      setPipelines(pipeRes.pipelines);
      setModels(mdlRes.models);
      setExperiments(expRes.runs);

      setActiveDatasetId((prev) => {
        if (prev && dsRes.datasets.some((d) => d.id === prev)) return prev;
        return dsRes.datasets[0]?.id || '';
      });
    } catch {
      // keep clean empty state if backend is not reachable yet
    } finally {
      setIsLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    loadWorkspaceData();
  }, [loadWorkspaceData]);

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) || datasets[0] || null;

  const handleDatasetCreated = (newDataset: Dataset) => {
    setDatasets((prev) => [newDataset, ...prev]);
    setActiveDatasetId(newDataset.id);
    navigate('/');
  };

  const handleUpdateDataset = (updated: Dataset) => {
    setDatasets((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
  };

  const handleDeleteDataset = async (id: string) => {
    try {
      await api.datasets.remove(id);
      setDatasets((prev) => {
        const remaining = prev.filter((d) => d.id !== id);
        if (activeDatasetId === id) {
          setActiveDatasetId(remaining[0]?.id || '');
        }
        return remaining;
      });
      toast.info('Dataset deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete dataset');
    }
  };

  const handleModelCreated = (newModel: TrainedModel, newExperiment: ExperimentRun) => {
    setModels((prev) => [newModel, ...prev]);
    setExperiments((prev) => [newExperiment, ...prev]);
    navigate('/evaluation');
  };

  const handleLogout = async () => {
    await logout();
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
                      element={
                        <DatasetViewer
                          dataset={activeDataset}
                          isLoading={isLoadingWorkspace}
                          onDeleteDataset={handleDeleteDataset}
                        />
                      }
                    />
                    <Route path="/datasets" element={<Navigate to="/" replace />} />
                    <Route
                      path="/upload"
                      element={<DatasetUpload onDatasetCreated={handleDatasetCreated} />}
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
                      element={
                        <PipelineManager
                          pipelines={pipelines}
                          datasets={datasets}
                          onPipelineCreated={(p) => setPipelines((prev) => [p, ...prev])}
                          onPipelineUpdated={(updated) => {
                            setPipelines((prev) =>
                              prev.map((p) => (p.id === updated.id ? updated : p))
                            );
                            // Refresh dataset in case cleaner step mutated records
                            loadWorkspaceData();
                          }}
                          onPipelineDeleted={(id) =>
                            setPipelines((prev) => prev.filter((p) => p.id !== id))
                          }
                        />
                      }
                    />
                    <Route path="/warehouse" element={<WarehouseExplorer />} />
                    <Route path="/eda" element={<ExploratoryAnalysis dataset={activeDataset} />} />
                    <Route path="/dashboard" element={<AnalyticsDashboard dataset={activeDataset} />} />
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
                      element={
                        <ModelEvaluation
                          models={models}
                          onModelUpdated={(updated) => {
                            setModels((prev) =>
                              prev.map((m) => (m.id === updated.id ? updated : m))
                            );
                            api.experiments.list().then((r) => setExperiments(r.runs)).catch(() => {});
                          }}
                          onModelDeleted={(id) =>
                            setModels((prev) => prev.filter((m) => m.id !== id))
                          }
                        />
                      }
                    />
                    <Route path="/quality" element={<QualityMonitoring dataset={activeDataset} />} />
                    <Route
                      path="/reports"
                      element={
                        <ExperimentReports
                          dataset={activeDataset}
                          models={models}
                          experiments={experiments}
                          onExperimentUpdated={(updated) =>
                            setExperiments((prev) =>
                              prev.map((e) => (e.id === updated.id ? updated : e))
                            )
                          }
                          onExperimentDeleted={(id) =>
                            setExperiments((prev) => prev.filter((e) => e.id !== id))
                          }
                        />
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>

              {user && (
                <ProfileModal
                  isOpen={isProfileOpen}
                  onClose={() => setIsProfileOpen(false)}
                  user={user}
                  onUpdateRole={async (newRole) => {
                    try {
                      await updateRole(newRole);
                      toast.info(`Updated role: ${newRole}`);
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to update role');
                    }
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
