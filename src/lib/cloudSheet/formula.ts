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

/**
 * 함수 시그니처·설명 — 셀 수식 입력 시 popover 로 표시.
 * key 는 함수 이름 (대문자). 도움말 모달과 popover 모두 이걸 사용.
 */
export const FUNC_HELP: Record<string, { sig: string; desc: string }> = {
  SUM:       { sig: 'SUM(range)',                      desc: '범위의 합계' },
  AVG:       { sig: 'AVG(range)',                      desc: '범위의 평균' },
  AVERAGE:   { sig: 'AVERAGE(range)',                  desc: '범위의 평균 (AVG 와 동일)' },
  MIN:       { sig: 'MIN(range)',                      desc: '최솟값' },
  MAX:       { sig: 'MAX(range)',                      desc: '최댓값' },
  COUNT:     { sig: 'COUNT(range)',                    desc: '숫자 셀 개수' },
  MEDIAN:    { sig: 'MEDIAN(range)',                   desc: '중앙값' },
  IF:        { sig: 'IF(조건, 참값, 거짓값)',          desc: '조건부 분기' },
  ABS:       { sig: 'ABS(숫자)',                       desc: '절댓값' },
  ROUND:     { sig: 'ROUND(숫자, 소수자리)',           desc: '반올림' },
  POWER:     { sig: 'POWER(밑, 지수)',                 desc: '거듭제곱' },
  SQRT:      { sig: 'SQRT(숫자)',                      desc: '제곱근' },
  MOD:       { sig: 'MOD(피제수, 제수)',               desc: '나머지' },
  INT:       { sig: 'INT(숫자)',                       desc: '소수 버림 (내림)' },
  SUMIF:     { sig: 'SUMIF(range, criteria, [sum_range])', desc: '조건 만족 셀 합계' },
  COUNTIF:   { sig: 'COUNTIF(range, criteria)',        desc: '조건 만족 셀 개수' },
  SUMIFS:    { sig: 'SUMIFS(sum_range, range1, c1, …)', desc: '다중 조건 합계' },
  COUNTIFS:  { sig: 'COUNTIFS(range1, c1, range2, c2, …)', desc: '다중 조건 개수' },
  LEFT:      { sig: 'LEFT(텍스트, n)',                 desc: '왼쪽 n자' },
  RIGHT:     { sig: 'RIGHT(텍스트, n)',                desc: '오른쪽 n자' },
  MID:       { sig: 'MID(텍스트, 시작, 길이)',         desc: '중간 부분 문자열' },
  LEN:       { sig: 'LEN(텍스트)',                     desc: '글자 수' },
  UPPER:     { sig: 'UPPER(텍스트)',                   desc: '대문자' },
  LOWER:     { sig: 'LOWER(텍스트)',                   desc: '소문자' },
  TRIM:      { sig: 'TRIM(텍스트)',                    desc: '앞뒤 공백 제거' },
  CONCAT:    { sig: 'CONCAT(텍스트1, 텍스트2, …)',    desc: '문자열 연결' },
  CONCATENATE: { sig: 'CONCATENATE(텍스트1, …)',       desc: '문자열 연결 (CONCAT 과 동일)' },
  AND:       { sig: 'AND(논리1, 논리2, …)',            desc: '모두 참인지' },
  OR:        { sig: 'OR(논리1, 논리2, …)',             desc: '하나 이상 참인지' },
  NOT:       { sig: 'NOT(논리)',                       desc: '부정' },
  TODAY:     { sig: 'TODAY()',                         desc: '오늘 날짜 (yyyy-mm-dd)' },
  NOW:       { sig: 'NOW()',                           desc: '현재 시각' },
  YEAR:      { sig: 'YEAR(날짜)',                      desc: '연도' },
  MONTH:     { sig: 'MONTH(날짜)',                     desc: '월 (1~12)' },
  DAY:       { sig: 'DAY(날짜)',                       desc: '일 (1~31)' },
  WEEKDAY:   { sig: 'WEEKDAY(날짜)',                   desc: '요일 (1=일, 7=토)' },
  VLOOKUP:   { sig: 'VLOOKUP(key, range, returnCol, numCols)', desc: '세로 검색 (numCols 필수)' },
  HLOOKUP:   { sig: 'HLOOKUP(key, range, returnRow, numCols)', desc: '가로 검색' },
  INDEX:     { sig: 'INDEX(range, idx)',               desc: '1-based 평탄 인덱싱' },
  MATCH:     { sig: 'MATCH(key, range)',               desc: 'key 위치 (1-based) 또는 #N/A' },
  IMAGE:     { sig: 'IMAGE(url)',                      desc: '셀에 이미지 표시 (HTTPS 권장)' },
};

/** IMAGE 함수 sentinel — 셀 렌더가 이 prefix 를 보고 <img> 로 표시. */
export const IMAGE_SENTINEL = '__CLOUDSHEET_IMAGE__:';

// 긴 이름부터 → 짧은 이름이 prefix 인 경우 먼저 매칭되도록 정렬
const FUNC_ORDER = [
  // 6자+
  'AVERAGE', 'SUMIFS', 'COUNTIFS', 'VLOOKUP', 'HLOOKUP',
  // 5자
  'MEDIAN', 'POWER', 'SQRT', 'UPPER', 'LOWER', 'TRIM',
  'MONTH', 'TODAY', 'CONCATENATE', 'CONCAT', 'IMAGE',
  // 4자
  'SUMIF', 'COUNTIF', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT',
  'ROUND', 'INDEX', 'MATCH', 'LEFT', 'RIGHT',
  'YEAR', 'WEEKDAY',
  // 3자
  'AND', 'NOT', 'MID', 'LEN', 'MOD', 'INT', 'NOW', 'DAY',
  // 2자
  'IF', 'OR', 'ABS',
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

  // ─── 문자열 함수 ───
  const __left   = (s: unknown, n: unknown = 1) => String(s ?? '').slice(0, Math.max(0, Number(n) || 0));
  const __right  = (s: unknown, n: unknown = 1) => {
    const str = String(s ?? '');
    const k = Math.max(0, Number(n) || 0);
    return k === 0 ? '' : str.slice(-k);
  };
  const __mid    = (s: unknown, start: unknown, len: unknown) => {
    const str = String(s ?? '');
    const i = Math.max(0, (Number(start) || 1) - 1);
    return str.slice(i, i + Math.max(0, Number(len) || 0));
  };
  const __len    = (s: unknown) => String(s ?? '').length;
  const __upper  = (s: unknown) => String(s ?? '').toUpperCase();
  const __lower  = (s: unknown) => String(s ?? '').toLowerCase();
  const __trim   = (s: unknown) => String(s ?? '').trim();
  const __concat = (...args: unknown[]) => args.flatMap(toArr).map((x) => String(x ?? '')).join('');
  const __concatenate = __concat;

  // ─── 논리 함수 ───
  const __and = (...args: unknown[]) => args.flatMap(toArr).every((x) => !!x);
  const __or  = (...args: unknown[]) => args.flatMap(toArr).some((x) => !!x);
  const __not = (x: unknown) => !x;

  // ─── 날짜 함수 ───
  const __today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const __now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');
  const parseDate = (v: unknown): Date | null => {
    if (v instanceof Date) return v;
    const s = String(v ?? '').trim();
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };
  const __year  = (v: unknown) => { const d = parseDate(v); return d ? d.getFullYear() : 0; };
  const __month = (v: unknown) => { const d = parseDate(v); return d ? d.getMonth() + 1 : 0; };
  const __day   = (v: unknown) => { const d = parseDate(v); return d ? d.getDate() : 0; };
  const __weekday = (v: unknown) => { const d = parseDate(v); return d ? d.getDay() + 1 : 0; }; // 1=일, 7=토

  // ─── 수치 추가 ───
  const __power  = (b: unknown, e: unknown) => Math.pow(Number(b), Number(e));
  const __sqrt   = (n: unknown) => Math.sqrt(Number(n));
  const __mod    = (a: unknown, b: unknown) => {
    const bb = Number(b);
    return bb === 0 ? NaN : Number(a) % bb;
  };
  const __int    = (n: unknown) => Math.floor(Number(n));
  const __median = (...args: unknown[]) => {
    const nums = args.flatMap(toNums).sort((a, b) => a - b);
    if (nums.length === 0) return 0;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
  };

  // ─── 조회 함수 ───
  /** VLOOKUP(search, range, colIdx, exactOnly=true)
   *  range 는 2D 가 아니라 1D 배열 (셀 값들이 행 우선 평탄화됨).
   *  단순 v1: range 의 첫 col 만 검색하고 colIdx 번째 col 값 반환.
   *  range 가 길이 N 이면, 콜럼 개수를 추정 어렵 → range 가 명확히
   *  rectangle 일 때만 동작. 사용자는 colIdx + 행 개수로 가정.
   *  실제 표현: VLOOKUP(key, A1:C10, 2) — 3 columns 10 rows.
   *  현재 평탄화는 row-major. 따라서 colCount = numCols, rowCount = N/numCols.
   *  numCols 는 별도 정보가 없어 추정 어려움 → v1 단순화: 사용자가 colIdx
   *  대신 'colCount' 4번째 인자로 전달하게 함:
   *    VLOOKUP(key, range, returnColIdx, numCols)
   *  엑셀과 시그니처 차이 있지만 v1 한계.
   */
  const __vlookup = (key: unknown, range: unknown, returnColIdx: unknown, numCols: unknown = 2) => {
    const arr = toArr(range);
    const cols = Math.max(1, Math.floor(Number(numCols) || 2));
    const ret = Math.max(1, Math.floor(Number(returnColIdx) || 1));
    if (ret > cols) return '#REF!';
    const keyStr = String(key ?? '');
    const keyNum = Number(key);
    for (let r = 0; r < arr.length; r += cols) {
      const cell = arr[r];
      const cellNum = Number(cell);
      const match = Number.isFinite(keyNum) && Number.isFinite(cellNum)
        ? cellNum === keyNum
        : String(cell ?? '') === keyStr;
      if (match) return arr[r + ret - 1];
    }
    return '#N/A';
  };
  /** HLOOKUP: 같은 사상으로 row-major 1D. 첫 row 에서 검색.
   *  HLOOKUP(key, range, returnRowIdx, numCols)
   */
  const __hlookup = (key: unknown, range: unknown, returnRowIdx: unknown, numCols: unknown = 2) => {
    const arr = toArr(range);
    const cols = Math.max(1, Math.floor(Number(numCols) || 2));
    const ret = Math.max(1, Math.floor(Number(returnRowIdx) || 1));
    const keyStr = String(key ?? '');
    const keyNum = Number(key);
    for (let c = 0; c < cols; c++) {
      const cell = arr[c];
      const cellNum = Number(cell);
      const match = Number.isFinite(keyNum) && Number.isFinite(cellNum)
        ? cellNum === keyNum
        : String(cell ?? '') === keyStr;
      if (match) {
        const idx = (ret - 1) * cols + c;
        if (idx < arr.length) return arr[idx];
        return '#REF!';
      }
    }
    return '#N/A';
  };
  /** INDEX(range, idx) — 단순 1-based 인덱싱 (평탄화 배열) */
  const __index = (range: unknown, idx: unknown) => {
    const arr = toArr(range);
    const i = Math.max(1, Math.floor(Number(idx) || 1));
    if (i > arr.length) return '#REF!';
    return arr[i - 1];
  };
  /** IMAGE(url) — sentinel 문자열 반환. 셀 렌더가 prefix 보고 <img> 표시. */
  const __image = (url: unknown) => {
    const u = String(url ?? '').trim();
    if (!u) return '#VALUE!';
    // 보안: javascript: / data: text/html 스킴 차단
    if (/^\s*javascript:/i.test(u)) return '#REF!';
    if (/^\s*data:text\/html/i.test(u)) return '#REF!';
    return `${IMAGE_SENTINEL}${u}`;
  };

  /** MATCH(key, range) — 1-based 위치 반환. 못 찾으면 #N/A */
  const __match = (key: unknown, range: unknown) => {
    const arr = toArr(range);
    const keyStr = String(key ?? '');
    const keyNum = Number(key);
    for (let i = 0; i < arr.length; i++) {
      const cell = arr[i];
      const cellNum = Number(cell);
      const found = Number.isFinite(keyNum) && Number.isFinite(cellNum)
        ? cellNum === keyNum
        : String(cell ?? '') === keyStr;
      if (found) return i + 1;
    }
    return '#N/A';
  };

  // 6. 평가 (new Function — 단일 사용자 환경 가정)
  const fn = new Function(
    '__sum', '__avg', '__average', '__min', '__max', '__count', '__if', '__abs', '__round',
    '__sumif', '__countif', '__sumifs', '__countifs',
    '__left', '__right', '__mid', '__len', '__upper', '__lower', '__trim',
    '__concat', '__concatenate',
    '__and', '__or', '__not',
    '__today', '__now', '__year', '__month', '__day', '__weekday',
    '__power', '__sqrt', '__mod', '__int', '__median',
    '__vlookup', '__hlookup', '__index', '__match', '__image',
    `"use strict"; return (${work});`,
  );
  return fn(
    __sum, __avg, __average, __min, __max, __count, __if, __abs, __round,
    __sumif, __countif, __sumifs, __countifs,
    __left, __right, __mid, __len, __upper, __lower, __trim,
    __concat, __concatenate,
    __and, __or, __not,
    __today, __now, __year, __month, __day, __weekday,
    __power, __sqrt, __mod, __int, __median,
    __vlookup, __hlookup, __index, __match, __image,
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
