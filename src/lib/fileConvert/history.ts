/**
 * 파일변환 이력 — localStorage 기반.
 *
 * 메타만 저장 (blob 자체는 X — 너무 무거움).
 * 사용자가 같은 파일·태스크 다시 변환할 때 빠른 재진입.
 * 최근 10개 유지.
 */

const STORAGE_KEY = 'fileconvert.history.v1';
const MAX_ITEMS = 10;

export interface ConvertHistoryItem {
  id: string;
  taskId: string;
  taskLabel: string;
  taskIcon: string;
  fileName: string;
  outputFileName: string;
  outputFormat: string;
  originalSize: number;
  newSize: number;
  completedAt: number;
}

function safeRead(): ConvertHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ConvertHistoryItem[]) : [];
  } catch {
    return [];
  }
}

function safeWrite(list: ConvertHistoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

export function listHistory(): ConvertHistoryItem[] {
  return safeRead().sort((a, b) => b.completedAt - a.completedAt);
}

export function addToHistory(item: Omit<ConvertHistoryItem, 'id' | 'completedAt'>): void {
  const next: ConvertHistoryItem = {
    ...item,
    id: `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    completedAt: Date.now(),
  };
  const list = [next, ...safeRead()].slice(0, MAX_ITEMS);
  safeWrite(list);
}

export function clearHistory(): void {
  safeWrite([]);
}

/** 사람 친화 시간 라벨 — '방금', '5분 전', '어제' 등. */
export function formatHistoryTime(epoch: number): string {
  const diff = Date.now() - epoch;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '방금';
  if (diff < hour) return `${Math.floor(diff / min)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  if (diff < 2 * day) return '어제';
  return `${Math.floor(diff / day)}일 전`;
}
