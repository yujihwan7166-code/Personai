import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  OPENROUTER_API_URL,
  getOpenRouterApiKey,
  getOpenRouterHeaders,
} from './_lib/openrouter.js';

/**
 * 음성 분석: 전사 결과 → {title, summary, chapters, actionItems} 한 번에 생성.
 * JSON 모드 사용. 실패 시 fallback 텍스트로 파싱 시도.
 */

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

interface Segment {
  start: number;
  end: number;
  text: string;
}

interface ReqBody {
  segments?: Segment[];
  durationSec?: number;
}

interface AnalyzeResult {
  title: string;
  summary: string;
  chapters: Array<{ start: number; end: number; title: string }>;
  actionItems: Array<{ text: string; owner?: string; due?: string }>;
}

function buildMessages(segments: Segment[], durationSec: number) {
  const transcriptText = segments
    .map((s) => `[${Math.round(s.start)}s] ${s.text}`)
    .join('\n')
    .slice(0, 32000); // 토큰 폭주 방지

  const system = `당신은 음성 전사본을 분석해 구조화된 JSON을 반환하는 어시스턴트입니다.
반드시 아래 JSON 스키마만 출력하세요. 설명/서론/백틱 금지.

스키마:
{
  "title": string,           // 30자 이내 한국어 제목. 녹음 핵심을 압축.
  "summary": string,         // 2~3문장 한국어 요약. 중요한 결론부터.
  "chapters": [              // 3~7개 챕터. 녹음 전체를 시간 순으로 분할.
    { "start": number, "end": number, "title": string }  // 초 단위, 제목은 12자 내외
  ],
  "actionItems": [           // 해야 할 일/결정사항. 회의가 아니면 빈 배열.
    { "text": string, "owner"?: string, "due"?: string }
  ]
}

규칙:
- 모든 문자열은 한국어.
- chapters의 start/end는 반드시 실제 타임스탬프 범위 내에서 오름차순, 겹침 없음.
- 녹음이 너무 짧으면(1분 미만) chapters는 1~2개만.
- actionItems는 "무엇을 하기로 했는가" 명확한 것만. 없으면 빈 배열.`;

  const user = `녹음 길이: ${Math.round(durationSec)}초

전사:
${transcriptText}`;

  return { system, user };
}

function parseJsonSafely(text: string): AnalyzeResult | null {
  // 백틱/prefix/postfix 제거
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
  try {
    const obj = JSON.parse(cleaned) as unknown;
    if (!obj || typeof obj !== 'object') return null;
    const o = obj as Record<string, unknown>;
    const title = typeof o.title === 'string' ? o.title : '';
    const summary = typeof o.summary === 'string' ? o.summary : '';
    const chapters = Array.isArray(o.chapters)
      ? o.chapters
          .map((c) => {
            const cc = c as Record<string, unknown>;
            return {
              start: Number(cc.start) || 0,
              end: Number(cc.end) || 0,
              title: typeof cc.title === 'string' ? cc.title : '',
            };
          })
          .filter((c) => c.title && c.end >= c.start)
      : [];
    const actionItems = Array.isArray(o.actionItems)
      ? o.actionItems
          .map((a) => {
            const aa = a as Record<string, unknown>;
            return {
              text: typeof aa.text === 'string' ? aa.text : '',
              owner: typeof aa.owner === 'string' ? aa.owner : undefined,
              due: typeof aa.due === 'string' ? aa.due : undefined,
            };
          })
          .filter((a) => a.text)
      : [];
    return { title, summary, chapters, actionItems };
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return res.status(501).json({ error: '분석 서비스가 연결되지 않았어요. OPENROUTER_API_KEY를 설정해 주세요.' });
  }

  const { segments, durationSec } = (req.body || {}) as ReqBody;
  if (!Array.isArray(segments) || segments.length === 0) {
    return res.status(400).json({ error: '전사 세그먼트가 비어 있어요.' });
  }
  const dur = Number.isFinite(durationSec) ? Math.max(0, Number(durationSec)) : segments[segments.length - 1]?.end ?? 0;

  const { system, user } = buildMessages(segments, dur);

  try {
    const r = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: getOpenRouterHeaders(apiKey),
      body: JSON.stringify({
        model: DEFAULT_OPENROUTER_TEXT_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return res.status(r.status).json({ error: t || '분석 실패' });
    }
    const data = (await r.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseJsonSafely(content);
    if (!parsed) {
      return res.status(500).json({ error: '분석 결과를 해석하지 못했어요.', raw: content });
    }
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : '오류' });
  }
}
