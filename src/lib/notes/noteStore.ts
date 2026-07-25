/**
 * 노트 저장소 — "탭 컨테이너" 모델 (재설계 A).
 *
 * 한 노트가 여러 탭(item)을 품는다: 메모(Plate) · 보드(tldraw) · 시트(Fortune-sheet).
 * 새 노트 생성 시 [메모 1 · 보드 1 · 시트 1] 자동 생성. 이후 탭 추가/제거.
 *
 * 보드 콘텐츠는 tldraw 가 persistenceKey(=tab id)로 자체 저장, 메모·시트는 여기 저장.
 * 저장 백엔드는 localStorage(추후 IndexedDB/Yjs 교체 쉽게 격리).
 */
import { useSyncExternalStore } from 'react';
import type { Value } from 'platejs';

export type TabType = 'memo' | 'board' | 'sheet';

export interface TabItem {
  id: string;
  type: TabType;
  name: string;
  /** 메모 탭 본문 (Plate value). */
  memo?: Value;
  /** 시트 탭 데이터 (Fortune-sheet sheets). */
  sheet?: unknown;
  // 보드 탭: tldraw 가 persistenceKey=id 로 자체 저장하므로 여기 콘텐츠 없음.
}

export interface Note {
  id: string;
  title: string;
  items: TabItem[];
  /** 소속 폴더 id — 없으면 null(미분류). */
  folderId: string | null;
  /** 즐겨찾기(고정). */
  favorite: boolean;
  /** 고정 섹션 수동 정렬 순서 — 작을수록 위. 없으면 목록 끝. */
  favOrder?: number;
  /** 노트 문양(이모지) — 없으면 기본 문서 아이콘. */
  emoji?: string;
  createdAt: number;
  updatedAt: number;
  /** 휴지통 이동 시각(ms). 있으면 삭제된 상태(복원 가능). */
  deletedAt?: number;
  meta: { surface: 'memo'; tags: string[] };
}

export interface NoteFolder {
  id: string;
  name: string;
  createdAt: number;
}

const STORAGE_KEY = 'personai.notes.v1';
const CHANGED_EVENT = 'personai:notes-changed';
const FOLDER_KEY = 'personai.note-folders.v1';
const FOLDER_CHANGED = 'personai:note-folders-changed';

const uid = () => (crypto.randomUUID?.() ?? String(Date.now() + Math.random()));

/** 빈 글 본문 — Plate 최소 문서(문단 1개). */
export function emptyMemoValue(): Value {
  return [{ type: 'p', children: [{ text: '' }] }];
}

/** 새 노트의 기본 탭 3종. */
function defaultItems(): TabItem[] {
  return [
    { id: uid(), type: 'memo', name: '노트 1', memo: emptyMemoValue() },
    { id: uid(), type: 'board', name: '화이트보드 1' },
    { id: uid(), type: 'sheet', name: '시트 1', sheet: null },
  ];
}

/** 구버전({memo}) → 탭 모델 + 폴더/즐겨찾기 필드 마이그레이션. */
function migrate(raw: unknown): Note {
  const n = raw as Note & { memo?: Value };
  const items: TabItem[] = (Array.isArray(n.items) && n.items.length > 0)
    ? n.items
    : [
        { id: uid(), type: 'memo', name: '노트 1', memo: n.memo ?? emptyMemoValue() },
        { id: uid(), type: 'board', name: '화이트보드 1' },
        { id: uid(), type: 'sheet', name: '시트 1', sheet: null },
      ];
  return {
    ...n,
    items,
    folderId: n.folderId ?? null,
    favorite: n.favorite ?? false,
  } as Note;
}

function readAll(): Note[] {
  if (typeof window === 'undefined') return [];
  try {
    const rawList = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(rawList)) return [];
    return rawList.map(migrate);
  } catch {
    return [];
  }
}

function writeAll(notes: Note[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  } catch {
    /* 용량 초과 등 — 조용히 무시(추후 IndexedDB). */
  }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

export function listNotes(): Note[] {
  return readAll().filter((n) => !n.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** 휴지통 — 삭제된 노트(최근 삭제 먼저). */
export function listTrash(): Note[] {
  return readAll().filter((n) => n.deletedAt).sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
}

export function getNote(id: string): Note | undefined {
  return readAll().find((n) => n.id === id);
}

export function createNote(): Note {
  const now = Date.now();
  const note: Note = {
    id: uid(),
    title: '',
    items: defaultItems(),
    folderId: null,
    favorite: false,
    createdAt: now,
    updatedAt: now,
    meta: { surface: 'memo', tags: [] },
  };
  writeAll([note, ...readAll()]);
  return note;
}

/** 새 노트를 특정 폴더에 생성. */
export function createNoteInFolder(folderId: string | null): Note {
  const note = createNote();
  if (folderId) patchNote(note.id, (n) => ({ ...n, folderId }));
  return getNote(note.id) ?? note;
}

/** 즐겨찾기(고정) 토글 — 켤 때는 고정 목록 맨 아래로(favOrder = max+1). */
export function toggleFavorite(id: string): void {
  const maxOrder = readAll().filter((n) => n.favorite).reduce((m, n) => Math.max(m, n.favOrder ?? 0), 0);
  patchNote(id, (n) => (n.favorite
    ? { ...n, favorite: false, favOrder: undefined }
    : { ...n, favorite: true, favOrder: maxOrder + 1 }));
}

/** 노트 문양(이모지) 지정 — null 이면 기본 아이콘으로. 이름표라 순서는 건드리지 않는다. */
export function setNoteEmoji(id: string, emoji: string | null): void {
  patchNote(id, (n) => ({ ...n, emoji: emoji ?? undefined }), false);
}

/** 고정 목록의 표시 순서 — favOrder(수동) 우선, 없으면 최근 편집순. */
export function sortedFavorites(notes: Note[]): Note[] {
  return notes.filter((n) => n.favorite)
    .sort((a, b) => (a.favOrder ?? Number.MAX_SAFE_INTEGER) - (b.favOrder ?? Number.MAX_SAFE_INTEGER) || b.updatedAt - a.updatedAt);
}

/** 고정 노트를 위/아래로 한 칸 이동 — 전체 고정 목록의 favOrder 를 0..n-1 로 재부여하며 스왑. */
export function moveFavorite(id: string, dir: -1 | 1): void {
  const all = readAll();
  const favs = sortedFavorites(all.filter((n) => !n.deletedAt));
  const i = favs.findIndex((n) => n.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= favs.length) return;
  [favs[i], favs[j]] = [favs[j], favs[i]];
  const orderOf = new Map(favs.map((n, idx) => [n.id, idx]));
  writeAll(all.map((n) => (orderOf.has(n.id) ? { ...n, favOrder: orderOf.get(n.id) } : n)));
}

/** 노트를 폴더로 이동(null=미분류). @deprecated 태그 분류로 대체 — 데이터 보존용으로만 유지. */
export function setNoteFolder(id: string, folderId: string | null): void {
  patchNote(id, (n) => ({ ...n, folderId }));
}

/** 태그 정규화 — 앞뒤 공백·선행 # 제거, 최대 24자. */
function normTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').trim().slice(0, 24);
}

/** 노트에 태그 추가(중복·대소문자 무시). 이름표라 순서는 건드리지 않는다. */
export function addNoteTag(id: string, raw: string): void {
  const tag = normTag(raw);
  if (!tag) return;
  patchNote(id, (n) => {
    const tags = n.meta?.tags ?? [];
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return n;
    return { ...n, meta: { ...n.meta, surface: 'memo', tags: [...tags, tag] } };
  }, false);
}

/** 노트에서 태그 제거. 이름표라 순서는 건드리지 않는다. */
export function removeNoteTag(id: string, tag: string): void {
  patchNote(id, (n) => ({
    ...n,
    meta: { ...n.meta, surface: 'memo', tags: (n.meta?.tags ?? []).filter((t) => t !== tag) },
  }), false);
}

/* ── 태그 목록 ──
 * 태그는 원래 노트에 붙어 있을 때만 존재했다. 그래서 '태그를 먼저 만들어 두는 것'이 불가능하고,
 * 마지막 노트에서 떼면 태그도 같이 증발했다. 따로 만든 태그를 여기 담아 둔다.
 * (노트에 붙은 태그는 여전히 노트가 진실 — 이건 '빈 태그'를 살려두기 위한 명부다) */
const TAGS_KEY = 'allinone.notes.tags.v1';

function readTagRegistry(): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(TAGS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((t): t is string => typeof t === 'string' && !!t.trim()) : [];
  } catch { return []; }
}

function writeTagRegistry(tags: string[]): void {
  try { window.localStorage.setItem(TAGS_KEY, JSON.stringify(tags)); } catch { /* 용량 초과 등 */ }
  window.dispatchEvent(new CustomEvent(CHANGED_EVENT));
}

/** 따로 만들어 둔 태그(아직 아무 노트에도 안 붙은 것 포함). */
export function listTagRegistry(): string[] {
  return readTagRegistry();
}

/** 태그를 미리 만들어 둔다. 이미 있으면(노트에 붙어 있든 명부에 있든) 아무 일도 안 한다. */
export function createTag(raw: string): string | null {
  const tag = normTag(raw);
  if (!tag) return null;
  const lower = tag.toLowerCase();
  const inNotes = readAll().some((n) => (n.meta?.tags ?? []).some((t) => t.toLowerCase() === lower));
  const reg = readTagRegistry();
  if (inNotes || reg.some((t) => t.toLowerCase() === lower)) return tag;
  writeTagRegistry([...reg, tag]);
  return tag;
}

/**
 * 태그 자체를 없앤다 — 모든 노트에서 걷어내고 명부에서도 지운다.
 * 노트별 제거만 있으면, 쓰던 태그를 목록에서 치우려고 노트를 하나하나 뒤져야 한다.
 */
export function deleteTagEverywhere(raw: string): void {
  const tag = normTag(raw).toLowerCase();
  if (!tag) return;
  const reg = readTagRegistry();
  const nextReg = reg.filter((t) => t.toLowerCase() !== tag);
  const notes = readAll();
  let hit = false;
  const next = notes.map((n) => {
    const tags = n.meta?.tags ?? [];
    if (!tags.some((t) => t.toLowerCase() === tag)) return n;
    hit = true;
    return { ...n, meta: { ...n.meta, surface: 'memo' as const, tags: tags.filter((t) => t.toLowerCase() !== tag) } };
  });
  if (hit) writeAll(next);
  if (nextReg.length !== reg.length) writeTagRegistry(nextReg);
}

/**
 * @param touch 기본 true — updatedAt 을 지금으로 올린다.
 *   목록이 updatedAt 내림차순이라, 문양·태그처럼 '내용을 고친 게 아니라 이름표를 붙인' 변경까지
 *   시각을 올리면 노트가 맨 위로 튀어 순서가 뒤집힌다. 그런 변경은 false 로 넘긴다.
 */
function patchNote(id: string, fn: (note: Note) => Note, touch = true): void {
  const notes = readAll();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const next = fn(notes[idx]);
  notes[idx] = touch ? { ...next, updatedAt: Date.now() } : next;
  writeAll(notes);
}

export function updateNoteTitle(id: string, title: string): void {
  patchNote(id, (n) => ({ ...n, title }));
}

/** 특정 탭의 콘텐츠·이름 갱신. */
export function updateTab(noteId: string, tabId: string, patch: Partial<Pick<TabItem, 'memo' | 'sheet' | 'name'>>): void {
  patchNote(noteId, (n) => ({
    ...n,
    items: n.items.map((it) => (it.id === tabId ? { ...it, ...patch } : it)),
  }));
}

/** 탭 추가 — 같은 타입 개수+1 로 이름 자동. 새 탭 id 반환. */
export function addTab(noteId: string, type: TabType): string {
  const newId = uid();
  patchNote(noteId, (n) => {
    const count = n.items.filter((it) => it.type === type).length + 1;
    const label = type === 'memo' ? '노트' : type === 'board' ? '화이트보드' : '시트';
    const item: TabItem =
      type === 'memo'
        ? { id: newId, type, name: `${label} ${count}`, memo: emptyMemoValue() }
        : type === 'sheet'
          ? { id: newId, type, name: `${label} ${count}`, sheet: null }
          : { id: newId, type, name: `${label} ${count}` };
    return { ...n, items: [...n.items, item] };
  });
  return newId;
}

/** 탭 제거 — 최소 1개는 유지. */
export function removeTab(noteId: string, tabId: string): void {
  patchNote(noteId, (n) => {
    if (n.items.length <= 1) return n;
    return { ...n, items: n.items.filter((it) => it.id !== tabId) };
  });
}

/** 탭 순서 이동 — tabId 를 toIndex 위치로. 범위 밖이면 무시. */
export function reorderTab(noteId: string, tabId: string, toIndex: number): void {
  patchNote(noteId, (n) => {
    const from = n.items.findIndex((it) => it.id === tabId);
    if (from === -1 || toIndex < 0 || toIndex >= n.items.length || toIndex === from) return n;
    const items = [...n.items];
    const [moved] = items.splice(from, 1);
    items.splice(toIndex, 0, moved);
    return { ...n, items };
  });
}

/**
 * 탭을 다른 노트로 이동 — 원본에서 빼고 대상 노트 끝에 붙인다.
 * 원본은 최소 1개 유지(마지막 탭은 이동 불가). board 탭은 id 보존이라 tldraw 콘텐츠도 따라감.
 */
export function moveTabToNote(fromNoteId: string, tabId: string, toNoteId: string): void {
  if (fromNoteId === toNoteId) return;
  const notes = readAll();
  const from = notes.find((n) => n.id === fromNoteId);
  const to = notes.find((n) => n.id === toNoteId);
  if (!from || !to || from.items.length <= 1) return;
  const tab = from.items.find((it) => it.id === tabId);
  if (!tab) return;
  const now = Date.now();
  from.items = from.items.filter((it) => it.id !== tabId);
  from.updatedAt = now;
  to.items = [...to.items, tab];
  to.updatedAt = now;
  writeAll(notes);
}

/** 삭제 = 휴지통으로 이동(소프트). 완전 삭제는 purgeNote. */
export function deleteNote(id: string): void {
  patchNote(id, (n) => ({ ...n, deletedAt: Date.now() }));
}

/** 휴지통에서 복원. */
export function restoreNote(id: string): void {
  patchNote(id, (n) => ({ ...n, deletedAt: undefined }));
}

/** 완전 삭제(되돌릴 수 없음). */
export function purgeNote(id: string): void {
  writeAll(readAll().filter((n) => n.id !== id));
}

/** 휴지통 비우기 — 삭제된 노트 전부 완전 삭제. */
export function emptyTrash(): void {
  writeAll(readAll().filter((n) => !n.deletedAt));
}

/** 노트 목록 미리보기·제목 폴백용 — 첫 메모 탭 텍스트. */
export function notePlainText(note: Note): string {
  const memoTab = note.items.find((it) => it.type === 'memo');
  if (!memoTab?.memo) return '';
  const out: string[] = [];
  const walk = (nodes: unknown[]) => {
    for (const node of nodes) {
      if (node && typeof node === 'object') {
        const nd = node as { text?: string; children?: unknown[] };
        if (typeof nd.text === 'string') out.push(nd.text);
        if (Array.isArray(nd.children)) walk(nd.children);
      }
    }
  };
  walk(memoTab.memo as unknown[]);
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export function noteDisplayTitle(note: Note): string {
  if (note.title.trim()) return note.title.trim();
  const text = notePlainText(note);
  return text ? text.slice(0, 40) : '제목 없음';
}

/* ── React 구독 훅 ── */
function subscribe(cb: () => void): () => void {
  window.addEventListener(CHANGED_EVENT, cb);
  window.addEventListener('storage', cb);
  return () => {
    window.removeEventListener(CHANGED_EVENT, cb);
    window.removeEventListener('storage', cb);
  };
}

let cachedSnapshot: Note[] = [];
let cachedKey = '';
/**
 * 스냅샷 키 — 무엇이 바뀌었는지 판별하는 지문.
 *
 * updatedAt 만 보면 안 된다. 문양·태그·고정처럼 '이름표'에 해당하는 변경은
 * 목록 순서를 흔들지 않으려고 일부러 시각을 올리지 않기 때문에(patchNote touch=false),
 * updatedAt 만 비교하면 저장은 됐는데 화면은 그대로인 상태가 된다.
 * 시각을 올리지 않는 필드는 전부 여기 들어와야 한다.
 */
function snapshotKey(notes: Note[]): string {
  return notes
    .map((n) => `${n.id}:${n.updatedAt}:${n.emoji ?? ''}:${n.favorite ? 1 : 0}:${n.favOrder ?? ''}:${(n.meta?.tags ?? []).join(',')}`)
    .join('|');
}
function getSnapshot(): Note[] {
  const notes = listNotes();
  const key = snapshotKey(notes);
  if (key !== cachedKey) {
    cachedKey = key;
    cachedSnapshot = notes;
  }
  return cachedSnapshot;
}

export function useNotes(): Note[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => cachedSnapshot);
}

/* 태그 명부는 노트와 다른 키에 있어서 노트 스냅샷만 보면 변화를 놓친다 —
   0건짜리 태그를 만들어도 화면이 안 바뀌는 이유가 된다. 따로 구독한다. */
let tagsSnapshot: string[] = [];
let tagsKey = '';
function getTagsSnapshot(): string[] {
  const tags = readTagRegistry();
  const key = tags.join('|');
  if (key !== tagsKey) { tagsKey = key; tagsSnapshot = tags; }
  return tagsSnapshot;
}
export function useTagRegistry(): string[] {
  return useSyncExternalStore(subscribe, getTagsSnapshot, () => tagsSnapshot);
}

let trashSnapshot: Note[] = [];
let trashKey = '';
function getTrashSnapshot(): Note[] {
  const notes = listTrash();
  const key = notes.map((n) => `${n.id}:${n.deletedAt}`).join('|');
  if (key !== trashKey) {
    trashKey = key;
    trashSnapshot = notes;
  }
  return trashSnapshot;
}

export function useTrash(): Note[] {
  return useSyncExternalStore(subscribe, getTrashSnapshot, () => trashSnapshot);
}

/* ── 폴더 ── */
function readFolders(): NoteFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const r = JSON.parse(window.localStorage.getItem(FOLDER_KEY) || '[]');
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

function writeFolders(folders: NoteFolder[]): void {
  try {
    window.localStorage.setItem(FOLDER_KEY, JSON.stringify(folders));
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent(FOLDER_CHANGED));
}

export function listFolders(): NoteFolder[] {
  return readFolders().sort((a, b) => a.createdAt - b.createdAt);
}

export function createFolder(name: string): NoteFolder {
  const f: NoteFolder = { id: uid(), name: name.trim() || '새 폴더', createdAt: Date.now() };
  writeFolders([...readFolders(), f]);
  return f;
}

export function renameFolder(id: string, name: string): void {
  writeFolders(readFolders().map((f) => (f.id === id ? { ...f, name: name.trim() || f.name } : f)));
}

export function deleteFolder(id: string): void {
  writeFolders(readFolders().filter((f) => f.id !== id));
  // 소속 노트는 미분류로.
  const notes = readAll();
  let changed = false;
  const next = notes.map((n) => {
    if (n.folderId === id) { changed = true; return { ...n, folderId: null }; }
    return n;
  });
  if (changed) writeAll(next);
}

let cachedFolders: NoteFolder[] = [];
let cachedFolderKey = '';
function folderSnapshot(): NoteFolder[] {
  const fs = listFolders();
  const key = fs.map((f) => `${f.id}:${f.name}`).join('|');
  if (key !== cachedFolderKey) {
    cachedFolderKey = key;
    cachedFolders = fs;
  }
  return cachedFolders;
}

export function useFolders(): NoteFolder[] {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(FOLDER_CHANGED, cb);
      window.addEventListener('storage', cb);
      return () => {
        window.removeEventListener(FOLDER_CHANGED, cb);
        window.removeEventListener('storage', cb);
      };
    },
    folderSnapshot,
    () => cachedFolders,
  );
}
