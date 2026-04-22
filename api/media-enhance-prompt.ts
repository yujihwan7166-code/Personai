import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

/**
 * 사용자가 쓴 짧은/모호한 프롬프트를 이미지/동영상 생성에 적합한 상세 프롬프트로 재작성.
 * 한국어 입력 → 한국어 + 영어 키워드 혼합 프롬프트 반환.
 */

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

interface ReqBody {
  prompt?: string;
  kind?: 'image' | 'video';
  style?: string;
}

const SYSTEM_PROMPT_IMAGE = `당신은 이미지 생성 프롬프트 엔지니어입니다.
사용자의 짧거나 모호한 프롬프트를 받아 시각적으로 풍부한 생성 프롬프트로 재작성합니다.

규칙:
- 한국어 핵심 주제 + 영어 품질 키워드 혼합
- 피사체·배경·조명·구도·분위기·색감 중 누락된 요소를 구체적으로 보강
- 길이는 1~3 문장 (과도하게 길지 않게)
- "masterpiece" 같은 클리셰 단어 남용 금지
- 응답은 개선된 프롬프트 한 줄만. 설명·따옴표·인사말 금지.`;

const SYSTEM_PROMPT_VIDEO = `당신은 동영상 생성 프롬프트 엔지니어입니다.
사용자의 짧거나 모호한 프롬프트를 받아 5초 분량의 동영상 생성에 적합한 상세 프롬프트로 재작성합니다.

규칙:
- 한국어 핵심 주제 + 영어 품질 키워드 혼합
- 카메라 움직임(slow pan, dolly-in, orbit 등), 조명, 분위기를 명시
- 5초 안에 담기는 자연스러운 모션 1~2가지로 한정
- 응답은 개선된 프롬프트 한 줄만. 설명·따옴표·인사말 금지.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(501).json({ error: 'OPENROUTER_API_KEY가 설정되지 않았어요.' });
  }

  const { prompt, kind, style } = (req.body || {}) as ReqBody;
  const trimmed = typeof prompt === 'string' ? prompt.trim() : '';
  if (!trimmed) return res.status(400).json({ error: '프롬프트가 비어 있어요.' });

  const systemPrompt = kind === 'video' ? SYSTEM_PROMPT_VIDEO : SYSTEM_PROMPT_IMAGE;
  const styleHint = style && style !== 'none' ? `\n\n[참고] 사용자가 선택한 스타일: ${style}` : '';

  try {
    const r = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `원본 프롬프트: "${trimmed}"${styleHint}\n\n재작성된 프롬프트:` },
        ],
        temperature: 0.7,
        max_tokens: 400,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t || '프롬프트 개선 실패' });
    }
    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = data.choices?.[0]?.message?.content ?? '';
    const enhanced = raw.trim().replace(/^["'`]+|["'`]+$/g, '').replace(/^재작성된 프롬프트:\s*/i, '');

    if (!enhanced) {
      return res.status(502).json({ error: '개선된 프롬프트를 받지 못했어요.' });
    }
    return res.status(200).json({ original: trimmed, enhanced });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : '오류' });
  }
}
