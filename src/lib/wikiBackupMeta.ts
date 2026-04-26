/**
 * 마이위키 마지막 백업 시점 추적 — 사용자가 7일+ 백업 안 했으면 헤더 배지 노출.
 * Stripe·Notion 의 "백업 알림" 패턴.
 */

const KEY = 'wiki_last_backup_at';

export function getLastBackupAt(): number | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function setLastBackupAt(ts = Date.now()): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(KEY, String(ts));
}

const DAY = 24 * 60 * 60 * 1000;

export function daysSinceBackup(): number | null {
  const last = getLastBackupAt();
  if (last == null) return null;
  return Math.floor((Date.now() - last) / DAY);
}

/** 며칠 이상이면 백업 권장 배지 노출. null = 한 번도 백업 안 함. */
export function shouldShowBackupNudge(thresholdDays = 7): boolean {
  const last = getLastBackupAt();
  if (last == null) return false; // 한 번도 백업 안 한 신규는 nag X (페이지 0 가능성)
  const days = daysSinceBackup() ?? 0;
  return days >= thresholdDays;
}
