import {
  AnalyticsSummary,
  ColumnSchema,
  ColumnStat,
  CorrelationCell,
  DataDriftMetric,
  Dataset,
  EdaReport,
  Pipeline,
  TransformationStep,
  ValidationIssue,
  ValidationResult,
} from '../types.js';

export function inferSchema(rows: Record<string, any>[]): ColumnSchema[] {
  if (!rows || rows.length === 0) return [];

  const keys = Array.from(
    rows.reduce<Set<string>>((acc, row) => {
      Object.keys(row).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  return keys.map((key) => {
    let nullCount = 0;
    let numericCount = 0;
    let integerCount = 0;
    let booleanCount = 0;
    let dateCount = 0;
    const distinctSet = new Set<any>();
    const samples: any[] = [];
    const scanLimit = Math.min(rows.length, 200);

    for (let i = 0; i < scanLimit; i++) {
      const val = rows[i][key];
      if (val === null || val === undefined || val === '') {
        nullCount++;
      } else {
        distinctSet.add(val);
        if (samples.length < 4) samples.push(val);

        if (typeof val === 'number') {
          numericCount++;
          if (Number.isInteger(val)) integerCount++;
        } else if (typeof val === 'boolean' || val === 'true' || val === 'false') {
          booleanCount++;
        } else if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed !== '' && !isNaN(Number(trimmed))) {
            numericCount++;
            if (Number.isInteger(Number(trimmed))) integerCount++;
          } else if ((val.includes('-') || val.includes('/')) && !isNaN(Date.parse(val))) {
            dateCount++;
          }
        }
      }
    }

    const validCount = scanLimit - nullCount;
    let type: ColumnSchema['type'] = 'string';

    if (validCount > 0) {
      if (booleanCount / validCount > 0.8) {
        type = 'boolean';
      } else if (numericCount / validCount > 0.8) {
        type = integerCount / validCount > 0.8 ? 'integer' : 'float';
      } else if (dateCount / validCount > 0.8) {
        type = 'datetime';
      } else if (distinctSet.size <= 12 && rows.length >= 5) {
        type = 'categorical';
      }
    }

    return {
      name: key,
      type,
      nullable: nullCount > 0,
      sampleValues: samples,
    };
  });
}

export function validateDataset(
  datasetId: string,
  rows: Record<string, any>[],
  columns: ColumnSchema[]
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const totalRows = rows.length;

  if (totalRows === 0 || columns.length === 0) {
    return {
      datasetId,
      totalChecks: 0,
      passedChecks: 0,
      qualityScore: 100,
      issues: [],
      completenessRatio: 1,
      validityRatio: 1,
      uniquenessRatio: 1,
      timestamp: new Date().toISOString(),
    };
  }

  let totalNullCells = 0;
  const totalCells = totalRows * columns.length;

  columns.forEach((col) => {
    let nulls = 0;
    const values: number[] = [];

    rows.forEach((r) => {
      const v = r[col.name];
      if (v === null || v === undefined || v === '') {
        nulls++;
      } else if (col.type === 'integer' || col.type === 'float') {
        const num = Number(v);
        if (!isNaN(num)) values.push(num);
      }
    });

    totalNullCells += nulls;

    if (nulls > 0) {
      const ratio = nulls / totalRows;
      issues.push({
        column: col.name,
        severity: ratio > 0.1 ? 'error' : 'warning',
        type: 'missing_values',
        message: `${nulls} records (${(ratio * 100).toFixed(1)}%) contain missing/null entries`,
        affectedCount: nulls,
        affectedRatio: ratio,
        suggestedFix:
          col.type === 'integer' || col.type === 'float'
            ? 'Impute with median value or drop affected rows'
            : 'Drop affected rows or normalize string values',
      });
    }

    if ((col.type === 'integer' || col.type === 'float') && values.length >= 8) {
      values.sort((a, b) => a - b);
      const q1 = values[Math.floor(values.length * 0.25)];
      const q3 = values[Math.floor(values.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const outliers = values.filter((v) => v < lowerBound || v > upperBound);
      if (outliers.length > 0 && iqr > 0) {
        const ratio = outliers.length / values.length;
        issues.push({
          column: col.name,
          severity: ratio > 0.05 ? 'warning' : 'info',
          type: 'outlier',
          message: `${outliers.length} records fall outside the 1.5x IQR threshold [${lowerBound.toFixed(1)}, ${upperBound.toFixed(1)}]`,
          affectedCount: outliers.length,
          affectedRatio: ratio,
          suggestedFix: 'Apply StandardScaler or MinMaxScaler normalization',
        });
      }
    }
  });

  const stringifiedRows = rows.map((r) => JSON.stringify(r));
  const uniqueCount = new Set(stringifiedRows).size;
  const duplicateCount = totalRows - uniqueCount;

  if (duplicateCount > 0) {
    issues.push({
      column: '_all_',
      severity: 'warning',
      type: 'unique_violation',
      message: `${duplicateCount} duplicate rows detected across records`,
      affectedCount: duplicateCount,
      affectedRatio: duplicateCount / totalRows,
      suggestedFix: 'Execute deduplication transformation to preserve unique records',
    });
  }

  const completenessRatio = totalCells > 0 ? Math.max(0, 1 - totalNullCells / totalCells) : 1;
  const uniquenessRatio = totalRows > 0 ? Math.max(0, uniqueCount / totalRows) : 1;
  const validityRatio = Math.max(0, 1 - issues.filter((i) => i.severity === 'error').length * 0.1);

  const qualityScore = Math.round(
    completenessRatio * 40 + uniquenessRatio * 30 + validityRatio * 30
  );

  return {
    datasetId,
    totalChecks: columns.length * 3 + 1,
    passedChecks: Math.max(0, columns.length * 3 + 1 - issues.length),
    qualityScore: Math.min(100, Math.max(20, qualityScore)),
    issues,
    completenessRatio,
    validityRatio,
    uniquenessRatio,
    timestamp: new Date().toISOString(),
  };
}

export function applyTransformation(
  rows: Record<string, any>[],
  columns: ColumnSchema[],
  step: TransformationStep
): { updatedRows: Record<string, any>[]; updatedColumns: ColumnSchema[]; impactNote: string } {
  let updatedRows = rows.map((r) => ({ ...r }));
  let updatedColumns = [...columns];
  let impactNote = '';

  const { action, column } = step;

  switch (action) {
    case 'drop_missing': {
      const initialCount = updatedRows.length;
      if (column) {
        updatedRows = updatedRows.filter(
          (r) => r[column] !== null && r[column] !== undefined && r[column] !== ''
        );
      } else {
        updatedRows = updatedRows.filter((r) =>
          Object.values(r).every((v) => v !== null && v !== undefined && v !== '')
        );
      }
      const dropped = initialCount - updatedRows.length;
      impactNote = `Dropped ${dropped} records containing null values`;
      break;
    }

    case 'impute_mean': {
      if (!column) break;
      const validNums = updatedRows
        .map((r) => Number(r[column]))
        .filter((n) => !isNaN(n) && rIsPresent(n));
      if (validNums.length === 0) {
        impactNote = `No numeric values found in '${column}' for mean imputation`;
        break;
      }
      const meanVal = validNums.reduce((a, b) => a + b, 0) / validNums.length;
      let count = 0;
      updatedRows.forEach((r) => {
        if (r[column] === null || r[column] === undefined || r[column] === '') {
          r[column] = Number(meanVal.toFixed(2));
          count++;
        }
      });
      updatedColumns = updatedColumns.map((c) =>
        c.name === column ? { ...c, nullable: false } : c
      );
      impactNote = `Imputed ${count} nulls in '${column}' with mean (${meanVal.toFixed(2)})`;
      break;
    }

    case 'impute_median': {
      if (!column) break;
      const validNums = updatedRows
        .filter((r) => r[column] !== null && r[column] !== undefined && r[column] !== '')
        .map((r) => Number(r[column]))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);
      if (validNums.length === 0) {
        impactNote = `No numeric values found in '${column}' for median imputation`;
        break;
      }
      const mid = Math.floor(validNums.length / 2);
      const medianVal =
        validNums.length % 2 !== 0 ? validNums[mid] : (validNums[mid - 1] + validNums[mid]) / 2;
      let count = 0;
      updatedRows.forEach((r) => {
        if (r[column] === null || r[column] === undefined || r[column] === '') {
          r[column] = Number(medianVal.toFixed(2));
          count++;
        }
      });
      updatedColumns = updatedColumns.map((c) =>
        c.name === column ? { ...c, nullable: false } : c
      );
      impactNote = `Imputed ${count} nulls in '${column}' with median (${medianVal.toFixed(2)})`;
      break;
    }

    case 'drop_duplicates': {
      const initial = updatedRows.length;
      const seen = new Set<string>();
      updatedRows = updatedRows.filter((r) => {
        const key = JSON.stringify(r);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      impactNote = `Removed ${initial - updatedRows.length} duplicate records`;
      break;
    }

    case 'scale_standard': {
      if (!column) break;
      const vals = updatedRows.map((r) => Number(r[column])).filter((n) => !isNaN(n));
      if (vals.length === 0) {
        impactNote = `Column '${column}' contains no numeric values to scale`;
        break;
      }
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / vals.length;
      const std = Math.sqrt(variance) || 1;
      const scaledCol = `${column}_std`;
      updatedRows.forEach((r) => {
        const v = Number(r[column]);
        r[scaledCol] = isNaN(v) ? 0 : Number(((v - mean) / std).toFixed(4));
      });
      if (!updatedColumns.some((c) => c.name === scaledCol)) {
        updatedColumns.push({
          name: scaledCol,
          type: 'float',
          nullable: false,
          sampleValues: updatedRows.slice(0, 3).map((r) => r[scaledCol]),
        });
      }
      impactNote = `Standardized '${column}' to Z-score column '${scaledCol}' (mean=0, std=1)`;
      break;
    }

    case 'scale_minmax': {
      if (!column) break;
      const vals = updatedRows.map((r) => Number(r[column])).filter((n) => !isNaN(n));
      if (vals.length === 0) {
        impactNote = `Column '${column}' contains no numeric values to scale`;
        break;
      }
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const range = max - min || 1;
      const scaledCol = `${column}_minmax`;
      updatedRows.forEach((r) => {
        const v = Number(r[column]);
        r[scaledCol] = isNaN(v) ? 0 : Number(((v - min) / range).toFixed(4));
      });
      if (!updatedColumns.some((c) => c.name === scaledCol)) {
        updatedColumns.push({
          name: scaledCol,
          type: 'float',
          nullable: false,
          sampleValues: updatedRows.slice(0, 3).map((r) => r[scaledCol]),
        });
      }
      impactNote = `Min-Max normalized '${column}' into [0.0, 1.0] as '${scaledCol}'`;
      break;
    }

    case 'one_hot_encode': {
      if (!column) break;
      const categories = Array.from(
        new Set(updatedRows.map((r) => String(r[column] ?? 'Unknown')))
      ).slice(0, 20);
      categories.forEach((cat) => {
        const oheName = `${column}_${cat.replace(/[^a-zA-Z0-9]/g, '_')}`;
        updatedRows.forEach((r) => {
          r[oheName] = String(r[column] ?? 'Unknown') === cat ? 1 : 0;
        });
        if (!updatedColumns.some((c) => c.name === oheName)) {
          updatedColumns.push({
            name: oheName,
            type: 'integer',
            nullable: false,
            sampleValues: [0, 1],
          });
        }
      });
      impactNote = `One-Hot Encoded '${column}' into ${categories.length} binary features`;
      break;
    }

    case 'lowercase_strings': {
      if (!column) break;
      let changed = 0;
      updatedRows.forEach((r) => {
        if (typeof r[column] === 'string') {
          r[column] = r[column].trim().toLowerCase();
          changed++;
        }
      });
      impactNote = `Normalized ${changed} text entries in '${column}' to lowercase`;
      break;
    }

    case 'drop_column': {
      if (!column) break;
      updatedRows.forEach((r) => {
        delete r[column];
      });
      updatedColumns = updatedColumns.filter((c) => c.name !== column);
      impactNote = `Dropped column '${column}'`;
      break;
    }

    default:
      impactNote = `Executed ${action}`;
  }

  return { updatedRows, updatedColumns, impactNote };
}

function rIsPresent(v: number): boolean {
  return typeof v === 'number' && !isNaN(v) && isFinite(v);
}

export function generateEdaReport(
  datasetId: string,
  rows: Record<string, any>[],
  columns: ColumnSchema[]
): EdaReport {
  const summaryStats: ColumnStat[] = [];
  const numericColumns: string[] = [];

  columns.forEach((col) => {
    const isNum = col.type === 'integer' || col.type === 'float';
    let nullCount = 0;
    const numVals: number[] = [];
    const catFreq: Record<string, number> = {};

    rows.forEach((r) => {
      const v = r[col.name];
      if (v === null || v === undefined || v === '') {
        nullCount++;
      } else {
        const str = String(v);
        catFreq[str] = (catFreq[str] || 0) + 1;
        if (isNum) {
          const n = Number(v);
          if (!isNaN(n)) numVals.push(n);
        }
      }
    });

    if (isNum && numVals.length > 0) {
      numericColumns.push(col.name);
      numVals.sort((a, b) => a - b);
      const mean = numVals.reduce((a, b) => a + b, 0) / numVals.length;
      const mid = Math.floor(numVals.length / 2);
      const median =
        numVals.length % 2 !== 0 ? numVals[mid] : (numVals[mid - 1] + numVals[mid]) / 2;
      const variance =
        numVals.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / (numVals.length || 1);
      const stdDev = Math.sqrt(variance);
      const m3 =
        numVals.reduce((sum, n) => sum + Math.pow(n - mean, 3), 0) / (numVals.length || 1);
      const skewness = stdDev > 0 ? m3 / Math.pow(stdDev, 3) : 0;

      summaryStats.push({
        column: col.name,
        type: col.type,
        count: rows.length,
        missingCount: nullCount,
        missingPercentage: rows.length ? Number(((nullCount / rows.length) * 100).toFixed(1)) : 0,
        distinctCount: Object.keys(catFreq).length,
        mean: Number(mean.toFixed(2)),
        median: Number(median.toFixed(2)),
        stdDev: Number(stdDev.toFixed(2)),
        min: numVals[0],
        q25: numVals[Math.floor(numVals.length * 0.25)],
        q75: numVals[Math.floor(numVals.length * 0.75)],
        max: numVals[numVals.length - 1],
        skewness: Number(skewness.toFixed(2)),
      });
    } else {
      const sortedCats = Object.entries(catFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([value, count]) => ({
          value,
          count,
          percentage: rows.length ? Number(((count / rows.length) * 100).toFixed(1)) : 0,
        }));

      summaryStats.push({
        column: col.name,
        type: col.type,
        count: rows.length,
        missingCount: nullCount,
        missingPercentage: rows.length ? Number(((nullCount / rows.length) * 100).toFixed(1)) : 0,
        distinctCount: Object.keys(catFreq).length,
        topCategories: sortedCats,
      });
    }
  });

  const correlations: CorrelationCell[] = [];
  for (let i = 0; i < numericColumns.length; i++) {
    for (let j = 0; j < numericColumns.length; j++) {
      const colA = numericColumns[i];
      const colB = numericColumns[j];
      if (i === j) {
        correlations.push({ colA, colB, coefficient: 1.0 });
      } else {
        const pairs: [number, number][] = [];
        rows.forEach((r) => {
          const a = Number(r[colA]);
          const b = Number(r[colB]);
          if (r[colA] !== null && r[colB] !== null && !isNaN(a) && !isNaN(b)) pairs.push([a, b]);
        });
        if (pairs.length > 2) {
          const meanA = pairs.reduce((sum, p) => sum + p[0], 0) / pairs.length;
          const meanB = pairs.reduce((sum, p) => sum + p[1], 0) / pairs.length;
          let num = 0;
          let denA = 0;
          let denB = 0;
          pairs.forEach(([a, b]) => {
            const diffA = a - meanA;
            const diffB = b - meanB;
            num += diffA * diffB;
            denA += diffA * diffA;
            denB += diffB * diffB;
          });
          const coeff = denA * denB > 0 ? num / Math.sqrt(denA * denB) : 0;
          correlations.push({ colA, colB, coefficient: Number(coeff.toFixed(3)) });
        } else {
          correlations.push({ colA, colB, coefficient: 0 });
        }
      }
    }
  }

  const highCorr = correlations.filter((c) => c.colA !== c.colB && Math.abs(c.coefficient) >= 0.5);
  const keyFindings: string[] = [
    `Dataset profile spans ${rows.length} records across ${columns.length} columns (${numericColumns.length} numerical, ${columns.length - numericColumns.length} non-numeric).`,
  ];

  if (highCorr.length > 0) {
    const topPair = [...highCorr].sort((a, b) => Math.abs(b.coefficient) - Math.abs(a.coefficient))[0];
    keyFindings.push(
      `Notable correlation between ${topPair.colA} and ${topPair.colB} (r = ${topPair.coefficient}).`
    );
  }

  const skewed = summaryStats.filter((s) => s.skewness !== undefined && Math.abs(s.skewness) > 1.0);
  if (skewed.length > 0) {
    keyFindings.push(
      `Feature '${skewed[0].column}' shows distributional skewness (${skewed[0].skewness}).`
    );
  }

  const missingCols = summaryStats.filter((s) => s.missingCount > 0);
  if (missingCols.length > 0) {
    keyFindings.push(
      `${missingCols.length} column(s) contain null entries (highest: '${missingCols[0].column}' at ${missingCols[0].missingPercentage}%).`
    );
  }

  const recommendedActions: string[] = [];
  if (missingCols.length > 0) {
    recommendedActions.push(`Impute or drop null records in ${missingCols.map((m) => m.column).slice(0, 3).join(', ')}.`);
  }
  if (numericColumns.length > 0) {
    recommendedActions.push('Apply StandardScaler or MinMaxScaler on continuous features prior to training.');
  }
  const catCols = columns.filter((c) => c.type === 'categorical');
  if (catCols.length > 0) {
    recommendedActions.push(`One-hot encode categorical dimensions (${catCols.map((c) => c.name).slice(0, 3).join(', ')}).`);
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push('Schema is complete and clean; proceed directly to modeling or warehouse export.');
  }

  const zeroNullCount = summaryStats.filter((s) => s.missingCount === 0).length;
  const executiveSummary = `Statistical profile computed for ${rows.length} rows across ${columns.length} schema attributes. ${zeroNullCount} of ${columns.length} columns have 100% completeness. Pairwise correlations were evaluated across ${numericColumns.length} numerical features.`;

  return {
    datasetId,
    summaryStats,
    correlations,
    executiveSummary,
    keyFindings,
    recommendedActions,
  };
}

export function calculateDrift(
  baselineRows: Record<string, any>[],
  currentRows: Record<string, any>[],
  columns: ColumnSchema[]
): DataDriftMetric[] {
  const metrics: DataDriftMetric[] = [];
  const numCols = columns.filter((c) => c.type === 'integer' || c.type === 'float');

  numCols.forEach((col) => {
    const baseVals = baselineRows
      .filter((r) => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== '')
      .map((r) => Number(r[col.name]))
      .filter((n) => !isNaN(n));
    const currVals = currentRows
      .filter((r) => r[col.name] !== null && r[col.name] !== undefined && r[col.name] !== '')
      .map((r) => Number(r[col.name]))
      .filter((n) => !isNaN(n));

    if (baseVals.length < 2 || currVals.length < 2) return;

    const baseMean = baseVals.reduce((a, b) => a + b, 0) / baseVals.length;
    const currMean = currVals.reduce((a, b) => a + b, 0) / currVals.length;

    const baseStd = Math.sqrt(
      baseVals.reduce((s, v) => s + Math.pow(v - baseMean, 2), 0) / baseVals.length
    ) || 1;
    const zShift = Math.abs(currMean - baseMean) / baseStd;
    const psiScore = Number(Math.min(1, zShift * 0.25).toFixed(3));

    let status: DataDriftMetric['status'] = 'stable';
    if (psiScore > 0.25) status = 'critical_drift';
    else if (psiScore > 0.1) status = 'moderate_drift';

    metrics.push({
      feature: col.name,
      psiScore,
      status,
      baselineMean: Number(baseMean.toFixed(2)),
      currentMean: Number(currMean.toFixed(2)),
      pValue: Number(Math.max(0.001, 1 - psiScore * 2).toFixed(3)),
    });
  });

  return metrics;
}

export function computeAnalytics(
  dataset: Dataset,
  pipelines: Pipeline[]
): AnalyticsSummary {
  const rows = dataset.rows;
  const cols = dataset.columns;
  const validation = validateDataset(dataset.id, rows, cols);

  // Pick best categorical or low-cardinality column for Segment Distribution
  let segmentCol = cols.find(
    (c) => c.type === 'categorical' || c.type === 'boolean'
  );
  if (!segmentCol) {
    segmentCol = cols.find((c) => {
      const uniq = new Set(rows.map((r) => String(r[c.name] ?? ''))).size;
      return uniq > 1 && uniq <= 12;
    });
  }

  let segmentLabel = segmentCol ? `Distribution by ${segmentCol.name}` : 'Schema Column Types';
  let segments: { name: string; count: number; percentage: number }[] = [];

  if (segmentCol && rows.length > 0) {
    const counts: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r[segmentCol!.name] !== null && r[segmentCol!.name] !== undefined && r[segmentCol!.name] !== ''
        ? String(r[segmentCol!.name])
        : 'Null / Missing';
      counts[key] = (counts[key] || 0) + 1;
    });
    segments = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({
        name,
        count,
        percentage: Math.round((count / rows.length) * 100),
      }));
  } else {
    const typeCounts: Record<string, number> = {};
    cols.forEach((c) => {
      typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
    });
    segments = Object.entries(typeCounts).map(([name, count]) => ({
      name,
      count,
      percentage: cols.length ? Math.round((count / cols.length) * 100) : 0,
    }));
  }

  // Real partition/batch completeness health across chunks of rows (real data quality across chunks)
  const chunkCount = Math.min(6, Math.max(1, rows.length));
  const chunkSize = Math.max(1, Math.ceil(rows.length / chunkCount));
  const batchHealth: { label: string; score: number }[] = [];

  for (let i = 0; i < chunkCount; i++) {
    const slice = rows.slice(i * chunkSize, (i + 1) * chunkSize);
    if (slice.length === 0) break;
    let nonNull = 0;
    const cells = slice.length * cols.length;
    slice.forEach((r) => {
      cols.forEach((c) => {
        const v = r[c.name];
        if (v !== null && v !== undefined && v !== '') nonNull++;
      });
    });
    const score = cells > 0 ? Math.round((nonNull / cells) * 100) : 100;
    batchHealth.push({
      label: `Part ${i + 1} (${slice.length}r)`,
      score,
    });
  }

  const matchingPipelines = pipelines.filter((p) => p.datasetId === dataset.id && p.throughputRecsPerSec);
  const throughputRecsPerSec = matchingPipelines.length > 0
    ? Math.round(
        matchingPipelines.reduce((s, p) => s + (p.throughputRecsPerSec || 0), 0) /
          matchingPipelines.length
      )
    : 0;

  const typeCounts: Record<string, number> = {};
  cols.forEach((c) => {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  });

  return {
    datasetId: dataset.id,
    rowCount: dataset.rowCount,
    columnCount: dataset.columnCount,
    qualityScore: validation.qualityScore,
    completenessPct: Number((validation.completenessRatio * 100).toFixed(1)),
    throughputRecsPerSec,
    segmentLabel,
    segments,
    batchHealth,
    schemaBreakdown: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
  };
}
