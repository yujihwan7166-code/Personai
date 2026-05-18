/**
 * 공용 포맷터 — 한국어 위주.
 *
 * 각 페이지가 같은 형식을 inline 코드로 반복 표시 중. 한 곳 모음.
 * 모두 순수 함수 — DOM/시간/현지화 의존 X.
 */

/**
 * 숫자 약식 (1.2K / 3.4M / 5.6B).
 * 음수 자동, 0/NaN 은 '0'.
 */
export function formatCompactNumber(n: number): string {
  if (!Number.isFinite(n)) return '0';
  const neg = n < 0;
  const abs = Math.abs(n);
  let out: string;
  if (abs < 1_000) out = String(Math.round(abs));
  else if (abs < 1_000_000) out = `${(abs / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  else if (abs < 1_000_000_000) out = `${(abs / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
  else out = `${(abs / 1_000_000_000).toFixed(2).replace(/\.?0+$/, '')}B`;
  return neg ? `-${out}` : out;
}

/**
 * 바이트 → 사람 친화 (1.2 KB / 3.4 MB / 5.6 GB).
 */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(i === 0 ? 0 : 1).replace(/\.0$/, '')} ${units[i]}`;
}

/**
 * 두 시각 사이 상대 표현 ('방금' / '3분 전' / '2시간 전' / '5월 12일').
 * past = past time, base = 기준 (기본 now).
 */
export function formatRelativeTime(past: number | Date, base: Date = new Date()): string {
  const ms = base.getTime() - (past instanceof Date ? past.getTime() : past);
  const sec = Math.floor(ms / 1000);
  if (sec < 5) return '방금';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  // 1주 이상이면 날짜 자체
  const d = past instanceof Date ? past : new Date(past);
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
}

/**
 * 초 → 'HH:MM:SS' 또는 'MM:SS' (1시간 미만).
 * 음수/비유한 → '00:00'.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const s = Math.floor(seconds);
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

/**
 * 한국어 % 표기 ('12.3%').
 * ratio 가 0~1 이면 자동 × 100 (NaN 은 '0%').
 */
export function formatPercent(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return '0%';
  const v = (ratio <= 1 && ratio >= -1 ? ratio * 100 : ratio);
  return `${v.toFixed(decimals).replace(/\.0+$/, '')}%`;
}

/**
 * 텍스트 가운데 자르기 (긴 파일명 등).
 *   'AVeryLongFileName.pdf' → 'AVeryLo…me.pdf'
 */
export function truncateMiddle(s: string, max = 24): string {
  if (s.length <= max) return s;
  const half = Math.floor((max - 1) / 2);
  return `${s.slice(0, half)}…${s.slice(-half)}`;
}
