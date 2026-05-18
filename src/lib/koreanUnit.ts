/**
 * 한국 숫자 단위 — 만/억/조 단위로 큰 숫자 표시.
 * 가계부, AI 사용량 비용(원), 통계 등 한국 사용자 친화 표기.
 */

/** 12345678 → "1,234만 5,678" / 0 → "0" / 음수 -123 → "-123". */
export function formatKrNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  const neg = n < 0;
  const abs = Math.abs(Math.floor(n));
  const eok = Math.floor(abs / 100_000_000);
  const man = Math.floor((abs % 100_000_000) / 10_000);
  const rest = abs % 10_000;
  const parts: string[] = [];
  if (eok > 0) parts.push(`${eok.toLocaleString('ko-KR')}억`);
  if (man > 0) parts.push(`${man.toLocaleString('ko-KR')}만`);
  if (rest > 0 || parts.length === 0) parts.push(rest.toLocaleString('ko-KR'));
  return (neg ? '-' : '') + parts.join(' ');
}

/** 원화 표기 — '₩1,234' / 큰 수는 '₩1,234만'. compact 옵션. */
export function formatKrw(n: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '₩0';
  if (opts.compact) {
    const abs = Math.abs(n);
    if (abs >= 100_000_000) return `${n < 0 ? '-' : ''}₩${(abs / 100_000_000).toFixed(1).replace(/\.0$/, '')}억`;
    if (abs >= 10_000) return `${n < 0 ? '-' : ''}₩${(abs / 10_000).toFixed(1).replace(/\.0$/, '')}만`;
  }
  return `₩${Math.floor(n).toLocaleString('ko-KR')}`;
}
