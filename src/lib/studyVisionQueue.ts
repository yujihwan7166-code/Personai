/**
 * Vision LLM 백그라운드 큐.
 * - PDF doc + 처리할 페이지 배열을 받아 순차 vision 호출
 * - 페이지를 JPEG dataURL 로 렌더 → /api/study-vision-extract 로 batch 전송
 * - 페이지 단위 IDB 캐시 (이미 있으면 스킵)
 * - pause / resume / cancel 지원
 * - onProgress / onPageDone 콜백
 *
 * Tesseract 큐와 별도. 보통 OCR 결과가 빈약한 페이지(그림 위주)를 골라 enqueue 한다.
 */
import {
  getCompletedVisionPages,
  putVision,
  type VisionRecord,
} from './studyVisionStore';
import { isUsefulVisionText } from './studyOcrQuality';

const MAX_VISION_LAYOUT_BLOCKS = 96;

interface VisionPdfPage {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }) => { promise: Promise<void> };
}

interface VisionPdfDoc {
  getPage: (n: number) => Promise<VisionPdfPage>;
  numPages: number;
}

export interface VisionQueueCallbacks {
  onProgress?: (done: number, total: number, currentPage?: number) => void;
  onPageDone?: (page: number, record: VisionRecord) => void;
  onPageSkipped?: (page: number, reason: 'empty' | 'weak' | 'error' | 'missing', err?: unknown) => void;
  onError?: (err: unknown, page?: number, fatal?: boolean) => void;
  onFinish?: () => void;
}

export interface VisionQueueOptions {
  blobRef: string;
  /** pdfjs document */
  doc: VisionPdfDoc;
  /** PDF 원본 Blob 또는 File. 이전 호환용으로 보관하지만 큐 렌더링은 doc 를 우선 사용한다. */
  file: Blob | File;
  /** 처리 대상 페이지 (1-based). */
  pages: number[];
  /** 한 batch 당 페이지 수. 기본 4. */
  batchSize?: number;
  /** 페이지 렌더 max width. 기본 1024 (vision LLM 토큰 비용 절약). */
  maxWidth?: number;
  /** 작은 글씨 보정용 렌더 스케일 상한. 기본 2, 약한 OCR 보정은 3+ 권장. */
  maxScale?: number;
  /** JPEG 품질 (0-1). 기본 0.72. */
  quality?: number;
  /** 모델 override. */
  model?: string;
  /** Retry once when text is useful but layout blocks are too sparse for selection. */
  requireLayoutBlocks?: boolean;
}

type State = 'idle' | 'running' | 'paused' | 'canceled' | 'done';

interface VisionApiResponse {
  results: Array<{ page: number; text: string; blocks?: VisionRecord['blocks']; error?: string }>;
  model?: string;
}

export class VisionQueue {
  private state: State = 'idle';
  private done = 0;
  private remaining: number[];
  private resumeWaiters: Array<() => void> = [];

  constructor(
    private opts: VisionQueueOptions,
    private cb: VisionQueueCallbacks = {},
  ) {
    this.remaining = [...opts.pages];
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

  async start() {
    if (this.state === 'running' || this.state === 'done') return;
    this.state = 'running';

    // 이미 캐시된 페이지는 큐에서 제거
    const completed = await getCompletedVisionPages(this.opts.blobRef);
    this.remaining = this.remaining.filter((p) => !completed.has(p));
    this.done = this.opts.pages.length - this.remaining.length;
    this.cb.onProgress?.(this.done, this.opts.pages.length);

    if (this.remaining.length === 0) {
      this.state = 'done';
      this.cb.onFinish?.();
      return;
    }

    const batchSize = Math.max(1, Math.min(this.opts.batchSize ?? 4, 8));

    while (this.remaining.length > 0) {
      if (this.state === 'canceled') return;
      await this.waitIfPaused();
      if (this.state === 'canceled') return;

      // 한 batch 페이지 분리
      const batch = this.remaining.splice(0, batchSize);

      try {
        const batchStartedAt = performance.now();
        // 1) 페이지를 dataURL 로 렌더
        const images = await this.renderPages(batch, {
          maxWidth: this.opts.maxWidth ?? 1024,
          maxScale: this.opts.maxScale ?? 2,
          quality: this.opts.quality ?? 0.72,
        });

        // 2) API 호출. 약한 결과는 더 선명한 단일 재렌더로 한 번 보강 시도.
        const json = await this.requestVision(images);
        const resultMap = new Map((json.results ?? []).map((result) => [result.page, result] as const));
        const weakPages = batch.filter((page) => {
          const result = resultMap.get(page);
          return !result || (!result.error && shouldRetryVisionResult(result.text, result.blocks, this.opts.requireLayoutBlocks));
        });
        let resultModel = json.model;
        if (weakPages.length > 0) {
          try {
            const retryImages = await this.renderPages(weakPages, {
              maxWidth: Math.max(this.opts.maxWidth ?? 1024, 2800),
              maxScale: Math.max(this.opts.maxScale ?? 2, 4.2),
              quality: Math.max(this.opts.quality ?? 0.72, 0.94),
            });
            const retryJson = await this.requestVision(retryImages);
            resultModel = retryJson.model ?? resultModel;
            for (const retryResult of retryJson.results ?? []) {
              const current = resultMap.get(retryResult.page);
              if (
                retryResult.text
                && !retryResult.error
                && isUsefulVisionText(retryResult.text)
                && (!current || scoreVisionResult(retryResult, this.opts.requireLayoutBlocks) > scoreVisionResult(current, this.opts.requireLayoutBlocks))
              ) {
                resultMap.set(retryResult.page, retryResult);
              }
            }
          } catch (e) {
            this.cb.onError?.(e, undefined, false);
          }
        }

        // 3) 결과 저장 + 콜백
        for (const page of batch) {
          const r = resultMap.get(page) ?? { page, text: '', error: 'missing vision result' };
          if (!r.text || r.error || !isUsefulVisionText(r.text)) {
            // 빈약한 결과는 캐시하지 않음 (다음번 더 좋은 입력/모델로 다시 시도 가능)
            this.done += 1;
            this.cb.onProgress?.(this.done, this.opts.pages.length, r.page);
            const reason = r.error
              ? (r.error === 'missing vision result' ? 'missing' : 'error')
              : (!r.text ? 'empty' : 'weak');
            const err = r.error
              ? new Error(`p.${r.page}: ${r.error}`)
              : new Error(`p.${r.page}: weak vision OCR result`);
            this.cb.onPageSkipped?.(r.page, reason, err);
            this.cb.onError?.(err, r.page, false);
            continue;
          }
          const rec: Omit<VisionRecord, 'key'> = {
            blobRef: this.opts.blobRef,
            page: r.page,
            text: r.text,
            blocks: sanitizeVisionBlocks(r.blocks),
            model: resultModel,
            durationMs: Math.round(performance.now() - batchStartedAt),
            doneAt: Date.now(),
          };
          try {
            await putVision(rec);
            this.done += 1;
            this.cb.onProgress?.(this.done, this.opts.pages.length, r.page);
            this.cb.onPageDone?.(r.page, { ...rec, key: `${rec.blobRef}:${rec.page}` });
          } catch (e) {
            this.done += 1;
            this.cb.onProgress?.(this.done, this.opts.pages.length, r.page);
            this.cb.onPageSkipped?.(r.page, 'error', e);
            this.cb.onError?.(e, r.page, false);
          }
        }
      } catch (e) {
        // batch 전체 실패 — 진행률은 batch 만큼 올려서 무한 retry 방지
        for (const page of batch) {
          this.done += 1;
          this.cb.onProgress?.(this.done, this.opts.pages.length, page);
          this.cb.onPageSkipped?.(page, 'error', e);
          this.cb.onError?.(e, page, false);
        }
      }
    }

    if (this.state !== 'canceled') {
      this.state = 'done';
      this.cb.onFinish?.();
    }
  }

  private async requestVision(images: Array<{ page: number; dataUrl: string }>): Promise<VisionApiResponse> {
    const apiBody = {
      images: images.map((i) => ({ page: i.page, dataUrl: i.dataUrl })),
      ...(this.opts.model ? { model: this.opts.model } : {}),
    };
    const res = await fetch('/api/study-vision-extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiBody),
    });

    if (!res.ok) {
      throw new Error(`vision API ${res.status}`);
    }

    return (await res.json()) as VisionApiResponse;
  }

  private async renderPages(
    pages: number[],
    opts: { maxWidth: number; maxScale: number; quality: number },
  ): Promise<Array<{ page: number; dataUrl: string }>> {
    const out: Array<{ page: number; dataUrl: string }> = [];
    for (const pageNum of pages) {
      if (pageNum < 1 || pageNum > this.opts.doc.numPages) continue;
      const page = await this.opts.doc.getPage(pageNum);
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(opts.maxScale, opts.maxWidth / Math.max(1, baseViewport.width));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      out.push({ page: pageNum, dataUrl: canvas.toDataURL('image/jpeg', opts.quality) });

      canvas.width = 0;
      canvas.height = 0;
      if (out.length % 4 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
    }
    return out;
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
}

function shouldRetryVisionResult(
  text: string | undefined,
  blocks: VisionRecord['blocks'] | undefined,
  requireLayoutBlocks = false,
): boolean {
  if (!isUsefulVisionText(text)) return true;
  return !hasUsableVisionLayoutBlocks(text, blocks, requireLayoutBlocks);
}

function scoreVisionResult(
  result: { text?: string; blocks?: VisionRecord['blocks'] },
  requireLayoutBlocks = false,
): number {
  const textLength = (result.text ?? '').replace(/\s/g, '').length;
  const blockCount = sanitizeVisionBlocks(result.blocks)?.length ?? 0;
  return textLength + (requireLayoutBlocks ? blockCount * 90 : Math.min(blockCount, 12) * 20);
}

export function hasUsableVisionLayoutBlocks(
  text: string | undefined,
  blocks: VisionRecord['blocks'] | undefined,
  requireLayoutBlocks = false,
): boolean {
  if (!requireLayoutBlocks) return true;
  const compactLength = (text ?? '').replace(/\s/g, '').length;
  if (compactLength < 120) return true;
  const blockCount = sanitizeVisionBlocks(blocks)?.length ?? 0;
  const minimum = compactLength >= 900 ? 6 : compactLength >= 360 ? 3 : 1;
  return blockCount >= minimum;
}

function sanitizeVisionBlocks(blocks: VisionRecord['blocks'] | undefined): VisionRecord['blocks'] | undefined {
  if (!Array.isArray(blocks)) return undefined;
  const clean = blocks
    .map((block) => {
      const [x0, y0, x1, y1] = normalizeVisionBlockCoordinates([
        Number(block.x0),
        Number(block.y0),
        Number(block.x1),
        Number(block.y1),
      ]);
      return {
        text: typeof block.text === 'string' ? block.text.trim() : '',
        x0,
        y0,
        x1,
        y1,
      };
    })
    .filter((block) => block.text && block.x1 > block.x0 && block.y1 > block.y0)
    .slice(0, MAX_VISION_LAYOUT_BLOCKS);
  return clean.length > 0 ? clean : undefined;
}

function normalizeVisionBlockCoordinates(input: [number, number, number, number]): [number, number, number, number] {
  const max = Math.max(...input.map((n) => Math.abs(n)));
  const divisor = max > 2 && max <= 100 ? 100 : 1;
  return input.map((n) => clamp01(n / divisor)) as [number, number, number, number];
}

function clamp01(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}
