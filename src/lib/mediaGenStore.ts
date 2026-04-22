/**
 * AI 어시스턴트 - 이미지·동영상 생성 저장소.
 * - 이미지 blob: IndexedDB ('mediaBlobs' DB)
 * - 메타: Supabase (media_items)
 * - 월 사용량: Supabase (media_usage)
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  MediaItem,
  MediaKind,
  MediaAspectRatio,
  MediaStatus,
  MediaUsage,
  ImageStylePreset,
} from '@/types/mediaGen';
import {
  MONTHLY_IMAGE_LIMIT,
  MONTHLY_VIDEO_SEC_LIMIT,
  currentYearMonthKST,
} from '@/types/mediaGen';

/* ───────────────────── IndexedDB: 이미지 blob ───────────────────── */

const DB_NAME = 'mediaBlobs';
const STORE = 'blobs';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB 를 사용할 수 없는 환경입니다.'));
  }
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
  return dbPromise;
}

interface StoredBlob {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

export async function putMediaBlob(blob: Blob, mimeType: string): Promise<string> {
  const id = `mb-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put({ id, blob, mimeType, size: blob.size, createdAt: Date.now() } satisfies StoredBlob);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return id;
}

export async function getMediaBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredBlob | undefined)?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getMediaObjectURL(id: string): Promise<string | null> {
  const blob = await getMediaBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteMediaBlob(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/* ───────────────────── Supabase: untyped 래퍼 ───────────────────── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as unknown as any;

interface MediaItemRow {
  id: string;
  user_id: string;
  kind: MediaKind;
  prompt: string;
  style: string | null;
  aspect_ratio: MediaAspectRatio;
  status: MediaStatus;
  blob_ref: string | null;
  result_url: string | null;
  thumbnail_url: string | null;
  mime_type: string | null;
  duration_sec: number | null;
  model: string | null;
  error_message: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToItem(row: MediaItemRow): MediaItem {
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    prompt: row.prompt ?? '',
    style: (row.style as ImageStylePreset | null) ?? undefined,
    aspectRatio: row.aspect_ratio,
    status: row.status,
    blobRef: row.blob_ref ?? undefined,
    resultUrl: row.result_url ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    mimeType: row.mime_type ?? undefined,
    durationSec: row.duration_sec ?? undefined,
    model: row.model ?? undefined,
    errorMessage: row.error_message ?? undefined,
    jobId: row.job_id ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listMediaItems(userId: string): Promise<MediaItem[]> {
  const { data, error } = await supa
    .from('media_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as MediaItemRow[]).map(rowToItem);
}

export async function getMediaItem(id: string): Promise<MediaItem | null> {
  const { data, error } = await supa
    .from('media_items')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToItem(data as MediaItemRow) : null;
}

export async function createMediaItem(input: {
  userId: string;
  kind: MediaKind;
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio: MediaAspectRatio;
  status?: MediaStatus;
  model?: string;
  durationSec?: number;
  blobRef?: string;
  resultUrl?: string;
  thumbnailUrl?: string;
  mimeType?: string;
  jobId?: string;
}): Promise<MediaItem> {
  const { data, error } = await supa
    .from('media_items')
    .insert({
      user_id: input.userId,
      kind: input.kind,
      prompt: input.prompt,
      style: input.style ?? null,
      aspect_ratio: input.aspectRatio,
      status: input.status ?? 'generating',
      blob_ref: input.blobRef ?? null,
      result_url: input.resultUrl ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      mime_type: input.mimeType ?? null,
      duration_sec: input.durationSec ?? null,
      model: input.model ?? null,
      job_id: input.jobId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToItem(data as MediaItemRow);
}

export async function updateMediaItem(
  id: string,
  patch: Partial<{
    status: MediaStatus;
    blobRef: string | null;
    resultUrl: string | null;
    thumbnailUrl: string | null;
    mimeType: string | null;
    durationSec: number | null;
    model: string | null;
    errorMessage: string | null;
    jobId: string | null;
  }>,
): Promise<MediaItem> {
  const row: Record<string, unknown> = {};
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.blobRef !== undefined) row.blob_ref = patch.blobRef;
  if (patch.resultUrl !== undefined) row.result_url = patch.resultUrl;
  if (patch.thumbnailUrl !== undefined) row.thumbnail_url = patch.thumbnailUrl;
  if (patch.mimeType !== undefined) row.mime_type = patch.mimeType;
  if (patch.durationSec !== undefined) row.duration_sec = patch.durationSec;
  if (patch.model !== undefined) row.model = patch.model;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.jobId !== undefined) row.job_id = patch.jobId;
  row.updated_at = new Date().toISOString();

  const { data, error } = await supa
    .from('media_items')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToItem(data as MediaItemRow);
}

export async function deleteMediaItem(id: string): Promise<void> {
  const existing = await getMediaItem(id);
  if (existing?.blobRef) {
    await deleteMediaBlob(existing.blobRef).catch(() => {
      /* 실패 무시 */
    });
  }
  const { error } = await supa.from('media_items').delete().eq('id', id);
  if (error) throw error;
}

/* ───────────────────── Supabase: 월 사용량 ───────────────────── */

interface MediaUsageRow {
  user_id: string;
  year_month: string;
  images_used: number;
  video_seconds_used: number;
}

function rowToUsage(row: MediaUsageRow): MediaUsage {
  return {
    userId: row.user_id,
    yearMonth: row.year_month,
    imagesUsed: row.images_used ?? 0,
    videoSecondsUsed: row.video_seconds_used ?? 0,
  };
}

export async function getMonthlyMediaUsage(userId: string): Promise<MediaUsage> {
  const ym = currentYearMonthKST();
  const { data, error } = await supa
    .from('media_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', ym)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { userId, yearMonth: ym, imagesUsed: 0, videoSecondsUsed: 0 };
  return rowToUsage(data as MediaUsageRow);
}

async function upsertUsage(userId: string, images: number, videoSeconds: number): Promise<void> {
  const ym = currentYearMonthKST();
  const current = await getMonthlyMediaUsage(userId);
  const nextImages = Math.max(0, current.imagesUsed + images);
  const nextVideo = Math.max(0, current.videoSecondsUsed + videoSeconds);
  const { error } = await supa
    .from('media_usage')
    .upsert(
      {
        user_id: userId,
        year_month: ym,
        images_used: nextImages,
        video_seconds_used: nextVideo,
      },
      { onConflict: 'user_id,year_month' },
    );
  if (error) throw error;
}

export async function addImageUsage(userId: string, count: number): Promise<void> {
  if (count <= 0) return;
  await upsertUsage(userId, count, 0);
}

export async function addVideoSecondsUsage(userId: string, sec: number): Promise<void> {
  if (sec <= 0) return;
  await upsertUsage(userId, 0, Math.round(sec));
}

export async function canGenerateImages(
  userId: string,
  count: number,
): Promise<{ ok: boolean; remaining: number }> {
  const u = await getMonthlyMediaUsage(userId);
  const remaining = Math.max(0, MONTHLY_IMAGE_LIMIT - u.imagesUsed);
  return { ok: count <= remaining && count > 0, remaining };
}

export async function canGenerateVideoSeconds(
  userId: string,
  sec: number,
): Promise<{ ok: boolean; remaining: number }> {
  const u = await getMonthlyMediaUsage(userId);
  const remaining = Math.max(0, MONTHLY_VIDEO_SEC_LIMIT - u.videoSecondsUsed);
  return { ok: sec <= remaining && sec > 0, remaining };
}
