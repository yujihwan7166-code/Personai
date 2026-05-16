/**
 * 시트 수식 평가 엔진 v1.
 *
 * 지원:
 * - 산술: + - * / % ^
 * - 비교: > >= < <= == != (JS 그대로)
 * - 셀 참조: A1, AA10
 * - 범위: A1:B5 (열·행 자동 정렬)
 * - 함수: SUM / AVG / AVERAGE / MIN / MAX / COUNT / IF / ABS / ROUND
 * - 문자열 리터럴: "..."
 * - 숫자
 *
 * 한계:
 * - 순환 참조 → #CIRCULAR
 * - 평가 실패 → #ERROR
 * - 셀이 텍스트면 산술에서 0으로 처리
 * - new Function 으로 평가 (단일 사용자 + 자기 입력이라 안전. 다중 사용자 시 sandboxing 필요)
 *
 * 사용:
 *   evalCell('A1', cells)  → 'A1' 셀이 수식이면 평가 결과, 아니면 raw 값
 *   cells[ref] 가 '=' 로 시작하면 수식으로 인식
 */

type Cells = Record<string, string>;

const FUNC_ORDER = ['AVERAGE', 'AVG', 'SUM', 'MIN', 'MAX', 'COUNT', 'IF', 'ABS', 'ROUND'];

// ─────────────────────────────────────────────
// 셀 좌표 헬퍼
// ─────────────────────────────────────────────

function colToIdx(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

function idxToCol(i: number): string {
  let s = '';
  let n = i;
  while (n >= 0) {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

function collectRange(c1: string, r1: number, c2: string, r2: number): string[] {
  const refs: string[] = [];
  const minC = Math.min(colToIdx(c1), colToIdx(c2));
  const maxC = Math.max(colToIdx(c1), colToIdx(c2));
  const minR = Math.min(r1, r2);
  const maxR = Math.max(r1, r2);
  for (let r = minR; r <= maxR; r++) {
    for (let c = minC; c <= maxC; c++) {
      refs.push(`${idxToCol(c)}${r}`);
    }
  }
  return refs;
}

// ─────────────────────────────────────────────
// 평가
// ─────────────────────────────────────────────

/** 셀 평가 — 수식이면 결과, 아니면 raw 값. */
export function evalCell(ref: string, cells: Cells): string {
  return evalWithGuard(ref, cells, new Set());
}

function evalWithGuard(ref: string, cells: Cells, visiting: Set<string>): string {
  const raw = cells[ref] ?? '';
  if (!raw.startsWith('=')) return raw;
  if (visiting.has(ref)) return '#CIRCULAR';
  const next = new Set(visiting);
  next.add(ref);
  try {
    const result = evalExpr(raw.slice(1), cells, next);
    return formatResult(result);
  } catch {
    return '#ERROR';
  }
}

function formatResult(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') {
    if (Number.isNaN(v)) return '#NUM!';
    if (!Number.isFinite(v)) return '#DIV/0!';
    if (Number.isInteger(v)) return String(v);
    // 소수점 6자리 까지
    return String(Math.round(v * 1e6) / 1e6);
  }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

function evalExpr(expr: string, cells: Cells, visiting: Set<string>): unknown {
  let work = expr;

  // 1. 범위 (A1:B5) 평가 → 숫자 배열
  work = work.replace(/([A-Z]+)(\d+):([A-Z]+)(\d+)/g, (_m, c1, r1, c2, r2) => {
    const refs = collectRange(c1 as string, Number(r1), c2 as string, Number(r2));
    const values = refs.map((r) => {
      const v = evalWithGuard(r, cells, visiting);
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    });
    return `[${values.join(',')}]`;
  });

  // 2. 단일 셀 참조 (A1) → 숫자 또는 문자열 리터럴
  //    함수 이름과 혼동 방지: lookbehind 로 알파벳·_ 뒤가 아닐 때만 매칭
  work = work.replace(/(?<![A-Za-z_])([A-Z]+)(\d+)\b/g, (_m, c, r) => {
    const ref = `${c}${r}`;
    const v = evalWithGuard(ref, cells, visiting);
    if (v.startsWith('#')) return '0';  // 에러 셀은 0으로
    const n = Number(v);
    if (Number.isFinite(n) && v.trim() !== '') return String(n);
    // 빈 셀이나 텍스트는 0 또는 JSON 문자열
    if (v === '') return '0';
    return JSON.stringify(v);
  });

  // 3. 함수 이름 → __funcname (긴 이름부터 처리: AVERAGE 먼저)
  for (const fn of FUNC_ORDER) {
    const re = new RegExp(`\\b${fn}\\b`, 'gi');
    work = work.replace(re, `__${fn.toLowerCase()}`);
  }

  // 4. ^ → ** (지수)
  work = work.replace(/\^/g, '**');

  // 5. 안전 함수들 정의
  const toArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [v]);
  const toNums = (v: unknown): number[] => toArr(v).map((x) => {
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  });

  const __sum = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.reduce((a, b) => a + b, 0);
  };
  const __avg = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.length ? __sum(flat) / flat.length : 0;
  };
  const __average = __avg;
  const __min = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.length ? Math.min(...flat) : 0;
  };
  const __max = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.length ? Math.max(...flat) : 0;
  };
  const __count = (...args: unknown[]) => {
    const flat = args.flatMap(toArr);
    return flat.filter((x) => {
      if (typeof x === 'number') return !Number.isNaN(x);
      const n = Number(x);
      return Number.isFinite(n) && String(x).trim() !== '';
    }).length;
  };
  const __if = (cond: unknown, a: unknown, b: unknown) => (cond ? a : b);
  const __abs = (n: unknown) => Math.abs(Number(n));
  const __round = (n: unknown, d: unknown = 0) => {
    const p = Math.pow(10, Number(d));
    return Math.round(Number(n) * p) / p;
  };

  // 6. 평가 (new Function — 단일 사용자 환경 가정)
  const fn = new Function(
    '__sum', '__avg', '__average', '__min', '__max', '__count', '__if', '__abs', '__round',
    `"use strict"; return (${work});`,
  );
  return fn(__sum, __avg, __average, __min, __max, __count, __if, __abs, __round);
}

// ─────────────────────────────────────────────
// 일괄 평가 (전체 시트의 모든 displayValue)
// ─────────────────────────────────────────────

/** 전체 셀 맵을 한 번에 평가한 displayValue 맵. */
export function evalAllCells(cells: Cells, rows: number, cols: number): Cells {
  const out: Cells = {};
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ref = `${idxToCol(c)}${r}`;
      const raw = cells[ref];
      if (raw == null) continue;
      out[ref] = raw.startsWith('=') ? evalCell(ref, cells) : raw;
    }
  }
  return out;
}
