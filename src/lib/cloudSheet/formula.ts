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
  // ── 에러 처리 ──
  IFERROR:   { sig: 'IFERROR(값, 대체값)',             desc: '에러면 대체값, 아니면 값 그대로' },
  IFNA:      { sig: 'IFNA(값, 대체값)',                desc: '#N/A 면 대체값' },
  ISNUMBER:  { sig: 'ISNUMBER(값)',                    desc: '숫자면 TRUE' },
  ISBLANK:   { sig: 'ISBLANK(값)',                     desc: '빈 셀이면 TRUE' },
  ISTEXT:    { sig: 'ISTEXT(값)',                      desc: '문자열이면 TRUE' },
  ISERROR:   { sig: 'ISERROR(값)',                     desc: '에러(#XXX)면 TRUE' },
  ISNA:      { sig: 'ISNA(값)',                        desc: '#N/A 면 TRUE' },
  // ── 분기 ──
  IFS:       { sig: 'IFS(조건1, 값1, 조건2, 값2, …)',  desc: '여러 조건을 차례로 검사' },
  SWITCH:    { sig: 'SWITCH(식, 케이스1, 값1, …, [기본값])', desc: '식이 케이스와 일치하면 값' },
  // ── 검색 (XLOOKUP) ──
  XLOOKUP:   { sig: 'XLOOKUP(키, 검색범위, 반환범위, [없을때])', desc: 'VLOOKUP 상위호환' },
  // ── 텍스트 ──
  TEXTJOIN:  { sig: 'TEXTJOIN(구분자, 빈셀무시, 텍스트1, …)', desc: '여러 텍스트를 구분자로 연결' },
  SUBSTITUTE: { sig: 'SUBSTITUTE(텍스트, 옛값, 새값, [N번째])', desc: '특정 문자열 치환' },
  REPLACE:   { sig: 'REPLACE(텍스트, 시작, 길이, 새값)', desc: '위치 기반 치환' },
  FIND:      { sig: 'FIND(찾을값, 텍스트, [시작])',    desc: '대소문자 구분 검색 (1-based)' },
  SEARCH:    { sig: 'SEARCH(찾을값, 텍스트, [시작])',  desc: '대소문자 무시 검색' },
  HYPERLINK: { sig: 'HYPERLINK(url, [라벨])',          desc: '링크 (v1: 라벨만 표시)' },
  // ── 수치 ──
  ROUNDUP:   { sig: 'ROUNDUP(숫자, 소수자리)',         desc: '올림' },
  ROUNDDOWN: { sig: 'ROUNDDOWN(숫자, 소수자리)',       desc: '내림' },
  CEILING:   { sig: 'CEILING(숫자, [기준])',           desc: '기준 배수로 올림' },
  FLOOR:     { sig: 'FLOOR(숫자, [기준])',             desc: '기준 배수로 내림' },
  COUNTA:    { sig: 'COUNTA(range)',                   desc: '비어있지 않은 셀 개수' },
  COUNTBLANK:{ sig: 'COUNTBLANK(range)',               desc: '빈 셀 개수' },
  // ── 통계 ──
  STDEV:     { sig: 'STDEV(range)',                    desc: '표본 표준편차' },
  VAR:       { sig: 'VAR(range)',                      desc: '표본 분산' },
  RANK:      { sig: 'RANK(값, range, [오름차순=0])',  desc: '범위 내 순위' },
  // ── 날짜 ──
  DATE:      { sig: 'DATE(년, 월, 일)',                desc: '날짜 만들기' },
  EOMONTH:   { sig: 'EOMONTH(시작, [개월]=0)',         desc: '월말 (개월 더한 뒤)' },
  EDATE:     { sig: 'EDATE(시작, 개월)',               desc: '개월 더한 같은 날짜' },
  DATEDIF:   { sig: 'DATEDIF(시작, 끝, "Y"|"M"|"D")',  desc: '두 날짜 간격' },
  NETWORKDAYS: { sig: 'NETWORKDAYS(시작, 끝)',         desc: '평일 일수 (주말 제외)' },
  // ── 포맷 ──
  TEXT:      { sig: 'TEXT(값, 형식)',                  desc: '숫자·날짜 포맷 (yyyy-mm-dd, #,##0.00 등)' },
  // ── 정규표현식 ──
  REGEXMATCH:   { sig: 'REGEXMATCH(텍스트, 패턴)',     desc: '패턴 일치 여부' },
  REGEXEXTRACT: { sig: 'REGEXEXTRACT(텍스트, 패턴)',   desc: '첫 일치(또는 그룹 1) 추출' },
  REGEXREPLACE: { sig: 'REGEXREPLACE(텍스트, 패턴, 치환)', desc: '패턴 치환 (전역)' },
  // ── 미니 차트 ──
  SPARKLINE:    { sig: 'SPARKLINE(range, [옵션JSON])',  desc: '셀에 미니 차트 (line/bar/column/winloss)' },
  // ── 동적 배열 (spill) ──
  FILTER:       { sig: 'FILTER(range, 조건range)',      desc: '조건이 참인 값만 (인접 셀로 spill)' },
  SORT:         { sig: 'SORT(range, [내림차순=0])',     desc: '정렬 (인접 셀로 spill)' },
  UNIQUE:       { sig: 'UNIQUE(range)',                 desc: '중복 제거 (인접 셀로 spill)' },
  SEQUENCE:     { sig: 'SEQUENCE(n, [시작=1], [증분=1])', desc: '연속 숫자 n개 (인접 셀로 spill)' },
  // ── AI (비동기 — 결과 캐시) ──
  AI:           { sig: 'AI("프롬프트", [모델])',         desc: 'AI 에 자연어 질문 → 결과 텍스트 (30일 캐시)' },
  AI_CLASSIFY:  { sig: 'AI_CLASSIFY(텍스트, "카테고리1,카테고리2,…")', desc: 'AI 가 텍스트를 카테고리 중 하나로 분류' },
  AI_TRANSLATE: { sig: 'AI_TRANSLATE(텍스트, "en")',     desc: 'AI 번역 (언어 코드: en/ko/ja 등)' },
  AI_SUMMARIZE: { sig: 'AI_SUMMARIZE(텍스트 또는 range)', desc: 'AI 가 1~2문장으로 요약' },
};

/** IMAGE 함수 sentinel — 셀 렌더가 이 prefix 를 보고 <img> 로 표시. */
export const IMAGE_SENTINEL = '__CLOUDSHEET_IMAGE__:';

/**
 * 동적 배열 함수 (FILTER/SORT/UNIQUE/SEQUENCE) sentinel.
 * 페이로드: SPILL_SENTINEL + JSON.stringify(2D array)
 * 1D 입력은 항상 [[v1],[v2],…] 의 세로 spill 로 정규화.
 * displayValues 단계 (CloudSheetEditor) 가 anchor 셀 + 인접 셀로 펼쳐 표시.
 */
export const SPILL_SENTINEL = '__CLOUDSHEET_SPILL__:';
// SPARKLINE 도 동일 패턴 — sparkline.ts 에 상수 정의 (순환 import 피하려 거기에).
// 셀 렌더는 SPARKLINE_SENTINEL 도 함께 검사.
export { SPARKLINE_SENTINEL } from './sparkline';
// AI 함수도 동일 — 비동기라 cache hit 면 결과, miss 면 sentinel 반환.
export { AI_SENTINEL, AI_LOADING_PREFIX, AI_ERROR_PREFIX } from './aiCellEval';

import {
  AI_SENTINEL as AI_SEN,
  AI_LOADING_PREFIX as AI_LOAD,
  aiCacheGet,
  aiCacheKey,
  aiQueueFetch,
} from './aiCellEval';

// 긴 이름부터 → \b 경계 덕에 prefix 충돌은 없지만 가독성 위해 desc 정렬.
const FUNC_ORDER = [
  // 12자
  'REGEXREPLACE', 'REGEXEXTRACT', 'AI_SUMMARIZE', 'AI_TRANSLATE',
  // 11자
  'NETWORKDAYS', 'CONCATENATE', 'AI_CLASSIFY',
  // 10자
  'REGEXMATCH', 'COUNTBLANK', 'SUBSTITUTE',
  // 9자
  'ROUNDDOWN', 'HYPERLINK', 'SPARKLINE',
  // 8자
  'SEQUENCE',
  // 6자
  'FILTER', 'UNIQUE',
  // 4자
  'SORT',
  // 8자
  'TEXTJOIN', 'ISNUMBER', 'COUNTIFS',
  // 7자
  'AVERAGE', 'VLOOKUP', 'HLOOKUP', 'DATEDIF', 'CEILING', 'ROUNDUP', 'EOMONTH',
  'XLOOKUP', 'IFERROR', 'ISBLANK', 'ISERROR', 'REPLACE',
  // 6자
  'SUMIFS', 'MEDIAN', 'ISTEXT', 'COUNTA', 'SWITCH', 'SEARCH', 'CONCAT',
  // 5자
  'POWER', 'SQRT', 'UPPER', 'LOWER', 'TRIM', 'MONTH', 'TODAY', 'IMAGE',
  'STDEV', 'EDATE', 'FLOOR', 'SUMIF', 'COUNT', 'ROUND', 'INDEX', 'MATCH',
  'RIGHT',
  // 4자
  'COUNTIF', 'LEFT', 'YEAR', 'WEEKDAY', 'RANK', 'DATE', 'TEXT',
  'IFNA', 'ISNA', 'FIND',
  // 3자
  'SUM', 'AVG', 'MIN', 'MAX', 'AND', 'NOT', 'MID', 'LEN', 'MOD', 'INT',
  'NOW', 'DAY', 'VAR', 'IFS',
  // 2자
  'IF', 'OR', 'ABS',
  // AI (특수 — '_' 포함). 위에서 긴 것부터 처리되지만 'AI' 는 'AI_*' 와 \b 경계 덕에 별 충돌 없음.
  'AI',
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

/**
 * 문자열 리터럴 escape pre-processor.
 * - 두 따옴표(`""`) → `\"` (Excel/Sheets 의 embedded quote)
 * - 백슬래시(`\`) → `\\` (regex 패턴 `\d+` 등이 JS 문자열 파서에서 손실되지 않게)
 * 문자열 바깥은 그대로 두고, 안쪽만 변환.
 */
function escapeStringLiterals(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c !== '"') { out += c; i++; continue; }
    out += '"';
    i++;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"') {
        // Excel: "" 가 한 따옴표 (escape). 그렇지 않으면 문자열 종료.
        if (src[i + 1] === '"') { out += '\\"'; i += 2; continue; }
        out += '"'; i++; break;
      }
      if (ch === '\\') { out += '\\\\'; i++; continue; }
      out += ch; i++;
    }
  }
  return out;
}

function evalExpr(
  expr: string,
  currentSheet: string,
  allSheets: Record<string, Cells>,
  namedRanges: Record<string, string>,
  visiting: Set<string>,
): unknown {
  let work = expr;

  // -1. TRUE/FALSE 리터럴 — JS 식별자 아님(=undefined ReferenceError). 사전 치환.
  work = work.replace(/\bTRUE\b/gi, 'true').replace(/\bFALSE\b/gi, 'false');

  // -0.5. 문자열 리터럴 전처리 — Excel/Sheets 식 "" escape + 백슬래시 보존.
  //   "abc""def"  → "abc\"def"   (Excel 스타일: 두 따옴표가 한 따옴표)
  //   "\d+"       → "\\d+"       (정규표현식 \d 가 JS 파서에서 사라지지 않게)
  //   둘을 동시에 정확히 처리하려면 단순 regex 로는 안 되므로 작은 state machine.
  work = escapeStringLiterals(work);

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

  /**
   * SPARKLINE(range, [optionsJSON]) — sentinel 반환. 렌더가 SVG 로 그림.
   * 페이로드: `__CLOUDSHEET_SPARKLINE__:{"values":[…], "options":{…}}`
   *
   * 옵션 인자는 JSON 문자열로 전달:
   *   =SPARKLINE(A1:A12)
   *   =SPARKLINE(A1:A12, "{""charttype"":""column"", ""color"":""#22c55e""}")
   *
   * IMAGE 함수와 동일하게 evaluator 는 sentinel 만 만들고 렌더링은
   * CloudSheetEditor 가 buildSparklineSvg 로 수행 — 평가 단계에 DOM 의존성 없음.
   */
  const __sparkline = (range: unknown, optionsJson?: unknown) => {
    const arr = toArr(range);
    const values = arr.map((x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : 0;
    });
    if (values.length === 0) return '#VALUE!';
    let options: Record<string, unknown> = {};
    if (optionsJson !== undefined) {
      try {
        const parsed = JSON.parse(String(optionsJson ?? ''));
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          options = parsed as Record<string, unknown>;
        }
      } catch { /* 잘못된 JSON 은 기본 옵션 fallback */ }
    }
    const payload = JSON.stringify({ values, options });
    return `__CLOUDSHEET_SPARKLINE__:${payload}`;
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

  // ─── 에러 처리 ───
  const isErrorStr = (v: unknown): boolean =>
    typeof v === 'string' && /^#(?:REF|VALUE|N\/A|NUM|DIV\/0|ERROR|CIRCULAR)!?$/.test(v);
  // IFERROR — 문자열 에러 + JS 수준 Infinity/NaN 도 fallback.
  // (1/0 같은 식은 evaluator 가 formatResult 단계에 가야 #DIV/0! 가 됨.
  //  IFERROR 호출 시점엔 raw Infinity 이므로 isFinite 도 같이 검사.)
  const __iferror = (v: unknown, fallback: unknown) => {
    if (isErrorStr(v)) return fallback;
    if (typeof v === 'number' && !Number.isFinite(v)) return fallback;
    return v;
  };
  const __ifna = (v: unknown, fallback: unknown) => (v === '#N/A' ? fallback : v);
  const __isnumber = (v: unknown) => {
    if (typeof v === 'number') return Number.isFinite(v);
    const s = String(v ?? '').trim();
    if (!s) return false;
    return Number.isFinite(Number(s));
  };
  const __isblank = (v: unknown) => v == null || String(v ?? '') === '';
  const __istext = (v: unknown) => {
    if (typeof v !== 'string') return false;
    if (isErrorStr(v)) return false;
    const s = v.trim();
    if (s === '') return false;
    return !Number.isFinite(Number(s));
  };
  const __iserror = (v: unknown) => isErrorStr(v);
  const __isna = (v: unknown) => v === '#N/A';

  // ─── 분기 ───
  const __ifs = (...args: unknown[]) => {
    for (let i = 0; i < args.length - 1; i += 2) if (args[i]) return args[i + 1];
    return '#N/A';
  };
  const __switch = (value: unknown, ...args: unknown[]) => {
    const pairCount = args.length - (args.length % 2);
    const vStr = String(value ?? '');
    const vNum = Number(value);
    for (let i = 0; i < pairCount; i += 2) {
      const caseV = args[i];
      const caseNum = Number(caseV);
      const match = Number.isFinite(vNum) && Number.isFinite(caseNum)
        ? vNum === caseNum
        : vStr === String(caseV ?? '');
      if (match) return args[i + 1];
    }
    return args.length % 2 ? args[args.length - 1] : '#N/A';
  };

  // ─── XLOOKUP — VLOOKUP 상위호환 ───
  const __xlookup = (
    key: unknown, lookupRange: unknown, returnRange: unknown, notFound: unknown = '#N/A',
  ) => {
    const lookup = toArr(lookupRange);
    const ret = toArr(returnRange);
    const keyStr = String(key ?? '');
    const keyNum = Number(key);
    for (let i = 0; i < lookup.length; i++) {
      const cell = lookup[i];
      const cellNum = Number(cell);
      const match = Number.isFinite(keyNum) && Number.isFinite(cellNum)
        ? cellNum === keyNum
        : String(cell ?? '') === keyStr;
      if (match) return i < ret.length ? ret[i] : '#N/A';
    }
    return notFound;
  };

  // ─── 텍스트 ───
  const __textjoin = (sep: unknown, ignoreEmpty: unknown, ...args: unknown[]) => {
    const arr = args.flatMap(toArr).map((x) => String(x ?? ''));
    const filtered = ignoreEmpty ? arr.filter((s) => s !== '') : arr;
    return filtered.join(String(sep ?? ''));
  };
  const __substitute = (text: unknown, oldStr: unknown, newStr: unknown, instance?: unknown) => {
    const s = String(text ?? '');
    const o = String(oldStr ?? '');
    const n = String(newStr ?? '');
    if (!o) return s;
    if (instance === undefined) return s.split(o).join(n);
    const inst = Math.max(1, Math.floor(Number(instance) || 1));
    let count = 0;
    let result = '';
    let i = 0;
    while (i < s.length) {
      if (s.startsWith(o, i)) {
        count++;
        if (count === inst) {
          result += n + s.slice(i + o.length);
          return result;
        }
        result += o;
        i += o.length;
      } else {
        result += s[i++];
      }
    }
    return result;
  };
  const __replace = (text: unknown, start: unknown, len: unknown, newText: unknown) => {
    const s = String(text ?? '');
    const i = Math.max(0, (Number(start) || 1) - 1);
    const k = Math.max(0, Number(len) || 0);
    return s.slice(0, i) + String(newText ?? '') + s.slice(i + k);
  };
  const __find = (search: unknown, text: unknown, start: unknown = 1) => {
    const s = String(text ?? '');
    const q = String(search ?? '');
    const from = Math.max(0, (Number(start) || 1) - 1);
    const idx = s.indexOf(q, from);
    return idx < 0 ? '#VALUE!' : idx + 1;
  };
  const __search = (search: unknown, text: unknown, start: unknown = 1) => {
    const s = String(text ?? '').toLowerCase();
    const q = String(search ?? '').toLowerCase();
    const from = Math.max(0, (Number(start) || 1) - 1);
    const idx = s.indexOf(q, from);
    return idx < 0 ? '#VALUE!' : idx + 1;
  };
  // HYPERLINK v1: 셀 렌더가 별도 처리 안 함 — 라벨(있으면) 또는 URL 만 텍스트 표시.
  const __hyperlink = (url: unknown, label?: unknown) =>
    String(label ?? url ?? '');

  // ─── 수치 ───
  const __roundup = (n: unknown, d: unknown = 0) => {
    const p = Math.pow(10, Number(d) || 0);
    const v = Number(n);
    return (v >= 0 ? Math.ceil(v * p) : Math.floor(v * p)) / p;
  };
  const __rounddown = (n: unknown, d: unknown = 0) => {
    const p = Math.pow(10, Number(d) || 0);
    return Math.trunc(Number(n) * p) / p;
  };
  const __ceiling = (n: unknown, significance: unknown = 1) => {
    const s = Number(significance) || 1;
    if (s === 0) return 0;
    return Math.ceil(Number(n) / s) * s;
  };
  const __floor = (n: unknown, significance: unknown = 1) => {
    const s = Number(significance) || 1;
    if (s === 0) return 0;
    return Math.floor(Number(n) / s) * s;
  };
  const __counta = (...args: unknown[]) =>
    args.flatMap(toArr).filter((x) => x != null && String(x).trim() !== '').length;
  const __countblank = (...args: unknown[]) =>
    args.flatMap(toArr).filter((x) => x == null || String(x).trim() === '').length;

  // ─── 통계 ───
  const __stdev = (...args: unknown[]) => {
    const nums = args.flatMap(toNums);
    if (nums.length < 2) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
    return Math.sqrt(variance);
  };
  const __var = (...args: unknown[]) => {
    const nums = args.flatMap(toNums);
    if (nums.length < 2) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
  };
  const __rank = (val: unknown, range: unknown, ascending: unknown = 0) => {
    const nums = toNums(range);
    const v = Number(val);
    if (!Number.isFinite(v)) return '#N/A';
    const sorted = ascending ? [...nums].sort((a, b) => a - b) : [...nums].sort((a, b) => b - a);
    const idx = sorted.indexOf(v);
    return idx < 0 ? '#N/A' : idx + 1;
  };

  // ─── 날짜 (parseDate 위에서 정의됨) ───
  const fmtDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const __date = (y: unknown, m: unknown, d: unknown) => {
    const Y = Number(y), M = Number(m), D = Number(d);
    if (![Y, M, D].every(Number.isFinite)) return '#VALUE!';
    return fmtDate(new Date(Y, M - 1, D));
  };
  const __eomonth = (start: unknown, months: unknown = 0) => {
    const d = parseDate(start);
    if (!d) return '#VALUE!';
    const end = new Date(d.getFullYear(), d.getMonth() + (Number(months) || 0) + 1, 0);
    return fmtDate(end);
  };
  const __edate = (start: unknown, months: unknown = 0) => {
    const d = parseDate(start);
    if (!d) return '#VALUE!';
    const next = new Date(d.getFullYear(), d.getMonth() + (Number(months) || 0), d.getDate());
    return fmtDate(next);
  };
  const __datedif = (start: unknown, end: unknown, unit: unknown) => {
    const a = parseDate(start), b = parseDate(end);
    if (!a || !b) return '#VALUE!';
    const u = String(unit ?? '').toUpperCase();
    if (u === 'D') return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
    if (u === 'M') return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    if (u === 'Y') {
      let y = b.getFullYear() - a.getFullYear();
      if (b.getMonth() < a.getMonth() || (b.getMonth() === a.getMonth() && b.getDate() < a.getDate())) y--;
      return y;
    }
    return '#NUM!';
  };
  const __networkdays = (start: unknown, end: unknown) => {
    const a = parseDate(start), b = parseDate(end);
    if (!a || !b) return '#VALUE!';
    const cur = new Date(a.getFullYear(), a.getMonth(), a.getDate());
    const stop = new Date(b.getFullYear(), b.getMonth(), b.getDate());
    let n = 0;
    while (cur <= stop) {
      const wd = cur.getDay();
      if (wd !== 0 && wd !== 6) n++;
      cur.setDate(cur.getDate() + 1);
    }
    return n;
  };

  // ─── 포맷 (단순 지원) ───
  const __text = (val: unknown, format: unknown) => {
    const f = String(format ?? '');
    const d = parseDate(val);
    if (d && /[ymdhMs]/i.test(f)) {
      return f
        .replace(/yyyy/gi, String(d.getFullYear()))
        .replace(/yy/g, String(d.getFullYear()).slice(-2))
        .replace(/mm/g, String(d.getMonth() + 1).padStart(2, '0'))
        .replace(/dd/g, String(d.getDate()).padStart(2, '0'))
        .replace(/HH/g, String(d.getHours()).padStart(2, '0'))
        .replace(/MM/g, String(d.getMinutes()).padStart(2, '0'))
        .replace(/SS/g, String(d.getSeconds()).padStart(2, '0'));
    }
    const n = Number(val);
    if (Number.isFinite(n) && /[0#]/.test(f)) {
      const dotIdx = f.indexOf('.');
      const hasComma = f.includes(',');
      let decDigits = 0;
      if (dotIdx >= 0) decDigits = f.slice(dotIdx + 1).replace(/[^0#]/g, '').length;
      let result = n.toFixed(decDigits);
      if (hasComma) {
        const [intPart, decPart] = result.split('.');
        result = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decPart ? '.' + decPart : '');
      }
      return result;
    }
    return String(val ?? '');
  };

  // ─── 동적 배열 (spill) ───
  // 1D 결과를 SPILL_SENTINEL + JSON 2D 배열로 직렬화. displayValues 가 인접 셀로 펼침.
  const spillVertical = (arr: unknown[]): string => {
    const grid = arr.map((v) => [v == null ? '' : String(v)]);
    return `__CLOUDSHEET_SPILL__:${JSON.stringify(grid)}`;
  };
  const __filter = (range: unknown, condition: unknown) => {
    const data = toArr(range);
    const cond = toArr(condition);
    const out: unknown[] = [];
    for (let i = 0; i < data.length; i++) {
      const c = cond[i];
      // truthy 판정 — 숫자 0/"" 제외, 그 외 truthy
      const truthy = c === true || (typeof c === 'number' && c !== 0) || (typeof c === 'string' && c !== '' && c !== '0' && c.toLowerCase() !== 'false');
      if (truthy) out.push(data[i]);
    }
    if (out.length === 0) return '#N/A';
    return spillVertical(out);
  };
  const __sort = (range: unknown, descending: unknown = 0) => {
    const data = [...toArr(range)];
    const desc = Boolean(Number(descending));
    data.sort((a, b) => {
      const na = Number(a), nb = Number(b);
      if (Number.isFinite(na) && Number.isFinite(nb)) return desc ? nb - na : na - nb;
      return desc
        ? String(b ?? '').localeCompare(String(a ?? ''))
        : String(a ?? '').localeCompare(String(b ?? ''));
    });
    return spillVertical(data);
  };
  const __unique = (range: unknown) => {
    const data = toArr(range);
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const v of data) {
      const k = String(v ?? '');
      if (!seen.has(k)) { seen.add(k); out.push(v); }
    }
    return spillVertical(out);
  };
  const __sequence = (n: unknown, start: unknown = 1, step: unknown = 1) => {
    const count = Math.max(0, Math.floor(Number(n) || 0));
    const s = Number(start) || 0;
    const st = Number(step) || 1;
    const out: number[] = [];
    for (let i = 0; i < count; i++) out.push(s + i * st);
    return spillVertical(out);
  };

  // ─── AI 함수 (비동기 — 캐시 hit 면 결과, miss 면 sentinel 로 진행 알림) ───
  // sentinel 이 셀에 떠있는 동안 백그라운드 fetch 가 동작하고, 결과가 오면
  // AI_CHANGED 이벤트가 발행 → CloudSheetEditor 가 해당 셀 재평가 → 결과 표시.
  const aiResolve = (fn: string, args: unknown): unknown => {
    const key = aiCacheKey(fn, args);
    const cached = aiCacheGet(key);
    if (cached !== undefined) return cached;
    aiQueueFetch(key, fn, args);
    return `${AI_SEN}${AI_LOAD}${key}`;
  };
  const __ai = (prompt: unknown, model?: unknown) =>
    aiResolve('ai', { prompt: String(prompt ?? ''), model: model !== undefined ? String(model) : undefined });
  const __ai_classify = (text: unknown, categories: unknown) =>
    aiResolve('ai_classify', { text: String(text ?? ''), categories: String(categories ?? '') });
  const __ai_translate = (text: unknown, lang: unknown) =>
    aiResolve('ai_translate', { text: String(text ?? ''), lang: String(lang ?? 'en') });
  const __ai_summarize = (text: unknown) => {
    // range 가 들어오면 join 해서 한 텍스트로.
    const joined = Array.isArray(text)
      ? text.filter((x) => x != null && String(x).trim() !== '').map(String).join('\n')
      : String(text ?? '');
    return aiResolve('ai_summarize', { text: joined });
  };

  // ─── 정규표현식 ───
  const __regexmatch = (text: unknown, pattern: unknown) => {
    try {
      return new RegExp(String(pattern ?? '')).test(String(text ?? ''));
    } catch {
      return '#ERROR!';
    }
  };
  const __regexextract = (text: unknown, pattern: unknown) => {
    try {
      const m = String(text ?? '').match(new RegExp(String(pattern ?? '')));
      return m ? (m[1] ?? m[0]) : '';
    } catch {
      return '#ERROR!';
    }
  };
  const __regexreplace = (text: unknown, pattern: unknown, replacement: unknown) => {
    try {
      return String(text ?? '').replace(
        new RegExp(String(pattern ?? ''), 'g'),
        String(replacement ?? ''),
      );
    } catch {
      return '#ERROR!';
    }
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
    '__vlookup', '__hlookup', '__index', '__match', '__image', '__sparkline',
    '__iferror', '__ifna', '__isnumber', '__isblank', '__istext', '__iserror', '__isna',
    '__ifs', '__switch', '__xlookup',
    '__textjoin', '__substitute', '__replace', '__find', '__search', '__hyperlink',
    '__roundup', '__rounddown', '__ceiling', '__floor', '__counta', '__countblank',
    '__stdev', '__var', '__rank',
    '__date', '__eomonth', '__edate', '__datedif', '__networkdays',
    '__text', '__regexmatch', '__regexextract', '__regexreplace',
    '__ai', '__ai_classify', '__ai_translate', '__ai_summarize',
    '__filter', '__sort', '__unique', '__sequence',
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
    __vlookup, __hlookup, __index, __match, __image, __sparkline,
    __iferror, __ifna, __isnumber, __isblank, __istext, __iserror, __isna,
    __ifs, __switch, __xlookup,
    __textjoin, __substitute, __replace, __find, __search, __hyperlink,
    __roundup, __rounddown, __ceiling, __floor, __counta, __countblank,
    __stdev, __var, __rank,
    __date, __eomonth, __edate, __datedif, __networkdays,
    __text, __regexmatch, __regexextract, __regexreplace,
    __ai, __ai_classify, __ai_translate, __ai_summarize,
    __filter, __sort, __unique, __sequence,
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
