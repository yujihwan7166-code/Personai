/**
 * Duration 포매팅 — ms → "1시간 23분" / "2:34" 등.
 *
 * 한국어 "Xh Ym Zs" 자연어, 또는 시계형 "HH:MM:SS".
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "1일 3시간 20분" — 0 단위 생략. */
export function formatDurationKr(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '0초';
  if (ms < 1000) return `${ms}ms`;
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / HOUR);
  const m = Math.floor((ms % HOUR) / MIN);
  const s = Math.floor((ms % MIN) / 1000);
  const parts: string[] = [];
  if (d) parts.push(`${d}일`);
  if (h) parts.push(`${h}시간`);
  if (m) parts.push(`${m}분`);
  if (s && !d && !h) parts.push(`${s}초`);
  return parts.length ? parts.join(' ') : '0초';
}

/** "HH:MM:SS" 시계형. 1시간 미만이면 "MM:SS". */
export function formatDurationClock(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
