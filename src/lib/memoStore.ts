/**
 * 메모 — 인박스 zero 철학의 1차 사고 공간.
 *
 * 위키와 분리: localStorage 기반 (가벼운 read·write).
 * 위키로 보낸 후엔 wikiPageId 보관 → 다시 클릭 시 위키로 이동.
 */

import { useSyncExternalStore } from 'react';

export interface MemoImage {
  id: string;
  dataUrl: string;              // base64 (소형) — 향후 IDB blob URL 로 마이그 가능
  name?: string;
  addedAt: number;
}

export interface Memo {
  id: string;
  body: string;                 // 마크다운, 첫 줄 = 제목
  pinned: boolean;
  folderId?: string;            // optional — 없으면 미분류 (인박스)
  archivedAt?: number;          // 보관함
  /** 휴지통(소프트 삭제). 있으면 활성 list 에서 제외 + 복구 가능. */
  deletedAt?: number;
  wikiPageId?: string;          // 위키로 보낸 후 그 페이지 id
  /** 첨부 이미지 — paste / drag-drop. 본문 위에 grid 로 표시. */
  images?: MemoImage[];
  // 녹음 노트 → 메모 승격 시 출처 (단방향 단서 — 메모 → 부모 가리킴)
  sourceRecordingId?: string;   // 출처 녹음 id (Supabase voice_recording.id)
  sourceRecordingTitle?: string;// 표시용 스냅샷 (녹음 삭제 후에도 라벨 유지)
  sourceChapterIndex?: number;  // 그 녹음의 몇 번째 챕터에서 왔는지
  createdAt: number;
  updatedAt: number;
  version: 1;
}

/** 폴더 색 — TaskListColor 와 동일 팔레트 (시각 일관성). */
export type MemoFolderColor =
  | 'blue' | 'teal' | 'amber' | 'rose' | 'violet' | 'green' | 'orange' | 'cyan';

export const MEMO_FOLDER_COLORS: Record<MemoFolderColor, { stripe: string; chipBg: string }> = {
  blue:   { stripe: 'hsl(220 70% 55%)', chipBg: 'hsl(220 70% 95%)' },
  teal:   { stripe: 'hsl(180 50% 45%)', chipBg: 'hsl(160 50% 92%)' },
  amber:  { stripe: 'hsl(40 80% 50%)',  chipBg: 'hsl(45 80% 92%)' },
  rose:   { stripe: 'hsl(0 70% 55%)',   chipBg: 'hsl(0 60% 94%)' },
  violet: { stripe: 'hsl(270 50% 55%)', chipBg: 'hsl(270 50% 94%)' },
  green:  { stripe: 'hsl(140 50% 45%)', chipBg: 'hsl(140 50% 92%)' },
  orange: { stripe: 'hsl(15 80% 55%)',  chipBg: 'hsl(15 70% 93%)' },
  cyan:   { stripe: 'hsl(195 60% 50%)', chipBg: 'hsl(195 60% 92%)' },
};

export interface MemoFolder {
  id: string;
  name: string;
  emoji?: string;               // 기본 📁
  color?: MemoFolderColor;      // optional 색 — 없으면 회색 dot
  order: number;                // 정렬
  createdAt: number;
}

const STORAGE_KEY = 'personai.memos.v1';
const FOLDER_STORAGE_KEY = 'personai.memo-folders.v1';

// 구버전 RightMemoSidebar (제거됨) 가 사용하던 별도 키 — 잔존 데이터 1회 정리.
// (해당 컴포넌트는 import 0 이라 dead. 데이터는 사용자 관점에서 잃을 게 없음 — 별도 store 라 메인 메모와 연결 안 됐음.)
const LEGACY_KEYS = ['personai-right-memo-sidebar-v1'];
if (typeof window !== 'undefined') {
  try {
    for (const k of LEGACY_KEYS) {
      if (window.localStorage.getItem(k) !== null) {
        window.localStorage.removeItem(k);
      }
    }
  } catch { /* private mode 등 — silent */ }
}

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

/** 마지막 quota 알림 시각 — 1분 안에 중복 안내 X. */
let lastQuotaAlertTs = 0;

function save(list: Memo[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    // quota 초과·privacy mode 등 — 사용자가 데이터 유실 인지 못하면 큰 사고. 알림 + 콘솔.
    console.error('[memoStore] save 실패:', err);
    const now = Date.now();
    if (now - lastQuotaAlertTs > 60_000) {
      lastQuotaAlertTs = now;
      import('@/lib/notify').then(({ notify }) => {
        notify.error('메모 저장 실패 — 저장 공간 부족 가능. 휴지통 비우거나 큰 이미지 삭제하세요.', { duration: 6000 });
      }).catch(() => { /* silent */ });
    }
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

// 30일 지난 휴지통 자동 정리 — 매 페이지 로드 시 1회.
// (휴지통 누적으로 quota 잡아먹는 거 방지)
if (typeof window !== 'undefined') {
  // 다음 tick 으로 미뤄서 최초 commit/listeners 와 race 안 만들기
  setTimeout(() => {
    try { autoPurgeExpiredTrash(30); } catch { /* silent */ }
  }, 0);
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

/** 폴더 emoji / color 한 번에 갱신. */
export function updateFolder(
  id: string,
  patch: Partial<Pick<MemoFolder, 'name' | 'emoji' | 'color'>>,
): void {
  commitFolders(
    ensureFolders().map((f) => {
      if (f.id !== id) return f;
      const next = { ...f, ...patch };
      if (patch.name !== undefined) next.name = patch.name.trim() || f.name;
      return next;
    }),
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

export function addMemo(
  initial?: Partial<Pick<Memo, 'body' | 'pinned' | 'folderId' | 'sourceRecordingId' | 'sourceRecordingTitle' | 'sourceChapterIndex'>>,
): Memo {
  const now = Date.now();
  const m: Memo = {
    id: newMemoId(),
    body: initial?.body ?? '',
    pinned: initial?.pinned ?? false,
    folderId: initial?.folderId,
    sourceRecordingId: initial?.sourceRecordingId,
    sourceRecordingTitle: initial?.sourceRecordingTitle,
    sourceChapterIndex: initial?.sourceChapterIndex,
    createdAt: now,
    updatedAt: now,
    version: 1,
  };
  commit([m, ...ensure()]);
  return m;
}

export function updateMemo(
  id: string,
  patch: Partial<Pick<Memo,
    'body' | 'pinned' | 'folderId' | 'archivedAt' | 'wikiPageId' | 'images' |
    'sourceRecordingId' | 'sourceRecordingTitle' | 'sourceChapterIndex'>>,
): void {
  commit(
    ensure().map((m) => (m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m)),
  );
}

/** 이미지 추가 (base64 dataUrl). 큰 이미지는 호출 측에서 압축 권장. */
export function addMemoImage(memoId: string, dataUrl: string, name?: string): void {
  const memo = getMemo(memoId);
  if (!memo) return;
  const img: MemoImage = {
    id: `img_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    dataUrl,
    name,
    addedAt: Date.now(),
  };
  updateMemo(memoId, { images: [...(memo.images ?? []), img] });
}

export function removeMemoImage(memoId: string, imageId: string): void {
  const memo = getMemo(memoId);
  if (!memo) return;
  updateMemo(memoId, { images: (memo.images ?? []).filter((i) => i.id !== imageId) });
}

/** 특정 녹음에서 만들어진 메모 모두 (녹음 디테일에서 "이 녹음에서 만든 메모" 표시용). */
export function memosFromRecording(recordingId: string): Memo[] {
  return ensure().filter((m) => m.sourceRecordingId === recordingId);
}

/** 특정 (녹음, 챕터 인덱스) 조합으로 이미 만든 메모가 있는지 — 중복 방지. */
export function findMemoFromChapter(recordingId: string, chapterIdx: number): Memo | undefined {
  return ensure().find((m) => m.sourceRecordingId === recordingId && m.sourceChapterIndex === chapterIdx);
}

/**
 * 메모 삭제.
 * - 기본(soft=true): 휴지통으로 이동 (deletedAt 세팅). 복구 가능.
 * - soft=false: 영구 삭제 (purgeMemo 와 동일).
 *
 * 기존 호출자 호환: 인자 없이 부르면 soft delete (이전: 즉시 영구 삭제 → 정책 변경됨).
 * 영구 삭제가 필요한 곳은 명시적으로 purgeMemo 사용.
 */
export function removeMemo(id: string, soft = true): void {
  if (!soft) {
    commit(ensure().filter((m) => m.id !== id));
    return;
  }
  commit(ensure().map((m) => (m.id === id ? { ...m, deletedAt: Date.now(), pinned: false, updatedAt: Date.now() } : m)));
}

/** 휴지통에서 영구 삭제. UI 의 '비우기' 또는 '영구 삭제' 액션용. */
export function purgeMemo(id: string): void {
  commit(ensure().filter((m) => m.id !== id));
}

/** 휴지통 일괄 비우기. */
export function emptyTrash(): number {
  const before = ensure();
  const trashCount = before.filter((m) => m.deletedAt).length;
  commit(before.filter((m) => !m.deletedAt));
  return trashCount;
}

/** 휴지통에서 복구 — deletedAt 제거. */
export function restoreMemo(id: string): void {
  commit(
    ensure().map((m) => {
      if (m.id !== id) return m;
      const { deletedAt, ...rest } = m;
      void deletedAt;
      return { ...rest, updatedAt: Date.now() } as Memo;
    }),
  );
}

/** 30일 지난 휴지통 항목 자동 영구 삭제 — store 진입 시 1회 호출 권장. */
export function autoPurgeExpiredTrash(retentionDays = 30): number {
  const cutoff = Date.now() - retentionDays * 24 * 3600_000;
  const before = ensure();
  const survivors = before.filter((m) => !(m.deletedAt && m.deletedAt < cutoff));
  const purged = before.length - survivors.length;
  if (purged > 0) commit(survivors);
  return purged;
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

export type MemoSortKey = 'updated' | 'created' | 'title';

export interface MemoFilter {
  query?: string;             // 본문·태그 검색
  /** 'folder' = 특정 폴더 (folderId 정의 시 그 폴더, undefined 시 미분류)
   *  'all' = 모든 메모 (검색·태그 시 유용)
   *  'trash' = 휴지통 (deletedAt 있는 것만) */
  scope: 'folder' | 'all' | 'trash';
  tag?: string;
  folderId?: string;
  /** 정렬 키. 기본 'updated'. */
  sort?: MemoSortKey;
  /** true 면 보관함도 포함 (default: false — active only). */
  includeArchived?: boolean;
}

/** 필터·정렬 — 핀 우선, 그 다음 sort 키. */
export function selectMemos(memos: Memo[], filter: MemoFilter): Memo[] {
  let list = memos;

  // 휴지통 분기 — 다른 모든 분기와 배타.
  if (filter.scope === 'trash') {
    list = list.filter((m) => m.deletedAt);
    return list.sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  }

  // 휴지통 항목은 active 분기에서 제외 (전역).
  list = list.filter((m) => !m.deletedAt);

  if (!filter.includeArchived) {
    list = list.filter((m) => !m.archivedAt);
  }

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

  const sortKey: MemoSortKey = filter.sort ?? 'updated';
  return list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (sortKey === 'created') return b.createdAt - a.createdAt;
    if (sortKey === 'title') return memoTitle(a).localeCompare(memoTitle(b), 'ko');
    return b.updatedAt - a.updatedAt;
  });
}

/** 휴지통 카운트. */
export function trashCount(memos: Memo[]): number {
  return memos.filter((m) => m.deletedAt).length;
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
