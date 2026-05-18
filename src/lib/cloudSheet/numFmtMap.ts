/**
 * 엑셀 numFmt 코드 ↔ 우리 CellFormat.numberFmt 토큰 매핑.
 *
 * 우리는 6 종만 표현: integer / decimal2 / percent / currency-krw / date / (general).
 * 엑셀은 임의 코드 가능 — 가장 흔한 패턴만 매핑하고 나머지는 fallback.
 */

export type NumberFmtToken =
  | 'integer'
  | 'decimal2'
  | 'percent'
  | 'currency-krw'
  | 'date';

/**
 * 엑셀 코드 → 우리 토큰. 못 알아보면 undefined (= general).
 * 대소문자 무시. 공백 trim.
 */
export function excelNumFmtToToken(code: string | undefined): NumberFmtToken | undefined {
  if (!code) return undefined;
  const c = code.trim();
  if (!c || c.toLowerCase() === 'general') return undefined;

  // 퍼센트
  if (/%/.test(c)) return 'percent';

  // 한국 통화 (원/₩)
  if (/₩|"원"|\bKRW\b/.test(c)) return 'currency-krw';

  // 날짜/시간 — y/m/d/h 들어가면 date 로 일반화
  if (/[yYdDhH]/.test(c) && !/[#0]/.test(c)) return 'date';
  // 'yyyy-mm-dd' 패턴 (대소문자 무관, m 이 분이 아니라 월)
  if (/y{1,4}.?m{1,2}.?d{1,2}/i.test(c)) return 'date';

  // 소수점 자리 — 2자리 패턴
  if (/\.0{2,}|\.#{2,}|\.0#/.test(c)) return 'decimal2';

  // 정수 (콤마 천단위 또는 단순 0/#)
  if (/^#,##0$|^0$|^#$/.test(c)) return 'integer';
  if (/^#,##0\.0+$/.test(c)) return 'decimal2';

  return undefined; // 미지원 코드는 general
}

/**
 * 우리 토큰 → 엑셀 코드 (export 시 사용).
 * 이미 xlsx.ts:numFmtFor 가 동일 일 함 — 호환 위해 같은 코드 반환.
 */
export function tokenToExcelNumFmt(t: NumberFmtToken): string {
  switch (t) {
    case 'integer':      return '#,##0';
    case 'decimal2':     return '0.00';
    case 'currency-krw': return '"₩"#,##0';
    case 'percent':      return '0.0%';
    case 'date':         return 'yyyy-mm-dd';
  }
}
