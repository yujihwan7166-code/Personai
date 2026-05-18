/**
 * Relative time — "방금 전", "3분 전", "어제" 등.
 *
 * 한국어 자연어. 7일 이상이면 yyyy-mm-dd.
 */

const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

function pad(n: number): string { return String(n).padStart(2, '0'); }

export function formatRelativeTime(target: Date | number | string, now: Date | number = Date.now()): string {
  const t = target instanceof Date ? target.getTime() : new Date(target).getTime();
  const n = typeof now === 'number' ? now : now.getTime();
  if (!Number.isFinite(t)) return '';
  const diffSec = Math.round((n - t) / 1000);
  if (diffSec < 0) return formatFuture(-diffSec);
  return formatPast(diffSec, t);
}

function formatPast(sec: number, t: number): string {
  if (sec < 10) return '방금 전';
  if (sec < MIN) return `${sec}초 전`;
  if (sec < HOUR) return `${Math.floor(sec / MIN)}분 전`;
  if (sec < DAY) return `${Math.floor(sec / HOUR)}시간 전`;
  if (sec < 2 * DAY) return '어제';
  if (sec < 7 * DAY) return `${Math.floor(sec / DAY)}일 전`;
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatFuture(sec: number): string {
  if (sec < MIN) return `${sec}초 후`;
  if (sec < HOUR) return `${Math.floor(sec / MIN)}분 후`;
  if (sec < DAY) return `${Math.floor(sec / HOUR)}시간 후`;
  return `${Math.floor(sec / DAY)}일 후`;
}
