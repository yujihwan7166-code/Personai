/**
 * 이미지·동영상 생성 파이프라인.
 * - 이미지: /api/general-image (동기) → base64 → blob → Supabase
 * - 동영상: /api/media-video-create (async) → polling /api/media-video-status
 */

import {
  createMediaItem,
  updateMediaItem,
  putMediaBlob,
  addImageUsage,
  addVideoSecondsUsage,
} from '@/lib/mediaGenStore';
import type {
  MediaItem,
  MediaAspectRatio,
  ImageStylePreset,
} from '@/types/mediaGen';
import { IMAGE_STYLE_LABELS, VIDEO_CLIP_LENGTH_SEC } from '@/types/mediaGen';

interface GeneralImageResponse {
  mode?: string;
  text?: string;
  images?: Array<{ mimeType?: string; data?: string; url?: string }>;
  aspectRatio?: string;
  sourceModel?: string;
  error?: string;
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function buildImagePrompt(prompt: string, style?: ImageStylePreset): string {
  if (!style || style === 'none') return prompt;
  const suffix = IMAGE_STYLE_LABELS[style]?.suffix || '';
  return suffix ? `${prompt}${suffix}` : prompt;
}

/* ───────────────────── 이미지 ───────────────────── */

export interface GenerateImagesInput {
  userId: string;
  prompt: string;
  style?: ImageStylePreset;
  aspectRatio: MediaAspectRatio;
  /** 1~4. 내부적으로 개수만큼 순차 호출(OpenRouter 단일 호출은 1장 기본) */
  count: number;
  onProgress?: (item: MediaItem) => void;
}

export async function generateImages(input: GenerateImagesInput): Promise<MediaItem[]> {
  const { userId, prompt, style, aspectRatio, count, onProgress } = input;
  const fullPrompt = buildImagePrompt(prompt, style);
  const created: MediaItem[] = [];

  for (let i = 0; i < count; i++) {
    // 1) 메타 먼저 insert (generating 상태) → 갤러리에 플레이스홀더 표시
    let item = await createMediaItem({
      userId,
      kind: 'image',
      prompt,
      style,
      aspectRatio,
      status: 'generating',
    });
    onProgress?.(item);

    try {
      const r = await fetch('/api/general-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          mode: 'generate',
          aspectRatio,
        }),
      });
      const data = (await r.json().catch(() => ({}))) as GeneralImageResponse;
      if (!r.ok || !data.images || data.images.length === 0) {
        throw new Error(data.error || '이미지 생성에 실패했어요.');
      }
      const img = data.images[0];
      const mimeType = img.mimeType || 'image/png';
      let blobRef: string | undefined;

      if (img.data) {
        const blob = base64ToBlob(img.data, mimeType);
        blobRef = await putMediaBlob(blob, mimeType);
      }

      item = await updateMediaItem(item.id, {
        status: 'ready',
        blobRef: blobRef ?? null,
        resultUrl: img.url ?? null,
        mimeType,
        model: data.sourceModel ?? null,
      });
      onProgress?.(item);
      created.push(item);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '이미지 생성에 실패했어요.';
      item = await updateMediaItem(item.id, { status: 'error', errorMessage: msg }).catch(() => item);
      onProgress?.(item);
      created.push(item);
    }
  }

  // 사용량: 성공 장수만큼만 차감
  const successCount = created.filter((c) => c.status === 'ready').length;
  if (successCount > 0) {
    await addImageUsage(userId, successCount).catch(() => {});
  }

  return created;
}

/* ───────────────────── 동영상 ───────────────────── */

interface VideoCreateResponse {
  jobId?: string;
  model?: string;
  status?: string;
  error?: string;
}

interface VideoStatusResponse {
  status?: 'queued' | 'generating' | 'ready' | 'error';
  videoUrl?: string;
  thumbnailUrl?: string;
  errorMessage?: string;
  error?: string;
}

export interface GenerateVideoInput {
  userId: string;
  prompt: string;
  aspectRatio: MediaAspectRatio;
  /** Image-to-video 첫 프레임 — 공개 URL 또는 data URL */
  sourceImageUrl?: string;
  /** Start+End 전환 영상용 끝 프레임 */
  endImageUrl?: string;
  durationSec?: number;
  onProgress?: (item: MediaItem) => void;
}

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_MS = 5 * 60 * 1000; // 5분

export async function generateVideo(input: GenerateVideoInput): Promise<MediaItem> {
  const { userId, prompt, aspectRatio, sourceImageUrl, endImageUrl, durationSec, onProgress } = input;
  const length = durationSec && durationSec > 0 ? durationSec : VIDEO_CLIP_LENGTH_SEC;

  // 1) 플레이스홀더 insert
  let item = await createMediaItem({
    userId,
    kind: 'video',
    prompt,
    aspectRatio,
    status: 'queued',
    durationSec: length,
  });
  onProgress?.(item);

  try {
    // 2) Job 제출 — Start + End Frame 지원 (Pika · Kling 패턴)
    const frames: Array<{ url: string; type: 'first_frame' | 'last_frame' }> = [];
    if (sourceImageUrl) frames.push({ url: sourceImageUrl, type: 'first_frame' });
    if (endImageUrl) frames.push({ url: endImageUrl, type: 'last_frame' });

    const createRes = await fetch('/api/media-video-create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        aspectRatio,
        durationSec: length,
        sourceImage: frames.length > 0 ? frames[0] : undefined, // 단일 호환
        frames: frames.length > 0 ? frames : undefined, // 신규 다중 프레임
      }),
    });
    const createData = (await createRes.json().catch(() => ({}))) as VideoCreateResponse;
    if (!createRes.ok || !createData.jobId) {
      throw new Error(createData.error || '동영상 job 생성 실패');
    }

    item = await updateMediaItem(item.id, {
      status: 'generating',
      jobId: createData.jobId,
      model: createData.model ?? null,
    });
    onProgress?.(item);

    // 3) Polling
    const startedAt = Date.now();
    while (Date.now() - startedAt < POLL_MAX_MS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const statusRes = await fetch(`/api/media-video-status?jobId=${encodeURIComponent(createData.jobId)}`);
      const statusData = (await statusRes.json().catch(() => ({}))) as VideoStatusResponse;
      if (!statusRes.ok) {
        throw new Error(statusData.error || '상태 조회 실패');
      }
      if (statusData.status === 'ready' && statusData.videoUrl) {
        item = await updateMediaItem(item.id, {
          status: 'ready',
          resultUrl: statusData.videoUrl,
          thumbnailUrl: statusData.thumbnailUrl ?? null,
          mimeType: 'video/mp4',
        });
        onProgress?.(item);
        await addVideoSecondsUsage(userId, length).catch(() => {});
        return item;
      }
      if (statusData.status === 'error') {
        throw new Error(statusData.errorMessage || '동영상 생성에 실패했어요.');
      }
      // queued/generating 상태면 계속 폴링
    }
    throw new Error('동영상 생성이 너무 오래 걸려 중단됐어요.');
  } catch (err) {
    const msg = err instanceof Error ? err.message : '동영상 생성에 실패했어요.';
    item = await updateMediaItem(item.id, { status: 'error', errorMessage: msg }).catch(() => item);
    onProgress?.(item);
    throw err;
  }
}
