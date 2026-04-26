/**
 * Vision LLM PDF 페이지 추출.
 *
 * 입력: PDF 페이지를 JPEG dataURL 로 렌더한 이미지 1~8장
 * 출력: 페이지별 마크다운 텍스트 (본문 + 그림 라벨 + 화살표 관계 + 표 구조)
 *
 * Tesseract OCR 만으론 그림 안 라벨·다이어그램 관계를 못 잡는다 → vision LLM 으로 보강.
 * 페이지별 직렬 호출 (배치 응답 정합성·debug 용이성 우선).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  OPENROUTER_API_URL,
  extractOpenRouterText,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

interface VisionRequestImage {
  page: number;
  /** data:image/jpeg;base64,... 형태 */
  dataUrl: string;
}

interface VisionRequestBody {
  images: VisionRequestImage[];
  /** 모델 override. 기본은 OPENROUTER_VISION_MODEL env. */
  model?: string;
}

interface VisionPageResult {
  page: number;
  text: string;
  error?: string;
}

const DEFAULT_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.5-flash';
const MAX_IMAGES_PER_REQUEST = 8;

const VISION_PROMPT = `이 페이지는 강의·문서 슬라이드입니다. 페이지에 보이는 모든 텍스트와 그림 정보를 빠짐없이 추출해주세요.

추출 항목:
1. **본문 텍스트** — 보이는 그대로 (제목·목차·문단·각주)
2. **그림·다이어그램의 모든 라벨** — 한국어·영어 그대로 보존
3. **화살표·연결선이 표현하는 관계** — 자연어로 풀어 설명 (예: "간동맥은 간으로 30-40% 혈류 공급")
4. **표** — 행·열 구조를 마크다운 표로 보존
5. **숫자·단위·고유명사** — 누락 없이

출력 형식:
- 마크다운
- 한국어와 영어가 섞여 있으면 그대로 보존
- 추측·설명·요약 금지 (보이는 그대로만)
- 불필요한 머릿말("이 페이지는 ~ 입니다") 금지`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as VisionRequestBody | undefined;
  if (!body?.images || !Array.isArray(body.images) || body.images.length === 0) {
    return res.status(400).json({ error: '이미지가 없습니다' });
  }
  if (body.images.length > MAX_IMAGES_PER_REQUEST) {
    return res.status(400).json({ error: `한 번에 최대 ${MAX_IMAGES_PER_REQUEST}장까지` });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENROUTER_API_KEY 미설정' });
  }

  const model = body.model || DEFAULT_VISION_MODEL;
  const results: VisionPageResult[] = [];

  // 페이지별 직렬 호출 — vision LLM 은 한 번에 한 이미지 처리가 가장 정확
  for (const img of body.images) {
    if (typeof img.page !== 'number' || typeof img.dataUrl !== 'string' || !img.dataUrl.startsWith('data:image/')) {
      results.push({ page: img.page, text: '', error: '잘못된 이미지' });
      continue;
    }
    try {
      const orRes = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: getOpenRouterHeaders(apiKey),
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: VISION_PROMPT },
                { type: 'image_url', image_url: { url: img.dataUrl } },
              ],
            },
          ],
          // 안정성·재현성: temperature 낮게
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (!orRes.ok) {
        const detail = await orRes.text().catch(() => '');
        results.push({
          page: img.page,
          text: '',
          error: `vision API ${orRes.status}: ${detail.slice(0, 200)}`,
        });
        continue;
      }

      const payload = await orRes.json();
      const text = extractOpenRouterText(payload).trim();
      results.push({ page: img.page, text });
    } catch (e) {
      results.push({
        page: img.page,
        text: '',
        error: e instanceof Error ? e.message : 'unknown',
      });
    }
  }

  return res.status(200).json({ results, model });
}
