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

import { isSafeHref, isSafeImageSrc } from '@/lib/safeUrl';

type Cells = Record<string, string>;
interface FormulaTable {
  name: string;
  ref: string;
  headerRow?: boolean;
  totalsRow?: boolean;
  columns?: Array<{ name: string }>;
}

/**
 * 함수 시그니처·설명 — 셀 수식 입력 시 popover 로 표시.
 * key 는 함수 이름 (대문자). 도움말 모달과 popover 모두 이걸 사용.
 */
export const FUNC_HELP: Record<string, { sig: string; desc: string }> = {
  DATEVALUE: { sig: 'DATEVALUE(date_text)', desc: 'Converts date text to an Excel serial date' },
  DAYS:      { sig: 'DAYS(end_date, start_date)', desc: 'Returns the number of days between two dates' },
  VALUE:     { sig: 'VALUE(text)', desc: 'Converts numeric text to a number' },
  PRODUCT:   { sig: 'PRODUCT(range)', desc: 'Multiplies numbers together' },
  SUMPRODUCT:{ sig: 'SUMPRODUCT(range1, range2, ...)', desc: 'Sums products of matching ranges' },
  SUBTOTAL:  { sig: 'SUBTOTAL(function_num, ref1, ...)', desc: 'Excel subtotal aggregation by function number' },
  LARGE:     { sig: 'LARGE(range, k)', desc: 'Returns the k-th largest numeric value' },
  SMALL:     { sig: 'SMALL(range, k)', desc: 'Returns the k-th smallest numeric value' },
  PERCENTILE:{ sig: 'PERCENTILE(range, k)', desc: 'Inclusive percentile, compatible with PERCENTILE.INC' },
  QUARTILE:  { sig: 'QUARTILE(range, quart)', desc: 'Inclusive quartile, compatible with QUARTILE.INC' },
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
  AVERAGEIF: { sig: 'AVERAGEIF(range, criteria, [average_range])', desc: '조건 만족 셀 평균' },
  SUMIFS:    { sig: 'SUMIFS(sum_range, range1, c1, …)', desc: '다중 조건 합계' },
  COUNTIFS:  { sig: 'COUNTIFS(range1, c1, range2, c2, …)', desc: '다중 조건 개수' },
  AVERAGEIFS:{ sig: 'AVERAGEIFS(avg_range, range1, c1, …)', desc: '다중 조건 평균' },
  MINIFS:    { sig: 'MINIFS(min_range, range1, c1, …)', desc: '다중 조건 최솟값' },
  MAXIFS:    { sig: 'MAXIFS(max_range, range1, c1, …)', desc: '다중 조건 최댓값' },
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
  VLOOKUP:   { sig: 'VLOOKUP(key, range, returnCol, [range_lookup])', desc: '세로 검색' },
  HLOOKUP:   { sig: 'HLOOKUP(key, range, returnRow, [range_lookup])', desc: '가로 검색' },
  INDEX:     { sig: 'INDEX(range, row, [column])',      desc: '범위 내 값 반환' },
  MATCH:     { sig: 'MATCH(key, range, [match_type])',  desc: 'key 위치 (1-based) 또는 #N/A' },
  XMATCH:    { sig: 'XMATCH(key, range, [match_mode], [search_mode])', desc: 'Excel-compatible exact or nearest position' },
  ROWS:      { sig: 'ROWS(range)', desc: 'Number of rows in a range' },
  COLUMNS:   { sig: 'COLUMNS(range)', desc: 'Number of columns in a range' },
  ROW:       { sig: 'ROW([range])', desc: 'Current row or first row of a range' },
  COLUMN:    { sig: 'COLUMN([range])', desc: 'Current column or first column of a range' },
  CHOOSE:    { sig: 'CHOOSE(index, value1, value2, ...)', desc: 'Returns the value at a 1-based index' },
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
  SEQUENCE:     { sig: 'SEQUENCE(rows, [columns], [start], [step])', desc: '연속 숫자 배열 (인접 셀로 spill)' },
  // ── AI (비동기 — 결과 캐시) ──
  AI:           { sig: 'AI("프롬프트", [모델])',         desc: 'AI 에 자연어 질문 → 결과 텍스트 (30일 캐시)' },
  AI_CLASSIFY:  { sig: 'AI_CLASSIFY(텍스트, "카테고리1,카테고리2,…")', desc: 'AI 가 텍스트를 카테고리 중 하나로 분류' },
  AI_TRANSLATE: { sig: 'AI_TRANSLATE(텍스트, "en")',     desc: 'AI 번역 (언어 코드: en/ko/ja 등)' },
  AI_SUMMARIZE: { sig: 'AI_SUMMARIZE(텍스트 또는 range)', desc: 'AI 가 1~2문장으로 요약' },
};

/** IMAGE 함수 sentinel — 셀 렌더가 이 prefix 를 보고 <img> 로 표시. */
export const IMAGE_SENTINEL = '__CLOUDSHEET_IMAGE__:';

/**
 * HYPERLINK 함수 sentinel — 셀 렌더가 <a> 로 표시 (새 탭, rel=noreferrer).
 * 페이로드: SENTINEL + JSON {"url":"…","label":"…"}.
 * 보안: javascript:/vbscript:/data:text/html 스킴 차단 (formula 단계).
 */
export const LINK_SENTINEL = '__CLOUDSHEET_LINK__:';

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
  AI_ERROR_PREFIX as AI_ERR,
  AI_CELL_TEXT_LIMIT,
  aiCacheGet,
  aiCacheKey,
  aiQueueFetch,
} from './aiCellEval';

// 긴 이름부터 → \b 경계 덕에 prefix 충돌은 없지만 가독성 위해 desc 정렬.
const FUNC_ORDER = [
  // 12자
  'REGEXREPLACE', 'REGEXEXTRACT', 'AI_SUMMARIZE', 'AI_TRANSLATE',
  'SUBTOTAL',
  // 11자
  'NETWORKDAYS', 'CONCATENATE', 'AI_CLASSIFY', 'AVERAGEIFS', 'SUMPRODUCT',
  'TRANSPOSE',
  // 10자
  'PERCENTILEEXC', 'REGEXMATCH', 'COUNTBLANK', 'SUBSTITUTE', 'AVERAGEIF', 'DATEVALUE', 'PERCENTILE',
  // 9자
  'ROUNDDOWN', 'HYPERLINK', 'SPARKLINE',
  // 8자
  'SEQUENCE',
  // 6자
  'FILTER', 'UNIQUE',
  // 4자
  'SORT', 'TAKE', 'DROP',
  // 8자
  'TEXTJOIN', 'ISNUMBER', 'COUNTIFS',
  // 7자
  'AVERAGE', 'VLOOKUP', 'HLOOKUP', 'DATEDIF', 'CEILING', 'ROUNDUP', 'EOMONTH',
  'QUARTILEEXC', 'XLOOKUP', 'IFERROR', 'ISBLANK', 'ISERROR', 'REPLACE', 'QUARTILE',
  // 6자
  'SUMIFS', 'MEDIAN', 'ISTEXT', 'COUNTA', 'SWITCH', 'SEARCH', 'CONCAT',
  'MINIFS', 'MAXIFS',
  // 5자
  'POWER', 'SQRT', 'UPPER', 'LOWER', 'TRIM', 'MONTH', 'TODAY', 'IMAGE',
  'STDEVP', 'STDEV', 'SMALL', 'LARGE', 'EDATE', 'FLOOR', 'SUMIF', 'COUNT', 'ROUND', 'INDEX', 'MATCH',
  'XMATCH', 'CHOOSE', 'RIGHT', 'VALUE',
  // 4자
  'COUNTIF', 'LEFT', 'YEAR', 'WEEKDAY', 'RANK', 'VARP', 'DATE', 'TEXT',
  'ROWS', 'IFNA', 'ISNA', 'FIND', 'DAYS',
  // 7??
  'PRODUCT', 'COLUMNS',
  // 3자
  'SUM', 'AVG', 'MIN', 'MAX', 'AND', 'NOT', 'MID', 'LEN', 'MOD', 'INT',
  'NOW', 'DAY', 'VAR', 'IFS', 'ROW',
  // 6??
  'COLUMN',
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
  tables?: Record<string, FormulaTable[]>;
  formulaCache?: Map<string, string>;
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
  const tables = ctx?.tables ?? {};
  return evalWithGuard(sheetName, ref, allSheets, namedRanges, tables, new Set(), ctx?.formulaCache, new Set());
}

function evalWithGuard(
  sheetName: string,
  ref: string,
  allSheets: Record<string, Cells>,
  namedRanges: Record<string, string>,
  tables: Record<string, FormulaTable[]>,
  visiting: Set<string>,
  formulaCache?: Map<string, string>,
  nonCacheable?: Set<string>,
): string {
  const cells = allSheets[sheetName] ?? {};
  const raw = cells[ref] ?? '';
  if (!raw.startsWith('=')) return raw;
  const key = `${sheetName}!${ref}`;
  if (visiting.has(key)) {
    for (const activeKey of visiting) nonCacheable?.add(activeKey);
    nonCacheable?.add(key);
    return '#CIRCULAR';
  }
  const cached = formulaCache?.get(key);
  if (cached !== undefined) return cached;
  const next = new Set(visiting);
  next.add(key);
  try {
    const result = evalExpr(raw.slice(1), sheetName, ref, allSheets, namedRanges, tables, next, formulaCache, nonCacheable);
    const formatted = formatResult(result);
    if (!nonCacheable?.has(key)) formulaCache?.set(key, formatted);
    return formatted;
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

const SAFE_EVAL_IDENTIFIERS = new Set([
  'true', 'false',
  '__range',
  '__sum', '__product', '__sumproduct', '__subtotal', '__avg', '__average', '__min', '__max', '__count', '__if', '__abs', '__round',
  '__sumif', '__countif', '__averageif', '__sumifs', '__countifs', '__averageifs', '__minifs', '__maxifs',
  '__left', '__right', '__mid', '__len', '__upper', '__lower', '__trim',
  '__concat', '__concatenate',
  '__and', '__or', '__not',
  '__today', '__now', '__year', '__month', '__day', '__weekday',
  '__power', '__sqrt', '__mod', '__int', '__median', '__large', '__small', '__percentile', '__percentileexc', '__quartile', '__quartileexc',
  '__vlookup', '__hlookup', '__index', '__match', '__xmatch',
  '__rows', '__columns', '__row', '__column', '__choose',
  '__image', '__sparkline',
  '__iferror', '__ifna', '__isnumber', '__isblank', '__istext', '__iserror', '__isna',
  '__ifs', '__switch', '__xlookup',
  '__textjoin', '__substitute', '__replace', '__find', '__search', '__hyperlink',
  '__roundup', '__rounddown', '__ceiling', '__floor', '__counta', '__countblank',
  '__stdev', '__stdevp', '__var', '__varp', '__rank',
  '__date', '__eomonth', '__edate', '__datedif', '__networkdays', '__datevalue', '__days',
  '__value',
  '__text', '__regexmatch', '__regexextract', '__regexreplace',
  '__ai', '__ai_classify', '__ai_translate', '__ai_summarize',
  '__filter', '__sort', '__unique', '__transpose', '__take', '__drop', '__sequence',
  '__cmp',
]);

function maskStringLiterals(src: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (const ch of src) {
    if (!inString) {
      if (ch === '"') {
        inString = true;
        out += '"';
      } else {
        out += ch;
      }
      continue;
    }
    if (escaped) {
      escaped = false;
      out += ' ';
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      out += ' ';
      continue;
    }
    if (ch === '"') {
      inString = false;
      out += '"';
      continue;
    }
    out += ' ';
  }
  return out;
}

function assertSafeEvalExpression(src: string): void {
  const masked = maskStringLiterals(src);
  if (/[;{}`]/.test(masked)) throw new Error('Unsafe formula token');
  if (/=>|\/\*|\*\//.test(masked)) throw new Error('Unsafe formula token');
  if (/(?<!\d)\.|\.(?!\d)/.test(masked)) throw new Error('Unsafe formula token');
  if (/\]\s*\[|\)\s*\[|"\s*\[|[A-Za-z_$][\w$]*\s*\[/.test(masked)) {
    throw new Error('Unsafe formula token');
  }
  const identifiers = masked.match(/[A-Za-z_$][\w$]*/g) ?? [];
  for (const ident of identifiers) {
    if (!SAFE_EVAL_IDENTIFIERS.has(ident)) throw new Error('Unsafe formula identifier');
  }
}

function previousNonSpace(src: string): string {
  for (let i = src.length - 1; i >= 0; i--) {
    if (!/\s/.test(src[i])) return src[i];
  }
  return '';
}

function normalizeExcelComparisons(src: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === '<' && src[i + 1] === '>') {
      out += '!=';
      i++;
      continue;
    }

    if (ch === '=') {
      const prev = previousNonSpace(out);
      const next = src[i + 1] ?? '';
      out += (prev === '>' || prev === '<' || prev === '!' || prev === '=' || next === '=')
        ? ch
        : '==';
      continue;
    }

    out += ch;
  }

  return out;
}

function normalizeExcelConcatenation(src: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === '&') {
      if (src[i + 1] === '&') {
        out += '&&';
        i++;
      } else {
        out += '+';
      }
      continue;
    }

    out += ch;
  }

  return out;
}

function rewriteRangeComparisons(src: string): string {
  const rangePattern = String.raw`__range\(\[[^\]]*\],[^)]*\)`;
  const valuePattern = String.raw`(?:-?\d+(?:\.\d+)?|true|false|"(?:\\.|[^"])*")`;
  return replaceOutsideStringLiterals(src, (chunk) => {
    let out = chunk.replace(
      new RegExp(`(${rangePattern})\\s*(>=|<=|==|!=|>|<)\\s*(${valuePattern})`, 'g'),
      (_match, range, op, value) => `__cmp(${range},${value},"${op}")`,
    );
    out = out.replace(
      new RegExp(`(${valuePattern})\\s*(>=|<=|==|!=|>|<)\\s*(${rangePattern})`, 'g'),
      (_match, value, op, range) => `__cmp(${value},${range},"${op}")`,
    );
    return out;
  });
}

function normalizeExcelPercentLiterals(src: string): string {
  let out = '';
  let chunk = '';
  let inString = false;
  let escaped = false;
  const normalizeChunk = (value: string) =>
    value.replace(/((?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*%/gi, '($1/100)');

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      out += normalizeChunk(chunk) + ch;
      chunk = '';
      inString = true;
      continue;
    }

    chunk += ch;
  }

  return out + normalizeChunk(chunk);
}

function normalizeExcelFunctionAliases(src: string): string {
  return replaceOutsideStringLiterals(src, (chunk) => chunk
    .replace(/\bPERCENTILE\.INC\b/gi, 'PERCENTILE')
    .replace(/\bPERCENTILE\.EXC\b/gi, 'PERCENTILEEXC')
    .replace(/\bQUARTILE\.INC\b/gi, 'QUARTILE')
    .replace(/\bQUARTILE\.EXC\b/gi, 'QUARTILEEXC')
    .replace(/\bSTDEV\.S\b/gi, 'STDEV')
    .replace(/\bSTDEV\.P\b/gi, 'STDEVP')
    .replace(/\bVAR\.S\b/gi, 'VAR')
    .replace(/\bVAR\.P\b/gi, 'VARP'));
}

function replaceOutsideStringLiterals(src: string, replaceChunk: (chunk: string) => string): string {
  let out = '';
  let chunk = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (!inString) {
      if (ch === '"') {
        out += replaceChunk(chunk) + ch;
        chunk = '';
        inString = true;
      } else {
        chunk += ch;
      }
      continue;
    }

    out += ch;
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"' && src[i + 1] === '"') {
      out += '"';
      i++;
      continue;
    }
    if (ch === '"') inString = false;
  }

  return out + replaceChunk(chunk);
}

function parseSheetPrefix(sheetRaw: unknown, currentSheet: string): string {
  if (!sheetRaw) return currentSheet;
  const raw = String(sheetRaw);
  if (raw.startsWith("'") && raw.endsWith("'")) {
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  return raw;
}

function quoteSheetNameForFormulaLocal(name: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? name
    : `'${name.replace(/'/g, "''")}'`;
}

function parseA1Range(raw: string): {
  startCol: number;
  endCol: number;
  startRow: number;
  endRow: number;
} | null {
  const m = raw.replace(/\$/g, '').match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const c1 = colToIdx(m[1]);
  const c2 = colToIdx(m[3]);
  const r1 = Number(m[2]);
  const r2 = Number(m[4]);
  return {
    startCol: Math.min(c1, c2),
    endCol: Math.max(c1, c2),
    startRow: Math.min(r1, r2),
    endRow: Math.max(r1, r2),
  };
}

function normalizeStructuredToken(raw: string): string {
  return raw.trim().replace(/^'/, '').replace(/'$/, '');
}

function normalizeCurrentRowColumnToken(raw: string): string {
  const token = normalizeStructuredToken(raw);
  if (token.startsWith('@[') && token.endsWith(']')) return token.slice(2, -1).trim();
  if (token.startsWith('@')) return token.slice(1).trim();
  return token;
}

function findTableEntry(
  tableName: string,
  currentSheet: string,
  tables: Record<string, FormulaTable[]>,
): { sheetName: string; table: FormulaTable } | null {
  const wanted = tableName.toLowerCase();
  const current = (tables[currentSheet] ?? []).find((table) => table.name.toLowerCase() === wanted);
  if (current) return { sheetName: currentSheet, table: current };
  for (const [sheetName, sheetTables] of Object.entries(tables)) {
    const table = sheetTables.find((candidate) => candidate.name.toLowerCase() === wanted);
    if (table) return { sheetName, table };
  }
  return null;
}

function parseCellRef(raw: string): { row: number; col: number } | null {
  const m = raw.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  return { col: colToIdx(m[1]), row: Number(m[2]) };
}

function findCurrentRowTableEntry(
  currentSheet: string,
  currentRef: string,
  tables: Record<string, FormulaTable[]>,
): { sheetName: string; table: FormulaTable; bounds: NonNullable<ReturnType<typeof parseA1Range>> } | null {
  const pos = parseCellRef(currentRef);
  if (!pos) return null;
  for (const table of tables[currentSheet] ?? []) {
    const bounds = parseA1Range(table.ref);
    if (!bounds) continue;
    const hasHeader = table.headerRow !== false;
    const hasTotals = table.totalsRow === true;
    const dataStartRow = bounds.startRow + (hasHeader ? 1 : 0);
    const dataEndRow = bounds.endRow - (hasTotals ? 1 : 0);
    if (
      pos.row >= dataStartRow &&
      pos.row <= dataEndRow &&
      pos.col >= bounds.startCol &&
      pos.col <= bounds.endCol
    ) {
      return { sheetName: currentSheet, table, bounds };
    }
  }
  return null;
}

function tableColumnName(table: FormulaTable, bounds: NonNullable<ReturnType<typeof parseA1Range>>, cells: Cells, headerRow: number, colOffset: number): string {
  const fromMeta = table.columns?.[colOffset]?.name;
  if (fromMeta && fromMeta.trim()) return fromMeta.trim();
  return String(cells[`${idxToCol(bounds.startCol + colOffset)}${headerRow}`] ?? '').trim();
}

function tableColumnOffset(
  table: FormulaTable,
  bounds: NonNullable<ReturnType<typeof parseA1Range>>,
  cells: Cells,
  headerRow: number,
  columnRaw: string,
): number {
  const wanted = normalizeCurrentRowColumnToken(columnRaw).toLowerCase();
  const width = bounds.endCol - bounds.startCol + 1;
  for (let i = 0; i < width; i++) {
    if (tableColumnName(table, bounds, cells, headerRow, i).toLowerCase() === wanted) return i;
  }
  return -1;
}

function resolveStructuredTableRef(
  tableName: string,
  selectorRaw: string,
  columnRaw: string | undefined,
  endColumnRaw: string | undefined,
  currentSheet: string,
  currentRef: string,
  tables: Record<string, FormulaTable[]>,
  allSheets: Record<string, Cells>,
): string | undefined {
  const found = findTableEntry(tableName, currentSheet, tables);
  if (!found) return undefined;
  const bounds = parseA1Range(found.table.ref);
  if (!bounds) return undefined;

  const { sheetName, table } = found;
  const cells = allSheets[sheetName] ?? {};
  const hasHeader = table.headerRow !== false;
  const hasTotals = table.totalsRow === true;
  const headerRow = bounds.startRow;
  const dataStartRow = bounds.startRow + (hasHeader ? 1 : 0);
  const dataEndRow = bounds.endRow - (hasTotals ? 1 : 0);
  const selector = normalizeStructuredToken(selectorRaw);
  const column = columnRaw ? normalizeStructuredToken(columnRaw) : undefined;
  const currentPos = parseCellRef(currentRef);

  let startRow = dataStartRow;
  let endRow = dataEndRow;
  let isCurrentRowSelector = false;
  if (selector.startsWith('@')) {
    isCurrentRowSelector = true;
    if (sheetName !== currentSheet) return undefined;
    if (
      !currentPos ||
      currentPos.row < dataStartRow ||
      currentPos.row > dataEndRow ||
      currentPos.col < bounds.startCol ||
      currentPos.col > bounds.endCol
    ) return undefined;
    startRow = currentPos.row;
    endRow = currentPos.row;
  } else if (selector.startsWith('#')) {
    const key = selector.toLowerCase();
    if (key === '#all') {
      startRow = bounds.startRow;
      endRow = bounds.endRow;
    } else if (key === '#this row') {
      isCurrentRowSelector = true;
      if (sheetName !== currentSheet) return undefined;
      if (
        !currentPos ||
        currentPos.row < dataStartRow ||
        currentPos.row > dataEndRow ||
        currentPos.col < bounds.startCol ||
        currentPos.col > bounds.endCol
      ) return undefined;
      startRow = currentPos.row;
      endRow = currentPos.row;
    } else if (key === '#headers') {
      if (!hasHeader) return undefined;
      startRow = headerRow;
      endRow = headerRow;
    } else if (key === '#data') {
      startRow = dataStartRow;
      endRow = dataEndRow;
    } else if (key === '#totals') {
      if (!hasTotals) return undefined;
      startRow = bounds.endRow;
      endRow = bounds.endRow;
    } else {
      return undefined;
    }
  }
  if (startRow > endRow) return undefined;

  let startCol = bounds.startCol;
  let endCol = bounds.endCol;
  const wantedColumn = column
    ? normalizeCurrentRowColumnToken(column)
    : (selector.startsWith('#') ? undefined : normalizeCurrentRowColumnToken(selector));
  if (wantedColumn) {
    const colOffset = tableColumnOffset(table, bounds, cells, headerRow, wantedColumn);
    if (colOffset < 0) return undefined;
    startCol = bounds.startCol + colOffset;
    endCol = startCol;
  }
  if (endColumnRaw) {
    const startOffset = tableColumnOffset(table, bounds, cells, headerRow, wantedColumn ?? column ?? '');
    const endOffset = tableColumnOffset(table, bounds, cells, headerRow, endColumnRaw);
    if (startOffset < 0 || endOffset < 0) return undefined;
    startCol = bounds.startCol + Math.min(startOffset, endOffset);
    endCol = bounds.startCol + Math.max(startOffset, endOffset);
  }

  const prefix = `${quoteSheetNameForFormulaLocal(sheetName)}!`;
  if (isCurrentRowSelector && startRow === endRow && startCol === endCol) {
    return `${prefix}${idxToCol(startCol)}${startRow}`;
  }
  return `${prefix}${idxToCol(startCol)}${startRow}:${idxToCol(endCol)}${endRow}`;
}

function resolveCurrentRowStructuredRef(
  columnRaw: string,
  currentSheet: string,
  currentRef: string,
  tables: Record<string, FormulaTable[]>,
  allSheets: Record<string, Cells>,
): string | undefined {
  const found = findCurrentRowTableEntry(currentSheet, currentRef, tables);
  if (!found) return undefined;
  return resolveStructuredTableRef(
    found.table.name,
    '@',
    columnRaw,
    undefined,
    currentSheet,
    currentRef,
    tables,
    allSheets,
  );
}

function replaceStructuredReferences(
  src: string,
  currentSheet: string,
  currentRef: string,
  tables: Record<string, FormulaTable[]>,
  allSheets: Record<string, Cells>,
): string {
  if (Object.keys(tables).length === 0) return src;
  return replaceOutsideStringLiterals(src, (chunk) => {
    let next = chunk.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[\[([^\]]+)\],\[([^\]]+)\]:\[([^\]]+)\]\]/g,
      (match, tableName, selector, startColumn, endColumn) =>
        resolveStructuredTableRef(tableName, selector, startColumn, endColumn, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[\[([^\]#][^\]]*)\]:\[([^\]]+)\]\]/g,
      (match, tableName, startColumn, endColumn) =>
        resolveStructuredTableRef(tableName, startColumn, undefined, endColumn, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[@\[([^\]]+)\]:\[([^\]]+)\]\]/g,
      (match, tableName, startColumn, endColumn) =>
        resolveStructuredTableRef(tableName, '@', startColumn, endColumn, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[@\[([^\]]+)\]\]/g,
      (match, tableName, column) =>
        resolveStructuredTableRef(tableName, '@', column, undefined, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[\[([^\]]+)\],\[([^\]]+)\]\]/g,
      (match, tableName, selector, column) =>
        resolveStructuredTableRef(tableName, selector, column, undefined, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /\b([A-Za-z_][A-Za-z0-9_]*)\[([^\]]+)\]/g,
      (match, tableName, selector) =>
        resolveStructuredTableRef(tableName, selector, undefined, undefined, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /(?<![A-Za-z0-9_])\[@\[([^\]]+)\]:\[([^\]]+)\]\]/g,
      (match, startColumn, endColumn) => {
        const found = findCurrentRowTableEntry(currentSheet, currentRef, tables);
        if (!found) return match;
        return resolveStructuredTableRef(found.table.name, '@', startColumn, endColumn, currentSheet, currentRef, tables, allSheets) ?? match;
      },
    );
    next = next.replace(
      /(?<![A-Za-z0-9_])\[@\[([^\]]+)\]\]/g,
      (match, column) =>
        resolveCurrentRowStructuredRef(column, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    next = next.replace(
      /(?<![A-Za-z0-9_])\[@([^\]]+)\]/g,
      (match, column) =>
        resolveCurrentRowStructuredRef(column, currentSheet, currentRef, tables, allSheets) ?? match,
    );
    return next;
  });
}

function evalExpr(
  expr: string,
  currentSheet: string,
  currentRef: string,
  allSheets: Record<string, Cells>,
  namedRanges: Record<string, string>,
  tables: Record<string, FormulaTable[]>,
  visiting: Set<string>,
  formulaCache?: Map<string, string>,
  nonCacheable?: Set<string>,
): unknown {
  let work = expr;

  // -1. TRUE/FALSE 리터럴 — JS 식별자 아님(=undefined ReferenceError). 사전 치환.
  work = replaceOutsideStringLiterals(work, (chunk) =>
    chunk.replace(/\bTRUE\b/gi, 'true').replace(/\bFALSE\b/gi, 'false'));

  // -0.5. 문자열 리터럴 전처리 — Excel/Sheets 식 "" escape + 백슬래시 보존.
  //   "abc""def"  → "abc\"def"   (Excel 스타일: 두 따옴표가 한 따옴표)
  //   "\d+"       → "\\d+"       (정규표현식 \d 가 JS 파서에서 사라지지 않게)
  //   둘을 동시에 정확히 처리하려면 단순 regex 로는 안 되므로 작은 state machine.
  work = escapeStringLiterals(work);
  work = normalizeExcelFunctionAliases(work);

  // -0.25. Excel table structured references: Table1[Column], Table1[#Data],
  // Table1[[#All],[Column]] -> ordinary A1 ranges before the standard range pass.
  work = replaceStructuredReferences(work, currentSheet, currentRef, tables, allSheets);

  // 0. Named Range 치환 — 가장 먼저. 이름이 함수명·기존 ref 와 안 겹친다 가정.
  //    토큰 경계: 앞뒤가 알파뉴 X. case-insensitive.
  if (Object.keys(namedRanges).length > 0) {
    // 긴 이름부터 (짧은 이름이 긴 이름의 prefix 인 경우 방지)
    const names = Object.keys(namedRanges).sort((a, b) => b.length - a.length);
    for (const name of names) {
      const safe = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 한글·영문·_ 등 word 문자로 시작/끝나는 토큰만 매칭
      const re = new RegExp(`(?<![A-Za-z0-9_가-힣])${safe}(?![A-Za-z0-9_가-힣!])`, 'g');
      work = replaceOutsideStringLiterals(work, (chunk) => chunk.replace(re, `(${namedRanges[name]})`));
    }
  }

  // 1. 범위 (sheet 옵셔널 + A1:B5) — $ 절대 참조 마커는 평가에서 무시
  //    Sheet1!$A$1:$B$5 또는 A1:B5
  work = replaceOutsideStringLiterals(work, (chunk) => chunk.replace(
    /(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+):(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)/g,
    (_m, sheetRaw, c1, r1, sheetRaw2, c2, r2) => {
      const sheet = parseSheetPrefix(sheetRaw ?? sheetRaw2, currentSheet);
      const minC = Math.min(colToIdx(c1 as string), colToIdx(c2 as string));
      const maxC = Math.max(colToIdx(c1 as string), colToIdx(c2 as string));
      const minR = Math.min(Number(r1), Number(r2));
      const maxR = Math.max(Number(r1), Number(r2));
      const refs = collectRange(c1 as string, Number(r1), c2 as string, Number(r2));
      const tokens = refs.map((r) => {
        const v = evalWithGuard(sheet, r, allSheets, namedRanges, tables, visiting, formulaCache, nonCacheable);
        if (v.startsWith('#')) return '0';
        const n = Number(v);
        if (Number.isFinite(n) && v.trim() !== '') return String(n);
        if (v === '') return '""';
        return JSON.stringify(v);
      });
      return `__range([${tokens.join(',')}],${maxC - minC + 1},${maxR - minR + 1},${minR},${minC + 1})`;
    },
  ));

  // 2. 단일 셀 참조 — Sheet1!$A$1 또는 A1
  //    함수 이름과 혼동 방지: lookbehind 로 알파벳·_ 뒤가 아닐 때만 매칭
  work = replaceOutsideStringLiterals(work, (chunk) => chunk.replace(
    /(?<![A-Za-z_0-9$])(?:('(?:[^']|'')+'|[A-Za-z]\w*)!)?\$?([A-Z]+)\$?(\d+)\b/g,
    (_m, sheetRaw, c, r) => {
      const sheet = parseSheetPrefix(sheetRaw, currentSheet);
      const ref = `${c}${r}`;
      const v = evalWithGuard(sheet, ref, allSheets, namedRanges, tables, visiting, formulaCache, nonCacheable);
      if (v.startsWith('#')) return '0';
      const n = Number(v);
      if (Number.isFinite(n) && v.trim() !== '') return String(n);
      if (v === '') return '0';
      return JSON.stringify(v);
    },
  ));

  // 3. 함수 이름 → __funcname (긴 이름부터 처리: AVERAGE 먼저)
  work = replaceOutsideStringLiterals(work, (chunk) => {
    let replaced = chunk;
    for (const fn of FUNC_ORDER) {
      const re = new RegExp(`\\b${fn}\\b`, 'gi');
      replaced = replaced.replace(re, `__${fn.toLowerCase()}`);
    }
    return replaced;
  });

  // 4. ^ → ** (지수)
  work = replaceOutsideStringLiterals(work, (chunk) => chunk.replace(/\^/g, '**'));
  work = normalizeExcelComparisons(work);
  work = normalizeExcelConcatenation(work);
  work = rewriteRangeComparisons(work);
  work = normalizeExcelPercentLiterals(work);
  assertSafeEvalExpression(work);

  // 5. 안전 함수들 정의
  type RangeArray = unknown[] & { __cols?: number; __rows?: number; __startRow?: number; __startCol?: number };
  const __range = (values: unknown[], cols: unknown, rows: unknown, startRow?: unknown, startCol?: unknown): RangeArray => {
    const arr = Array.isArray(values) ? values as RangeArray : [values] as RangeArray;
    const colCount = Math.max(1, Math.floor(Number(cols) || arr.length || 1));
    const rowCount = Math.max(1, Math.floor(Number(rows) || Math.ceil(arr.length / colCount) || 1));
    const firstRow = Math.max(1, Math.floor(Number(startRow) || 1));
    const firstCol = Math.max(1, Math.floor(Number(startCol) || 1));
    Object.defineProperties(arr, {
      __cols: { value: colCount, enumerable: false, configurable: true },
      __rows: { value: rowCount, enumerable: false, configurable: true },
      __startRow: { value: firstRow, enumerable: false, configurable: true },
      __startCol: { value: firstCol, enumerable: false, configurable: true },
    });
    return arr;
  };
  const toArr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [v]);
  const rangeCols = (v: unknown, fallback = 1): number => {
    if (!Array.isArray(v)) return fallback;
    const cols = (v as RangeArray).__cols;
    return typeof cols === 'number' && Number.isFinite(cols) && cols > 0 ? cols : fallback;
  };
  const rangeRows = (v: unknown, fallback = 1): number => {
    if (!Array.isArray(v)) return fallback;
    const rows = (v as RangeArray).__rows;
    return typeof rows === 'number' && Number.isFinite(rows) && rows > 0 ? rows : fallback;
  };
  const compareValues = (a: unknown, b: unknown, op: unknown): boolean => {
    const leftNum = Number(a);
    const rightNum = Number(b);
    const useNumber = Number.isFinite(leftNum) && Number.isFinite(rightNum);
    const left = useNumber ? leftNum : String(a ?? '');
    const right = useNumber ? rightNum : String(b ?? '');
    switch (String(op)) {
      case '>': return left > right;
      case '<': return left < right;
      case '>=': return left >= right;
      case '<=': return left <= right;
      case '!=': return left !== right;
      default: return left === right;
    }
  };
  const __cmp = (left: unknown, right: unknown, op: unknown): unknown => {
    const leftArr = toArr(left);
    const rightArr = toArr(right);
    const len = Math.max(leftArr.length, rightArr.length);
    const values = Array.from({ length: len }, (_, idx) => (
      compareValues(leftArr[idx % leftArr.length], rightArr[idx % rightArr.length], op)
    ));
    const cols = Array.isArray(left) ? rangeCols(left, values.length) : rangeCols(right, values.length);
    const rows = Array.isArray(left) ? rangeRows(left, Math.ceil(values.length / cols)) : rangeRows(right, Math.ceil(values.length / cols));
    return __range(values, cols, rows);
  };
  const toNums = (v: unknown): number[] => toArr(v).flatMap((x) => {
    if (x === null || x === undefined || x === '') return [];
    const n = Number(x);
    return Number.isFinite(n) ? [n] : [];
  });
  const toNumsOrZero = (v: unknown): number[] => toArr(v).map((x) => {
    if (x === null || x === undefined || x === '') return 0;
    const n = Number(x);
    return Number.isFinite(n) ? n : 0;
  });

  const __sum = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.reduce((a, b) => a + b, 0);
  };
  const __product = (...args: unknown[]) => {
    const flat = args.flatMap(toNums);
    return flat.length ? flat.reduce((a, b) => a * b, 1) : 0;
  };
  const __sumproduct = (...args: unknown[]) => {
    const arrays = args.map(toNumsOrZero);
    if (arrays.length === 0) return 0;
    const len = Math.min(...arrays.map((arr) => arr.length));
    let total = 0;
    for (let i = 0; i < len; i++) {
      total += arrays.reduce((prod, arr) => prod * (arr[i] ?? 0), 1);
    }
    return total;
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
  const subtotalNums = (...args: unknown[]): number[] => args.flatMap(toArr).flatMap((x) => {
    if (x === null || x === undefined || x === '') return [];
    const n = Number(x);
    return Number.isFinite(n) ? [n] : [];
  });
  const __subtotal = (functionNum: unknown, ...args: unknown[]) => {
    const rawCode = Math.floor(Number(functionNum));
    if (!Number.isFinite(rawCode)) return '#VALUE!';
    const code = rawCode >= 100 ? rawCode - 100 : rawCode;
    const nums = subtotalNums(...args);
    switch (code) {
      case 1:
        return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : '#DIV/0!';
      case 2:
        return __count(...args);
      case 3:
        return __counta(...args);
      case 4:
        return nums.length ? Math.max(...nums) : 0;
      case 5:
        return nums.length ? Math.min(...nums) : 0;
      case 6:
        return nums.length ? nums.reduce((a, b) => a * b, 1) : 0;
      case 7:
      case 107:
        return __stdev(...args);
      case 8:
      case 108: {
        if (nums.length === 0) return '#DIV/0!';
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
        return Math.sqrt(variance);
      }
      case 9:
        return nums.reduce((a, b) => a + b, 0);
      case 10:
      case 110:
        return __var(...args);
      case 11:
      case 111: {
        if (nums.length === 0) return '#DIV/0!';
        const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
        return nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
      }
      default:
        return '#VALUE!';
    }
  };
  const __if = (cond: unknown, a: unknown, b: unknown) => (cond ? a : b);
  const __abs = (n: unknown) => Math.abs(Number(n));
  const __round = (n: unknown, d: unknown = 0) => {
    const p = Math.pow(10, Number(d));
    return Math.round(Number(n) * p) / p;
  };

  const escapeCriteriaRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const criteriaHasWildcard = (text: string): boolean => {
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '~') {
        i += 1;
      } else if (text[i] === '*' || text[i] === '?') {
        return true;
      }
    }
    return false;
  };
  const criteriaWildcardRegex = (text: string): RegExp => {
    let pattern = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '~' && i + 1 < text.length) {
        pattern += escapeCriteriaRegex(text[++i]);
      } else if (ch === '*') {
        pattern += '.*';
      } else if (ch === '?') {
        pattern += '.';
      } else {
        pattern += escapeCriteriaRegex(ch);
      }
    }
    return new RegExp(`^${pattern}$`, 'i');
  };
  const unescapeCriteriaText = (text: string): string => {
    let out = '';
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '~' && i + 1 < text.length) out += text[++i];
      else out += text[i];
    }
    return out;
  };
  const textCriteriaEquals = (value: unknown, criteriaText: string): boolean => {
    const valStr = String(value ?? '');
    if (criteriaHasWildcard(criteriaText)) return criteriaWildcardRegex(criteriaText).test(valStr);
    const plainCriteria = unescapeCriteriaText(criteriaText);
    const rhsNum = Number(plainCriteria);
    const valueNum = Number(value);
    if (plainCriteria.trim() !== '' && Number.isFinite(rhsNum) && Number.isFinite(valueNum)) {
      return valueNum === rhsNum;
    }
    return valStr.toLowerCase() === plainCriteria.toLowerCase();
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
      // 문자열 비교 (= 와 <>): Excel처럼 대소문자를 무시하고 wildcard도 처리.
      if (op === '=') return textCriteriaEquals(valStr, rhsStr);
      if (op === '<>') return !textCriteriaEquals(valStr, rhsStr);
      return false;
    }
    return textCriteriaEquals(value, criteria);
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

  const __averageif = (range: unknown, criteria: unknown, averageRange?: unknown) => {
    const arr = toArr(range);
    const avgArr = averageRange !== undefined ? toArr(averageRange) : arr;
    let total = 0;
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!matchCriteria(arr[i], criteria)) continue;
      const n = Number(avgArr[i]);
      if (Number.isFinite(n)) {
        total += n;
        count++;
      }
    }
    return count === 0 ? '#DIV/0!' : total / count;
  };

  const conditionalValues = (valueRange: unknown, args: unknown[]): number[] => {
    if (args.length < 2 || args.length % 2 !== 0) return [];
    const values = toArr(valueRange);
    const pairs: Array<{ range: unknown[]; criteria: unknown }> = [];
    for (let i = 0; i < args.length; i += 2) {
      pairs.push({ range: toArr(args[i]), criteria: args[i + 1] });
    }
    const out: number[] = [];
    for (let i = 0; i < values.length; i++) {
      let allMatch = true;
      for (const p of pairs) {
        if (!matchCriteria(p.range[i], p.criteria)) { allMatch = false; break; }
      }
      if (!allMatch) continue;
      const n = Number(values[i]);
      if (Number.isFinite(n)) out.push(n);
    }
    return out;
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
    return conditionalValues(sumRange, args).reduce((a, b) => a + b, 0);
  };

  const __averageifs = (averageRange: unknown, ...args: unknown[]) => {
    const values = conditionalValues(averageRange, args);
    return values.length === 0 ? '#DIV/0!' : values.reduce((a, b) => a + b, 0) / values.length;
  };

  const __minifs = (minRange: unknown, ...args: unknown[]) => {
    const values = conditionalValues(minRange, args);
    return values.length === 0 ? 0 : Math.min(...values);
  };

  const __maxifs = (maxRange: unknown, ...args: unknown[]) => {
    const values = conditionalValues(maxRange, args);
    return values.length === 0 ? 0 : Math.max(...values);
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
  const __value = (text: unknown) => {
    if (typeof text === 'number') return text;
    if (typeof text === 'boolean') return text ? 1 : 0;
    let s = String(text ?? '').trim();
    if (!s) return '#VALUE!';
    let negative = false;
    if (/^\(.*\)$/.test(s)) {
      negative = true;
      s = s.slice(1, -1);
    }
    const percent = /%$/.test(s);
    if (percent) s = s.slice(0, -1);
    s = s.replace(/[$₩€£¥,\s]/g, '');
    const n = Number(s);
    if (!Number.isFinite(n)) return '#VALUE!';
    const signed = negative ? -n : n;
    return percent ? signed / 100 : signed;
  };
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
  const MS_PER_DAY = 86_400_000;
  const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
  const dateToExcelSerial = (d: Date) =>
    Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EXCEL_EPOCH_UTC) / MS_PER_DAY);
  const excelSerialToDate = (serial: number) =>
    new Date(EXCEL_EPOCH_UTC + Math.floor(serial) * MS_PER_DAY);
  const parseDate = (v: unknown): Date | null => {
    if (v instanceof Date) return v;
    if (typeof v === 'number' && Number.isFinite(v)) return excelSerialToDate(v);
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
  const percentileInclusive = (values: number[], k: unknown): number | string => {
    const nums = [...values].sort((a, b) => a - b);
    const p = Number(k);
    if (nums.length === 0 || !Number.isFinite(p) || p < 0 || p > 1) return '#NUM!';
    if (nums.length === 1) return nums[0];
    const rank = (nums.length - 1) * p;
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    return lo === hi ? nums[lo] : nums[lo] + (nums[hi] - nums[lo]) * (rank - lo);
  };
  const percentileExclusive = (values: number[], k: unknown): number | string => {
    const nums = [...values].sort((a, b) => a - b);
    const p = Number(k);
    if (nums.length < 2 || !Number.isFinite(p) || p <= 0 || p >= 1) return '#NUM!';
    const rank = (nums.length + 1) * p;
    if (rank <= 1 || rank >= nums.length) return '#NUM!';
    const lo = Math.floor(rank);
    const hi = Math.ceil(rank);
    return lo === hi ? nums[lo - 1] : nums[lo - 1] + (nums[hi - 1] - nums[lo - 1]) * (rank - lo);
  };
  const __large = (range: unknown, k: unknown) => {
    const nums = toNums(range).sort((a, b) => b - a);
    const idx = Math.floor(Number(k)) - 1;
    return idx >= 0 && idx < nums.length ? nums[idx] : '#NUM!';
  };
  const __small = (range: unknown, k: unknown) => {
    const nums = toNums(range).sort((a, b) => a - b);
    const idx = Math.floor(Number(k)) - 1;
    return idx >= 0 && idx < nums.length ? nums[idx] : '#NUM!';
  };
  const __percentile = (range: unknown, k: unknown) => percentileInclusive(toNums(range), k);
  const __percentileexc = (range: unknown, k: unknown) => percentileExclusive(toNums(range), k);
  const __quartile = (range: unknown, quart: unknown) => {
    const q = Math.floor(Number(quart));
    return q >= 0 && q <= 4 ? percentileInclusive(toNums(range), q / 4) : '#NUM!';
  };
  const __quartileexc = (range: unknown, quart: unknown) => {
    const q = Math.floor(Number(quart));
    return q >= 1 && q <= 3 ? percentileExclusive(toNums(range), q / 4) : '#NUM!';
  };

  // ─── 조회 함수 ───
  const lookupExactMatch = (key: unknown, cell: unknown): boolean => {
    const keyNum = Number(key);
    const cellNum = Number(cell);
    return Number.isFinite(keyNum) && Number.isFinite(cellNum)
      ? cellNum === keyNum
      : String(cell ?? '') === String(key ?? '');
  };
  const lookupWildcardMatch = (pattern: unknown, cell: unknown): boolean => {
    const source = String(pattern ?? '');
    let escaped = '';
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '~' && i + 1 < source.length) {
        escaped += source[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else if (ch === '*') {
        escaped += '.*';
      } else if (ch === '?') {
        escaped += '.';
      } else {
        escaped += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp(`^${escaped}$`, 'i').test(String(cell ?? ''));
  };
  const orderedIndexes = (length: number, reverse = false): number[] => {
    const indexes = Array.from({ length }, (_, idx) => idx);
    if (reverse) indexes.reverse();
    return indexes;
  };
  const approximateLookupIndex = (key: unknown, values: unknown[], mode: -1 | 1): number => {
    const keyNum = Number(key);
    if (!Number.isFinite(keyNum)) return -1;
    let bestIdx = -1;
    let bestValue = mode === -1 ? -Infinity : Infinity;
    for (let i = 0; i < values.length; i++) {
      const value = Number(values[i]);
      if (!Number.isFinite(value)) continue;
      if (mode === -1 && value <= keyNum && value > bestValue) {
        bestValue = value;
        bestIdx = i;
      } else if (mode === 1 && value >= keyNum && value < bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }
    return bestIdx;
  };
  const isExactLookup = (rangeLookup: unknown): boolean => (
    rangeLookup === false ||
    rangeLookup === 0 ||
    (typeof rangeLookup === 'string' && rangeLookup.trim().toLowerCase() === 'false')
  );

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
  const __vlookup = (key: unknown, range: unknown, returnColIdx: unknown, rangeLookup: unknown = true) => {
    const arr = toArr(range);
    const cols = rangeCols(range, 2);
    const ret = Math.max(1, Math.floor(Number(returnColIdx) || 1));
    if (ret > cols) return '#REF!';
    const firstCol = Array.from({ length: Math.ceil(arr.length / cols) }, (_, row) => arr[row * cols]);
    const rowIndexes = isExactLookup(rangeLookup)
      ? orderedIndexes(firstCol.length)
      : [approximateLookupIndex(key, firstCol, -1)];
    if (rowIndexes[0] < 0) return '#N/A';
    for (const rowIdx of rowIndexes) {
      const r = rowIdx * cols;
      if (!isExactLookup(rangeLookup) || lookupExactMatch(key, arr[r])) return arr[r + ret - 1];
    }
    return '#N/A';
  };
  /** HLOOKUP: 같은 사상으로 row-major 1D. 첫 row 에서 검색.
   *  HLOOKUP(key, range, returnRowIdx, numCols)
   */
  const __hlookup = (key: unknown, range: unknown, returnRowIdx: unknown, rangeLookup: unknown = true) => {
    const arr = toArr(range);
    const cols = rangeCols(range, 2);
    const ret = Math.max(1, Math.floor(Number(returnRowIdx) || 1));
    const firstRow = arr.slice(0, cols);
    const colIndexes = isExactLookup(rangeLookup)
      ? orderedIndexes(firstRow.length)
      : [approximateLookupIndex(key, firstRow, -1)];
    if (colIndexes[0] < 0) return '#N/A';
    for (const c of colIndexes) {
      if (isExactLookup(rangeLookup) && !lookupExactMatch(key, arr[c])) continue;
      const idx = (ret - 1) * cols + c;
      if (idx < arr.length) return arr[idx];
      return '#REF!';
    }
    return '#N/A';
  };
  /** INDEX(range, idx) — 단순 1-based 인덱싱 (평탄화 배열) */
  const __index = (range: unknown, idx: unknown, colIdx?: unknown) => {
    const arr = toArr(range);
    const cols = rangeCols(range, arr.length || 1);
    const row = Math.max(1, Math.floor(Number(idx) || 1));
    const col = colIdx === undefined ? 1 : Math.max(1, Math.floor(Number(colIdx) || 1));
    const i = colIdx === undefined ? row : ((row - 1) * cols) + col;
    if (i > arr.length) return '#REF!';
    return arr[i - 1];
  };
  /** IMAGE(url) — sentinel 문자열 반환. 셀 렌더가 prefix 보고 <img> 표시. */
  const __image = (url: unknown) => {
    const u = String(url ?? '').trim();
    if (!u) return '#VALUE!';
    if (!isSafeImageSrc(u)) return '#REF!';
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

  /** MATCH(key, range, [match_type]) — 1-based 위치 반환. 못 찾으면 #N/A */
  const __match = (key: unknown, range: unknown, matchType: unknown = 1) => {
    const arr = toArr(range);
    const mode = Math.floor(Number(matchType));
    if (mode === 0) {
      for (let i = 0; i < arr.length; i++) {
        if (lookupExactMatch(key, arr[i])) return i + 1;
      }
      return '#N/A';
    }
    const idx = approximateLookupIndex(key, arr, mode < 0 ? 1 : -1);
    return idx < 0 ? '#N/A' : idx + 1;
  };

  // ─── 에러 처리 ───
  const __xmatch = (key: unknown, range: unknown, matchMode: unknown = 0, searchMode: unknown = 1) => {
    const arr = toArr(range);
    const mode = Math.floor(Number(matchMode) || 0);
    const reverse = Math.floor(Number(searchMode) || 1) < 0;
    if (mode === 0 || mode === 2) {
      for (const i of orderedIndexes(arr.length, reverse)) {
        const found = mode === 2 ? lookupWildcardMatch(key, arr[i]) : lookupExactMatch(key, arr[i]);
        if (found) return i + 1;
      }
      return '#N/A';
    }
    const idx = approximateLookupIndex(key, arr, mode < 0 ? -1 : 1);
    return idx < 0 ? '#N/A' : idx + 1;
  };

  const __rows = (range: unknown) => rangeRows(range, Array.isArray(range) ? range.length : 1);
  const __columns = (range: unknown) => rangeCols(range, 1);
  const currentRefMatch = currentRef.toUpperCase().match(/^([A-Z]+)([0-9]+)$/);
  const currentRow = currentRefMatch ? Number(currentRefMatch[2]) : 1;
  const currentCol = currentRefMatch ? colToIdx(currentRefMatch[1]) + 1 : 1;
  const __row = (range?: unknown) => (
    Array.isArray(range) && typeof (range as RangeArray).__startRow === 'number'
      ? (range as RangeArray).__startRow
      : currentRow
  );
  const __column = (range?: unknown) => (
    Array.isArray(range) && typeof (range as RangeArray).__startCol === 'number'
      ? (range as RangeArray).__startCol
      : currentCol
  );
  const __choose = (idx: unknown, ...values: unknown[]) => {
    const i = Math.floor(Number(idx));
    return i >= 1 && i <= values.length ? values[i - 1] : '#VALUE!';
  };

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
  const exactLookupMatch = (key: unknown, cell: unknown): boolean => {
    const keyNum = Number(key);
    const cellNum = Number(cell);
    return Number.isFinite(keyNum) && Number.isFinite(cellNum)
      ? cellNum === keyNum
      : String(cell ?? '') === String(key ?? '');
  };
  const wildcardLookupMatch = (pattern: unknown, cell: unknown): boolean => {
    const source = String(pattern ?? '');
    let escaped = '';
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (ch === '~' && i + 1 < source.length) {
        escaped += source[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      } else if (ch === '*') {
        escaped += '.*';
      } else if (ch === '?') {
        escaped += '.';
      } else {
        escaped += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      }
    }
    return new RegExp(`^${escaped}$`, 'i').test(String(cell ?? ''));
  };
  const spillGrid = (grid: unknown[][]): string =>
    `${SPILL_SENTINEL}${JSON.stringify(grid.map((row) => row.map((v) => (v == null ? '' : String(v)))))}`;
  const spillVertical = (arr: unknown[]): string => spillGrid(arr.map((v) => [v]));
  const rangeGrid = (range: unknown): unknown[][] => {
    const arr = toArr(range);
    const cols = rangeCols(range, 1);
    const rows = rangeRows(range, Math.max(1, Math.ceil(arr.length / Math.max(1, cols))));
    return Array.from({ length: rows }, (_, row) => (
      Array.from({ length: cols }, (_, col) => arr[row * cols + col] ?? '')
    ));
  };
  const spillTruthy = (value: unknown): boolean => (
    value === true ||
    (typeof value === 'number' && value !== 0) ||
    (typeof value === 'string' && value !== '' && value !== '0' && value.toLowerCase() !== 'false')
  );
  const compareSpreadsheetValues = (a: unknown, b: unknown): number => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return String(a ?? '').localeCompare(String(b ?? ''));
  };
  const xlookupReturnValue = (lookupRange: unknown, returnRange: unknown, index: number): unknown => {
    const ret = toArr(returnRange);
    const lookup = toArr(lookupRange);
    const lookupRows = rangeRows(lookupRange, lookup.length || 1);
    const lookupCols = rangeCols(lookupRange, 1);
    const returnRows = rangeRows(returnRange, ret.length || 1);
    const returnCols = rangeCols(returnRange, 1);
    if (lookupCols === 1 && lookupRows === lookup.length && returnRows === lookup.length && returnCols > 1) {
      const row = ret.slice(index * returnCols, index * returnCols + returnCols);
      return row.length === returnCols ? spillGrid([row]) : '#N/A';
    }
    if (lookupRows === 1 && lookupCols === lookup.length && returnCols === lookup.length && returnRows > 1) {
      return spillVertical(Array.from({ length: returnRows }, (_, row) => ret[row * returnCols + index]));
    }
    return index < ret.length ? ret[index] : '#N/A';
  };
  const __xlookup = (
    key: unknown,
    lookupRange: unknown,
    returnRange: unknown,
    notFound: unknown = '#N/A',
    matchMode: unknown = 0,
    searchMode: unknown = 1,
  ) => {
    const lookup = toArr(lookupRange);
    if (lookup.length === 0) return notFound;
    const mode = Math.floor(Number(matchMode) || 0);
    const reverse = Math.floor(Number(searchMode) || 1) < 0;
    const orderedIndexes = Array.from({ length: lookup.length }, (_, i) => i);
    if (reverse) orderedIndexes.reverse();
    for (const i of orderedIndexes) {
      const found = mode === 2
        ? wildcardLookupMatch(key, lookup[i])
        : exactLookupMatch(key, lookup[i]);
      if (found) return xlookupReturnValue(lookupRange, returnRange, i);
    }
    if (mode !== -1 && mode !== 1) return notFound;
    const keyNum = Number(key);
    if (!Number.isFinite(keyNum)) return notFound;
    let bestIdx = -1;
    let bestValue = mode === -1 ? -Infinity : Infinity;
    for (let i = 0; i < lookup.length; i++) {
      const value = Number(lookup[i]);
      if (!Number.isFinite(value)) continue;
      if (mode === -1 && value <= keyNum && value > bestValue) {
        bestValue = value;
        bestIdx = i;
      } else if (mode === 1 && value >= keyNum && value < bestValue) {
        bestValue = value;
        bestIdx = i;
      }
    }
    return bestIdx < 0 ? notFound : xlookupReturnValue(lookupRange, returnRange, bestIdx);
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
  // HYPERLINK v2 (PR #6) — sentinel + JSON {url, label} 반환. 셀 렌더가 <a> 로 표시.
  // 라벨이 비어있으면 URL 자체가 라벨. 안전한 스킴만 통과.
  const __hyperlink = (url: unknown, label?: unknown) => {
    const u = String(url ?? '').trim();
    if (!u) return '#VALUE!';
    if (!isSafeHref(u)) return '#REF!';
    const l = label === undefined || label === null || String(label).trim() === ''
      ? u : String(label);
    return `__CLOUDSHEET_LINK__:${JSON.stringify({ url: u, label: l })}`;
  };

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
  const __stdevp = (...args: unknown[]) => {
    const nums = args.flatMap(toNums);
    if (nums.length === 0) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
    return Math.sqrt(variance);
  };
  const __var = (...args: unknown[]) => {
    const nums = args.flatMap(toNums);
    if (nums.length < 2) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - m) ** 2, 0) / (nums.length - 1);
  };
  const __varp = (...args: unknown[]) => {
    const nums = args.flatMap(toNums);
    if (nums.length === 0) return 0;
    const m = nums.reduce((a, b) => a + b, 0) / nums.length;
    return nums.reduce((a, b) => a + (b - m) ** 2, 0) / nums.length;
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
  const __datevalue = (dateText: unknown) => {
    const d = parseDate(dateText);
    return d ? dateToExcelSerial(d) : '#VALUE!';
  };
  const __days = (endDate: unknown, startDate: unknown) => {
    const end = parseDate(endDate), start = parseDate(startDate);
    if (!end || !start) return '#VALUE!';
    return Math.floor(
      (Date.UTC(end.getFullYear(), end.getMonth(), end.getDate()) -
        Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())) / MS_PER_DAY,
    );
  };

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
  const __filter = (range: unknown, condition: unknown, ifEmpty: unknown = '#N/A') => {
    const grid = rangeGrid(range);
    const cond = toArr(condition);
    if (grid.length === 0 || grid[0]?.length === 0) return ifEmpty;
    let filteredGrid: unknown[][] = [];
    if (cond.length === grid.length) {
      filteredGrid = grid.filter((_, row) => spillTruthy(cond[row]));
    } else if (cond.length === grid[0].length) {
      filteredGrid = grid.map((row) => row.filter((_, col) => spillTruthy(cond[col])));
      if (filteredGrid.every((row) => row.length === 0)) filteredGrid = [];
    } else {
      filteredGrid = toArr(range).filter((_, idx) => spillTruthy(cond[idx])).map((value) => [value]);
    }
    return filteredGrid.length === 0 ? ifEmpty : spillGrid(filteredGrid);
  };
  const __sort = (range: unknown, descending: unknown = 0, sortOrder?: unknown, byCol: unknown = false) => {
    const grid = rangeGrid(range);
    if (grid.length > 0 && (grid[0]?.length ?? 0) > 1) {
      const sortIndex = Math.max(1, Math.floor(Number(descending) || 1));
      const orderArg = sortOrder ?? 1;
      const order = Number(orderArg) < 0 ? -1 : 1;
      const cols = grid[0].length;
      if (byCol) {
        const rowIdx = Math.min(grid.length - 1, sortIndex - 1);
        const colIndexes = Array.from({ length: cols }, (_, idx) => idx)
          .sort((a, b) => compareSpreadsheetValues(grid[rowIdx]?.[a], grid[rowIdx]?.[b]) * order);
        return spillGrid(grid.map((row) => colIndexes.map((idx) => row[idx])));
      }
      const colIdx = Math.min(cols - 1, sortIndex - 1);
      return spillGrid([...grid].sort((a, b) => compareSpreadsheetValues(a[colIdx], b[colIdx]) * order));
    }
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
    const grid = rangeGrid(range);
    if (grid.length > 0 && (grid[0]?.length ?? 0) > 1) {
      const seenRows = new Set<string>();
      const uniqueRows: unknown[][] = [];
      for (const row of grid) {
        const key = JSON.stringify(row);
        if (!seenRows.has(key)) {
          seenRows.add(key);
          uniqueRows.push(row);
        }
      }
      return spillGrid(uniqueRows);
    }
    const data = toArr(range);
    const seen = new Set<string>();
    const out: unknown[] = [];
    for (const v of data) {
      const k = String(v ?? '');
      if (!seen.has(k)) { seen.add(k); out.push(v); }
    }
    return spillVertical(out);
  };
  const __transpose = (range: unknown) => {
    const grid = rangeGrid(range);
    const rows = grid.length;
    const cols = grid[0]?.length ?? 0;
    return spillGrid(Array.from({ length: cols }, (_, c) => (
      Array.from({ length: rows }, (_, r) => grid[r]?.[c] ?? '')
    )));
  };
  const sliceBySignedCount = <T,>(items: T[], count: unknown, drop = false): T[] => {
    const n = Math.trunc(Number(count) || 0);
    if (n === 0) return drop ? items : [];
    if (!drop) return n > 0 ? items.slice(0, n) : items.slice(n);
    return n > 0 ? items.slice(n) : items.slice(0, Math.max(0, items.length + n));
  };
  const __take = (range: unknown, rows: unknown, cols?: unknown) => {
    let grid = sliceBySignedCount(rangeGrid(range), rows);
    if (cols !== undefined) grid = grid.map((row) => sliceBySignedCount(row, cols));
    return spillGrid(grid);
  };
  const __drop = (range: unknown, rows: unknown, cols?: unknown) => {
    let grid = sliceBySignedCount(rangeGrid(range), rows, true);
    if (cols !== undefined) grid = grid.map((row) => sliceBySignedCount(row, cols, true));
    return spillGrid(grid);
  };
  const __sequence = (rows: unknown, columns: unknown = 1, start: unknown = 1, step: unknown = 1) => {
    const rowCount = Math.max(0, Math.floor(Number(rows) || 0));
    const colCount = Math.max(0, Math.floor(Number(columns) || 0));
    const s = Number(start) || 0;
    const st = Number(step) || 1;
    return spillGrid(Array.from({ length: rowCount }, (_, r) => (
      Array.from({ length: colCount }, (_, c) => s + (r * colCount + c) * st)
    )));
  };

  // ─── AI 함수 (비동기 — 캐시 hit 면 결과, miss 면 sentinel 로 진행 알림) ───
  // sentinel 이 셀에 떠있는 동안 백그라운드 fetch 가 동작하고, 결과가 오면
  // AI_CHANGED 이벤트가 발행 → CloudSheetEditor 가 해당 셀 재평가 → 결과 표시.
  const clampAiText = (value: unknown, limit = AI_CELL_TEXT_LIMIT) => {
    const text = String(value ?? '');
    return text.length > limit ? text.slice(0, limit) : text;
  };
  const aiResolve = (fn: string, args: unknown): unknown => {
    const key = aiCacheKey(fn, args);
    const cached = aiCacheGet(key);
    if (cached !== undefined) return cached;
    const queued = aiQueueFetch(key, fn, args);
    if (!queued) return `${AI_SEN}${AI_ERR}AI_LIMIT`;
    return `${AI_SEN}${AI_LOAD}${key}`;
  };
  const __ai = (prompt: unknown, model?: unknown) =>
    aiResolve('ai', {
      prompt: clampAiText(prompt),
      model: model !== undefined ? clampAiText(model, 120) : undefined,
    });
  const __ai_classify = (text: unknown, categories: unknown) =>
    aiResolve('ai_classify', { text: clampAiText(text), categories: clampAiText(categories, 1000) });
  const __ai_translate = (text: unknown, lang: unknown) =>
    aiResolve('ai_translate', { text: clampAiText(text), lang: clampAiText(lang ?? 'en', 32) });
  const __ai_summarize = (text: unknown) => {
    // range 가 들어오면 join 해서 한 텍스트로.
    const joined = Array.isArray(text)
      ? text.filter((x) => x != null && String(x).trim() !== '').map(String).join('\n')
      : String(text ?? '');
    return aiResolve('ai_summarize', { text: clampAiText(joined) });
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
    '__range',
    '__sum', '__product', '__sumproduct', '__subtotal', '__avg', '__average', '__min', '__max', '__count', '__if', '__abs', '__round',
    '__sumif', '__countif', '__averageif', '__sumifs', '__countifs', '__averageifs', '__minifs', '__maxifs',
    '__left', '__right', '__mid', '__len', '__upper', '__lower', '__trim', '__value',
    '__concat', '__concatenate',
    '__and', '__or', '__not',
    '__today', '__now', '__year', '__month', '__day', '__weekday',
    '__power', '__sqrt', '__mod', '__int', '__median', '__large', '__small', '__percentile', '__percentileexc', '__quartile', '__quartileexc',
    '__vlookup', '__hlookup', '__index', '__match', '__xmatch',
    '__rows', '__columns', '__row', '__column', '__choose',
    '__image', '__sparkline',
    '__iferror', '__ifna', '__isnumber', '__isblank', '__istext', '__iserror', '__isna',
    '__ifs', '__switch', '__xlookup',
    '__textjoin', '__substitute', '__replace', '__find', '__search', '__hyperlink',
    '__roundup', '__rounddown', '__ceiling', '__floor', '__counta', '__countblank',
    '__stdev', '__stdevp', '__var', '__varp', '__rank',
    '__date', '__eomonth', '__edate', '__datedif', '__networkdays', '__datevalue', '__days',
    '__text', '__regexmatch', '__regexextract', '__regexreplace',
    '__ai', '__ai_classify', '__ai_translate', '__ai_summarize',
    '__filter', '__sort', '__unique', '__transpose', '__take', '__drop', '__sequence', '__cmp',
    `"use strict"; return (${work});`,
  );
  return fn(
    __range,
    __sum, __product, __sumproduct, __subtotal, __avg, __average, __min, __max, __count, __if, __abs, __round,
    __sumif, __countif, __averageif, __sumifs, __countifs, __averageifs, __minifs, __maxifs,
    __left, __right, __mid, __len, __upper, __lower, __trim, __value,
    __concat, __concatenate,
    __and, __or, __not,
    __today, __now, __year, __month, __day, __weekday,
    __power, __sqrt, __mod, __int, __median, __large, __small, __percentile, __percentileexc, __quartile, __quartileexc,
    __vlookup, __hlookup, __index, __match, __xmatch,
    __rows, __columns, __row, __column, __choose,
    __image, __sparkline,
    __iferror, __ifna, __isnumber, __isblank, __istext, __iserror, __isna,
    __ifs, __switch, __xlookup,
    __textjoin, __substitute, __replace, __find, __search, __hyperlink,
    __roundup, __rounddown, __ceiling, __floor, __counta, __countblank,
    __stdev, __stdevp, __var, __varp, __rank,
    __date, __eomonth, __edate, __datedif, __networkdays, __datevalue, __days,
    __text, __regexmatch, __regexextract, __regexreplace,
    __ai, __ai_classify, __ai_translate, __ai_summarize,
    __filter, __sort, __unique, __transpose, __take, __drop, __sequence, __cmp,
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
