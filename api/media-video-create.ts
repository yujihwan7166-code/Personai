import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOpenRouterApiKey, getOpenRouterHeaders } from './_lib/openrouter.js';

/**
 * 동영상 생성 job 제출 — OpenRouter /api/v1/videos.
 * 비동기: 여기선 jobId만 반환. 상태 조회는 /api/media-video-status.
 */

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

const VIDEO_API_URL = 'https://openrouter.ai/api/v1/videos';
const DEFAULT_VIDEO_MODEL = process.env.OPENROUTER_VIDEO_MODEL || 'google/veo-3.1-fast';

type AspectRatio = '1:1' | '16:9' | '9:16';

interface ReqBody {
  prompt?: string;
  aspectRatio?: AspectRatio;
  durationSec?: number;
  /** 단일 프레임 레거시 호환 */
  sourceImage?: { url?: string; type?: 'first_frame' | 'last_frame' };
  /** Start + End Frame 등 다중 프레임 */
  frames?: Array<{ url?: string; type?: 'first_frame' | 'last_frame' }>;
}

function normalizeAspect(a: string | undefined): AspectRatio {
  return a === '16:9' || a === '9:16' ? a : '1:1';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res
      .status(501)
      .json({ error: '동영상 생성 서비스가 아직 연결되지 않았어요. 서버에 OPENROUTER_API_KEY를 설정해 주세요.' });
  }

  const { prompt, aspectRatio, durationSec, sourceImage, frames } = (req.body || {}) as ReqBody;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: '프롬프트가 비어 있어요.' });
  }

  const body: Record<string, unknown> = {
    model: DEFAULT_VIDEO_MODEL,
    prompt: prompt.trim(),
    aspect_ratio: normalizeAspect(aspectRatio),
    duration_seconds: Number.isFinite(durationSec) && Number(durationSec) > 0 ? Number(durationSec) : 5,
  };

  // 다중 프레임 우선, 없으면 단일 sourceImage 호환
  const framesList = (frames && frames.length > 0)
    ? frames
    : (sourceImage?.url ? [{ url: sourceImage.url, type: sourceImage.type }] : []);

  if (framesList.length > 0) {
    body.frame_images = framesList
      .filter((f) => f.url)
      .map((f) => ({
        frame_type: f.type === 'last_frame' ? 'last_frame' : 'first_frame',
        image_url: { url: f.url! },
      }));
  }

  try {
    const r = await fetch(VIDEO_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify(body),
    });
    const data = (await r.json().catch(() => ({}))) as {
      id?: string;
      job_id?: string;
      error?: { message?: string } | string;
      status?: string;
    };
    if (!r.ok) {
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || `동영상 생성 요청이 실패했어요 (${r.status})`;
      return res.status(r.status).json({ error: errMsg });
    }
    const jobId = data.id || data.job_id || '';
    if (!jobId) {
      return res.status(502).json({ error: '동영상 생성 job id를 받지 못했어요.' });
    }
    return res.status(200).json({
      jobId,
      model: DEFAULT_VIDEO_MODEL,
      status: data.status || 'queued',
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : '동영상 생성 중 오류' });
  }
}
