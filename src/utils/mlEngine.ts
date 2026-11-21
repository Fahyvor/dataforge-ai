import {
  ConfusionMatrixData,
  FeatureImportance,
  MlAlgorithm,
  MlTaskType,
  ModelHyperparameters,
  ModelMetrics,
  TrainedModel,
} from '../types';

export interface TrainModelRequest {
  datasetId: string;
  datasetName: string;
  rows: Record<string, any>[];
  targetFeature: string;
  predictorFeatures: string[];
  taskType: MlTaskType;
  algorithm: MlAlgorithm;
  hyperparameters: ModelHyperparameters;
}

/**
 * Machine learning model simulation & evaluation engine
 */
export async function trainMachineLearningModel(
  req: TrainModelRequest,
  onProgress?: (progress: number, loss: number) => void
): Promise<TrainedModel> {
  const {
    datasetId,
    datasetName,
    rows,
    targetFeature,
    predictorFeatures,
    taskType,
    algorithm,
    hyperparameters,
  } = req;

  const startTime = Date.now();
  const totalSteps = 20;

  // Simulate training iterations with progressive loss reduction
  let initialLoss = taskType === 'regression' ? 45.2 : 0.88;
  for (let i = 1; i <= totalSteps; i++) {
    await new Promise((res) => setTimeout(res, 35));
    initialLoss = Math.max(
      taskType === 'regression' ? 2.4 : 0.12,
      initialLoss * 0.92 + (Math.random() - 0.5) * 0.02
    );
    if (onProgress) {
      onProgress(Math.round((i / totalSteps) * 100), Number(initialLoss.toFixed(4)));
    }
  }

  const durationSec = Number(((Date.now() - startTime) / 1000).toFixed(2));

  // Compute feature importance ranking
  const rawImportance = predictorFeatures.map((feat) => {
    // Generate pseudo deterministic weight based on feature name string length & algorithm
    const weight = (feat.length * 13 + (algorithm.length % 7) * 9) % 100 + 10;
    return { feature: feat, raw: weight };
  });
  const sumWeights = rawImportance.reduce((s, item) => s + item.raw, 0) || 1;
  const featureImportance: FeatureImportance[] = rawImportance
    .map((item) => ({
      feature: item.feature,
      importance: Number((item.raw / sumWeights).toFixed(3)),
    }))
    .sort((a, b) => b.importance - a.importance);

  // Compute performance metrics
  let metrics: ModelMetrics;
  let confusionMatrix: ConfusionMatrixData | undefined;
  let rocCurve: { falsePositiveRate: number; truePositiveRate: number }[] | undefined;

  if (taskType === 'classification' || taskType === 'anomaly_detection') {
    // Realistic classification metrics based on algorithm strength
    const baseAcc =
      algorithm.includes('Gradient') || algorithm.includes('Random Forest')
        ? 0.91 + Math.random() * 0.05
        : 0.84 + Math.random() * 0.06;

    const accuracy = Number(baseAcc.toFixed(3));
    const precision = Number(Math.min(0.99, accuracy + (Math.random() - 0.5) * 0.04).toFixed(3));
    const recall = Number(Math.min(0.99, accuracy + (Math.random() - 0.5) * 0.04).toFixed(3));
    const f1Score = Number(((2 * precision * recall) / (precision + recall || 1)).toFixed(3));
    const rocAuc = Number(Math.min(0.99, accuracy + 0.03).toFixed(3));

    metrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc,
      trainingTimeSec: durationSec,
      inferenceLatencyMs: Number((1.2 + Math.random() * 1.5).toFixed(1)),
    };

    // Construct 2x2 confusion matrix
    const totalSamples = rows.length || 50;
    const tp = Math.round(totalSamples * 0.42 * recall);
    const fn = Math.round(totalSamples * 0.42 * (1 - recall));
    const fp = Math.round(totalSamples * 0.58 * (1 - precision));
    const tn = Math.round(totalSamples * 0.58 - fp);

    confusionMatrix = {
      labels: ['Negative (0)', 'Positive (1)'],
      matrix: [
        [Math.max(1, tn), Math.max(0, fp)],
        [Math.max(0, fn), Math.max(1, tp)],
      ],
    };

    rocCurve = [
      { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
      { falsePositiveRate: 0.05, truePositiveRate: 0.48 },
      { falsePositiveRate: 0.12, truePositiveRate: 0.76 },
      { falsePositiveRate: 0.22, truePositiveRate: 0.88 },
      { falsePositiveRate: 0.35, truePositiveRate: 0.94 },
      { falsePositiveRate: 0.65, truePositiveRate: 0.98 },
      { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
    ];
  } else if (taskType === 'regression') {
    const r2 = Number((0.85 + Math.random() * 0.1).toFixed(3));
    const mae = Number((2.15 + Math.random() * 0.8).toFixed(2));
    const rmse = Number((Math.sqrt(mae * 1.45) * 2).toFixed(2));

    metrics = {
      r2Score: r2,
      mae,
      rmse,
      trainingTimeSec: durationSec,
      inferenceLatencyMs: Number((0.9 + Math.random() * 1.1).toFixed(1)),
    };
  } else {
    // Clustering
    metrics = {
      silhouetteScore: Number((0.68 + Math.random() * 0.18).toFixed(3)),
      trainingTimeSec: durationSec,
      inferenceLatencyMs: 0.8,
    };
  }

  const modelId = `mdl-${Date.now().toString(36)}`;
  return {
    id: modelId,
    name: `${algorithm} - ${targetFeature || 'Cluster'} Model`,
    taskType,
    algorithm,
    datasetId,
    datasetName,
    targetFeature,
    predictorFeatures,
    hyperparameters,
    metrics,
    confusionMatrix,
    rocCurve,
    featureImportance,
    createdAt: new Date().toISOString(),
    status: 'ready',
    version: '1.0.0',
  };
}

/**
 * Generate initial benchmark models for the leaderboard
 */
export function getBaselineTrainedModels(): TrainedModel[] {
  return [
    {
      id: 'mdl-baseline-rf',
      name: 'Random Forest Churn Predictor',
      taskType: 'classification',
      algorithm: 'Random Forest',
      datasetId: 'ds-churn-enterprise',
      datasetName: 'Customer Churn & LTV Telemetry',
      targetFeature: 'Churn',
      predictorFeatures: [
        'TenureMonths',
        'MonthlyCharges',
        'SupportTickets',
        'UsageHoursWeekly',
        'Age',
      ],
      hyperparameters: {
        nEstimators: 150,
        maxDepth: 12,
        testSplitRatio: 0.2,
        randomSeed: 42,
      },
      metrics: {
        accuracy: 0.938,
        precision: 0.921,
        recall: 0.945,
        f1Score: 0.933,
        rocAuc: 0.962,
        trainingTimeSec: 2.14,
        inferenceLatencyMs: 1.8,
      },
      confusionMatrix: {
        labels: ['Retained (0)', 'Churned (1)'],
        matrix: [
          [28, 2],
          [1, 14],
        ],
      },
      rocCurve: [
        { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
        { falsePositiveRate: 0.04, truePositiveRate: 0.55 },
        { falsePositiveRate: 0.08, truePositiveRate: 0.82 },
        { falsePositiveRate: 0.18, truePositiveRate: 0.94 },
        { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
      ],
      featureImportance: [
        { feature: 'SupportTickets', importance: 0.384 },
        { feature: 'UsageHoursWeekly', importance: 0.265 },
        { feature: 'MonthlyCharges', importance: 0.178 },
        { feature: 'TenureMonths', importance: 0.112 },
        { feature: 'Age', importance: 0.061 },
      ],
      createdAt: '2026-11-20T10:30:00Z',
      status: 'deployed',
      version: '1.2.0',
    },
    {
      id: 'mdl-baseline-gbm',
      name: 'Gradient Boosting (GBM) Risk Classifier',
      taskType: 'classification',
      algorithm: 'Gradient Boosting (GBM)',
      datasetId: 'ds-churn-enterprise',
      datasetName: 'Customer Churn & LTV Telemetry',
      targetFeature: 'Churn',
      predictorFeatures: [
        'TenureMonths',
        'MonthlyCharges',
        'SupportTickets',
        'UsageHoursWeekly',
        'Age',
      ],
      hyperparameters: {
        nEstimators: 200,
        maxDepth: 6,
        learningRate: 0.05,
        testSplitRatio: 0.2,
        randomSeed: 42,
      },
      metrics: {
        accuracy: 0.952,
        precision: 0.948,
        recall: 0.956,
        f1Score: 0.952,
        rocAuc: 0.978,
        trainingTimeSec: 3.42,
        inferenceLatencyMs: 2.1,
      },
      confusionMatrix: {
        labels: ['Retained (0)', 'Churned (1)'],
        matrix: [
          [29, 1],
          [1, 14],
        ],
      },
      rocCurve: [
        { falsePositiveRate: 0.0, truePositiveRate: 0.0 },
        { falsePositiveRate: 0.02, truePositiveRate: 0.62 },
        { falsePositiveRate: 0.06, truePositiveRate: 0.89 },
        { falsePositiveRate: 0.12, truePositiveRate: 0.97 },
        { falsePositiveRate: 1.0, truePositiveRate: 1.0 },
      ],
      featureImportance: [
        { feature: 'SupportTickets', importance: 0.412 },
        { feature: 'UsageHoursWeekly', importance: 0.288 },
        { feature: 'MonthlyCharges', importance: 0.154 },
        { feature: 'TenureMonths', importance: 0.098 },
        { feature: 'Age', importance: 0.048 },
      ],
      createdAt: '2026-11-20T14:45:00Z',
      status: 'ready',
      version: '1.0.0',
    },
  ];
}
