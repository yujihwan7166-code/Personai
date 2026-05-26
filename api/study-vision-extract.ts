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
  blocks?: VisionTextBlock[];
  error?: string;
}

interface VisionTextBlock {
  text: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const DEFAULT_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || 'google/gemini-2.5-flash';
const MAX_IMAGES_PER_REQUEST = 8;
const MAX_LAYOUT_BLOCKS = 96;

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

const VISION_EXACT_PROMPT = `You are an exact OCR and document transcription engine for Korean study PDFs.

Goal:
- Transcribe every visible text fragment on the page as faithfully as possible.
- Preserve Korean, English, numbers, units, formulas, table labels, diagram labels, answer choices, and small captions.
- Do not summarize, paraphrase, solve, explain, or infer hidden content.
- If text is uncertain, keep the closest visible reading and mark only the uncertain token with [?].

Output format:
- Markdown is allowed only to preserve structure.
- Start with "## Page Text" and write the visible text in natural reading order.
- Then write "## Visual Labels" only if there are diagrams, charts, arrows, tables, or figures.
- For tables, preserve rows and columns using Markdown tables when possible.
- For diagrams, list labels and relationships that are visibly shown.
- Do not add commentary such as "this page shows" or "it appears".
- At the very end, add a section exactly named "## Layout Blocks".
- Under "## Layout Blocks", output a JSON array of visible text blocks for selectable overlay.
- Each block must use normalized page coordinates from 0 to 1: {"text":"...","bbox":[x0,y0,x1,y1]}.
- Use dense blocks for worksheets: one block per title, paragraph, question stem, answer choice, table row/cell group, diagram label cluster, or caption.
- Keep 12-80 blocks when the page is dense, ordered top-to-bottom then left-to-right. Coordinates can be approximate but must overlap the visible text.

Important:
- This output will be merged with OCR text. Exact visible transcription is more valuable than a polished explanation.
- Keep repeated labels if they are repeated in the image.
- Keep line breaks when they help preserve layout.`;

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
  const concurrency = Math.max(1, Math.min(Number(process.env.OPENROUTER_VISION_CONCURRENCY ?? 2) || 2, 3));
  const concurrentResults = await mapWithConcurrency(body.images, concurrency, (img) => (
    processVisionImage(img, apiKey, model)
  ));
  return res.status(200).json({ results: concurrentResults, model });

}

async function processVisionImage(img: VisionRequestImage, apiKey: string, model: string): Promise<VisionPageResult> {
  if (typeof img.page !== 'number' || typeof img.dataUrl !== 'string' || !img.dataUrl.startsWith('data:image/')) {
    return { page: img.page, text: '', error: 'invalid image' };
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
              { type: 'text', text: VISION_EXACT_PROMPT },
              { type: 'image_url', image_url: { url: img.dataUrl } },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 8000,
      }),
    });

    if (!orRes.ok) {
      const detail = await orRes.text().catch(() => '');
      return {
        page: img.page,
        text: '',
        error: `vision API ${orRes.status}: ${detail.slice(0, 200)}`,
      };
    }

    const payload = await orRes.json();
    const rawText = extractOpenRouterText(payload).trim();
    const parsed = splitVisionTextAndBlocks(rawText);
    return { page: img.page, text: parsed.text, blocks: parsed.blocks };
  } catch (e) {
    return {
      page: img.page,
      text: '',
      error: e instanceof Error ? e.message : 'unknown',
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function splitVisionTextAndBlocks(rawText: string): { text: string; blocks?: VisionTextBlock[] } {
  const marker = /^##\s+Layout Blocks\s*$/im;
  const match = marker.exec(rawText);
  if (!match) return { text: rawText.trim() };

  const text = rawText.slice(0, match.index).trim();
  const tail = rawText.slice(match.index + match[0].length).trim();
  const blocks = parseVisionBlocks(tail);
  return blocks.length > 0 ? { text, blocks } : { text };
}

export function parseVisionBlocks(value: string): VisionTextBlock[] {
  const rawJson = extractVisionBlocksJson(value);
  if (!rawJson) return [];
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    const items = Array.isArray(parsed)
      ? parsed
      : readVisionBlockArray(parsed);
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => {
        const raw = item as {
          text?: unknown;
          label?: unknown;
          content?: unknown;
          bbox?: unknown;
          box?: unknown;
          bounds?: unknown;
          x0?: unknown;
          y0?: unknown;
          x1?: unknown;
          y1?: unknown;
          x?: unknown;
          y?: unknown;
          width?: unknown;
          height?: unknown;
          w?: unknown;
          h?: unknown;
        };
        const text = readVisionBlockText(raw);
        if (!text) return null;
        const coordinates = readVisionBlockCoordinates(raw);
        if (!coordinates) return null;
        const [x0, y0, x1, y1] = normalizeVisionBlockCoordinates(coordinates);
        if (![x0, y0, x1, y1].every((n) => Number.isFinite(n))) return null;
        return {
          text,
          x0,
          y0,
          x1,
          y1,
        };
      })
      .filter((block): block is VisionTextBlock => (
        !!block && block.text.length > 0 && block.x1 > block.x0 && block.y1 > block.y0
      ))
      .slice(0, MAX_LAYOUT_BLOCKS);
  } catch {
    return [];
  }
}

function extractVisionBlocksJson(value: string): string | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value.trim();
  if (!source) return null;
  const arrayMatch = source.match(/\[[\s\S]*\]/);
  if (arrayMatch) return arrayMatch[0];
  const objectMatch = source.match(/\{[\s\S]*\}/);
  return objectMatch?.[0] ?? null;
}

function readVisionBlockArray(value: unknown): unknown[] | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as Record<string, unknown>;
  const candidates = [
    object.blocks,
    object.layoutBlocks,
    object.layout_blocks,
    object.items,
    object.results,
  ];
  return candidates.find((candidate): candidate is unknown[] => Array.isArray(candidate)) ?? null;
}

function readVisionBlockText(raw: { text?: unknown; label?: unknown; content?: unknown }): string {
  const value = typeof raw.text === 'string'
    ? raw.text
    : typeof raw.label === 'string'
    ? raw.label
    : typeof raw.content === 'string'
    ? raw.content
    : '';
  return value.trim();
}

function readVisionBlockCoordinates(raw: {
  bbox?: unknown;
  box?: unknown;
  bounds?: unknown;
  x0?: unknown;
  y0?: unknown;
  x1?: unknown;
  y1?: unknown;
  x?: unknown;
  y?: unknown;
  width?: unknown;
  height?: unknown;
  w?: unknown;
  h?: unknown;
}): [number, number, number, number] | null {
  const tuple = Array.isArray(raw.bbox)
    ? raw.bbox
    : Array.isArray(raw.box)
    ? raw.box
    : Array.isArray(raw.bounds)
    ? raw.bounds
    : null;
  if (tuple && tuple.length === 4) {
    return tuple.map((n) => Number(n)) as [number, number, number, number];
  }

  const objectBox = readObjectBox(raw.bbox) ?? readObjectBox(raw.box) ?? readObjectBox(raw.bounds);
  if (objectBox) return objectBox;

  const direct = [raw.x0, raw.y0, raw.x1, raw.y1].map((n) => Number(n));
  if (direct.every((n) => Number.isFinite(n))) {
    return direct as [number, number, number, number];
  }

  return readObjectBox(raw);
}

function readObjectBox(value: unknown): [number, number, number, number] | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as {
    x?: unknown;
    y?: unknown;
    width?: unknown;
    height?: unknown;
    w?: unknown;
    h?: unknown;
    x0?: unknown;
    y0?: unknown;
    x1?: unknown;
    y1?: unknown;
  };
  const direct = [object.x0, object.y0, object.x1, object.y1].map((n) => Number(n));
  if (direct.every((n) => Number.isFinite(n))) {
    return direct as [number, number, number, number];
  }
  const x = Number(object.x);
  const y = Number(object.y);
  const width = Number(object.width ?? object.w);
  const height = Number(object.height ?? object.h);
  if ([x, y, width, height].every((n) => Number.isFinite(n))) {
    return [x, y, x + width, y + height];
  }
  return null;
}

function normalizeVisionBlockCoordinates(input: [number, number, number, number]): [number, number, number, number] {
  const max = Math.max(...input.map((n) => Math.abs(n)));
  const divisor = max > 2 && max <= 100 ? 100 : 1;
  return input.map((n) => clamp01(n / divisor)) as [number, number, number, number];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
