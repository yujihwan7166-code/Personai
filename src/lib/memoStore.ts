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
  archivedAt?: number;          // 보관함
  wikiPageId?: string;          // 위키로 보낸 후 그 페이지 id
  createdAt: number;
  updatedAt: number;
  version: 1;
}

const STORAGE_KEY = 'personai.memos.v1';

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
  scope: 'inbox' | 'archived' | 'pinned' | 'all';
  tag?: string;               // 특정 태그만
}

/** 필터·정렬 적용 — 핀 우선, 그 다음 시간 desc. */
export function selectMemos(memos: Memo[], filter: MemoFilter): Memo[] {
  let list = memos;

  if (filter.scope === 'inbox') {
    list = list.filter((m) => !m.archivedAt);
  } else if (filter.scope === 'archived') {
    list = list.filter((m) => !!m.archivedAt);
  } else if (filter.scope === 'pinned') {
    list = list.filter((m) => m.pinned && !m.archivedAt);
  }

  if (filter.tag) {
    const t = filter.tag.toLowerCase();
    list = list.filter((m) => extractMemoTags(m).includes(t));
  }

  if (filter.query && filter.query.trim().length > 0) {
    const q = filter.query.trim().toLowerCase();
    list = list.filter((m) => m.body.toLowerCase().includes(q));
  }

  // 핀 우선 (인박스 모드일 때만 의미 있음 — 보관·핀 모드는 자체 필터로 충분)
  if (filter.scope === 'inbox') {
    return list.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });
  }
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 모든 활성 메모의 태그 빈도 (사이드 칩용). */
export function tagFrequencies(memos: Memo[]): Array<[string, number]> {
  const freq = new Map<string, number>();
  for (const m of memos) {
    if (m.archivedAt) continue;
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
