/**
 * 백그라운드 OCR 큐.
 * - PDF pdf.js 문서 + 처리할 페이지 배열을 받아 순차 OCR
 * - 동시 병렬 2개 (과부하 방지)
 * - 페이지 단위 IDB 캐시 (이미 있으면 스킵)
 * - pause / resume / cancel 지원
 * - onProgress(done, total, current?) / onPageDone(page, record) 콜백
 *
 * Tesseract.js 는 lazy dynamic import — 번들 절약 + 초기 로드 회피.
 */
import type { OcrRecord, OcrWord } from './studyOcrStore';
import { getCompletedPages, putOcr } from './studyOcrStore';
import { analyzeOcrRecord, shouldSkipExpensiveOcrFallback } from './studyOcrQuality';

type PdfDoc = { getPage: (n: number) => Promise<PdfPage>; numPages: number };
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};

export interface OcrQueueCallbacks {
  onProgress?: (done: number, total: number, currentPage?: number) => void;
  onPageDone?: (page: number, record: OcrRecord) => void;
  onError?: (err: unknown, page?: number, fatal?: boolean) => void;
  onFinish?: () => void;
}

export interface OcrQueueOptions {
  blobRef: string;
  doc: PdfDoc;
  pages: number[];
  /** 페이지 렌더 스케일. 너무 낮으면 인식률 ↓, 너무 높으면 속도 ↓. 1.6~2.0 권장. */
  renderScale?: number;
  /** 동시 실행 워커 수. */
  concurrency?: number;
  /** 언어 — 'kor+eng' 가 일반적. */
  languages?: string;
  /** Pages that will get Vision OCR afterwards, so Tesseract should stay fast. */
  visionBackedPages?: number[];
}

type State = 'idle' | 'running' | 'paused' | 'canceled' | 'done';

interface TesseractWorker {
  recognize: (img: HTMLCanvasElement | ImageData | string) => Promise<{
    data: {
      text: string;
      confidence?: number;
      words?: Array<{
        text: string;
        confidence?: number;
        bbox: { x0: number; y0: number; x1: number; y1: number };
      }>;
    };
  }>;
  setParameters?: (params: Record<string, string | number>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}

interface OcrPassResult {
  text: string;
  confidence?: number;
  words?: Array<{
    text: string;
    confidence?: number;
    bbox: { x0: number; y0: number; x1: number; y1: number };
  }>;
  width: number;
  height: number;
}

interface RenderedOcrCanvas {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function preprocessCanvasForOcr(source: HTMLCanvasElement, mode: 'soft' | 'binary' = 'soft'): HTMLCanvasElement {
  const ctx = source.getContext('2d', { willReadFrequently: true });
  if (!ctx) return source;

  let image: ImageData;
  try {
    image = ctx.getImageData(0, 0, source.width, source.height);
  } catch {
    return source;
  }

  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const outCtx = out.getContext('2d');
  if (!outCtx) return source;

  const data = image.data;
  const grays = new Uint8Array(source.width * source.height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    grays[p] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  const threshold = mode === 'binary' ? otsuThreshold(grays) : 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i] ?? 0;
    const g = data[i + 1] ?? 0;
    const b = data[i + 2] ?? 0;
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * (mode === 'binary' ? 1.9 : 1.55) + 128));
    const value = mode === 'binary'
      ? (contrasted > threshold - 8 ? 255 : 0)
      : (contrasted > 238 ? 255 : contrasted < 58 ? 0 : contrasted);
    data[i] = value;
    data[i + 1] = value;
    data[i + 2] = value;
  }

  outCtx.putImageData(image, 0, 0);
  if (mode === 'soft') {
    outCtx.globalCompositeOperation = 'multiply';
    outCtx.globalAlpha = 0.18;
    outCtx.drawImage(out, 0, 0);
    outCtx.globalAlpha = 1;
    outCtx.globalCompositeOperation = 'source-over';
  }
  return out;
}

function otsuThreshold(values: Uint8Array): number {
  const hist = new Array<number>(256).fill(0);
  for (const v of values) hist[v] += 1;
  const total = values.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let max = 0;
  let threshold = 160;
  for (let i = 0; i < 256; i += 1) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) {
      max = between;
      threshold = i;
    }
  }
  return Math.max(120, Math.min(210, threshold));
}

export class OcrQueue {
  private state: State = 'idle';
  private done = 0;
  private remaining: number[];
  private visionBackedPages = new Set<number>();
  private workers: TesseractWorker[] = [];
  private resumeWaiters: Array<() => void> = [];

  constructor(
    private opts: OcrQueueOptions,
    private cb: OcrQueueCallbacks = {},
  ) {
    this.remaining = [...opts.pages];
    this.markVisionBackedPages(opts.visionBackedPages ?? []);
  }

  get status() { return this.state; }
  get progress() { return { done: this.done, total: this.opts.pages.length }; }

  addPages(pages: number[], force = false): number {
    const known = new Set(this.opts.pages);
    let added = 0;
    for (const page of pages) {
      if (!Number.isFinite(page) || page < 1) continue;
      const isKnown = known.has(page);
      if (isKnown && !force) continue;
      if (!isKnown) {
        known.add(page);
        this.opts.pages.push(page);
      }
      if (this.state === 'done') this.state = 'idle';
      if (this.state !== 'canceled' && !this.remaining.includes(page)) {
        this.remaining.push(page);
      }
      added += 1;
    }
    if (added > 0) this.cb.onProgress?.(this.done, this.opts.pages.length);
    return added;
  }

  prioritizePages(pageOrder: number[]) {
    if (pageOrder.length === 0 || this.remaining.length <= 1) return;
    const rank = new Map(pageOrder.map((page, index) => [page, index]));
    this.remaining.sort((a, b) => (rank.get(a) ?? 9999) - (rank.get(b) ?? 9999));
  }

  markVisionBackedPages(pages: number[]) {
    for (const page of pages) {
      if (Number.isFinite(page) && page > 0) this.visionBackedPages.add(page);
    }
  }

  async start() {
    if (this.state === 'running' || this.state === 'done') return;
    this.state = 'running';

    // 이미 완료된 페이지는 큐에서 제거
    const completed = await getCompletedPages(this.opts.blobRef);
    this.remaining = this.remaining.filter((p) => !completed.has(p));
    this.done = this.opts.pages.length - this.remaining.length;
    this.cb.onProgress?.(this.done, this.opts.pages.length);

    if (this.remaining.length === 0) {
      this.state = 'done';
      this.cb.onFinish?.();
      return;
    }

    // Tesseract 워커 생성 (lazy import)
    try {
      const Tesseract = await import('tesseract.js');
      const concurrency = Math.max(1, Math.min(this.opts.concurrency ?? 2, 3));
      const langs = this.opts.languages ?? 'kor+eng';
      this.workers = await Promise.all(
        Array.from({ length: concurrency }, () => Tesseract.createWorker(langs)),
      ) as unknown as TesseractWorker[];
      await Promise.all(this.workers.map((worker) => {
        if (!worker.setParameters) return Promise.resolve(null);
        return worker.setParameters({
          preserve_interword_spaces: '1',
          user_defined_dpi: '360',
          tessedit_pageseg_mode: '3',
        }).catch(() => null);
      }));
    } catch (e) {
      this.state = 'idle';
      this.cb.onError?.(e, undefined, true);
      return;
    }

    // 각 워커가 자신의 루프 실행
    const runners = this.workers.map((w) => this.runOne(w));
    await Promise.all(runners);

    // 정리
    await Promise.all(this.workers.map((w) => w.terminate().catch(() => null)));
    this.workers = [];

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
      for (const w of waiters) w();
    }
  }

  cancel() {
    this.state = 'canceled';
    const waiters = this.resumeWaiters;
    this.resumeWaiters = [];
    for (const w of waiters) w();
  }

  private waitIfPaused(): Promise<void> {
    if (this.state !== 'paused') return Promise.resolve();
    return new Promise((resolve) => { this.resumeWaiters.push(resolve); });
  }

  private takeNext(): number | null {
    if (this.state === 'canceled') return null;
    return this.remaining.shift() ?? null;
  }

  private async runOne(worker: TesseractWorker) {
    while (true) {
      if (this.state === 'canceled') return;
      await this.waitIfPaused();
      if (this.state === 'canceled') return;
      const page = this.takeNext();
      if (page == null) return;

      try {
        const rec = await this.ocrPage(worker, page);
        await putOcr(rec);
        this.done += 1;
        this.cb.onProgress?.(this.done, this.opts.pages.length, page);
        this.cb.onPageDone?.(page, { ...rec, key: `${rec.blobRef}:${rec.page}` });
      } catch (e) {
        // 실패한 페이지는 건너뛰고 전체 진행 계속
        this.done += 1;
        this.cb.onProgress?.(this.done, this.opts.pages.length, page);
        this.cb.onError?.(e, page, false);
      }
    }
  }

  private async ocrPage(worker: TesseractWorker, pageNum: number): Promise<Omit<OcrRecord, 'key'>> {
    const startedAt = performance.now();
    const page = await this.opts.doc.getPage(pageNum);
    const baseScale = this.getSafeScale(page, this.opts.renderScale ?? 2.7);
    const first = await this.recognizeAtScale(worker, pageNum, baseScale, 'soft');
    let best = first;
    let passCount = 1;
    let fallbackMode: Omit<OcrRecord, 'key'>['fallbackMode'] = 'none';
    const visionBacked = this.visionBackedPages.has(pageNum);
    if (!visionBacked && isWeakOcr(best)) {
      best = chooseBetterOcr(best, await this.recognizeAtScale(worker, pageNum, this.getSafeScale(page, baseScale + 0.75), 'binary'));
      passCount += 1;
      fallbackMode = 'binary';
    }
    if (!visionBacked && isWeakOcr(best) && shouldRunTiledOcr(best)) {
      best = chooseBetterOcr(best, await this.recognizeTiled(worker, pageNum, this.getSafeScale(page, baseScale + 0.95)));
      passCount += 1;
      fallbackMode = 'tiled';
    }
    if (!visionBacked && isWeakOcr(best) && shouldRunDenseOcr(best)) {
      best = chooseBetterOcr(best, await this.recognizeTiled(worker, pageNum, this.getSafeScale(page, baseScale + 1.2), 'dense'));
      passCount += 1;
      fallbackMode = 'dense-tiled';
    }

    const words: OcrWord[] | undefined = best.words
      ?.filter((x) => x.text && x.text.trim().length > 0)
      .map((x) => ({
        text: x.text,
        x0: x.bbox.x0 / best.width,
        y0: x.bbox.y0 / best.height,
        x1: x.bbox.x1 / best.width,
        y1: x.bbox.y1 / best.height,
        confidence: x.confidence,
      }));
    const wordConfs = (words ?? [])
      .map((x) => x.confidence)
      .filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

    return {
      blobRef: this.opts.blobRef,
      page: pageNum,
      text: (best.text || '').trim(),
      words,
      wordCount: words?.length ?? 0,
      avgConfidence: wordConfs.length > 0
        ? Math.round((wordConfs.reduce((sum, x) => sum + x, 0) / wordConfs.length) * 10) / 10
        : (typeof best.confidence === 'number' ? best.confidence : null),
      durationMs: Math.round(performance.now() - startedAt),
      passCount,
      fallbackMode,
      doneAt: Date.now(),
    };
  }

  private getSafeScale(page: PdfPage, desiredScale: number): number {
    const base = page.getViewport({ scale: 1 });
    const maxPixels = 9_500_000;
    const maxScale = Math.sqrt(maxPixels / Math.max(1, base.width * base.height));
    return Math.max(2.4, Math.min(desiredScale, maxScale, 4.2));
  }

  private async recognizeAtScale(
    worker: TesseractWorker,
    pageNum: number,
    scale: number,
    mode: 'soft' | 'binary',
  ): Promise<OcrPassResult> {
    const rendered = await this.renderPageForOcr(pageNum, scale, mode);
    await this.setPageSegMode(worker, mode === 'binary' ? '6' : '3');
    const { data } = await worker.recognize(rendered.canvas);
    return {
      text: data.text ?? '',
      confidence: data.confidence,
      words: data.words,
      width: rendered.width,
      height: rendered.height,
    };
  }

  private async recognizeTiled(
    worker: TesseractWorker,
    pageNum: number,
    scale: number,
    layout: 'columns' | 'dense' = 'columns',
  ): Promise<OcrPassResult> {
    const rendered = await this.renderPageForOcr(pageNum, scale, 'soft');
    await this.setPageSegMode(worker, '6');
    const tiles = layout === 'dense'
      ? buildDenseTiles(rendered.width, rendered.height)
      : buildColumnTiles(rendered.width, rendered.height);

    const texts: string[] = [];
    const words: NonNullable<OcrPassResult['words']> = [];
    const confidences: number[] = [];

    for (const tile of tiles) {
      const tileCanvas = document.createElement('canvas');
      tileCanvas.width = tile.width;
      tileCanvas.height = tile.height;
      const tileCtx = tileCanvas.getContext('2d', { alpha: false });
      if (!tileCtx) continue;
      tileCtx.fillStyle = '#ffffff';
      tileCtx.fillRect(0, 0, tile.width, tile.height);
      tileCtx.drawImage(
        rendered.canvas,
        tile.x, tile.y, tile.width, tile.height,
        0, 0, tile.width, tile.height,
      );
      const { data } = await worker.recognize(tileCanvas);
      if (data.text?.trim()) texts.push(data.text.trim());
      if (typeof data.confidence === 'number') confidences.push(data.confidence);
      for (const word of data.words ?? []) {
        if (!word.text?.trim()) continue;
        words.push({
          ...word,
          bbox: {
            x0: word.bbox.x0 + tile.x,
            y0: word.bbox.y0 + tile.y,
            x1: word.bbox.x1 + tile.x,
            y1: word.bbox.y1 + tile.y,
          },
        });
      }
      tileCanvas.width = 0;
      tileCanvas.height = 0;
    }

    const mergedWords = dedupeOcrWords(words);
    return {
      text: mergeTileTexts(texts),
      confidence: confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
        : undefined,
      words: mergedWords,
      width: rendered.width,
      height: rendered.height,
    };
  }

  private async renderPageForOcr(
    pageNum: number,
    scale: number,
    mode: 'soft' | 'binary',
  ): Promise<RenderedOcrCanvas> {
    const page = await this.opts.doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('canvas 2d context 실패');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const ocrCanvas = preprocessCanvasForOcr(canvas, mode);
    return {
      canvas: ocrCanvas,
      width: ocrCanvas.width,
      height: ocrCanvas.height,
    };
  }

  private async setPageSegMode(worker: TesseractWorker, mode: '3' | '6') {
    if (!worker.setParameters) return;
    await worker.setParameters({ tessedit_pageseg_mode: mode }).catch(() => null);
  }
}

type OcrTile = { x: number; y: number; width: number; height: number };
type TesseractWord = NonNullable<OcrPassResult['words']>[number];

function mergeTileTexts(texts: string[]): string {
  const merged: string[] = [];
  const recentKeys: string[] = [];
  for (const text of texts) {
    const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
    for (const line of lines) {
      const key = normalizeTextDedupeKey(line);
      if (!key) continue;
      if (recentKeys.includes(key)) continue;
      merged.push(line);
      recentKeys.push(key);
      if (recentKeys.length > 10) recentKeys.shift();
    }
    if (merged.length > 0 && merged[merged.length - 1] !== '') merged.push('');
  }
  while (merged[merged.length - 1] === '') merged.pop();
  return merged.join('\n');
}

function dedupeOcrWords(words: TesseractWord[]): TesseractWord[] {
  const seen = new Set<string>();
  const out: TesseractWord[] = [];
  for (const word of words) {
    const textKey = normalizeTextDedupeKey(word.text);
    if (!textKey) continue;
    const boxKey = [
      Math.round(word.bbox.x0 / 10),
      Math.round(word.bbox.y0 / 10),
      Math.round(word.bbox.x1 / 10),
      Math.round(word.bbox.y1 / 10),
    ].join(':');
    const key = `${textKey}:${boxKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(word);
  }
  return out;
}

function normalizeTextDedupeKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
}

function buildColumnTiles(width: number, height: number): OcrTile[] {
  const overlap = Math.round(width * 0.015);
  const mid = Math.floor(width / 2);
  return [
    { x: 0, y: 0, width: mid + overlap, height },
    { x: Math.max(0, mid - overlap), y: 0, width: width - Math.max(0, mid - overlap), height },
  ].filter((tile) => tile.width > 80 && tile.height > 80);
}

function buildDenseTiles(width: number, height: number): OcrTile[] {
  const cols = width > height * 0.65 ? 2 : 1;
  const rows = 3;
  const overlapX = Math.round(width * 0.02);
  const overlapY = Math.round(height * 0.018);
  const tiles: OcrTile[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x0 = Math.max(0, Math.floor((width * col) / cols) - overlapX);
      const y0 = Math.max(0, Math.floor((height * row) / rows) - overlapY);
      const x1 = Math.min(width, Math.ceil((width * (col + 1)) / cols) + overlapX);
      const y1 = Math.min(height, Math.ceil((height * (row + 1)) / rows) + overlapY);
      const tile = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
      if (tile.width > 80 && tile.height > 80) tiles.push(tile);
    }
  }
  return tiles;
}

function isWeakOcr(result: OcrPassResult): boolean {
  return getOcrPassQuality(result).weak;
}

function shouldRunDenseOcr(result: OcrPassResult): boolean {
  const quality = getOcrPassQuality(result);
  if (!quality.weak) return false;
  if (quality.reason === 'empty' || quality.reason === 'garbled-text' || quality.reason === 'repeated-text') {
    return false;
  }
  return quality.textLength >= 120 || quality.wordCount >= 18 || (quality.confidence !== null && quality.confidence >= 55);
}

function shouldRunTiledOcr(result: OcrPassResult): boolean {
  if (!isWeakOcr(result)) return false;
  const wordCount = result.words?.filter((w) => w.text?.trim()).length ?? 0;
  return !shouldSkipExpensiveOcrFallback({
    text: result.text ?? '',
    wordCount,
    avgConfidence: typeof result.confidence === 'number' ? result.confidence : null,
  });
}

function getOcrPassQuality(result: OcrPassResult) {
  const wordCount = result.words?.filter((w) => w.text?.trim()).length ?? 0;
  return analyzeOcrRecord({
    text: result.text ?? '',
    wordCount,
    avgConfidence: typeof result.confidence === 'number' ? result.confidence : null,
  });
}

function chooseBetterOcr(a: OcrPassResult, b: OcrPassResult): OcrPassResult {
  return scoreOcr(b) > scoreOcr(a) ? b : a;
}

function scoreOcr(result: OcrPassResult): number {
  const textLength = (result.text ?? '').replace(/\s/g, '').length;
  const wordCount = result.words?.filter((w) => w.text?.trim()).length ?? 0;
  const confidence = typeof result.confidence === 'number' ? result.confidence : 45;
  return textLength * 1.15 + wordCount * 8 + confidence * 2;
}
