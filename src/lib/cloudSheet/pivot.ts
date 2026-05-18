/**
 * 피벗 테이블 엔진 (MVP).
 *
 * 입력: 시트 cells + 원본 범위 + PivotConfig
 * 출력: 결과 cells (A1 좌상단 헤더부터 배치)
 *
 * 알고리즘:
 *   1) 범위에서 헤더 row 추출 → 컬럼 인덱스 lookup
 *   2) 데이터 row 들을 객체로 변환 (col name → value)
 *   3) filters 적용 (모두 AND, criteria 매칭은 SUMIF 와 동일 패턴)
 *   4) groupBy(rowCol[, colCol]) 한 뒤 각 그룹의 values 컬럼에 agg 적용
 *   5) 행/열 라벨 정렬 + 결과 cells 출력
 *
 * 제한:
 *   · rows / cols 각 1개만 (다차원 v2).
 *   · 결과 cells 는 A1 부터 시작 — 별도 시트에 그대로 set 하는 용도.
 */

import { idxToCol } from './formula';
import type { PivotAgg, PivotConfig, PivotValueSpec } from './pivotTypes';

type Cells = Record<string, string>;

export interface PivotRange {
  minR: number;  // 0-based
  minC: number;
  maxR: number;  // inclusive
  maxC: number;
}

/** "A1:D100" 형식 파싱. 실패 시 throw. */
export function parsePivotRange(range: string): PivotRange {
  const m = range.trim().match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!m) throw new Error('범위 형식: A1:D100');
  const colToIdx = (c: string): number => {
    let n = 0;
    for (const ch of c.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };
  const r1 = Number(m[2]) - 1;
  const r2 = Number(m[4]) - 1;
  const c1 = colToIdx(m[1]);
  const c2 = colToIdx(m[3]);
  return {
    minR: Math.min(r1, r2),
    maxR: Math.max(r1, r2),
    minC: Math.min(c1, c2),
    maxC: Math.max(c1, c2),
  };
}

/** 범위 내 데이터를 [{col1: v, col2: v, ...}] 행 배열로. 첫 행은 헤더. */
export function extractRows(cells: Cells, range: PivotRange): {
  headers: string[];
  rows: Array<Record<string, string>>;
} {
  const headers: string[] = [];
  for (let c = range.minC; c <= range.maxC; c++) {
    const ref = `${idxToCol(c)}${range.minR + 1}`;
    headers.push((cells[ref] ?? '').trim() || `col${c}`);
  }
  const rows: Array<Record<string, string>> = [];
  for (let r = range.minR + 1; r <= range.maxR; r++) {
    const row: Record<string, string> = {};
    let allEmpty = true;
    for (let c = range.minC; c <= range.maxC; c++) {
      const ref = `${idxToCol(c)}${r + 1}`;
      const v = cells[ref] ?? '';
      if (v !== '') allEmpty = false;
      row[headers[c - range.minC]] = v;
    }
    if (!allEmpty) rows.push(row);
  }
  return { headers, rows };
}

/** SUMIF 식 criteria 매칭 — 숫자 비교 / 와일드카드 / 단순 == 지원. */
function matchCriteria(value: string, criteria: string): boolean {
  if (typeof criteria !== 'string') return false;
  const m = criteria.match(/^\s*(>=|<=|<>|>|<|=)\s*(.*)$/);
  if (m) {
    const op = m[1];
    const rhs = m[2].trim();
    const rhsN = Number(rhs);
    const valN = Number(value);
    if (Number.isFinite(rhsN) && Number.isFinite(valN)) {
      switch (op) {
        case '>': return valN > rhsN;
        case '<': return valN < rhsN;
        case '>=': return valN >= rhsN;
        case '<=': return valN <= rhsN;
        case '<>': return valN !== rhsN;
        default: return valN === rhsN;
      }
    }
    if (op === '=') return value === rhs;
    if (op === '<>') return value !== rhs;
    return false;
  }
  if (criteria.includes('*') || criteria.includes('?')) {
    const re = new RegExp('^' + criteria
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.') + '$', 'i');
    return re.test(value);
  }
  return value === criteria;
}

function aggregate(values: number[], agg: PivotAgg): number {
  if (values.length === 0) return 0;
  switch (agg) {
    case 'sum':   return values.reduce((a, b) => a + b, 0);
    case 'avg':   return values.reduce((a, b) => a + b, 0) / values.length;
    case 'count': return values.length;
    case 'min':   return Math.min(...values);
    case 'max':   return Math.max(...values);
  }
}

/**
 * 피벗 실행 — cells + 범위 + config → 결과 cells (A1 부터).
 */
export function runPivot(cells: Cells, range: PivotRange, config: PivotConfig): Cells {
  const { headers, rows } = extractRows(cells, range);

  // 필터 적용
  const filtered = (config.filters ?? []).reduce(
    (acc, f) => acc.filter((row) => matchCriteria(row[f.col] ?? '', f.criteria)),
    rows,
  );

  // 헤더 존재 검증
  if (!headers.includes(config.rowCol)) {
    throw new Error(`행 컬럼 "${config.rowCol}" 을 헤더에서 찾을 수 없어요`);
  }
  if (config.colCol && !headers.includes(config.colCol)) {
    throw new Error(`열 컬럼 "${config.colCol}" 을 헤더에서 찾을 수 없어요`);
  }
  for (const v of config.values) {
    if (!headers.includes(v.col)) {
      throw new Error(`값 컬럼 "${v.col}" 을 헤더에서 찾을 수 없어요`);
    }
  }

  // 그룹화
  // rowKey → (colKey → row[]) — colKey 없으면 빈 문자열 통일
  const groups = new Map<string, Map<string, Array<Record<string, string>>>>();
  const rowLabels = new Set<string>();
  const colLabels = new Set<string>();
  for (const row of filtered) {
    const rk = row[config.rowCol] ?? '';
    const ck = config.colCol ? (row[config.colCol] ?? '') : '';
    rowLabels.add(rk);
    colLabels.add(ck);
    if (!groups.has(rk)) groups.set(rk, new Map());
    const inner = groups.get(rk)!;
    if (!inner.has(ck)) inner.set(ck, []);
    inner.get(ck)!.push(row);
  }

  // 정렬
  const rowOrder = Array.from(rowLabels);
  const colOrder = Array.from(colLabels).sort();
  if (config.sort === 'rowAsc') rowOrder.sort();
  else if (config.sort === 'rowDesc') rowOrder.sort().reverse();
  else {
    // totalDesc (기본) — 첫 value 합계 기준
    const v0 = config.values[0];
    if (v0) {
      const total = (rk: string): number => {
        let acc = 0;
        for (const ck of colOrder) {
          const rs = groups.get(rk)?.get(ck) ?? [];
          for (const r of rs) {
            const n = Number(r[v0.col]);
            if (Number.isFinite(n)) acc += n;
          }
        }
        return acc;
      };
      rowOrder.sort((a, b) => total(b) - total(a));
    }
  }

  const valueLabel = (v: PivotValueSpec): string =>
    v.label ?? `${v.agg.toUpperCase()}(${v.col})`;

  // 결과 cells 출력
  // 레이아웃:
  //   - 1행: 헤더. A1 = config.rowCol 명, 이후 (value × col 조합) 또는 (value 만)
  //   - 2행~: 각 rowLabel 의 데이터
  // colCol 있을 때: A1 비움 / B1.. = colLabel 별로 values 펼침 (value 가 1개면 colLabel 그대로,
  //                  2개+면 "colLabel — valueLabel" 형태)
  const out: Cells = {};
  out['A1'] = config.rowCol;

  const colHeaders: string[] = [];
  if (config.colCol) {
    for (const ck of colOrder) {
      for (const v of config.values) {
        colHeaders.push(config.values.length === 1 ? ck : `${ck} — ${valueLabel(v)}`);
      }
    }
  } else {
    for (const v of config.values) colHeaders.push(valueLabel(v));
  }
  colHeaders.forEach((h, i) => {
    out[`${idxToCol(i + 1)}1`] = h;
  });

  // 데이터 행
  rowOrder.forEach((rk, rIdx) => {
    out[`A${rIdx + 2}`] = rk;
    let cIdx = 1;
    if (config.colCol) {
      for (const ck of colOrder) {
        for (const v of config.values) {
          const rs = groups.get(rk)?.get(ck) ?? [];
          const nums = rs.map((r) => Number(r[v.col])).filter(Number.isFinite);
          out[`${idxToCol(cIdx++)}${rIdx + 2}`] = formatNum(aggregate(nums, v.agg));
        }
      }
    } else {
      for (const v of config.values) {
        const rs = groups.get(rk)?.get('') ?? [];
        const nums = rs.map((r) => Number(r[v.col])).filter(Number.isFinite);
        out[`${idxToCol(cIdx++)}${rIdx + 2}`] = formatNum(aggregate(nums, v.agg));
      }
    }
  });

  return out;
}

function formatNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 1e4) / 1e4);
}
