/**
 * 클라우드 모드 데이터 어댑터.
 *
 * v1 (현재): localStorage 기반 단일 사용자. 로그인·Supabase 의존 0.
 * v2 (예정): 사용자 명시 요청 시 Supabase Storage·RLS 백엔드로 swap.
 *           외부 인터페이스(함수 시그니처)는 동일하게 유지 → 호출자 코드 변경 0.
 */

import {
  rowToCloudNode,
  type CloudNode,
  type CloudNodeRow,
  type CloudFileType,
} from '@/types/cloud';

const STORAGE_KEY = 'personai.cloud.nodes.v1';

interface StoredNode {
  id: string;
  owner_id: string;
  parent_folder_id: string | null;
  kind: 'file' | 'folder';
  name: string;
  file_type: CloudFileType | null;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  original_storage_path: string | null;
  meta: Record<string, unknown>;
  starred: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// 저장소 (localStorage + pub/sub)
// ─────────────────────────────────────────────

let cache: StoredNode[] | null = null;

function loadAll(): StoredNode[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = [];
      return cache;
    }
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? (parsed as StoredNode[]) : [];
    return cache;
  } catch {
    cache = [];
    return cache;
  }
}

function saveAll(nodes: StoredNode[]): void {
  cache = nodes;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nodes));
  } catch {
    // quota or privacy mode — 조용히 무시 (사용자에겐 토스트로 표시 가능)
  }
}

import { newId } from '@/lib/idGenerator';
function genId(): string {
  return newId('cn');
}

function nowIso(): string {
  return new Date().toISOString();
}

function toRow(n: StoredNode): CloudNodeRow {
  return n as CloudNodeRow;
}

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

/** 특정 폴더 안의 살아있는 노드 (folder 먼저, file 은 최근수정 순). */
export async function fetchAliveChildren(
  ownerId: string,
  parentFolderId: string | null,
): Promise<CloudNode[]> {
  const all = loadAll();
  return all
    .filter(
      (n) =>
        n.owner_id === ownerId &&
        n.parent_folder_id === parentFolderId &&
        n.deleted_at === null,
    )
    .sort(sortFolderFirstThenRecent)
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 모든 살아있는 폴더 — 사이드바 트리용. parent_folder_id + name 정렬. */
export async function fetchAllFolders(ownerId: string): Promise<CloudNode[]> {
  const all = loadAll();
  return all
    .filter((n) => n.owner_id === ownerId && n.deleted_at === null && n.kind === 'folder')
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 별표 (살아있는 항목 중 starred). */
export async function fetchStarred(ownerId: string): Promise<CloudNode[]> {
  const all = loadAll();
  return all
    .filter((n) => n.owner_id === ownerId && n.deleted_at === null && n.starred)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 휴지통 (deleted_at != null). */
export async function fetchTrash(ownerId: string): Promise<CloudNode[]> {
  const all = loadAll();
  return all
    .filter((n) => n.owner_id === ownerId && n.deleted_at !== null)
    .sort((a, b) => (b.deleted_at ?? '').localeCompare(a.deleted_at ?? ''))
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 최근 30일 안에 수정된 파일 (limit 개). */
export async function fetchRecent(ownerId: string, limit = 20): Promise<CloudNode[]> {
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const all = loadAll();
  return all
    .filter(
      (n) =>
        n.owner_id === ownerId &&
        n.deleted_at === null &&
        n.kind === 'file' &&
        n.updated_at >= sinceIso,
    )
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit)
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 단일 노드 조회. */
export async function fetchNode(id: string): Promise<CloudNode | null> {
  const all = loadAll();
  const found = all.find((n) => n.id === id);
  return found ? rowToCloudNode(toRow(found)) : null;
}

/** 이름 검색 (살아있는 항목, 부분 일치, limit 개). */
export async function searchByName(
  ownerId: string,
  query: string,
  limit = 30,
): Promise<CloudNode[]> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const all = loadAll();
  return all
    .filter(
      (n) =>
        n.owner_id === ownerId &&
        n.deleted_at === null &&
        n.name.toLowerCase().includes(q),
    )
    .sort(sortFolderFirstThenRecent)
    .slice(0, limit)
    .map((n) => rowToCloudNode(toRow(n)));
}

/** 사이드바 카운트 (별표·휴지통). */
export async function fetchCounts(ownerId: string): Promise<{ starred: number; trash: number }> {
  const all = loadAll();
  let starred = 0;
  let trash = 0;
  for (const n of all) {
    if (n.owner_id !== ownerId) continue;
    if (n.deleted_at !== null) {
      trash++;
    } else if (n.starred) {
      starred++;
    }
  }
  return { starred, trash };
}

// ─────────────────────────────────────────────
// 생성
// ─────────────────────────────────────────────

export async function createFolder(
  ownerId: string,
  name: string,
  parentFolderId: string | null,
): Promise<CloudNode> {
  const now = nowIso();
  const next: StoredNode = {
    id: genId(),
    owner_id: ownerId,
    parent_folder_id: parentFolderId,
    kind: 'folder',
    name,
    file_type: null,
    mime_type: null,
    size_bytes: null,
    storage_path: null,
    original_storage_path: null,
    meta: {},
    starred: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  saveAll([...loadAll(), next]);
  return rowToCloudNode(toRow(next));
}

export async function createEmptyFile(
  ownerId: string,
  name: string,
  fileType: CloudFileType,
  parentFolderId: string | null,
): Promise<CloudNode> {
  const now = nowIso();
  const next: StoredNode = {
    id: genId(),
    owner_id: ownerId,
    parent_folder_id: parentFolderId,
    kind: 'file',
    name,
    file_type: fileType,
    mime_type: null,
    size_bytes: null,
    storage_path: null,
    original_storage_path: null,
    meta: {},
    starred: false,
    deleted_at: null,
    created_at: now,
    updated_at: now,
  };
  saveAll([...loadAll(), next]);
  return rowToCloudNode(toRow(next));
}

// ─────────────────────────────────────────────
// 수정
// ─────────────────────────────────────────────

function patchNode(id: string, patch: Partial<StoredNode>): void {
  const all = loadAll();
  const idx = all.findIndex((n) => n.id === id);
  if (idx === -1) return;
  const next = [...all];
  next[idx] = { ...next[idx], ...patch, updated_at: nowIso() };
  saveAll(next);
}

export async function renameNode(id: string, name: string): Promise<void> {
  patchNode(id, { name });
}

export async function moveNode(id: string, parentFolderId: string | null): Promise<void> {
  patchNode(id, { parent_folder_id: parentFolderId });
}

export async function setStarred(id: string, starred: boolean): Promise<void> {
  patchNode(id, { starred });
}

/** 폴더 색상 지정 — meta.folderColor 에 색 키 (null = 기본) 저장. */
export async function setFolderColor(id: string, color: string | null): Promise<void> {
  const node = await fetchNode(id);
  if (!node) return;
  const nextMeta: Record<string, unknown> = { ...(node.meta ?? {}) };
  if (color == null) {
    delete nextMeta.folderColor;
  } else {
    nextMeta.folderColor = color;
  }
  patchNode(id, { meta: nextMeta });
}

/** 에디터에서 본문/제목 동시 저장 (자동저장용). */
export async function updateFileBody(
  id: string,
  patch: { name?: string; meta?: Record<string, unknown> },
): Promise<void> {
  const stored: Partial<StoredNode> = {};
  if (patch.name !== undefined) stored.name = patch.name;
  if (patch.meta !== undefined) stored.meta = patch.meta;
  if (Object.keys(stored).length === 0) return;
  patchNode(id, stored);
}

// ─────────────────────────────────────────────
// 삭제 (휴지통 → 영구)
// ─────────────────────────────────────────────

export async function moveToTrash(id: string): Promise<void> {
  patchNode(id, { deleted_at: nowIso() });
}

export async function restoreFromTrash(id: string): Promise<void> {
  patchNode(id, { deleted_at: null });
}

export async function permanentDelete(id: string): Promise<void> {
  const all = loadAll();
  saveAll(all.filter((n) => n.id !== id));
}

// ─────────────────────────────────────────────
// 정렬 헬퍼
// ─────────────────────────────────────────────

function sortFolderFirstThenRecent(a: StoredNode, b: StoredNode): number {
  if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1;
  return b.updated_at.localeCompare(a.updated_at);
}
