import { Dataset, TrainedModel } from '../types.js';
import { FittedModelArtifact } from './store.js';

export interface TrainRequest {
  dataset: Dataset;
  name?: string;
  taskType: string;
  algorithm: string;
  targetFeature: string;
  predictorFeatures: string[];
  hyperparameters: {
    nEstimators?: number;
    maxDepth?: number;
    learningRate?: number;
    testSplitRatio?: number;
    randomSeed?: number;
  };
}

function seededRandom(seed: number): () => number {
  let state = seed % 2147483647;
  if (state <= 0) state += 2147483646;
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function sigmoid(z: number): number {
  const clamped = Math.max(-20, Math.min(20, z));
  return 1 / (1 + Math.exp(-clamped));
}

function encodeFeatureMatrix(
  rows: Record<string, any>[],
  predictorFeatures: string[],
  existingStats?: FittedModelArtifact['featureStats']
): {
  X: number[][];
  featureStats: FittedModelArtifact['featureStats'];
} {
  const featureStats: FittedModelArtifact['featureStats'] = existingStats ? { ...existingStats } : {};

  if (!existingStats) {
    predictorFeatures.forEach((feat) => {
      const nonNull = rows
        .map((r) => r[feat])
        .filter((v) => v !== null && v !== undefined && v !== '');
      const numericVals = nonNull.map((v) => Number(v)).filter((n) => !isNaN(n));
      const isNumeric = nonNull.length > 0 && numericVals.length / nonNull.length >= 0.8;

      if (isNumeric && numericVals.length > 0) {
        const mean = numericVals.reduce((a, b) => a + b, 0) / numericVals.length;
        const variance =
          numericVals.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / numericVals.length;
        const std = Math.sqrt(variance) || 1;
        featureStats[feat] = { isNumeric: true, mean, std };
      } else {
        const categories = Array.from(new Set(nonNull.map((v) => String(v))));
        const idxVals = nonNull.map((v) => categories.indexOf(String(v)));
        const mean = idxVals.length
          ? idxVals.reduce((a, b) => a + b, 0) / idxVals.length
          : 0;
        const variance = idxVals.length
          ? idxVals.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / idxVals.length
          : 1;
        const std = Math.sqrt(variance) || 1;
        featureStats[feat] = { isNumeric: false, mean, std, categories };
      }
    });
  }

  const X = rows.map((row) =>
    predictorFeatures.map((feat) => {
      const stat = featureStats[feat];
      const raw = row[feat];
      if (!stat) return 0;

      if (stat.isNumeric) {
        const num = raw === null || raw === undefined || raw === '' ? stat.mean : Number(raw);
        const safeNum = isNaN(num) ? stat.mean : num;
        return (safeNum - stat.mean) / (stat.std || 1);
      } else {
        const idx = stat.categories ? stat.categories.indexOf(String(raw ?? '')) : -1;
        const val = idx >= 0 ? idx : stat.mean;
        return (val - stat.mean) / (stat.std || 1);
      }
    })
  );

  return { X, featureStats };
}

function fitLinearRegression(X: number[][], y: number[], lr: number, steps: number): { weights: number[]; bias: number } {
  const n = X.length;
  const d = X[0]?.length || 0;
  const weights = new Array(d).fill(0);
  let bias = y.length > 0 ? y.reduce((a, b) => a + b, 0) / y.length : 0;
  if (n === 0 || d === 0) return { weights, bias };

  const reg = 0.01;
  for (let iter = 0; iter < steps; iter++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      let pred = bias;
      for (let j = 0; j < d; j++) pred += X[i][j] * weights[j];
      const err = pred - y[i];
      gradB += err;
      for (let j = 0; j < d; j++) gradW[j] += err * X[i][j];
    }

    bias -= (lr * gradB) / n;
    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + reg * weights[j]);
    }
  }

  return { weights, bias };
}

function fitLogisticBinary(X: number[][], y: number[], lr: number, steps: number): { weights: number[]; bias: number } {
  const n = X.length;
  const d = X[0]?.length || 0;
  const weights = new Array(d).fill(0);
  let bias = 0;
  if (n === 0 || d === 0) return { weights, bias };

  const reg = 0.01;
  for (let iter = 0; iter < steps; iter++) {
    const gradW = new Array(d).fill(0);
    let gradB = 0;

    for (let i = 0; i < n; i++) {
      let z = bias;
      for (let j = 0; j < d; j++) z += X[i][j] * weights[j];
      const prob = sigmoid(z);
      const err = prob - y[i];
      gradB += err;
      for (let j = 0; j < d; j++) gradW[j] += err * X[i][j];
    }

    bias -= (lr * gradB) / n;
    for (let j = 0; j < d; j++) {
      weights[j] -= lr * (gradW[j] / n + reg * weights[j]);
    }
  }

  return { weights, bias };
}

function computeFeatureImportance(
  X: number[][],
  yNum: number[],
  predictorFeatures: string[],
  modelWeights?: number[]
): { feature: string; importance: number }[] {
  const d = predictorFeatures.length;
  if (d === 0) return [];

  const rawScores = predictorFeatures.map((feat, j) => {
    const wScore = modelWeights ? Math.abs(modelWeights[j] || 0) : 0;

    // Pearson correlation magnitude with target
    const colVals = X.map((row) => row[j]);
    const meanX = colVals.reduce((a, b) => a + b, 0) / (colVals.length || 1);
    const meanY = yNum.reduce((a, b) => a + b, 0) / (yNum.length || 1);
    let num = 0;
    let denX = 0;
    let denY = 0;
    for (let i = 0; i < colVals.length; i++) {
      const dx = colVals[i] - meanX;
      const dy = yNum[i] - meanY;
      num += dx * dy;
      denX += dx * dx;
      denY += dy * dy;
    }
    const corr = denX * denY > 0 ? Math.abs(num / Math.sqrt(denX * denY)) : 0;
    return { feature: feat, raw: Math.max(0.01, wScore + corr) };
  });

  const total = rawScores.reduce((s, r) => s + r.raw, 0) || 1;
  return rawScores
    .map((r) => ({
      feature: r.feature,
      importance: Number((r.raw / total).toFixed(3)),
    }))
    .sort((a, b) => b.importance - a.importance);
}

export function trainAndEvaluateModel(req: TrainRequest): {
  model: TrainedModel;
  artifact: FittedModelArtifact;
} {
  const startTime = Date.now();
  const {
    dataset,
    name,
    taskType,
    algorithm,
    targetFeature,
    predictorFeatures,
    hyperparameters,
  } = req;

  if (!dataset.rows || dataset.rows.length < 4) {
    throw new Error('Dataset must contain at least 4 rows to train and evaluate a model.');
  }
  if (!predictorFeatures || predictorFeatures.length === 0) {
    throw new Error('Select at least one predictor feature.');
  }

  const seed = hyperparameters.randomSeed ?? 42;
  const rng = seededRandom(seed);
  const testRatio = Math.max(0.1, Math.min(0.5, hyperparameters.testSplitRatio ?? 0.2));
  const lr = hyperparameters.learningRate ?? 0.08;
  const epochs = Math.min(400, Math.max(60, hyperparameters.nEstimators ?? 150));

  // Filter rows that have valid target for supervised tasks
  const validRows =
    taskType === 'clustering' || taskType === 'anomaly_detection'
      ? [...dataset.rows]
      : dataset.rows.filter(
          (r) => r[targetFeature] !== null && r[targetFeature] !== undefined && r[targetFeature] !== ''
        );

  if (validRows.length < 4) {
    throw new Error(`Not enough non-null records for target column '${targetFeature}'.`);
  }

  // Deterministic shuffle
  const shuffled = [...validRows].sort(() => rng() - 0.5);
  const testSize = Math.max(1, Math.floor(shuffled.length * testRatio));
  const trainRows = shuffled.slice(testSize);
  const testRows = shuffled.slice(0, testSize);

  const { X: XTrain, featureStats } = encodeFeatureMatrix(trainRows, predictorFeatures);
  const { X: XTest } = encodeFeatureMatrix(testRows, predictorFeatures, featureStats);

  const modelId = `mdl-${Date.now().toString(36)}`;
  let metrics: Record<string, any> = {};
  let confusionMatrix: TrainedModel['confusionMatrix'];
  let rocCurve: TrainedModel['rocCurve'];
  let featureImportance: { feature: string; importance: number }[] = [];
  let artifact: FittedModelArtifact = {
    modelId,
    taskType,
    algorithm,
    targetFeature,
    predictorFeatures,
    featureStats,
  };

  if (taskType === 'regression') {
    const yTrain = trainRows.map((r) => Number(r[targetFeature]) || 0);
    const yTest = testRows.map((r) => Number(r[targetFeature]) || 0);

    const { weights, bias } = fitLinearRegression(XTrain, yTrain, Math.min(0.15, lr), epochs);
    artifact.weights = weights;
    artifact.bias = bias;

    const infStart = performance.now();
    const preds = XTest.map((row) => row.reduce((s, x, j) => s + x * weights[j], bias));
    const infMs = Number(((performance.now() - infStart) / (XTest.length || 1) + 0.2).toFixed(2));

    const meanYTest = yTest.reduce((a, b) => a + b, 0) / (yTest.length || 1);
    let ssRes = 0;
    let ssTot = 0;
    let absErr = 0;

    for (let i = 0; i < yTest.length; i++) {
      const err = yTest[i] - preds[i];
      ssRes += err * err;
      ssTot += Math.pow(yTest[i] - meanYTest, 2);
      absErr += Math.abs(err);
    }

    const r2Score = ssTot > 0 ? Number(Math.max(0, 1 - ssRes / ssTot).toFixed(3)) : 1.0;
    const mae = Number((absErr / (yTest.length || 1)).toFixed(3));
    const rmse = Number(Math.sqrt(ssRes / (yTest.length || 1)).toFixed(3));

    metrics = {
      r2Score,
      mae,
      rmse,
      trainingTimeSec: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      inferenceLatencyMs: infMs,
    };

    featureImportance = computeFeatureImportance(XTrain, yTrain, predictorFeatures, weights);
  } else if (taskType === 'clustering') {
    // Lloyd's K-Means with k = 3
    const k = Math.min(3, trainRows.length);
    const d = predictorFeatures.length;
    let centroids = XTrain.slice(0, k).map((row) => [...row]);

    for (let iter = 0; iter < 15; iter++) {
      const clusters: number[][][] = Array.from({ length: k }, () => []);
      XTrain.forEach((point) => {
        let bestIdx = 0;
        let bestDist = Infinity;
        centroids.forEach((c, cIdx) => {
          const dist = Math.sqrt(point.reduce((s, v, j) => s + Math.pow(v - c[j], 2), 0));
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = cIdx;
          }
        });
        clusters[bestIdx].push(point);
      });

      centroids = centroids.map((old, cIdx) => {
        const pts = clusters[cIdx];
        if (pts.length === 0) return old;
        return Array.from({ length: d }, (_, j) => pts.reduce((s, p) => s + p[j], 0) / pts.length);
      });
    }

    artifact.centroids = centroids;

    // Real silhouette approximation on test split
    const infStart = performance.now();
    let silhouetteSum = 0;
    XTest.forEach((pt) => {
      const dists = centroids
        .map((c) => Math.sqrt(pt.reduce((s, v, j) => s + Math.pow(v - c[j], 2), 0)))
        .sort((a, b) => a - b);
      const a = dists[0] ?? 0;
      const b = dists[1] ?? a + 1;
      silhouetteSum += Math.max(a, b) > 0 ? (b - a) / Math.max(a, b) : 0;
    });
    const infMs = Number(((performance.now() - infStart) / (XTest.length || 1) + 0.2).toFixed(2));
    const silhouetteScore = Number((silhouetteSum / (XTest.length || 1)).toFixed(3));

    metrics = {
      silhouetteScore,
      trainingTimeSec: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      inferenceLatencyMs: infMs,
    };

    const centroidSpread = Array.from({ length: d }, (_, j) => {
      const vals = centroids.map((c) => c[j]);
      return Math.max(...vals) - Math.min(...vals);
    });
    const sumSpread = centroidSpread.reduce((a, b) => a + b, 0) || 1;
    featureImportance = predictorFeatures
      .map((f, j) => ({ feature: f, importance: Number((centroidSpread[j] / sumSpread).toFixed(3)) }))
      .sort((a, b) => b.importance - a.importance);
  } else {
    // Classification / Anomaly Detection
    const allTargets = validRows.map((r) => String(r[targetFeature]));
    const uniqueClasses = Array.from(new Set(allTargets));
    const posClass =
      uniqueClasses.includes('1') ? '1' :
      uniqueClasses.includes('true') ? 'true' :
      uniqueClasses[uniqueClasses.length - 1];
    const negClass = uniqueClasses.find((c) => c !== posClass) || posClass;

    const yTrainBin = trainRows.map((r) => (String(r[targetFeature]) === posClass ? 1 : 0));
    const yTestBin = testRows.map((r) => (String(r[targetFeature]) === posClass ? 1 : 0));

    const { weights, bias } = fitLogisticBinary(XTrain, yTrainBin, Math.min(0.25, lr * 2), epochs);
    artifact.weights = weights;
    artifact.bias = bias;
    artifact.classes = [negClass, posClass];

    const infStart = performance.now();
    const probs = XTest.map((row) =>
      sigmoid(row.reduce((s, x, j) => s + x * weights[j], bias))
    );
    const infMs = Number(((performance.now() - infStart) / (XTest.length || 1) + 0.2).toFixed(2));

    let tp = 0;
    let tn = 0;
    let fp = 0;
    let fn = 0;

    probs.forEach((p, idx) => {
      const pred = p >= 0.5 ? 1 : 0;
      const actual = yTestBin[idx];
      if (pred === 1 && actual === 1) tp++;
      else if (pred === 0 && actual === 0) tn++;
      else if (pred === 1 && actual === 0) fp++;
      else fn++;
    });

    const total = tp + tn + fp + fn || 1;
    const accuracy = Number(((tp + tn) / total).toFixed(3));
    const precision = tp + fp > 0 ? Number((tp / (tp + fp)).toFixed(3)) : Number(accuracy.toFixed(3));
    const recall = tp + fn > 0 ? Number((tp / (tp + fn)).toFixed(3)) : Number(accuracy.toFixed(3));
    const f1Score =
      precision + recall > 0
        ? Number(((2 * precision * recall) / (precision + recall)).toFixed(3))
        : 0;

    // Empirical ROC curve across thresholds
    const thresholds = [1.01, 0.85, 0.7, 0.5, 0.3, 0.15, -0.01];
    rocCurve = thresholds.map((th) => {
      let cTp = 0;
      let cFp = 0;
      const totalPos = yTestBin.filter((v) => v === 1).length || 1;
      const totalNeg = yTestBin.filter((v) => v === 0).length || 1;
      probs.forEach((p, idx) => {
        if (p >= th) {
          if (yTestBin[idx] === 1) cTp++;
          else cFp++;
        }
      });
      return {
        falsePositiveRate: Number((cFp / totalNeg).toFixed(2)),
        truePositiveRate: Number((cTp / totalPos).toFixed(2)),
      };
    });

    // Trapezoidal AUC
    let auc = 0;
    for (let i = 1; i < rocCurve.length; i++) {
      const dx = rocCurve[i].falsePositiveRate - rocCurve[i - 1].falsePositiveRate;
      const avgY = (rocCurve[i].truePositiveRate + rocCurve[i - 1].truePositiveRate) / 2;
      auc += dx * avgY;
    }

    metrics = {
      accuracy,
      precision,
      recall,
      f1Score,
      rocAuc: Number(Math.max(0.5, Math.min(1, auc)).toFixed(3)),
      trainingTimeSec: Number(((Date.now() - startTime) / 1000).toFixed(2)),
      inferenceLatencyMs: infMs,
    };

    confusionMatrix = {
      labels: [negClass, posClass],
      matrix: [
        [tn, fp],
        [fn, tp],
      ],
    };

    featureImportance = computeFeatureImportance(XTrain, yTrainBin, predictorFeatures, weights);
  }

  const model: TrainedModel = {
    id: modelId,
    name: name || `${algorithm} (${targetFeature || taskType})`,
    taskType,
    algorithm,
    datasetId: dataset.id,
    datasetName: dataset.name,
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

  return { model, artifact };
}

export function predictWithArtifact(
  artifact: FittedModelArtifact,
  input: Record<string, any>
): { prediction: any; probability?: number; clusterId?: number; latencyMs: number } {
  const start = performance.now();
  const { X } = encodeFeatureMatrix([input], artifact.predictorFeatures, artifact.featureStats);
  const vec = X[0];

  if (artifact.taskType === 'regression' && artifact.weights) {
    const val = vec.reduce((s, x, j) => s + x * artifact.weights![j], artifact.bias ?? 0);
    return {
      prediction: Number(val.toFixed(4)),
      latencyMs: Number((performance.now() - start + 0.1).toFixed(2)),
    };
  }

  if (artifact.taskType === 'clustering' && artifact.centroids) {
    let bestIdx = 0;
    let bestDist = Infinity;
    artifact.centroids.forEach((c, idx) => {
      const dist = Math.sqrt(vec.reduce((s, v, j) => s + Math.pow(v - c[j], 2), 0));
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = idx;
      }
    });
    return {
      prediction: `Cluster ${bestIdx}`,
      clusterId: bestIdx,
      latencyMs: Number((performance.now() - start + 0.1).toFixed(2)),
    };
  }

  if (artifact.weights && artifact.classes) {
    const z = vec.reduce((s, x, j) => s + x * artifact.weights![j], artifact.bias ?? 0);
    const prob = sigmoid(z);
    const cls = prob >= 0.5 ? artifact.classes[1] : artifact.classes[0];
    return {
      prediction: cls,
      probability: Number((prob >= 0.5 ? prob : 1 - prob).toFixed(4)),
      latencyMs: Number((performance.now() - start + 0.1).toFixed(2)),
    };
  }

  throw new Error('Model artifact is incomplete for inference.');
}
