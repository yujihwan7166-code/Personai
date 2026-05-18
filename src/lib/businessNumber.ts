/**
 * 한국 사업자등록번호 검증 + 포맷.
 *
 * 10자리: XXX-XX-XXXXX. 마지막 자리는 체크섬.
 * 알고리즘: 가중치 [1,3,7,1,3,7,1,3,5] × 앞 9자리 + (8자리 × 5 / 10) → mod 10 → 10 - 결과.
 */

const WEIGHTS = [1, 3, 7, 1, 3, 7, 1, 3, 5] as const;

/** 숫자만 추출. */
function digits(s: string): string {
  return s.replace(/\D/g, '');
}

/** 'XXX-XX-XXXXX' 형식. 10자리 아니면 원본. */
export function formatBizNumber(raw: string): string {
  const d = digits(raw);
  if (d.length !== 10) return d;
  return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
}

/** 체크섬 검증. */
export function isValidBizNumber(raw: string): boolean {
  const d = digits(raw);
  if (d.length !== 10) return false;
  if (!/^\d{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(d[i]) * WEIGHTS[i];
  }
  // 9번째 자리(인덱스 8) × 5 의 십의 자리 더하기
  sum += Math.floor((Number(d[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(d[9]);
}
