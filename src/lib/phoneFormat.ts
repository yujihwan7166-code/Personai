/**
 * 한국 전화번호 포맷 — 입력 string → 'XXX-XXXX-XXXX' 등.
 *
 * - 010-1234-5678 (휴대)
 * - 02-123-4567 (서울 8자리)
 * - 02-1234-5678 (서울 9자리)
 * - 031-123-4567 (지역 9자리)
 * - 031-1234-5678 (지역 10자리)
 */

/** 숫자만 추출. */
function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/** 한국 전화번호 → '하이픈' 형식. 인식 못하면 원본 (또는 숫자만). */
export function formatKrPhone(raw: string): string {
  const d = digits(raw);
  if (!d) return '';

  // 휴대전화 010/011/016/017/018/019 — 11자리: XXX-XXXX-XXXX, 10자리: XXX-XXX-XXXX
  if (/^01[016789]/.test(d)) {
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // 서울 02 — 9자리: 02-XXXX-XXXX, 8자리: 02-XXX-XXXX
  if (d.startsWith('02')) {
    if (d.length === 10) return `02-${d.slice(2, 6)}-${d.slice(6)}`;
    if (d.length === 9) return `02-${d.slice(2, 5)}-${d.slice(5)}`;
  }

  // 지역 03X/04X/05X/06X — 11자리: XXX-XXXX-XXXX, 10자리: XXX-XXX-XXXX
  if (/^0[3-6]\d/.test(d)) {
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }

  // 인터넷전화 070
  if (d.startsWith('070') && d.length === 11) {
    return `070-${d.slice(3, 7)}-${d.slice(7)}`;
  }

  // 기타 — 그대로 (숫자만 정리)
  return d;
}

/** 유효한 한국 전화번호인지 (대략). */
export function isValidKrPhone(raw: string): boolean {
  const d = digits(raw);
  if (/^01[016789]\d{7,8}$/.test(d)) return true;
  if (/^02\d{7,8}$/.test(d)) return true;
  if (/^0[3-6]\d{8,9}$/.test(d)) return true;
  if (/^070\d{8}$/.test(d)) return true;
  return false;
}
