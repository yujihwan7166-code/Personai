/** 시트 셀 숫자 포맷 토큰 + 적용 함수. */

export type NumberFmt = 'currency-krw' | 'percent' | 'integer' | 'decimal1' | 'decimal2' | 'decimal3' | 'decimal4' | 'date';

/** 자릿수 ±1 시 토큰 시퀀스. integer=0자리, decimal4=4자리. 통화/%/날짜는 별도 처리. */
export const DECIMAL_SEQUENCE: NumberFmt[] = ['integer', 'decimal1', 'decimal2', 'decimal3', 'decimal4'];

/** 토큰의 자릿수 위치 — 일반 숫자 토큰이면 0~4, 그 외(₩/%/date)면 -1. */
export function decimalsIndexOf(fmt: NumberFmt | undefined): number {
  if (!fmt) return -1;
  return DECIMAL_SEQUENCE.indexOf(fmt);
}

export const NUMBER_FMT_OPTIONS: Array<{ value: '' | NumberFmt; label: string; example: string }> = [
  { value: '',              label: '자동',         example: '' },
  { value: 'integer',       label: '정수',         example: '1,234' },
  { value: 'decimal1',      label: '소수 1자리',   example: '1.2' },
  { value: 'decimal2',      label: '소수 2자리',   example: '1.23' },
  { value: 'decimal3',      label: '소수 3자리',   example: '1.234' },
  { value: 'decimal4',      label: '소수 4자리',   example: '1.2345' },
  { value: 'currency-krw',  label: '₩ 통화',       example: '₩1,234' },
  { value: 'percent',       label: '%',            example: '12.3%' },
  { value: 'date',          label: '날짜',         example: '2026-05-16' },
];

export function applyNumberFormat(value: string, fmt: NumberFmt | undefined): string {
  if (!fmt) return value;
  const n = Number(value);
  if (!Number.isFinite(n) || value === '') return value;
  switch (fmt) {
    case 'integer':       return Math.round(n).toLocaleString('ko-KR');
    case 'decimal1':      return n.toFixed(1);
    case 'decimal2':      return n.toFixed(2);
    case 'decimal3':      return n.toFixed(3);
    case 'decimal4':      return n.toFixed(4);
    case 'currency-krw':  return `₩${n.toLocaleString('ko-KR')}`;
    case 'percent':       return `${(n * 100).toFixed(1)}%`;
    case 'date': {
      // Excel serial(1900) vs ms timestamp 둘 다 시도
      let d: Date | null = null;
      if (n > 1e10) d = new Date(n);                 // ms timestamp
      else if (n > 25569) d = new Date((n - 25569) * 86400 * 1000); // Excel serial
      else d = new Date(n);                          // 그 외
      if (isNaN(d.getTime())) return value;
      return d.toLocaleDateString('ko-KR');
    }
    default: return value;
  }
}
