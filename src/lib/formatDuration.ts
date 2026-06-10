/**
 * Duration 포매팅 — ms/minutes → "1시간 23분" / "2:34" 등.
 *
 * 한국어 자연어, 또는 시계형 "HH:MM:SS".
 */

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "1일 3시간 20분" — 0 단위 생략. */
export function formatDurationKr(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0초';
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

/** 분 단위 planner 길이 라벨 — "30분" / "1시간" / "1시간 30분". */
export function formatDurationMinutes(minutes: number, zeroLabel = ''): string {
  if (!Number.isFinite(minutes)) return zeroLabel;
  const total = Math.round(minutes);
  if (total <= 0) return zeroLabel;
  if (total < 60) return `${total}분`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}

/** ISO 시작/끝으로 planner 길이 라벨 생성. */
export function formatDurationRange(startIso: string, endIso: string, zeroLabel = ''): string {
  const minutes = (new Date(endIso).getTime() - new Date(startIso).getTime()) / MIN;
  return formatDurationMinutes(minutes, zeroLabel);
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
