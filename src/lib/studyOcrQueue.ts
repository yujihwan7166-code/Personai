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

type PdfDoc = { getPage: (n: number) => Promise<PdfPage>; numPages: number };
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};

export interface OcrQueueCallbacks {
  onProgress?: (done: number, total: number, currentPage?: number) => void;
  onPageDone?: (page: number, record: OcrRecord) => void;
  onError?: (err: unknown) => void;
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
}

type State = 'idle' | 'running' | 'paused' | 'canceled' | 'done';

interface TesseractWorker {
  recognize: (img: HTMLCanvasElement | ImageData | string) => Promise<{
    data: {
      text: string;
      words?: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number } }>;
    };
  }>;
  terminate: () => Promise<unknown>;
}

export class OcrQueue {
  private state: State = 'idle';
  private done = 0;
  private remaining: number[];
  private workers: TesseractWorker[] = [];
  private resumeWaiters: Array<() => void> = [];

  constructor(
    private opts: OcrQueueOptions,
    private cb: OcrQueueCallbacks = {},
  ) {
    this.remaining = [...opts.pages];
  }

  get status() { return this.state; }
  get progress() { return { done: this.done, total: this.opts.pages.length }; }

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
    } catch (e) {
      this.state = 'idle';
      this.cb.onError?.(e);
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
        this.cb.onError?.(e);
      }
    }
  }

  private async ocrPage(worker: TesseractWorker, pageNum: number): Promise<Omit<OcrRecord, 'key'>> {
    const scale = this.opts.renderScale ?? 1.8;
    const page = await this.opts.doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context 실패');
    await page.render({ canvasContext: ctx, viewport }).promise;

    // OCR 실행
    const { data } = await worker.recognize(canvas);
    const w = canvas.width;
    const h = canvas.height;
    const words: OcrWord[] | undefined = data.words
      ?.filter((x) => x.text && x.text.trim().length > 0)
      .map((x) => ({
        text: x.text,
        x0: x.bbox.x0 / w,
        y0: x.bbox.y0 / h,
        x1: x.bbox.x1 / w,
        y1: x.bbox.y1 / h,
      }));

    return {
      blobRef: this.opts.blobRef,
      page: pageNum,
      text: (data.text || '').trim(),
      words,
      doneAt: Date.now(),
    };
  }
}
