/**
 * 파일변환 즐겨찾기 — localStorage 기반.
 *
 * 사용자가 자주 쓰는 도구를 별표 → 빠른 접근.
 * 카탈로그 28개 늘어나서 findability 향상.
 */

const STORAGE_KEY = 'fileconvert.favorites.v1';

function safeRead(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* quota silent */
  }
}

export function getFavoriteIds(): string[] {
  return safeRead();
}

export function isFavorite(taskId: string): boolean {
  return safeRead().includes(taskId);
}

export function toggleFavorite(taskId: string): boolean {
  const list = safeRead();
  const idx = list.indexOf(taskId);
  let nowFavorite: boolean;
  if (idx === -1) {
    list.push(taskId);
    nowFavorite = true;
  } else {
    list.splice(idx, 1);
    nowFavorite = false;
  }
  safeWrite(list);
  return nowFavorite;
}
