/**
 * 화이트보드 store — useSyncExternalStore 패턴 (메모·일기와 일관).
 *
 * 저장 구조:
 *   localStorage:
 *     wb:boards             → WBBoard[] 메타
 *     wb:folders            → WBFolder[]
 *     wb:board:<id>         → WBBoardData (elements + viewport)
 *     wb:settings           → { activeBoardId, tool }
 *
 * IDB 이미지 저장은 Phase 2.
 * 큰 보드 (> 1MB) 가 생기면 IDB 마이그레이션 헬퍼 추가 예정.
 */
import { useSyncExternalStore } from 'react';
import type {
  WBBoard,
  WBBoardData,
  WBElement,
  WBFolder,
  WBToolState,
  WBViewport,
} from '@/types/whiteboard';
import { idbDeleteBoardData, idbGetBoardData, idbPutBoardData } from '@/lib/whiteboard/imageStore';

// ──────────────────────────────────────────
// Storage keys
const K_BOARDS = 'wb:boards';
const K_FOLDERS = 'wb:folders';
const K_SETTINGS = 'wb:settings';
const boardDataKey = (id: string) => `wb:board:${id}`;

// ──────────────────────────────────────────
// 기본값
const DEFAULT_TOOL: WBToolState = {
  kind: 'select',
  stickyColor: 'amber',
  shapeKind: 'rect',
  lineKind: 'arrow-solid',
  penWidth: 'normal',
  penColor: 'ink',
  strokeColor: 'ink',
  fillColor: 'none',
  roughness: 1,
};

const DEFAULT_VIEWPORT: WBViewport = { x: 0, y: 0, zoom: 1 };

export type WBGridType = 'dot' | 'line' | 'none';
export type WBBgColor = 'cream' | 'white' | 'dark';

interface WBSettings {
  activeBoardId: string | null;
  tool: WBToolState;
  gridType: WBGridType;
  bgColor: WBBgColor;
}

const DEFAULT_SETTINGS: WBSettings = {
  activeBoardId: null,
  tool: DEFAULT_TOOL,
  gridType: 'dot',
  bgColor: 'cream',
};

// ──────────────────────────────────────────
// 로드/저장 헬퍼
function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`[whiteboardStore] save 실패 (${key}):`, err);
  }
}

// ──────────────────────────────────────────
// 캐시 & 리스너
let boardsCache: WBBoard[] | null = null;
let foldersCache: WBFolder[] | null = null;
let settingsCache: WBSettings | null = null;
// 활성 보드의 BoardData 캐시 (메모리)
const boardDataCache: Map<string, WBBoardData> = new Map();

const boardsListeners = new Set<() => void>();
const foldersListeners = new Set<() => void>();
const settingsListeners = new Set<() => void>();
const boardDataListeners: Map<string, Set<() => void>> = new Map();

function ensureBoards(): WBBoard[] {
  if (boardsCache === null) boardsCache = loadJSON<WBBoard[]>(K_BOARDS, []);
  return boardsCache;
}
function ensureFolders(): WBFolder[] {
  if (foldersCache === null) foldersCache = loadJSON<WBFolder[]>(K_FOLDERS, []);
  return foldersCache;
}
function ensureSettings(): WBSettings {
  if (settingsCache === null) {
    settingsCache = { ...DEFAULT_SETTINGS, ...loadJSON<Partial<WBSettings>>(K_SETTINGS, {}) };
    settingsCache.tool = { ...DEFAULT_TOOL, ...(settingsCache.tool ?? {}) };
  }
  return settingsCache;
}
const EMPTY_BOARD_DATA: WBBoardData = {
  schemaVersion: 1,
  elements: [],
  viewport: DEFAULT_VIEWPORT,
};

// IDB 로딩 진행 중인 보드 (중복 fetch 방지)
const loadingBoardIds = new Set<string>();

function ensureBoardData(boardId: string): WBBoardData {
  const cached = boardDataCache.get(boardId);
  if (cached) return cached;

  // 캐시 없음 — 즉시 빈 데이터 반환 + 비동기 IDB 로드 트리거.
  // 1) IDB 에 있으면 그걸 캐시에 넣고 listeners 알림.
  // 2) IDB 에 없고 localStorage 에 옛 키 있으면 마이그레이션 후 캐시.
  if (!loadingBoardIds.has(boardId) && typeof window !== 'undefined') {
    loadingBoardIds.add(boardId);
    void (async () => {
      try {
        let data = await idbGetBoardData<WBBoardData>(boardId);
        if (!data) {
          // localStorage 마이그레이션
          const legacy = loadJSON<WBBoardData | null>(boardDataKey(boardId), null);
          if (legacy && legacy.schemaVersion) {
            data = legacy;
            await idbPutBoardData(boardId, data);
            window.localStorage.removeItem(boardDataKey(boardId));
          }
        }
        if (data) {
          boardDataCache.set(boardId, data);
          boardDataListeners.get(boardId)?.forEach((l) => l());
        }
      } catch { /* silent */ }
      finally {
        loadingBoardIds.delete(boardId);
      }
    })();
  }
  // 캐시에 빈 placeholder 임시 저장 — 같은 board 재요청 시 중복 IDB 호출 방지
  boardDataCache.set(boardId, EMPTY_BOARD_DATA);
  return EMPTY_BOARD_DATA;
}

function commitBoards(next: WBBoard[]): void {
  boardsCache = next;
  invalidateBoardsDerived();
  saveJSON(K_BOARDS, next);
  boardsListeners.forEach((l) => l());
  wbBroadcast?.postMessage({ type: 'boards' });
}
function commitFolders(next: WBFolder[]): void {
  foldersCache = next;
  invalidateFoldersDerived();
  saveJSON(K_FOLDERS, next);
  foldersListeners.forEach((l) => l());
  wbBroadcast?.postMessage({ type: 'folders' });
}
function commitSettings(next: WBSettings): void {
  settingsCache = next;
  saveJSON(K_SETTINGS, next);
  settingsListeners.forEach((l) => l());
}
// Save 상태 추적 (IDB write 진행 여부) + per-board debounce
export type WBSaveState = 'idle' | 'saving' | 'error';
const saveStateMap: Map<string, WBSaveState> = new Map();
const saveStateListeners = new Set<() => void>();
const saveDebounceTimers: Map<string, number> = new Map();

function setSaveState(boardId: string, state: WBSaveState): void {
  saveStateMap.set(boardId, state);
  saveStateListeners.forEach((l) => l());
}

export function getSaveState(boardId: string): WBSaveState {
  return saveStateMap.get(boardId) ?? 'idle';
}
export function useSaveState(boardId: string | null): WBSaveState {
  return useSyncExternalStore(
    (cb) => {
      saveStateListeners.add(cb);
      return () => saveStateListeners.delete(cb);
    },
    () => (boardId ? getSaveState(boardId) : 'idle'),
    () => (boardId ? getSaveState(boardId) : 'idle'),
  );
}

function commitBoardData(boardId: string, next: WBBoardData): void {
  boardDataCache.set(boardId, next);
  setSaveState(boardId, 'saving');
  // 200ms trailing debounce — 드래그 중 IDB write 폭주 방지
  const existing = saveDebounceTimers.get(boardId);
  if (existing) window.clearTimeout(existing);
  const tid = window.setTimeout(() => {
    saveDebounceTimers.delete(boardId);
    const latest = boardDataCache.get(boardId);
    if (!latest) return;
    idbPutBoardData(boardId, latest).then(() => {
      setSaveState(boardId, 'idle');
    }).catch((err) => {
      console.error(`[whiteboardStore] IDB boardData save 실패 (${boardId}):`, err);
      setSaveState(boardId, 'error');
    });
  }, 200);
  saveDebounceTimers.set(boardId, tid);
  boardDataListeners.get(boardId)?.forEach((l) => l());
  // BroadcastChannel — 다른 탭에 알림
  wbBroadcast?.postMessage({ type: 'boardData', boardId });
}

// 다중 탭 동기화 — BroadcastChannel (IDB 변경 sync) + storage 이벤트(메타)
const wbBroadcast: BroadcastChannel | null =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('wb-sync')
    : null;

wbBroadcast?.addEventListener('message', (ev) => {
  const msg = ev.data as { type: string; boardId?: string };
  if (msg.type === 'boardData' && msg.boardId) {
    // 캐시 무효화 → 다음 ensureBoardData 호출이 IDB 재로드
    boardDataCache.delete(msg.boardId);
    boardDataListeners.get(msg.boardId)?.forEach((l) => l());
  } else if (msg.type === 'boards') {
    boardsCache = null;
    invalidateBoardsDerived();
    boardsListeners.forEach((l) => l());
  } else if (msg.type === 'folders') {
    foldersCache = null;
    invalidateFoldersDerived();
    foldersListeners.forEach((l) => l());
  }
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === K_BOARDS) {
      boardsCache = null;
      invalidateBoardsDerived();
      boardsListeners.forEach((l) => l());
    } else if (e.key === K_FOLDERS) {
      foldersCache = null;
      invalidateFoldersDerived();
      foldersListeners.forEach((l) => l());
    } else if (e.key === K_SETTINGS) {
      settingsCache = null;
      settingsListeners.forEach((l) => l());
    } else if (e.key && e.key.startsWith('wb:board:')) {
      const boardId = e.key.slice('wb:board:'.length);
      boardDataCache.delete(boardId);
      boardDataListeners.get(boardId)?.forEach((l) => l());
    }
  });
}

// ──────────────────────────────────────────
// ID 생성
export function newBoardId(): string {
  return `wb_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function newFolderId(): string {
  return `wbf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
export function newElementId(): string {
  return `e_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ──────────────────────────────────────────
// Boards API
//
// useSyncExternalStore 는 getSnapshot 이 매 호출 같은 reference 를 반환해야 하므로
// derived 결과(필터·정렬)는 캐시. 원본 cache 변경 시 함께 무효화.
let boardsActiveDerived: WBBoard[] | null = null;
let boardsTrashedDerived: WBBoard[] | null = null;
let foldersSortedDerived: WBFolder[] | null = null;

function invalidateBoardsDerived(): void {
  boardsActiveDerived = null;
  boardsTrashedDerived = null;
}
function invalidateFoldersDerived(): void {
  foldersSortedDerived = null;
}

export function listBoards(): WBBoard[] {
  if (boardsActiveDerived === null) {
    boardsActiveDerived = ensureBoards().filter((b) => !b.trashedAt);
  }
  return boardsActiveDerived;
}
export function listTrashedBoards(): WBBoard[] {
  if (boardsTrashedDerived === null) {
    boardsTrashedDerived = ensureBoards().filter((b) => b.trashedAt);
  }
  return boardsTrashedDerived;
}
export function getBoard(id: string): WBBoard | undefined {
  return ensureBoards().find((b) => b.id === id);
}

export function addBoard(name?: string, folderId: string | null = null): WBBoard {
  const now = Date.now();
  const board: WBBoard = {
    id: newBoardId(),
    name: name?.trim() || '새 보드',
    folderId,
    createdAt: now,
    updatedAt: now,
  };
  const next = [board, ...ensureBoards()];
  commitBoards(next);
  // 빈 보드 데이터 생성
  commitBoardData(board.id, {
    schemaVersion: 1,
    elements: [],
    viewport: DEFAULT_VIEWPORT,
  });
  setActiveBoardId(board.id);
  return board;
}

export function renameBoard(id: string, name: string): void {
  const next = ensureBoards().map((b) =>
    b.id === id ? { ...b, name: name.trim() || b.name, updatedAt: Date.now() } : b,
  );
  commitBoards(next);
}

export function moveBoardToFolder(id: string, folderId: string | null): void {
  const next = ensureBoards().map((b) =>
    b.id === id ? { ...b, folderId, updatedAt: Date.now() } : b,
  );
  commitBoards(next);
}

export function toggleBoardStarred(id: string): void {
  const next = ensureBoards().map((b) =>
    b.id === id ? { ...b, starred: !b.starred, updatedAt: Date.now() } : b,
  );
  commitBoards(next);
}

export function trashBoard(id: string): void {
  const next = ensureBoards().map((b) =>
    b.id === id ? { ...b, trashedAt: Date.now() } : b,
  );
  commitBoards(next);
  // 활성 보드면 해제
  if (ensureSettings().activeBoardId === id) setActiveBoardId(null);
}

export function restoreBoard(id: string): void {
  const next = ensureBoards().map((b) => {
    if (b.id !== id) return b;
    const copy = { ...b };
    delete copy.trashedAt;
    return copy;
  });
  commitBoards(next);
}

export function purgeBoard(id: string): void {
  // 이미지 element 들의 IDB 정리 (orphan 방지)
  const data = ensureBoardData(id);
  const imageIds = data.elements
    .filter((el): el is Extract<WBElement, { type: 'image' }> => el.type === 'image')
    .map((el) => el.imageId);
  if (imageIds.length > 0) {
    void import('@/lib/whiteboard/imageStore').then(({ removeWBImage, revokeImageObjectURL }) => {
      for (const iid of imageIds) {
        revokeImageObjectURL(iid);
        void removeWBImage(iid).catch(() => { /* silent */ });
      }
    });
  }
  const next = ensureBoards().filter((b) => b.id !== id);
  commitBoards(next);
  // 데이터도 영구 삭제 (캐시 + IDB + 옛 localStorage)
  boardDataCache.delete(id);
  void idbDeleteBoardData(id).catch(() => { /* silent */ });
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(boardDataKey(id)); } catch { /* silent */ }
  }
}

export function duplicateBoard(id: string): WBBoard | null {
  const src = ensureBoards().find((b) => b.id === id);
  if (!src) return null;
  const srcData = ensureBoardData(id);
  const now = Date.now();
  const copy: WBBoard = {
    ...src,
    id: newBoardId(),
    name: `${src.name} (복제)`,
    createdAt: now,
    updatedAt: now,
  };
  delete (copy as { trashedAt?: number }).trashedAt;
  commitBoards([copy, ...ensureBoards()]);
  // 데이터도 복제 (요소 ID 새로 부여)
  commitBoardData(copy.id, {
    ...srcData,
    elements: srcData.elements.map((el) => ({ ...el, id: newElementId() })),
  });
  return copy;
}

// ──────────────────────────────────────────
// Folders API
export function listFolders(): WBFolder[] {
  if (foldersSortedDerived === null) {
    foldersSortedDerived = [...ensureFolders()].sort((a, b) => a.order - b.order);
  }
  return foldersSortedDerived;
}

export function addFolder(name: string): WBFolder {
  const trimmed = name.trim() || '새 폴더';
  const existing = ensureFolders();
  const maxOrder = existing.reduce((m, f) => Math.max(m, f.order), -1);
  const folder: WBFolder = {
    id: newFolderId(),
    name: trimmed,
    parentId: null,
    order: maxOrder + 1,
  };
  commitFolders([...existing, folder]);
  return folder;
}

export function renameFolder(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  const next = ensureFolders().map((f) => (f.id === id ? { ...f, name: trimmed } : f));
  commitFolders(next);
}

export function removeFolder(id: string): void {
  // 폴더 안 보드는 미분류로 이동
  const boards = ensureBoards().map((b) =>
    b.folderId === id ? { ...b, folderId: null, updatedAt: Date.now() } : b,
  );
  commitBoards(boards);
  commitFolders(ensureFolders().filter((f) => f.id !== id));
}

// ──────────────────────────────────────────
// Settings API
export function getSettings(): WBSettings {
  return ensureSettings();
}
export function setActiveBoardId(id: string | null): void {
  const cur = ensureSettings();
  if (cur.activeBoardId === id) return;
  commitSettings({ ...cur, activeBoardId: id });
}
export function setTool(patch: Partial<WBToolState>): void {
  const cur = ensureSettings();
  commitSettings({ ...cur, tool: { ...cur.tool, ...patch } });
}
export function setBoardGridType(gridType: WBGridType): void {
  const cur = ensureSettings();
  commitSettings({ ...cur, gridType });
}
export function setBoardBgColor(bgColor: WBBgColor): void {
  const cur = ensureSettings();
  commitSettings({ ...cur, bgColor });
}

// ──────────────────────────────────────────
// Board Data API
export function getBoardData(boardId: string): WBBoardData {
  return ensureBoardData(boardId);
}

export function updateBoardData(boardId: string, patch: Partial<WBBoardData>): void {
  const cur = ensureBoardData(boardId);
  commitBoardData(boardId, { ...cur, ...patch });
  // 보드 메타의 updatedAt 갱신
  const boards = ensureBoards().map((b) =>
    b.id === boardId ? { ...b, updatedAt: Date.now() } : b,
  );
  commitBoards(boards);
}

export function setViewport(boardId: string, viewport: WBViewport): void {
  const cur = ensureBoardData(boardId);
  // 메타 updatedAt 은 갱신 X (요소 변경이 아니므로)
  boardDataCache.set(boardId, { ...cur, viewport });
  saveJSON(boardDataKey(boardId), { ...cur, viewport });
  boardDataListeners.get(boardId)?.forEach((l) => l());
}

export function setElements(boardId: string, elements: WBElement[]): void {
  updateBoardData(boardId, { elements });
}

export function addElement(boardId: string, element: WBElement): void {
  const cur = ensureBoardData(boardId);
  updateBoardData(boardId, { elements: [...cur.elements, element] });
}

export function updateElement(boardId: string, elementId: string, patch: Partial<WBElement>): void {
  const cur = ensureBoardData(boardId);
  const elements = cur.elements.map((el) =>
    el.id === elementId
      ? ({ ...el, ...patch, updatedAt: Date.now() } as WBElement)
      : el,
  );
  updateBoardData(boardId, { elements });
}

export function removeElements(boardId: string, ids: string[]): void {
  const cur = ensureBoardData(boardId);
  const idSet = new Set(ids);
  // 이미지 element 들의 IDB orphan 정리
  const imageIds = cur.elements
    .filter((el) => idSet.has(el.id) && el.type === 'image')
    .map((el) => (el as Extract<WBElement, { type: 'image' }>).imageId);
  // 단, 같은 imageId 를 쓰는 다른 element 가 남아있으면 보존
  const remaining = cur.elements.filter((el) => !idSet.has(el.id));
  const stillUsed = new Set(
    remaining.filter((el) => el.type === 'image').map((el) => (el as Extract<WBElement, { type: 'image' }>).imageId),
  );
  const toPurge = imageIds.filter((iid) => !stillUsed.has(iid));
  if (toPurge.length > 0) {
    void import('@/lib/whiteboard/imageStore').then(({ removeWBImage, revokeImageObjectURL }) => {
      for (const iid of toPurge) {
        revokeImageObjectURL(iid);
        void removeWBImage(iid).catch(() => { /* silent */ });
      }
    });
  }
  updateBoardData(boardId, { elements: remaining });
}

// ──────────────────────────────────────────
// useSyncExternalStore 훅
export function useBoards(): WBBoard[] {
  return useSyncExternalStore(
    (cb) => {
      boardsListeners.add(cb);
      return () => boardsListeners.delete(cb);
    },
    listBoards,
    listBoards,
  );
}

export function useTrashedBoards(): WBBoard[] {
  return useSyncExternalStore(
    (cb) => {
      boardsListeners.add(cb);
      return () => boardsListeners.delete(cb);
    },
    listTrashedBoards,
    listTrashedBoards,
  );
}

export function useFolders(): WBFolder[] {
  return useSyncExternalStore(
    (cb) => {
      foldersListeners.add(cb);
      return () => foldersListeners.delete(cb);
    },
    listFolders,
    listFolders,
  );
}

export function useSettings(): WBSettings {
  return useSyncExternalStore(
    (cb) => {
      settingsListeners.add(cb);
      return () => settingsListeners.delete(cb);
    },
    getSettings,
    getSettings,
  );
}

export function useBoardData(boardId: string | null): WBBoardData | null {
  return useSyncExternalStore(
    (cb) => {
      if (!boardId) return () => undefined;
      let set = boardDataListeners.get(boardId);
      if (!set) {
        set = new Set();
        boardDataListeners.set(boardId, set);
      }
      set.add(cb);
      return () => {
        set?.delete(cb);
      };
    },
    () => (boardId ? ensureBoardData(boardId) : null),
    () => (boardId ? ensureBoardData(boardId) : null),
  );
}

// ──────────────────────────────────────────
// 30일 지난 휴지통 자동 정리 (메모 패턴)
export function autoPurgeExpiredTrash(daysMax = 30): number {
  const cutoff = Date.now() - daysMax * 24 * 60 * 60 * 1000;
  const all = ensureBoards();
  const toPurge = all.filter((b) => b.trashedAt && b.trashedAt < cutoff);
  if (toPurge.length === 0) return 0;
  // 이미지 IDB orphan 정리
  const imageIds: string[] = [];
  for (const b of toPurge) {
    const data = ensureBoardData(b.id);
    for (const el of data.elements) {
      if (el.type === 'image') imageIds.push(el.imageId);
    }
    boardDataCache.delete(b.id);
    void idbDeleteBoardData(b.id).catch(() => { /* silent */ });
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(boardDataKey(b.id)); } catch { /* silent */ }
    }
  }
  if (imageIds.length > 0) {
    void import('@/lib/whiteboard/imageStore').then(({ removeWBImage, revokeImageObjectURL }) => {
      for (const iid of imageIds) {
        revokeImageObjectURL(iid);
        void removeWBImage(iid).catch(() => { /* silent */ });
      }
    });
  }
  const remaining = all.filter((b) => !(b.trashedAt && b.trashedAt < cutoff));
  commitBoards(remaining);
  return toPurge.length;
}

if (typeof window !== 'undefined') {
  setTimeout(() => {
    try { autoPurgeExpiredTrash(30); } catch { /* silent */ }
  }, 0);
}
