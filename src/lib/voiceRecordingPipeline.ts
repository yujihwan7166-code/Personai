/**
 * 오디오 blob → 전사 → 분석 → 저장 파이프라인.
 * 이 함수를 녹음 종료/파일 업로드 직후 호출하면 상태가 자동으로 업데이트됨.
 */

import {
  createRecording,
  updateRecording,
  putAudioBlob,
  addUsageSeconds,
} from '@/lib/voiceRecordingStore';
import type {
  VoiceRecording,
  VoiceTranscriptSegment,
  VoiceChapter,
  VoiceActionItem,
} from '@/types/voiceAnalysis';

interface TranscribeResponse {
  text?: string;
  duration?: number | null;
  segments?: VoiceTranscriptSegment[];
  error?: string;
}

interface AnalyzeResponse {
  title?: string;
  summary?: string;
  chapters?: VoiceChapter[];
  actionItems?: VoiceActionItem[];
  error?: string;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function callTranscribe(blob: Blob): Promise<TranscribeResponse> {
  const audioBase64 = await blobToBase64(blob);
  const r = await fetch('/api/voice-transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audioBase64, mimeType: blob.type || 'audio/webm' }),
  });
  const data = (await r.json().catch(() => ({}))) as TranscribeResponse;
  if (!r.ok) throw new Error(data.error || '전사에 실패했어요.');
  return data;
}

async function callAnalyze(
  segments: VoiceTranscriptSegment[],
  durationSec: number,
): Promise<AnalyzeResponse> {
  const r = await fetch('/api/voice-analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ segments, durationSec }),
  });
  const data = (await r.json().catch(() => ({}))) as AnalyzeResponse;
  if (!r.ok) throw new Error(data.error || '분석에 실패했어요.');
  return data;
}

export interface RunPipelineInput {
  userId: string;
  audioBlob: Blob;
  /** 미리 계산한 길이(초). 모를 경우 전사 결과 duration 사용. */
  estimatedDurationSec: number;
  /** 임시 제목(전사 전). 분석 완료 후 자동 제목으로 대체됨. */
  provisionalTitle?: string;
  /** 단계별 상태 콜백 (UI 표시용). */
  onProgress?: (rec: VoiceRecording) => void;
}

/**
 * 전체 파이프라인 실행.
 * - blob IndexedDB 저장
 * - Supabase 메타 insert (status: transcribing)
 * - /api/voice-transcribe 호출 → transcript 저장 (status: analyzing)
 * - /api/voice-analyze 호출 → 제목/요약/챕터/액션 저장 (status: ready)
 * - 사용량 카운터에 실제 duration 초 추가
 * - 실패 시 status: 'error' + errorMessage 저장
 */
export async function runVoicePipeline(input: RunPipelineInput): Promise<VoiceRecording> {
  const { userId, audioBlob, estimatedDurationSec, provisionalTitle, onProgress } = input;

  // 1) IndexedDB에 blob 저장
  const audioBlobRef = await putAudioBlob(audioBlob, audioBlob.type || 'audio/webm');

  // 2) 메타 insert
  let rec = await createRecording({
    userId,
    title: provisionalTitle || '새 녹음',
    audioBlobRef,
    mimeType: audioBlob.type || 'audio/webm',
    durationSec: Math.max(0, estimatedDurationSec),
  });
  onProgress?.(rec);

  try {
    // 3) 전사
    const transcribe = await callTranscribe(audioBlob);
    const segments = (transcribe.segments ?? []).filter((s) => s.text && s.end >= s.start);
    const actualDuration = Number(transcribe.duration) || estimatedDurationSec || (segments.at(-1)?.end ?? 0);

    rec = await updateRecording(rec.id, {
      transcript: segments,
      status: 'analyzing',
    });
    onProgress?.(rec);

    if (segments.length === 0) {
      // 전사 결과가 비어있으면 분석 스킵
      rec = await updateRecording(rec.id, {
        title: provisionalTitle || '빈 녹음',
        summary: '음성이 감지되지 않았어요.',
        chapters: [],
        actionItems: [],
        status: 'ready',
      });
      onProgress?.(rec);
      await addUsageSeconds(userId, actualDuration).catch(() => {});
      return rec;
    }

    // 4) 분석
    const analyze = await callAnalyze(segments, actualDuration);
    const finalTitle = (analyze.title || '').trim() || provisionalTitle || '녹음';
    const summary = (analyze.summary || '').trim();
    const chapters = analyze.chapters ?? [];
    const actionItems = analyze.actionItems ?? [];

    rec = await updateRecording(rec.id, {
      title: finalTitle,
      summary,
      chapters,
      actionItems,
      status: 'ready',
    });
    onProgress?.(rec);

    // 5) 사용량 기록
    await addUsageSeconds(userId, actualDuration).catch(() => {});

    return rec;
  } catch (err) {
    const msg = err instanceof Error ? err.message : '처리 중 오류가 발생했어요.';
    rec = await updateRecording(rec.id, { status: 'error', errorMessage: msg }).catch(() => rec);
    onProgress?.(rec);
    throw err;
  }
}
