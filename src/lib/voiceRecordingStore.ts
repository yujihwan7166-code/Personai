/**
 * AI 어시스턴트 - 음성 분석 모듈의 저장소.
 * - 오디오 blob: IndexedDB ('voiceBlobs' DB)
 * - 메타/전사/요약/챕터/액션: Supabase (voice_recordings)
 * - 월 사용량: Supabase (voice_usage)
 *
 * 참고: voice_recordings / voice_usage 는 신규 테이블이므로 integrations/supabase/types.ts
 *       (자동 생성) 에 아직 반영되지 않음. 이를 위해 typed 래퍼를 통해 generic Supabase
 *       client 로 우회해서 접근한다. 마이그레이션 후 types.ts 재생성 시 래퍼를 제거해도 됨.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  VoiceRecording,
  VoiceUsage,
  VoiceRecordingStatus,
  VoiceTranscriptSegment,
  VoiceChapter,
  VoiceActionItem,
} from '@/types/voiceAnalysis';
import { MONTHLY_FREE_SECONDS, currentYearMonthKST } from '@/types/voiceAnalysis';

/* ───────────────────── IndexedDB: 오디오 blob ───────────────────── */

const DB_NAME = 'voiceBlobs';
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

interface StoredAudio {
  id: string;
  blob: Blob;
  mimeType: string;
  size: number;
  createdAt: number;
}

export async function putAudioBlob(blob: Blob, mimeType: string): Promise<string> {
  const id = `vr-audio-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put({ id, blob, mimeType, size: blob.size, createdAt: Date.now() } satisfies StoredAudio);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  return id;
}

export async function getAudioBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise<Blob | null>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).get(id);
    req.onsuccess = () => resolve((req.result as StoredAudio | undefined)?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function getAudioObjectURL(id: string): Promise<string | null> {
  const blob = await getAudioBlob(id);
  return blob ? URL.createObjectURL(blob) : null;
}

export async function deleteAudioBlob(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

/* ───────────────────── Supabase: untyped 래퍼 ─────────────────────
 * integrations/supabase/types.ts 에 아직 voice_* 테이블이 없어
 * 제네릭 Database 의 Tables 타입 교차로 호출이 막힘.
 * any 캐스트 1회로 통일해서 사용하고, 리턴 타입은 내부에서 명시적 row 타입으로 좁힌다.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supa = supabase as unknown as any;

interface VoiceRecordingRow {
  id: string;
  user_id: string;
  title: string;
  audio_blob_ref: string | null;
  mime_type: string | null;
  duration_sec: number;
  transcript: VoiceTranscriptSegment[] | null;
  summary: string | null;
  chapters: VoiceChapter[] | null;
  action_items: VoiceActionItem[] | null;
  status: VoiceRecordingStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function rowToRecording(row: VoiceRecordingRow): VoiceRecording {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title ?? '',
    audioBlobRef: row.audio_blob_ref ?? undefined,
    mimeType: row.mime_type ?? undefined,
    durationSec: row.duration_sec ?? 0,
    transcript: row.transcript ?? [],
    summary: row.summary ?? '',
    chapters: row.chapters ?? [],
    actionItems: row.action_items ?? [],
    status: row.status,
    errorMessage: row.error_message ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

export async function listRecordings(userId: string): Promise<VoiceRecording[]> {
  const { data, error } = await supa
    .from('voice_recordings')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return ((data ?? []) as VoiceRecordingRow[]).map(rowToRecording);
}

export async function getRecording(id: string): Promise<VoiceRecording | null> {
  const { data, error } = await supa
    .from('voice_recordings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToRecording(data as VoiceRecordingRow) : null;
}

export async function createRecording(input: {
  userId: string;
  title: string;
  audioBlobRef: string;
  mimeType: string;
  durationSec: number;
}): Promise<VoiceRecording> {
  const { data, error } = await supa
    .from('voice_recordings')
    .insert({
      user_id: input.userId,
      title: input.title,
      audio_blob_ref: input.audioBlobRef,
      mime_type: input.mimeType,
      duration_sec: Math.round(input.durationSec),
      transcript: [],
      summary: '',
      chapters: [],
      action_items: [],
      status: 'transcribing' as VoiceRecordingStatus,
    })
    .select()
    .single();
  if (error) throw error;
  return rowToRecording(data as VoiceRecordingRow);
}

export async function updateRecording(
  id: string,
  patch: Partial<{
    title: string;
    transcript: VoiceTranscriptSegment[];
    summary: string;
    chapters: VoiceChapter[];
    actionItems: VoiceActionItem[];
    status: VoiceRecordingStatus;
    errorMessage: string | null;
  }>,
): Promise<VoiceRecording> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.transcript !== undefined) row.transcript = patch.transcript;
  if (patch.summary !== undefined) row.summary = patch.summary;
  if (patch.chapters !== undefined) row.chapters = patch.chapters;
  if (patch.actionItems !== undefined) row.action_items = patch.actionItems;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  row.updated_at = new Date().toISOString();

  const { data, error } = await supa
    .from('voice_recordings')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return rowToRecording(data as VoiceRecordingRow);
}

export async function deleteRecording(id: string): Promise<void> {
  const existing = await getRecording(id);
  if (existing?.audioBlobRef) {
    await deleteAudioBlob(existing.audioBlobRef).catch(() => {
      /* IndexedDB 삭제 실패는 무시 (메타만 지우면 UI 상 사라짐) */
    });
  }
  const { error } = await supa.from('voice_recordings').delete().eq('id', id);
  if (error) throw error;
}

/* ───────────────────── Supabase: 월 사용량 ───────────────────── */

interface VoiceUsageRow {
  user_id: string;
  year_month: string;
  seconds_used: number;
}

function rowToUsage(row: VoiceUsageRow): VoiceUsage {
  return { userId: row.user_id, yearMonth: row.year_month, secondsUsed: row.seconds_used };
}

export async function getMonthlyUsage(userId: string): Promise<VoiceUsage> {
  const ym = currentYearMonthKST();
  const { data, error } = await supa
    .from('voice_usage')
    .select('*')
    .eq('user_id', userId)
    .eq('year_month', ym)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { userId, yearMonth: ym, secondsUsed: 0 };
  return rowToUsage(data as VoiceUsageRow);
}

export async function addUsageSeconds(userId: string, seconds: number): Promise<void> {
  if (seconds <= 0) return;
  const ym = currentYearMonthKST();
  const current = await getMonthlyUsage(userId);
  const next = Math.round(current.secondsUsed + seconds);
  const { error } = await supa
    .from('voice_usage')
    .upsert(
      { user_id: userId, year_month: ym, seconds_used: next },
      { onConflict: 'user_id,year_month' },
    );
  if (error) throw error;
}

/**
 * 요청한 녹음 길이(초)가 이번 달 한도 안에 들어가는지 체크.
 */
export async function canUseSeconds(
  userId: string,
  requestedSec: number,
): Promise<{ ok: boolean; usedSec: number; remainingSec: number; allowedSec: number }> {
  const usage = await getMonthlyUsage(userId);
  const remaining = Math.max(0, MONTHLY_FREE_SECONDS - usage.secondsUsed);
  const allowed = Math.max(0, Math.min(requestedSec, remaining));
  return {
    ok: allowed >= requestedSec && requestedSec > 0,
    usedSec: usage.secondsUsed,
    remainingSec: remaining,
    allowedSec: allowed,
  };
}
