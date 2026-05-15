/**
 * 클라우드 모드 Supabase 호출 wrapper.
 *
 * Supabase types.ts 에 cloud_nodes 가 아직 없어서 (재생성 전) 'cloud_nodes' 테이블
 * 호출 부분만 임시 unknown 캐스트 처리. 결과 row 는 CloudNodeRow 로 받음.
 *
 * 청크 1~3 까지의 SQL 만으로 모든 메타 CRUD 동작 가능.
 * 파일 binary 업로드/다운로드는 청크 4(Storage) 후 별도 함수로 추가.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  rowToCloudNode,
  type CloudNode,
  type CloudNodeRow,
  type CloudFileType,
} from '@/types/cloud';

const TABLE = 'cloud_nodes';

/** types 미재생성 우회용 임시 가드 — eslint 경고 캡슐화. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cloudTable = () => (supabase as any).from(TABLE);

// ─────────────────────────────────────────────
// 조회
// ─────────────────────────────────────────────

/** 특정 폴더 안의 살아있는 노드 (folder 먼저, 그 다음 file은 최근수정 순). */
export async function fetchAliveChildren(
  ownerId: string,
  parentFolderId: string | null,
): Promise<CloudNode[]> {
  let q = cloudTable()
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null);
  q = parentFolderId === null
    ? q.is('parent_folder_id', null)
    : q.eq('parent_folder_id', parentFolderId);
  // folder=true 가 먼저 오도록 kind 내림차순 정렬 ('folder' > 'file' 알파벳)
  q = q.order('kind', { ascending: true }).order('updated_at', { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as CloudNodeRow[]).map(rowToCloudNode);
}

/** 별표한 항목 전체 (deleted 제외). */
export async function fetchStarred(ownerId: string): Promise<CloudNode[]> {
  const { data, error } = await cloudTable()
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .eq('starred', true)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CloudNodeRow[]).map(rowToCloudNode);
}

/** 휴지통 (deleted_at IS NOT NULL). */
export async function fetchTrash(ownerId: string): Promise<CloudNode[]> {
  const { data, error } = await cloudTable()
    .select('*')
    .eq('owner_id', ownerId)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as CloudNodeRow[]).map(rowToCloudNode);
}

/** 최근 수정 (전체 폴더 가로질러, 30일·20개 제한). */
export async function fetchRecent(ownerId: string, limit = 20): Promise<CloudNode[]> {
  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await cloudTable()
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .eq('kind', 'file')
    .gte('updated_at', sinceIso)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as CloudNodeRow[]).map(rowToCloudNode);
}

/** 단일 노드 조회. 검색 결과의 부모 폴더 가져오기 등에 사용. */
export async function fetchNode(id: string): Promise<CloudNode | null> {
  const { data, error } = await cloudTable()
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToCloudNode(data as CloudNodeRow) : null;
}

/** 이름 검색 (살아있는 파일·폴더만, ILIKE 부분 일치). */
export async function searchByName(
  ownerId: string,
  query: string,
  limit = 30,
): Promise<CloudNode[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  // ILIKE 와일드카드 이스케이프 (% _ \)
  const safe = trimmed.replace(/[\\%_]/g, (m) => `\\${m}`);
  const { data, error } = await cloudTable()
    .select('*')
    .eq('owner_id', ownerId)
    .is('deleted_at', null)
    .ilike('name', `%${safe}%`)
    .order('kind', { ascending: true })
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as CloudNodeRow[]).map(rowToCloudNode);
}

/** 사이드바 카운트 (별표·휴지통). */
export async function fetchCounts(ownerId: string): Promise<{ starred: number; trash: number }> {
  const [starredRes, trashRes] = await Promise.all([
    cloudTable()
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .is('deleted_at', null)
      .eq('starred', true),
    cloudTable()
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', ownerId)
      .not('deleted_at', 'is', null),
  ]);
  return {
    starred: (starredRes.count as number | null) ?? 0,
    trash: (trashRes.count as number | null) ?? 0,
  };
}

// ─────────────────────────────────────────────
// 생성
// ─────────────────────────────────────────────

export async function createFolder(
  ownerId: string,
  name: string,
  parentFolderId: string | null,
): Promise<CloudNode> {
  const { data, error } = await cloudTable()
    .insert({
      owner_id: ownerId,
      parent_folder_id: parentFolderId,
      kind: 'folder',
      name,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCloudNode(data as CloudNodeRow);
}

/** 빈 파일 row 생성 (Storage 비어있음). */
export async function createEmptyFile(
  ownerId: string,
  name: string,
  fileType: CloudFileType,
  parentFolderId: string | null,
): Promise<CloudNode> {
  const { data, error } = await cloudTable()
    .insert({
      owner_id: ownerId,
      parent_folder_id: parentFolderId,
      kind: 'file',
      name,
      file_type: fileType,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCloudNode(data as CloudNodeRow);
}

// ─────────────────────────────────────────────
// 수정
// ─────────────────────────────────────────────

export async function renameNode(id: string, name: string): Promise<void> {
  const { error } = await cloudTable().update({ name }).eq('id', id);
  if (error) throw error;
}

export async function moveNode(id: string, parentFolderId: string | null): Promise<void> {
  const { error } = await cloudTable().update({ parent_folder_id: parentFolderId }).eq('id', id);
  if (error) throw error;
}

export async function setStarred(id: string, starred: boolean): Promise<void> {
  const { error } = await cloudTable().update({ starred }).eq('id', id);
  if (error) throw error;
}

/** 에디터에서 본문/제목 동시 저장 (자동저장용). */
export async function updateFileBody(
  id: string,
  patch: { name?: string; meta?: Record<string, unknown> },
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (patch.name !== undefined) payload.name = patch.name;
  if (patch.meta !== undefined) payload.meta = patch.meta;
  if (Object.keys(payload).length === 0) return;
  const { error } = await cloudTable().update(payload).eq('id', id);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// 삭제 (휴지통 → 영구)
// ─────────────────────────────────────────────

export async function moveToTrash(id: string): Promise<void> {
  const { error } = await cloudTable()
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function restoreFromTrash(id: string): Promise<void> {
  const { error } = await cloudTable().update({ deleted_at: null }).eq('id', id);
  if (error) throw error;
}

export async function permanentDelete(id: string): Promise<void> {
  const { error } = await cloudTable().delete().eq('id', id);
  if (error) throw error;
}
