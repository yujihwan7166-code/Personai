import { getCompletedPages, putOcr, type OcrRecord, type OcrWord } from './studyOcrStore';

interface PaddlePdfPage {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }) => { promise: Promise<void> };
}

interface PaddlePdfDoc {
  getPage: (n: number) => Promise<PaddlePdfPage>;
  numPages: number;
}

interface PaddleOcrLine {
  text: string;
  confidence?: number | null;
  box?: number[][];
}

interface PaddleOcrResult {
  page: number;
  text: string;
  avgConfidence?: number | null;
  lines?: PaddleOcrLine[];
  durationMs?: number;
  error?: string;
}

interface PaddleOcrApiResponse {
  engine?: string;
  lang?: string;
  results?: PaddleOcrResult[];
}

interface RenderedPaddlePage {
  page: number;
  dataUrl: string;
  width: number;
  height: number;
}

type State = 'idle' | 'running' | 'paused' | 'canceled' | 'done';

export interface PaddleOcrQueueCallbacks {
  onProgress?: (done: number, total: number, currentPage?: number) => void;
  onPageDone?: (page: number, record: OcrRecord) => void;
  onPageSkipped?: (page: number, reason: 'empty' | 'weak' | 'error' | 'missing', err?: unknown) => void;
  onError?: (err: unknown, page?: number, fatal?: boolean) => void;
  onFinish?: () => void;
}

export interface PaddleOcrQueueOptions {
  blobRef: string;
  doc: PaddlePdfDoc;
  pages: number[];
  batchSize?: number;
  maxWidth?: number;
  maxScale?: number;
  quality?: number;
  lang?: string;
}

export class PaddleOcrQueue {
  private state: State = 'idle';
  private done = 0;
  private remaining: number[];
  private available = false;
  private savedPages = new Set<number>();
  private resumeWaiters: Array<() => void> = [];

  constructor(
    private opts: PaddleOcrQueueOptions,
    private cb: PaddleOcrQueueCallbacks = {},
  ) {
    this.remaining = [...opts.pages];
  }

  get status() { return this.state; }
  get progress() { return { done: this.done, total: this.opts.pages.length }; }
  get wasAvailable() { return this.available; }
  get savedPageCount() { return this.savedPages.size; }

  prioritizePages(pageOrder: number[]) {
    if (pageOrder.length === 0 || this.remaining.length <= 1) return;
    const rank = new Map(pageOrder.map((page, index) => [page, index]));
    this.remaining.sort((a, b) => (rank.get(a) ?? 9999) - (rank.get(b) ?? 9999));
  }

  async start() {
    if (this.state === 'running' || this.state === 'done') return;
    this.state = 'running';

    this.available = await isPaddleOcrAvailable();
    if (!this.available) {
      this.state = 'done';
      this.cb.onFinish?.();
      return;
    }

    const completed = await getCompletedPages(this.opts.blobRef);
    this.remaining = this.remaining.filter((p) => !completed.has(p));
    this.done = this.opts.pages.length - this.remaining.length;
    this.cb.onProgress?.(this.done, this.opts.pages.length);

    if (this.remaining.length === 0) {
      this.state = 'done';
      this.cb.onFinish?.();
      return;
    }

    const batchSize = Math.max(1, Math.min(this.opts.batchSize ?? 2, 4));
    while (this.remaining.length > 0) {
      if (this.state === 'canceled') return;
      await this.waitIfPaused();
      if (this.state === 'canceled') return;

      const batch = this.remaining.splice(0, batchSize);
      try {
        const rendered = await this.renderPages(batch);
        const json = await requestPaddleOcr(rendered, this.opts.lang);
        const resultMap = new Map((json.results ?? []).map((result) => [result.page, result] as const));

        for (const page of batch) {
          const result = resultMap.get(page);
          const renderedPage = rendered.find((item) => item.page === page);
          if (!result) {
            this.finishSkipped(page, 'missing', new Error(`p.${page}: missing PaddleOCR result`));
            continue;
          }
          if (result.error) {
            this.finishSkipped(page, 'error', new Error(`p.${page}: ${result.error}`));
            continue;
          }
          if (!result.text?.trim()) {
            this.finishSkipped(page, 'empty', new Error(`p.${page}: empty PaddleOCR result`));
            continue;
          }
          if (!renderedPage) {
            this.finishSkipped(page, 'missing', new Error(`p.${page}: missing rendered page`));
            continue;
          }

          const rec = toOcrRecord(this.opts.blobRef, result, renderedPage);
          await putOcr(rec);
          this.savedPages.add(page);
          this.done += 1;
          this.cb.onProgress?.(this.done, this.opts.pages.length, page);
          this.cb.onPageDone?.(page, { ...rec, key: `${rec.blobRef}:${rec.page}` });
        }
      } catch (error) {
        for (const page of batch) {
          this.finishSkipped(page, 'error', error);
        }
      }
    }

    if (this.state !== 'canceled') {
      this.state = 'done';
      this.cb.onFinish?.();
    }
  }

  pause() {
    if (this.state === 'running') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') {
      this.state = 'running';
      const waiters = this.resumeWaiters;
      this.resumeWaiters = [];
      for (const waiter of waiters) waiter();
    }
  }

  cancel() {
    this.state = 'canceled';
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const waiter of waiters) waiter();
  }

  private finishSkipped(page: number, reason: 'empty' | 'weak' | 'error' | 'missing', err?: unknown) {
    this.done += 1;
    this.cb.onProgress?.(this.done, this.opts.pages.length, page);
    this.cb.onPageSkipped?.(page, reason, err);
    if (reason === 'error') this.cb.onError?.(err, page, false);
  }

  private async renderPages(pages: number[]): Promise<RenderedPaddlePage[]> {
    const out: RenderedPaddlePage[] = [];
    const maxWidth = this.opts.maxWidth ?? 2600;
    const maxScale = this.opts.maxScale ?? 4;
    const quality = this.opts.quality ?? 0.94;

    for (const pageNum of pages) {
      if (pageNum < 1 || pageNum > this.opts.doc.numPages) continue;
      const page = await this.opts.doc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(maxScale, maxWidth / Math.max(1, baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      out.push({
        page: pageNum,
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width: canvas.width,
        height: canvas.height,
      });
      canvas.width = 0;
      canvas.height = 0;
      if (out.length % 3 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    return out;
  }

  private waitIfPaused(): Promise<void> {
    if (this.state !== 'paused') return Promise.resolve();
    return new Promise((resolve) => { this.resumeWaiters.push(resolve); });
  }
}

export async function isPaddleOcrAvailable(): Promise<boolean> {
  try {
    const response = await fetch('/api/study-paddle-ocr', { method: 'GET' });
    if (!response.ok) return false;
    const json = await response.json() as { available?: boolean };
    return json.available === true;
  } catch {
    return false;
  }
}

async function requestPaddleOcr(
  pages: RenderedPaddlePage[],
  lang?: string,
): Promise<PaddleOcrApiResponse> {
  const response = await fetch('/api/study-paddle-ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      images: pages.map((page) => ({ page: page.page, dataUrl: page.dataUrl })),
      ...(lang ? { lang } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`PaddleOCR API ${response.status}`);
  }
  return await response.json() as PaddleOcrApiResponse;
}

function toOcrRecord(
  blobRef: string,
  result: PaddleOcrResult,
  rendered: RenderedPaddlePage,
): Omit<OcrRecord, 'key'> {
  const words = linesToWords(result.lines, rendered.width, rendered.height);
  return {
    blobRef,
    page: result.page,
    text: result.text.trim(),
    words,
    wordCount: countWords(result.text),
    avgConfidence: result.avgConfidence ?? averageWordConfidence(words),
    durationMs: result.durationMs,
    passCount: 1,
    fallbackMode: 'none',
    doneAt: Date.now(),
  };
}

function linesToWords(
  lines: PaddleOcrLine[] | undefined,
  width: number,
  height: number,
): OcrWord[] | undefined {
  if (!Array.isArray(lines) || lines.length === 0 || width <= 0 || height <= 0) return undefined;
  const words = lines
    .map((line) => {
      const box = normalizeLineBox(line.box, width, height);
      if (!box || !line.text.trim()) return null;
      return {
        text: line.text.trim(),
        x0: box.x0,
        y0: box.y0,
        x1: box.x1,
        y1: box.y1,
        confidence: typeof line.confidence === 'number' ? line.confidence : undefined,
      };
    })
    .filter((word): word is OcrWord => !!word);
  return words.length > 0 ? words : undefined;
}

function normalizeLineBox(
  box: number[][] | undefined,
  width: number,
  height: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  if (!Array.isArray(box) || box.length === 0) return null;
  const xs = box.map((point) => Number(point[0])).filter(Number.isFinite);
  const ys = box.map((point) => Number(point[1])).filter(Number.isFinite);
  if (xs.length === 0 || ys.length === 0) return null;
  const x0 = clamp01(Math.min(...xs) / width);
  const y0 = clamp01(Math.min(...ys) / height);
  const x1 = clamp01(Math.max(...xs) / width);
  const y1 = clamp01(Math.max(...ys) / height);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x0, y0, x1, y1 };
}

function averageWordConfidence(words: OcrWord[] | undefined): number | null {
  const values = (words ?? [])
    .map((word) => word.confidence)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
