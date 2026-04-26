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
import { renderPdfPagesToImages } from '@/lib/fileConvert/converters/pdf';
import {
  getCompletedVisionPages,
  putVision,
  type VisionRecord,
} from './studyVisionStore';

export interface VisionQueueCallbacks {
  onProgress?: (done: number, total: number, currentPage?: number) => void;
  onPageDone?: (page: number, record: VisionRecord) => void;
  onError?: (err: unknown) => void;
  onFinish?: () => void;
}

export interface VisionQueueOptions {
  blobRef: string;
  /** pdfjs document */
  doc: { getPage: (n: number) => Promise<unknown>; numPages: number };
  /** PDF 원본 Blob 또는 File — renderPdfPagesToImages 가 받음. */
  file: Blob | File;
  /** 처리 대상 페이지 (1-based). */
  pages: number[];
  /** 한 batch 당 페이지 수. 기본 4. */
  batchSize?: number;
  /** 페이지 렌더 max width. 기본 1024 (vision LLM 토큰 비용 절약). */
  maxWidth?: number;
  /** JPEG 품질 (0-1). 기본 0.72. */
  quality?: number;
  /** 모델 override. */
  model?: string;
}

type State = 'idle' | 'running' | 'paused' | 'canceled' | 'done';

interface VisionApiResponse {
  results: Array<{ page: number; text: string; error?: string }>;
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
        // 1) 페이지를 dataURL 로 렌더
        const images = await renderPdfPagesToImages(this.opts.file, batch, {
          maxWidth: this.opts.maxWidth ?? 1024,
          quality: this.opts.quality ?? 0.72,
        });

        // 2) API 호출
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

        const json = (await res.json()) as VisionApiResponse;

        // 3) 결과 저장 + 콜백
        for (const r of json.results ?? []) {
          if (!r.text || r.error) {
            // 빈 결과는 캐시하지 않음 (다음번 다시 시도 가능)
            this.done += 1;
            this.cb.onProgress?.(this.done, this.opts.pages.length, r.page);
            if (r.error) this.cb.onError?.(new Error(`p.${r.page}: ${r.error}`));
            continue;
          }
          const rec: Omit<VisionRecord, 'key'> = {
            blobRef: this.opts.blobRef,
            page: r.page,
            text: r.text,
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
            this.cb.onError?.(e);
          }
        }
      } catch (e) {
        // batch 전체 실패 — 진행률은 batch 만큼 올려서 무한 retry 방지
        this.done += batch.length;
        this.cb.onProgress?.(this.done, this.opts.pages.length);
        this.cb.onError?.(e);
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
