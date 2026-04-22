import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getOpenRouterApiKey, getOpenRouterHeaders } from './_lib/openrouter.js';

/**
 * 동영상 생성 job 상태 조회.
 * OpenRouter /api/v1/videos/{jobId}
 */

const VIDEO_API_URL = 'https://openrouter.ai/api/v1/videos';

interface StatusResponse {
  id?: string;
  status?: 'queued' | 'generating' | 'processing' | 'completed' | 'ready' | 'failed' | 'error';
  video?: { url?: string };
  thumbnail?: { url?: string };
  video_url?: string;
  thumbnail_url?: string;
  output?: { url?: string; thumbnail_url?: string };
  error?: { message?: string } | string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(501).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }

  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : '';
  if (!jobId) return res.status(400).json({ error: 'jobId가 필요해요.' });

  try {
    const r = await fetch(`${VIDEO_API_URL}/${encodeURIComponent(jobId)}`, {
      method: 'GET',
      headers: getOpenRouterHeaders(apiKey),
    });
    const data = (await r.json().catch(() => ({}))) as StatusResponse;
    if (!r.ok) {
      const errMsg =
        typeof data.error === 'string'
          ? data.error
          : data.error?.message || `상태 조회 실패 (${r.status})`;
      return res.status(r.status).json({ error: errMsg });
    }

    // OpenRouter의 스키마 변화 대응 — 여러 위치에서 URL 추출
    const videoUrl = data.video?.url || data.video_url || data.output?.url || '';
    const thumbnailUrl = data.thumbnail?.url || data.thumbnail_url || data.output?.thumbnail_url || '';

    const raw = (data.status || '').toLowerCase();
    const normalized: 'queued' | 'generating' | 'ready' | 'error' =
      raw === 'ready' || raw === 'completed'
        ? 'ready'
        : raw === 'failed' || raw === 'error'
        ? 'error'
        : raw === 'queued'
        ? 'queued'
        : 'generating';

    return res.status(200).json({
      status: normalized,
      videoUrl: normalized === 'ready' ? videoUrl : '',
      thumbnailUrl: thumbnailUrl || '',
      errorMessage:
        normalized === 'error'
          ? typeof data.error === 'string'
            ? data.error
            : data.error?.message || '동영상 생성에 실패했어요.'
          : undefined,
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : '상태 조회 오류' });
  }
}
