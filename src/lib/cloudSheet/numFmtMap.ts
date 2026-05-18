/**
 * 엑셀 numFmt 코드 ↔ 우리 CellFormat.numberFmt 토큰 매핑.
 *
 * 우리는 6 종만 표현: integer / decimal2 / percent / currency-krw / date / (general).
 * 엑셀은 임의 코드 가능 — 가장 흔한 패턴만 매핑하고 나머지는 fallback.
 */

export type NumberFmtToken =
  | 'integer'
  | 'decimal1'
  | 'decimal2'
  | 'decimal3'
  | 'decimal4'
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

  // 정수 (콤마 천단위 또는 단순 0/#)
  if (/^#,##0$|^0$|^#$/.test(c)) return 'integer';

  // 소수점 자리 — 자릿수별 매핑 (1~4). 콤마 천단위 유무 무관.
  const decMatch = c.match(/^(?:#,##)?0\.(0+|#+|0#+|#0+)$/);
  if (decMatch) {
    const dec = decMatch[1].length;
    if (dec >= 4) return 'decimal4';
    if (dec === 3) return 'decimal3';
    if (dec === 2) return 'decimal2';
    if (dec === 1) return 'decimal1';
  }
  // 일반 패턴 (위 정확 매치 실패 시 fallback)
  if (/\.0{4,}|\.#{4,}/.test(c)) return 'decimal4';
  if (/\.0{3}|\.#{3}/.test(c)) return 'decimal3';
  if (/\.0{2}|\.#{2}|\.0#/.test(c)) return 'decimal2';
  if (/\.0|\.#/.test(c)) return 'decimal1';

  return undefined; // 미지원 코드는 general
}

/**
 * 우리 토큰 → 엑셀 코드 (export 시 사용).
 * 이미 xlsx.ts:numFmtFor 가 동일 일 함 — 호환 위해 같은 코드 반환.
 */
export function tokenToExcelNumFmt(t: NumberFmtToken): string {
  switch (t) {
    case 'integer':      return '#,##0';
    case 'decimal1':     return '0.0';
    case 'decimal2':     return '0.00';
    case 'decimal3':     return '0.000';
    case 'decimal4':     return '0.0000';
    case 'currency-krw': return '"₩"#,##0';
    case 'percent':      return '0.0%';
    case 'date':         return 'yyyy-mm-dd';
  }
}
