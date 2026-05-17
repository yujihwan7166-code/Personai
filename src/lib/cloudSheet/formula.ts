/**
 * 시트 수식 평가 엔진 v1.
 *
 * 지원:
 * - 산술: + - * / % ^
 * - 비교: > >= < <= == != (JS 그대로)
 * - 셀 참조: A1, AA10
 * - 범위: A1:B5 (열·행 자동 정렬)
 * - 함수: SUM / AVG / AVERAGE / MIN / MAX / COUNT / IF / ABS / ROUND
 *         SUMIF / COUNTIF / SUMIFS / COUNTIFS (criteria: 숫자/문자열/">5" 등)
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

// 긴 이름부터 → SUMIFS/COUNTIFS 가 SUMIF/COUNTIF 보다 먼저 매칭되도록
const FUNC_ORDER = [
  'AVERAGE', 'AVG', 'SUMIFS', 'COUNTIFS', 'SUMIF', 'COUNTIF',
  'SUM', 'MIN', 'MAX', 'COUNT', 'IF', 'ABS', 'ROUND',
];

// ─────────────────────────────────────────────
// 셀 좌표 헬퍼
// ─────────────────────────────────────────────

export function colToIdx(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) {
    n = n * 26 + (ch.charCodeAt(0) - 64);
  }
  return n - 1;
}

export function idxToCol(i: number): string {
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

/**
 * 평가 컨텍스트.
 *  - currentName: 현재 평가 중인 시트 이름 (cross-sheet 참조 시 sheet prefix 가
 *    없으면 이 sheet 에서 조회)
 *  - allSheets: name → cells. 다른 시트 참조 시 lookup. 없으면 cross-sheet
 *    참조는 모두 #REF! 처럼 0/빈 값 처리.
 *  - namedRanges: 글로벌 이름 → 범위 문자열 (예: '월매출' → 'Sheet1!A1:A12').
 *    수식 평가 전에 이름이 그 문자열로 치환됨.
 */
export interface EvalContext {
  currentName?: string;
  allSheets?: Record<string, Cells>;
  namedRanges?: Record<string, string>;
}

/** 셀 평가 — 수식이면 결과, 아니면 raw 값. */
export function evalCell(ref: string, cells: Cells, ctx?: EvalContext): string {
  const sheetName = ctx?.currentName ?? '__default__';
  const allSheets: Record<string, Cells> = ctx?.allSheets ?? { [sheetName]: cells };
  // currentSheet 에 가장 권위 있는 cells 가 항상 들어가도록 보정
  if (allSheets[sheetName] !== cells) {
    allSheets[sheetName] = cells;
  }
  const namedRanges = ctx?.namedRanges ?? {};
  return evalWithGuard(sheetName, ref, allSheets, namedRanges, new Set());
}

function evalWithGuard(
  sheetName: string,
  ref: string,
  allSheets: Record<string, Cells>,
  namedRanges: Record<string, string>,
  visiting: Set<string>,
): string {
  const cells = allSheets[sheetName] ?? {};
  const raw = cells[ref] ?? '';
  if (!raw.startsWith('=')) return raw;
  const key = `${sheetName}!${ref}`;
  if (visiting.has(key)) return '#CIRCULAR';
  const next = new Set(visiting);
  next.add(key);
  try {
    const result = evalExpr(raw.slice(1), sheetName, allSheets, namedRanges, next);
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

function evalExpr(
  expr: string,
  currentSheet: string,
  allSheets: Record<string, Cells>,
  namedRanges: Record<string, string>,
  visiting: Set<string>,
): unknown {
  let work = expr;

  // 0. Named Range 치환 — 가장 먼저. 이름이 함수명·기존 ref 와 안 겹친다 가정.
  //    토큰 경계: 앞뒤가 알파뉴 X. case-insensitive.
  if (Object.keys(namedRanges).length > 0) {
    // 긴 이름부터 (짧은 이름이 긴 이름의 prefix 인 경우 방지)
    const names = Object.keys(namedRanges).sort((a, b) => b.length - a.length);
    for (const name of names) {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 한글·영문·_ 등 word 문자로 시작/끝나는 토큰만 매칭
      const re = new RegExp(`(?<![A-Za-z0-9_가-힣])${safe}(?![A-Za-z0-9_가-힣!])`, 'g');
      work = work.replace(re, `(${namedRanges[name]})`);
    }
  }

  // 1. 범위 (sheet 옵셔널 + A1:B5) — $ 절대 참조 마커는 평가에서 무시
  //    Sheet1!$A$1:$B$5 또는 A1:B5
  work = work.replace(
    /(?:('[^']+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+):\$?([A-Z]+)\$?(\d+)/g,
    (_m, sheetRaw, c1, r1, c2, r2) => {
      const sheet = sheetRaw
        ? String(sheetRaw).replace(/^'|'$/g, '')
        : currentSheet;
      const refs = collectRange(c1 as string, Number(r1), c2 as string, Number(r2));
      const tokens = refs.map((r) => {
        const v = evalWithGuard(sheet, r, allSheets, namedRanges, visiting);
        if (v.startsWith('#')) return '0';
        const n = Number(v);
        if (Number.isFinite(n) && v.trim() !== '') return String(n);
        if (v === '') return '""';
        return JSON.stringify(v);
      });
      return `[${tokens.join(',')}]`;
    },
  );

  // 2. 단일 셀 참조 — Sheet1!$A$1 또는 A1
  //    함수 이름과 혼동 방지: lookbehind 로 알파벳·_ 뒤가 아닐 때만 매칭
  work = work.replace(
    /(?<![A-Za-z_0-9$])(?:('[^']+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)\b/g,
    (_m, sheetRaw, c, r) => {
      const sheet = sheetRaw
        ? String(sheetRaw).replace(/^'|'$/g, '')
        : currentSheet;
      const ref = `${c}${r}`;
      const v = evalWithGuard(sheet, ref, allSheets, namedRanges, visiting);
      if (v.startsWith('#')) return '0';
      const n = Number(v);
      if (Number.isFinite(n) && v.trim() !== '') return String(n);
      if (v === '') return '0';
      return JSON.stringify(v);
    },
  );

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

  /** 단일 값이 엑셀식 criteria 매치하는지 */
  const matchCriteria = (value: unknown, criteria: unknown): boolean => {
    // criteria 가 숫자 → 같으면 매치
    if (typeof criteria === 'number') {
      const n = Number(value);
      return Number.isFinite(n) && n === criteria;
    }
    if (typeof criteria !== 'string') return false;
    // ">5" "<10" ">=3" "<=3" "<>2" "=4" 같은 비교 연산자
    const opMatch = criteria.match(/^\s*(>=|<=|<>|>|<|=)\s*(.*)$/);
    if (opMatch) {
      const op = opMatch[1];
      const rhsStr = opMatch[2].trim();
      const rhsNum = Number(rhsStr);
      const valStr = String(value);
      // 숫자 비교 우선
      if (Number.isFinite(rhsNum) && Number.isFinite(Number(value))) {
        const v = Number(value);
        switch (op) {
          case '>': return v > rhsNum;
          case '<': return v < rhsNum;
          case '>=': return v >= rhsNum;
          case '<=': return v <= rhsNum;
          case '<>': return v !== rhsNum;
          default: return v === rhsNum;
        }
      }
      // 문자열 비교 (= 와 <> 만)
      if (op === '=') return valStr === rhsStr;
      if (op === '<>') return valStr !== rhsStr;
      return false;
    }
    // 와일드카드: * (여러 문자) / ? (한 문자)
    if (criteria.includes('*') || criteria.includes('?')) {
      const pattern = criteria
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${pattern}$`, 'i').test(String(value));
    }
    // 단순 같음
    return String(value) === criteria;
  };

  const __sumif = (range: unknown, criteria: unknown, sumRange?: unknown) => {
    const arr = toArr(range);
    const sumArr = sumRange !== undefined ? toArr(sumRange) : arr;
    let total = 0;
    for (let i = 0; i < arr.length; i++) {
      if (matchCriteria(arr[i], criteria)) {
        const n = Number(sumArr[i]);
        if (Number.isFinite(n)) total += n;
      }
    }
    return total;
  };

  const __countif = (range: unknown, criteria: unknown) => {
    const arr = toArr(range);
    let count = 0;
    for (const v of arr) if (matchCriteria(v, criteria)) count++;
    return count;
  };

  const __countifs = (...args: unknown[]) => {
    // pairs: [range, criteria, range, criteria, ...]
    if (args.length < 2 || args.length % 2 !== 0) return 0;
    const pairs: Array<{ range: unknown[]; criteria: unknown }> = [];
    for (let i = 0; i < args.length; i += 2) {
      pairs.push({ range: toArr(args[i]), criteria: args[i + 1] });
    }
    const len = pairs[0].range.length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      let allMatch = true;
      for (const p of pairs) {
        if (!matchCriteria(p.range[i], p.criteria)) { allMatch = false; break; }
      }
      if (allMatch) count++;
    }
    return count;
  };

  const __sumifs = (sumRange: unknown, ...args: unknown[]) => {
    if (args.length < 2 || args.length % 2 !== 0) return 0;
    const sumArr = toArr(sumRange);
    const pairs: Array<{ range: unknown[]; criteria: unknown }> = [];
    for (let i = 0; i < args.length; i += 2) {
      pairs.push({ range: toArr(args[i]), criteria: args[i + 1] });
    }
    let total = 0;
    for (let i = 0; i < sumArr.length; i++) {
      let allMatch = true;
      for (const p of pairs) {
        if (!matchCriteria(p.range[i], p.criteria)) { allMatch = false; break; }
      }
      if (allMatch) {
        const n = Number(sumArr[i]);
        if (Number.isFinite(n)) total += n;
      }
    }
    return total;
  };

  // 6. 평가 (new Function — 단일 사용자 환경 가정)
  const fn = new Function(
    '__sum', '__avg', '__average', '__min', '__max', '__count', '__if', '__abs', '__round',
    '__sumif', '__countif', '__sumifs', '__countifs',
    `"use strict"; return (${work});`,
  );
  return fn(
    __sum, __avg, __average, __min, __max, __count, __if, __abs, __round,
    __sumif, __countif, __sumifs, __countifs,
  );
}

// ─────────────────────────────────────────────
// 일괄 평가 (전체 시트의 모든 displayValue)
// ─────────────────────────────────────────────

/** 전체 셀 맵을 한 번에 평가한 displayValue 맵. */
export function evalAllCells(
  cells: Cells, rows: number, cols: number,
  ctx?: EvalContext,
): Cells {
  const out: Cells = {};
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ref = `${idxToCol(c)}${r}`;
      const raw = cells[ref];
      if (raw == null) continue;
      out[ref] = raw.startsWith('=') ? evalCell(ref, cells, ctx) : raw;
    }
  }
  return out;
}
