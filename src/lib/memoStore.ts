/**
 * 메모 — 인박스 zero 철학의 1차 사고 공간.
 *
 * 위키와 분리: localStorage 기반 (가벼운 read·write).
 * 위키로 보낸 후엔 wikiPageId 보관 → 다시 클릭 시 위키로 이동.
 */

import { useSyncExternalStore } from 'react';

export interface Memo {
  id: string;
  body: string;                 // 마크다운, 첫 줄 = 제목
  pinned: boolean;
  folderId?: string;            // optional — 없으면 미분류 (인박스)
  archivedAt?: number;          // 보관함
  wikiPageId?: string;          // 위키로 보낸 후 그 페이지 id
  createdAt: number;
  updatedAt: number;
  version: 1;
}

export interface MemoFolder {
  id: string;
  name: string;
  emoji?: string;               // 기본 📁
  order: number;                // 정렬
  createdAt: number;
}

const STORAGE_KEY = 'personai.memos.v1';
const FOLDER_STORAGE_KEY = 'personai.memo-folders.v1';

let cache: Memo[] | null = null;
const listeners = new Set<() => void>();

function load(): Memo[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Memo[]) : [];
  } catch {
    return [];
  }
}

function save(list: Memo[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* quota / privacy mode */
  }
}

function ensure(): Memo[] {
  if (cache === null) cache = load();
  return cache;
}

function commit(next: Memo[]): void {
  cache = next;
  save(next);
  listeners.forEach((l) => l());
}

// ── 다중 탭 동기화 ──
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

export function newMemoId(): string {
  return `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ──────────────────────────────────────────
// 폴더 store (별도 — 메모와 독립)
// ──────────────────────────────────────────
let folderCache: MemoFolder[] | null = null;
const folderListeners = new Set<() => void>();

function loadFolders(): MemoFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FOLDER_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MemoFolder[]) : [];
  } catch {
    return [];
  }
}

function saveFolders(list: MemoFolder[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FOLDER_STORAGE_KEY, JSON.stringify(list));
  } catch { /* noop */ }
}

function ensureFolders(): MemoFolder[] {
  if (folderCache === null) folderCache = loadFolders();
  return folderCache;
}

function commitFolders(next: MemoFolder[]): void {
  folderCache = next;
  saveFolders(next);
  folderListeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === FOLDER_STORAGE_KEY) {
      folderCache = null;
      folderListeners.forEach((l) => l());
    }
  });
}

export function newFolderId(): string {
  return `f_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function getFolders(): MemoFolder[] {
  return ensureFolders();
}

export function addFolder(name: string, emoji = '📁'): MemoFolder {
  const list = ensureFolders();
  const f: MemoFolder = {
    id: newFolderId(),
    name: name.trim() || '새 폴더',
    emoji,
    order: list.length,
    createdAt: Date.now(),
  };
  commitFolders([...list, f]);
  return f;
}

export function renameFolder(id: string, name: string): void {
  commitFolders(
    ensureFolders().map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)),
  );
}

export function removeFolder(id: string): void {
  // 폴더 삭제 — 그 안 메모는 미분류로 cascade
  commitFolders(ensureFolders().filter((f) => f.id !== id));
  commit(
    ensure().map((m) => {
      if (m.folderId !== id) return m;
      const { folderId, ...rest } = m;
      void folderId;
      return { ...rest, updatedAt: Date.now() } as Memo;
    }),
  );
}

export function moveMemoToFolder(memoId: string, folderId: string | null): void {
  if (folderId === null) {
    commit(
      ensure().map((m) => {
        if (m.id !== memoId) return m;
        const { folderId: _, ...rest } = m;
        void _;
        return { ...rest, updatedAt: Date.now() } as Memo;
      }),
    );
  } else {
    updateMemo(memoId, { folderId });
  }
}

export function subscribeFolders(listener: () => void): () => void {
  folderListeners.add(listener);
  return () => { folderListeners.delete(listener); };
}

export function useFolders(): MemoFolder[] {
  return useSyncExternalStore(subscribeFolders, getFolders, getFolders);
}

/** 폴더별 메모 카운트. */
export function folderMemoCount(memos: Memo[], folderId: string): number {
  return memos.filter((m) => m.folderId === folderId).length;
}

/** 미분류(폴더 없는) 메모 카운트. */
export function unfiledCount(memos: Memo[]): number {
  return memos.filter((m) => !m.folderId).length;
}

/** 모든 활성 메모의 태그 빈도 — 폴더 구분 없이. */

// ──────────────────────────────────────────
// CRUD
// ──────────────────────────────────────────
export function getMemos(): Memo[] {
  return ensure();
}

export function getMemo(id: string): Memo | undefined {
  return ensure().find((m) => m.id === id);
}

export function addMemo(initial?: Partial<Pick<Memo, 'body' | 'pinned'>>): Memo {
  const now = Date.now();
  const m: Memo = {
    id: newMemoId(),
    body: initial?.body ?? '',
    pinned: initial?.pinned ?? false,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  commit([m, ...ensure()]);
  return m;
}

export function updateMemo(id: string, patch: Partial<Pick<Memo, 'body' | 'pinned' | 'archivedAt' | 'wikiPageId'>>): void {
  commit(
    ensure().map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)),
  );
}

export function removeMemo(id: string): void {
  commit(ensure().filter((m) => m.id !== id));
}

export function togglePin(id: string): void {
  const m = getMemo(id);
  if (!m) return;
  updateMemo(id, { pinned: !m.pinned });
}

export function archiveMemo(id: string): void {
  updateMemo(id, { archivedAt: Date.now() });
}

export function unarchiveMemo(id: string): void {
  commit(
    ensure().map((m) => {
      if (m.id !== id) return m;
      const { archivedAt, ...rest } = m;
      void archivedAt;
      return { ...rest, updatedAt: Date.now() } as Memo;
    }),
  );
}

// ──────────────────────────────────────────
// 파생 — 제목·본문 미리보기·태그·시간
// ──────────────────────────────────────────

/** 첫 줄(또는 첫 100자) — 제목으로 사용. 마크다운 # 자동 제거. */
export function memoTitle(memo: Memo): string {
  const firstLine = memo.body.split('\n', 1)[0]?.trim() ?? '';
  const stripped = firstLine.replace(/^#+\s*/, '');
  return stripped || '(빈 메모)';
}

/** 둘째 줄 ~ — 사이드바 미리보기용 (최대 60자). */
export function memoPreview(memo: Memo): string {
  const lines = memo.body.split('\n');
  const rest = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
  if (rest.length === 0) {
    // 본문이 한 줄밖에 없으면 그 한 줄 자르기 (제목과 같지만 길게)
    const single = lines[0]?.replace(/^#+\s*/, '').trim() ?? '';
    if (single.length > memoTitle(memo).length) return single.slice(0, 60);
    return '';
  }
  return rest.length > 60 ? rest.slice(0, 60) + '…' : rest;
}

/** 본문 안 #태그 자동 추출 (소문자 통일). */
export function extractMemoTags(memo: Memo): string[] {
  const re = /(?:^|\s)#([\p{L}0-9_-]{1,30})/gu;
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(memo.body)) !== null) {
    out.add(m[1].toLowerCase());
  }
  return [...out];
}

/** 본문 글자수 (공백 제거). */
export function memoCharCount(memo: Memo): number {
  return memo.body.replace(/\s+/g, '').length;
}

/** 사람 친화 시간 표시 — "방금" / "3분 전" / "어제 14:30" / "월" / "11/3". */
export function memoTimeLabel(epoch: number): string {
  const now = Date.now();
  const diff = now - epoch;
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '방금';
  if (diff < hour) return `${Math.floor(diff / min)}분 전`;
  if (diff < day) return `${Math.floor(diff / hour)}시간 전`;
  const d = new Date(epoch + 9 * 3600 * 1000); // KST
  if (diff < 2 * day) {
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `어제 ${hh}:${mm}`;
  }
  if (diff < 7 * day) {
    const w = ['일', '월', '화', '수', '목', '금', '토'];
    return w[d.getUTCDay()];
  }
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

// ──────────────────────────────────────────
// 검색 + 정렬
// ──────────────────────────────────────────

export interface MemoFilter {
  query?: string;             // 본문·태그 검색
  /** 'folder' = 특정 폴더 (folderId 정의 시 그 폴더, undefined 시 미분류)
   *  'all' = 모든 메모 (검색·태그 시 유용) */
  scope: 'folder' | 'all';
  tag?: string;
  folderId?: string;
}

/** 필터·정렬 — 핀 우선, 그 다음 시간 desc. */
export function selectMemos(memos: Memo[], filter: MemoFilter): Memo[] {
  let list = memos;

  if (filter.scope === 'folder') {
    // folderId 정의 → 그 폴더 / undefined → 미분류
    list = list.filter((m) => (m.folderId ?? null) === (filter.folderId ?? null));
  }
  // 'all' 은 모두

  if (filter.tag) {
    const t = filter.tag.toLowerCase();
    list = list.filter((m) => extractMemoTags(m).includes(t));
  }

  if (filter.query && filter.query.trim().length > 0) {
    const q = filter.query.trim().toLowerCase();
    list = list.filter((m) => m.body.toLowerCase().includes(q));
  }

  // 항상 핀 우선 + 시간 desc
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export function tagFrequencies(memos: Memo[]): Array<[string, number]> {
  const freq = new Map<string, number>();
  for (const m of memos) {
    for (const t of extractMemoTags(m)) {
      freq.set(t, (freq.get(t) ?? 0) + 1);
    }
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]);
}

// ──────────────────────────────────────────
// 구독
// ──────────────────────────────────────────
export function subscribeMemos(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useMemos(): Memo[] {
  return useSyncExternalStore(subscribeMemos, getMemos, getMemos);
}
