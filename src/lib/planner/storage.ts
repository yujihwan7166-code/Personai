/**
 * localStorage 직렬화 공용 헬퍼.
 * entity 별 키 분리 — 한 도메인 변경이 다른 도메인 read 에 영향 없음.
 */

const KEY_PREFIX = 'planner.';

export function loadList<T>(name: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX + name + '.v1');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export function saveList<T>(name: string, list: T[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_PREFIX + name + '.v1', JSON.stringify(list));
  } catch {
    /* quota / privacy 모드 — 조용히 실패 */
  }
}

export function newEntityId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

/** 4 entity store 가 변경될 때마다 ++. selector 가 cross-ref 캐시 무효화에 사용. */
let _indexVersion = 0;
const _indexListeners = new Set<() => void>();

export function bumpIndex(): void {
  _indexVersion++;
  _indexListeners.forEach((l) => l());
}

export function subscribeIndex(listener: () => void): () => void {
  _indexListeners.add(listener);
  return () => { _indexListeners.delete(listener); };
}

export function getIndexVersion(): number {
  return _indexVersion;
}

/** 다른 탭의 변경 감지 → 자동 reload. 각 store 가 자기 키 매칭 시 cache invalidate. */
type StorageHandler = (key: string) => void;
const _storageHandlers = new Set<StorageHandler>();

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(KEY_PREFIX)) return;
    _storageHandlers.forEach((h) => h(e.key!));
  });
}

export function onExternalChange(handler: StorageHandler): () => void {
  _storageHandlers.add(handler);
  return () => { _storageHandlers.delete(handler); };
}

export function storageKey(name: string): string {
  return KEY_PREFIX + name + '.v1';
}
