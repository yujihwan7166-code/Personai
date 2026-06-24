import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PaddleOcrRequestImage {
  page: number;
  dataUrl: string;
}

interface PaddleOcrRequestBody {
  images: PaddleOcrRequestImage[];
  lang?: string;
}

const DEFAULT_PADDLE_OCR_URL = 'http://127.0.0.1:8765';
const MAX_IMAGES_PER_REQUEST = 4;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return handleHealth(res);
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as PaddleOcrRequestBody | undefined;
  if (!body?.images || !Array.isArray(body.images) || body.images.length === 0) {
    return res.status(400).json({ error: 'OCR 이미지가 없습니다.' });
  }
  if (body.images.length > MAX_IMAGES_PER_REQUEST) {
    return res.status(400).json({ error: `한 번에 최대 ${MAX_IMAGES_PER_REQUEST}장까지 처리할 수 있습니다.` });
  }
  for (const image of body.images) {
    if (!Number.isFinite(image.page) || image.page < 1 || typeof image.dataUrl !== 'string' || !image.dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ error: '잘못된 OCR 이미지 형식입니다.' });
    }
  }

  const baseUrl = readPaddleOcrUrl();
  const timeoutMs = readTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        images: body.images,
        ...(body.lang ? { lang: body.lang } : {}),
      }),
      signal: controller.signal,
    });

    const text = await response.text();
    const payload = safeJson(text);
    if (!response.ok) {
      return res.status(response.status).json({
        error: 'PaddleOCR service failed',
        detail: payload ?? text.slice(0, 400),
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown PaddleOCR error';
    return res.status(503).json({
      error: 'PaddleOCR service unavailable',
      detail: message,
      url: baseUrl,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function handleHealth(res: VercelResponse) {
  const baseUrl = readPaddleOcrUrl();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: controller.signal });
    const text = await response.text();
    return res.status(200).json({
      enabled: true,
      available: response.ok,
      url: baseUrl,
      timeoutMs: readTimeoutMs(),
      service: safeJson(text) ?? text.slice(0, 300),
    });
  } catch (error) {
    return res.status(200).json({
      enabled: true,
      available: false,
      url: baseUrl,
      timeoutMs: readTimeoutMs(),
      detail: error instanceof Error ? error.message : 'PaddleOCR health check failed',
    });
  } finally {
    clearTimeout(timeout);
  }
}

function readPaddleOcrUrl(): string {
  const value = process.env.PADDLE_OCR_URL || DEFAULT_PADDLE_OCR_URL;
  return value.replace(/\/+$/, '');
}

function readTimeoutMs(): number {
  const value = Number(process.env.PADDLE_OCR_TIMEOUT_MS || 120000);
  return Number.isFinite(value) ? Math.max(5000, Math.min(value, 300000)) : 120000;
}

function safeJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}
