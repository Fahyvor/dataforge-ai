import { Dataset, SqlQueryResult, WarehouseTable } from '../types.js';

export function slugifyTableName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'dataset';
}

export function listQueryableTables(datasets: Dataset[]): WarehouseTable[] {
  return datasets.map((ds) => ({
    id: ds.id,
    tableName: slugifyTableName(ds.name),
    datasetName: ds.name,
    rowCount: ds.rowCount,
    sizeBytes: ds.sizeBytes,
    columns: ds.columns.map((c) => ({
      name: c.name,
      type: c.type,
      nullable: c.nullable,
    })),
    updatedAt: ds.updatedAt,
  }));
}

function findDatasetForTable(datasets: Dataset[], tableRef: string): Dataset | undefined {
  const cleanRef = tableRef.replace(/["`\[\]]/g, '').trim();
  const shortRef = cleanRef.includes('.') ? cleanRef.split('.').pop()! : cleanRef;
  const lowerRef = shortRef.toLowerCase();

  return datasets.find(
    (ds) =>
      ds.id.toLowerCase() === lowerRef ||
      slugifyTableName(ds.name) === lowerRef ||
      ds.name.toLowerCase() === lowerRef
  );
}

function parseValueLiteral(raw: string): any {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.toLowerCase() === 'true') return true;
  if (trimmed.toLowerCase() === 'false') return false;
  if (trimmed.toLowerCase() === 'null') return null;
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}

function evaluateCondition(row: Record<string, any>, clause: string): boolean {
  const trimmed = clause.trim();
  if (!trimmed) return true;

  // Handle IS NULL / IS NOT NULL
  const nullMatch = trimmed.match(/^([a-zA-Z0-9_.\s"`]+?)\s+IS\s+(NOT\s+)?NULL$/i);
  if (nullMatch) {
    const colKey = resolveColumnKey(row, nullMatch[1]);
    const val = colKey ? row[colKey] : undefined;
    const isNull = val === null || val === undefined || val === '';
    return nullMatch[2] ? !isNull : isNull;
  }

  // Handle LIKE
  const likeMatch = trimmed.match(/^([a-zA-Z0-9_."`]+)\s+LIKE\s+(.+)$/i);
  if (likeMatch) {
    const colKey = resolveColumnKey(row, likeMatch[1]);
    const val = String(colKey ? row[colKey] ?? '' : '').toLowerCase();
    const pattern = String(parseValueLiteral(likeMatch[2])).toLowerCase().replace(/%/g, '.*');
    return new RegExp(`^${pattern}$`, 'i').test(val);
  }

  // Handle comparison operators
  const opMatch = trimmed.match(/^([a-zA-Z0-9_."`]+)\s*(=|!=|<>|>=|<=|>|<)\s*(.+)$/);
  if (!opMatch) return true;

  const colKey = resolveColumnKey(row, opMatch[1]);
  const op = opMatch[2];
  const expected = parseValueLiteral(opMatch[3]);
  const actual = colKey ? row[colKey] : undefined;

  if (actual === null || actual === undefined) {
    return op === '!=' || op === '<>' ? expected !== null : expected === null;
  }

  const numActual = typeof actual === 'number' ? actual : Number(actual);
  const numExpected = typeof expected === 'number' ? expected : Number(expected);
  const bothNumeric =
    typeof actual !== 'boolean' &&
    typeof expected !== 'boolean' &&
    !isNaN(numActual) &&
    !isNaN(numExpected) &&
    String(actual).trim() !== '' &&
    String(expected).trim() !== '';

  const lhs = bothNumeric ? numActual : String(actual).toLowerCase();
  const rhs = bothNumeric ? numExpected : String(expected).toLowerCase();

  switch (op) {
    case '=':
      return lhs === rhs;
    case '!=':
    case '<>':
      return lhs !== rhs;
    case '>':
      return lhs > rhs;
    case '>=':
      return lhs >= rhs;
    case '<':
      return lhs < rhs;
    case '<=':
      return lhs <= rhs;
    default:
      return true;
  }
}

function resolveColumnKey(row: Record<string, any>, rawCol: string): string | undefined {
  const clean = rawCol.replace(/["`\[\]]/g, '').trim();
  const keys = Object.keys(row);
  if (keys.includes(clean)) return clean;
  const lower = clean.toLowerCase();
  return keys.find((k) => k.toLowerCase() === lower);
}

function matchesWhere(row: Record<string, any>, whereClause: string): boolean {
  const orParts = whereClause.split(/\s+OR\s+/i);
  return orParts.some((orPart) => {
    const andParts = orPart.split(/\s+AND\s+/i);
    return andParts.every((cond) => evaluateCondition(row, cond));
  });
}

function splitSelectExpressions(selectStr: string): string[] {
  const items: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of selectStr) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      if (current.trim()) items.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items;
}

interface ParsedExpr {
  header: string;
  fn?: 'COUNT' | 'AVG' | 'SUM' | 'MIN' | 'MAX';
  column?: string;
  roundDigits?: number;
}

function parseSelectExpression(expr: string): ParsedExpr {
  let working = expr.trim();
  let alias: string | undefined;

  const asMatch = working.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_"`]+)$/i);
  if (asMatch) {
    working = asMatch[1].trim();
    alias = asMatch[2].replace(/["`]/g, '').trim();
  }

  let roundDigits: number | undefined;
  const roundMatch = working.match(/^ROUND\s*\(\s*(.+)\s*,\s*(\d+)\s*\)$/i);
  if (roundMatch) {
    working = roundMatch[1].trim();
    roundDigits = Number(roundMatch[2]);
  }

  const aggMatch = working.match(/^(COUNT|AVG|SUM|MIN|MAX)\s*\(\s*([^)]+)\s*\)$/i);
  if (aggMatch) {
    const fn = aggMatch[1].toUpperCase() as ParsedExpr['fn'];
    const col = aggMatch[2].replace(/["`]/g, '').trim();
    return {
      header: alias || `${fn}_${col === '*' ? 'all' : col}`,
      fn,
      column: col,
      roundDigits,
    };
  }

  const cleanCol = working.replace(/["`]/g, '').trim();
  return {
    header: alias || cleanCol,
    column: cleanCol,
    roundDigits,
  };
}

function computeAggregate(
  groupRows: Record<string, any>[],
  expr: ParsedExpr
): any {
  const { fn, column, roundDigits } = expr;
  if (!fn) {
    const first = groupRows[0];
    const key = column ? resolveColumnKey(first, column) : undefined;
    const rawVal = key ? first[key] : null;
    if (roundDigits !== undefined && typeof rawVal === 'number') {
      return Number(rawVal.toFixed(roundDigits));
    }
    return rawVal ?? null;
  }

  if (fn === 'COUNT') {
    if (column === '*') return groupRows.length;
    return groupRows.filter((r) => {
      const k = column ? resolveColumnKey(r, column) : undefined;
      const v = k ? r[k] : undefined;
      return v !== null && v !== undefined && v !== '';
    }).length;
  }

  const nums = groupRows
    .map((r) => {
      const k = column ? resolveColumnKey(r, column) : undefined;
      return k ? Number(r[k]) : NaN;
    })
    .filter((n) => !isNaN(n));

  if (nums.length === 0) return null;

  let res = 0;
  if (fn === 'SUM') res = nums.reduce((a, b) => a + b, 0);
  else if (fn === 'AVG') res = nums.reduce((a, b) => a + b, 0) / nums.length;
  else if (fn === 'MIN') res = Math.min(...nums);
  else if (fn === 'MAX') res = Math.max(...nums);

  const digits = roundDigits !== undefined ? roundDigits : fn === 'AVG' ? 2 : undefined;
  return digits !== undefined ? Number(res.toFixed(digits)) : res;
}

export function executeSqlQuery(query: string, datasets: Dataset[]): SqlQueryResult {
  const start = Date.now();
  const normalized = query.trim().replace(/;+$/, '').replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      query,
      executionTimeMs: 0,
      rowsAffected: 0,
      columns: [],
      rows: [],
      bytesScannedKb: 0,
      error: 'SQL query cannot be empty.',
    };
  }

  // SHOW TABLES support
  if (/^SHOW\s+TABLES$/i.test(normalized)) {
    const tables = listQueryableTables(datasets);
    return {
      query,
      executionTimeMs: Math.max(1, Date.now() - start),
      rowsAffected: tables.length,
      columns: ['table_name', 'dataset_name', 'row_count', 'column_count', 'updated_at'],
      rows: tables.map((t) => [t.tableName, t.datasetName, t.rowCount, t.columns.length, t.updatedAt]),
      bytesScannedKb: 1,
    };
  }

  const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_."`\[\]]+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
  const match = normalized.match(selectRegex);

  if (!match) {
    return {
      query,
      executionTimeMs: Math.max(1, Date.now() - start),
      rowsAffected: 0,
      columns: [],
      rows: [],
      bytesScannedKb: 0,
      error: 'Unsupported SQL syntax. Expected: SELECT <cols> FROM <table> [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT n] or SHOW TABLES.',
    };
  }

  const [, selectPart, tablePart, wherePart, groupByPart, orderByPart, limitPart] = match;
  const dataset = findDatasetForTable(datasets, tablePart);

  if (!dataset) {
    const available = datasets.map((d) => slugifyTableName(d.name)).join(', ');
    return {
      query,
      executionTimeMs: Math.max(1, Date.now() - start),
      rowsAffected: 0,
      columns: [],
      rows: [],
      bytesScannedKb: 0,
      error: available
        ? `Table '${tablePart}' not found. Available tables: ${available}`
        : `Table '${tablePart}' not found. Upload a dataset first to query it.`,
    };
  }

  const scannedBytes = Buffer.byteLength(JSON.stringify(dataset.rows), 'utf8');
  let filteredRows = dataset.rows;

  if (wherePart) {
    filteredRows = filteredRows.filter((row) => matchesWhere(row, wherePart));
  }

  const selectItems = splitSelectExpressions(selectPart);
  const parsedExprs = selectItems.map(parseSelectExpression);
  const hasAggregate = parsedExprs.some((e) => Boolean(e.fn));

  let resultColumns: string[] = [];
  let resultObjects: Record<string, any>[] = [];

  if (groupByPart || hasAggregate) {
    const groupCols = groupByPart
      ? groupByPart.split(',').map((g) => g.replace(/["`]/g, '').trim())
      : [];

    const groups = new Map<string, Record<string, any>[]>();
    if (filteredRows.length === 0 && !groupByPart) {
      groups.set('__all__', []);
    } else {
      filteredRows.forEach((row) => {
        const keyVals = groupCols.map((gc) => {
          const k = resolveColumnKey(row, gc);
          return k ? String(row[k] ?? 'null') : 'null';
        });
        const gKey = keyVals.join('::') || '__all__';
        if (!groups.has(gKey)) groups.set(gKey, []);
        groups.get(gKey)!.push(row);
      });
    }

    resultColumns = parsedExprs.map((e) => e.header);
    groups.forEach((groupRows) => {
      const outObj: Record<string, any> = {};
      parsedExprs.forEach((expr) => {
        outObj[expr.header] = groupRows.length > 0 ? computeAggregate(groupRows, expr) : (expr.fn === 'COUNT' ? 0 : null);
      });
      resultObjects.push(outObj);
    });
  } else if (selectPart.trim() === '*') {
    resultColumns = dataset.columns.map((c) => c.name);
    resultObjects = filteredRows.map((row) => {
      const obj: Record<string, any> = {};
      resultColumns.forEach((c) => {
        obj[c] = row[c] ?? null;
      });
      return obj;
    });
  } else {
    resultColumns = parsedExprs.map((e) => e.header);
    resultObjects = filteredRows.map((row) => {
      const obj: Record<string, any> = {};
      parsedExprs.forEach((expr) => {
        const key = expr.column ? resolveColumnKey(row, expr.column) : undefined;
        let val = key ? row[key] : null;
        if (expr.roundDigits !== undefined && typeof val === 'number') {
          val = Number(val.toFixed(expr.roundDigits));
        }
        obj[expr.header] = val ?? null;
      });
      return obj;
    });
  }

  if (orderByPart) {
    const orderParts = orderByPart.trim().split(/\s+/);
    const orderCol = orderParts[0].replace(/["`]/g, '');
    const isDesc = orderParts[1]?.toUpperCase() === 'DESC';
    const targetCol =
      resultColumns.find((c) => c.toLowerCase() === orderCol.toLowerCase()) || resultColumns[0];

    if (targetCol) {
      resultObjects.sort((a, b) => {
        const va = a[targetCol];
        const vb = b[targetCol];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        const cmp =
          typeof va === 'number' && typeof vb === 'number'
            ? va - vb
            : String(va).localeCompare(String(vb));
        return isDesc ? -cmp : cmp;
      });
    }
  }

  if (limitPart) {
    const limitNum = parseInt(limitPart, 10);
    if (!isNaN(limitNum) && limitNum >= 0) {
      resultObjects = resultObjects.slice(0, limitNum);
    }
  }

  const finalRows = resultObjects.map((obj) => resultColumns.map((col) => obj[col] ?? null));

  return {
    query,
    executionTimeMs: Math.max(1, Date.now() - start),
    rowsAffected: finalRows.length,
    columns: resultColumns,
    rows: finalRows,
    bytesScannedKb: Number((scannedBytes / 1024).toFixed(2)),
  };
}
