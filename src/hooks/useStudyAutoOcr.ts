/**
 * 노트북 진입 시점에 PDF 소스의 OCR + Vision LLM 자동 시동.
 *
 * 기존: PdfViewer 가 마운트되어야 OCR/Vision 큐가 시작됨 → 사용자가 PDF 뷰어를
 * 안 열고 노트정리만 쓰면 placeholder 텍스트 → 환각.
 *
 * 변경: 노트북이 열리는 즉시 (=이 훅이 마운트되는 즉시) 모든 PDF 소스의
 * 스캔 페이지에 대해 백그라운드 OCR 시작 + 끝나면 빈약 페이지 Vision LLM 보강.
 *
 * 모듈 레벨 registry 로 중복 큐 방지 (PdfViewer 가 같은 blobRef 로 큐를
 * 또 만들어도 큰 문제는 아님 — IDB 캐시가 이미 처리한 페이지를 자동 스킵).
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { getBlob } from '@/lib/studyBlobStore';
import { OcrQueue } from '@/lib/studyOcrQueue';
import { getCompletedPages, getAllForBlob } from '@/lib/studyOcrStore';
import { VisionQueue } from '@/lib/studyVisionQueue';
import { getCompletedVisionPages } from '@/lib/studyVisionStore';
import { buildMergedContent } from '@/lib/studyContentMerge';
import { getEffectiveOcrPages, getVisionBackedFastOcrPages, getVisionForcedOcrPages } from '@/lib/studyOcrPages';
import { isWeakOcrRecord } from '@/lib/studyOcrQuality';
import type { StudyNotebook, StudySource } from '@/types/study';
import { isStudySourceTextPending } from '@/lib/studySourceReadiness';

interface RegistryEntry {
  ocr?: OcrQueue;
  vision?: VisionQueue;
  startedAt: number;
}

/** blobRef → 진행 중 큐. 모듈 레벨 — 같은 PDF 가 여러 곳에서 시동되어도 1개만. */
const queueRegistry = new Map<string, RegistryEntry>();

/** 자동 OCR 전체 진행 상황. UI 가 로딩 화면 노출 여부·진행률 결정에 사용. */
export interface AutoOcrProgress {
  /** 어느 페이지든 처리 중이면 true. 끝나면 false. */
  isProcessing: boolean;
  /** 단계 — UI 라벨용 */
  phase: 'idle' | 'ocr' | 'vision' | 'done';
  /** OCR 완료 페이지 수 (모든 소스 합산) */
  ocrDone: number;
  /** OCR 대상 페이지 총 수 */
  ocrTotal: number;
  /** Vision 완료 페이지 수 */
  visionDone: number;
  /** Vision 대상 페이지 총 수 (sparse 페이지) */
  visionTotal: number;
}

interface SourceProgress {
  ocrDone: number;
  ocrTotal: number;
  visionDone: number;
  visionTotal: number;
  ocrFinished: boolean;
  visionStarted: boolean;
  visionFinished: boolean;
}

interface PdfDoc {
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  }>;
  numPages: number;
}

// buildCombinedContent 는 src/lib/studyContentMerge.ts 의 buildMergedContent 로 대체.
// Native + OCR + Vision page-level 병합 (native 텍스트 손실 방지).

/**
 * 노트북의 PDF 소스에 대해 OCR + Vision 자동 시동.
 *
 * @param notebook 현재 열려 있는 노트북
 * @param onSourceContentUpdate (sourceId, combinedContent) — 결과로 source.content 업데이트
 */
export function useStudyAutoOcr(
  notebook: StudyNotebook,
  onSourceContentUpdate: (sourceId: string, content: string, status?: StudySource['status']) => void,
  priorityPage?: number,
): AutoOcrProgress {
  // 최신 콜백을 ref 로 보관 — useEffect 가 매번 재시동되지 않도록
  const callbackRef = useRef(onSourceContentUpdate);
  useEffect(() => { callbackRef.current = onSourceContentUpdate; }, [onSourceContentUpdate]);
  const priorityPageRef = useRef(priorityPage);
  useEffect(() => { priorityPageRef.current = priorityPage; }, [priorityPage]);

  // per-source 진행 추적 (ref) — 콜백에서 mutation, recompute() 가 setProgress 호출
  const sourceProgressRef = useRef<Map<string, SourceProgress>>(new Map());
  const [progress, setProgress] = useState<AutoOcrProgress>({
    isProcessing: false,
    phase: 'idle',
    ocrDone: 0, ocrTotal: 0,
    visionDone: 0, visionTotal: 0,
  });

  const recompute = useCallback(() => {
    const all = Array.from(sourceProgressRef.current.values());
    if (all.length === 0) {
      setProgress({ isProcessing: false, phase: 'idle', ocrDone: 0, ocrTotal: 0, visionDone: 0, visionTotal: 0 });
      return;
    }
    const ocrDone = all.reduce((s, p) => s + p.ocrDone, 0);
    const ocrTotal = all.reduce((s, p) => s + p.ocrTotal, 0);
    const visionDone = all.reduce((s, p) => s + p.visionDone, 0);
    const visionTotal = all.reduce((s, p) => s + p.visionTotal, 0);
    const anyOcrRunning = all.some((p) => !p.ocrFinished);
    const anyVisionRunning = all.some((p) => p.visionStarted && !p.visionFinished);
    const isProcessing = anyOcrRunning || anyVisionRunning;
    let phase: AutoOcrProgress['phase'] = 'done';
    if (anyOcrRunning) phase = 'ocr';
    else if (anyVisionRunning) phase = 'vision';
    else if (ocrTotal === 0 && visionTotal === 0) phase = 'idle';
    setProgress({ isProcessing, phase, ocrDone, ocrTotal, visionDone, visionTotal });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const localStarted: string[] = [];
    const pollers: number[] = [];
    const mergeTimers = new Map<string, number>();

    const runContentMerge = async (
      sourceId: string,
      blobRef: string,
      nativeText: string | undefined,
      status: StudySource['status'],
    ) => {
      const combined = await buildMergedContent(blobRef, nativeText);
      if (combined && !cancelled) callbackRef.current(sourceId, combined, status);
    };

    const scheduleContentMerge = (
      sourceId: string,
      blobRef: string,
      nativeText: string | undefined,
      status: StudySource['status'],
      delay = 650,
    ) => {
      const currentTimer = mergeTimers.get(sourceId);
      if (currentTimer) window.clearTimeout(currentTimer);
      const timer = window.setTimeout(() => {
        mergeTimers.delete(sourceId);
        void runContentMerge(sourceId, blobRef, nativeText, status).catch(() => null);
      }, delay);
      mergeTimers.set(sourceId, timer);
    };

    const flushContentMerge = async (
      sourceId: string,
      blobRef: string,
      nativeText: string | undefined,
      status: StudySource['status'],
    ) => {
      const currentTimer = mergeTimers.get(sourceId);
      if (currentTimer) window.clearTimeout(currentTimer);
      mergeTimers.delete(sourceId);
      await runContentMerge(sourceId, blobRef, nativeText, status);
    };

    // 노트북 변경 시 per-source 진행 추적 초기화 — 다른 노트북 영향 안 받게
    sourceProgressRef.current = new Map();
    // 초기 상태: PDF 소스가 OCR 대상이면 isProcessing 즉시 true (loading screen 깜빡임 방지)
    const needsProcessing = notebook.sources.some(
      (s) => s.kind === 'pdf' && s.blobRef && getEffectiveOcrPages(s).length > 0,
    );
    if (needsProcessing) {
      setProgress({
        isProcessing: true, phase: 'ocr',
        ocrDone: 0, ocrTotal: 0, visionDone: 0, visionTotal: 0,
      });
    } else {
      setProgress({ isProcessing: false, phase: 'idle', ocrDone: 0, ocrTotal: 0, visionDone: 0, visionTotal: 0 });
    }

    const mirrorExistingQueue = (
      sourceId: string,
      blobRef: string,
      scanPages: number[],
      visionForcedPageSet: Set<number>,
      hasImmediateText: boolean,
      nativeText?: string,
    ) => {
      const sync = async () => {
        if (cancelled) return;
        try {
          const completed = await getCompletedPages(blobRef);
          if (cancelled) return;

          const sp = sourceProgressRef.current.get(sourceId);
          if (!sp) return;
          sp.ocrDone = scanPages.filter((p) => completed.has(p)).length;
          sp.ocrFinished = sp.ocrDone >= scanPages.length;

          if (sp.ocrFinished) {
            const [ocrRecs, visionDone] = await Promise.all([
              getAllForBlob(blobRef),
              getCompletedVisionPages(blobRef),
            ]);
            const scanPageSet = new Set(scanPages);
            const sparsePages = ocrRecs
              .filter((r) => scanPageSet.has(r.page) && (isWeakOcrRecord(r) || visionForcedPageSet.has(r.page)))
              .map((r) => r.page);
            sp.visionStarted = sparsePages.length > 0;
            sp.visionTotal = sparsePages.length;
            sp.visionDone = sparsePages.filter((p) => visionDone.has(p)).length;
            sp.visionFinished = sparsePages.length === 0 || sp.visionDone >= sparsePages.length;

            await flushContentMerge(sourceId, blobRef, nativeText, sp.visionFinished || hasImmediateText ? 'ready' : 'processing');
          }

          recompute();
        } catch {
          // The owning queue keeps working; this view only mirrors cache progress.
        }
      };

      void sync();
      const poller = window.setInterval(() => {
        const sp = sourceProgressRef.current.get(sourceId);
        if (!sp || (sp.ocrFinished && sp.visionFinished)) {
          window.clearInterval(poller);
          return;
        }
        void sync();
      }, 1000);
      pollers.push(poller);
    };

    (async () => {
      // 동적 import — pdfjs 워커가 무거우므로 lazy
      const pdfjsModPromise = import('pdfjs-dist').then(async (mod) => {
        try {
          const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
          mod.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch { /* worker 설정 실패해도 시도 */ }
        return mod;
      });

      for (const source of notebook.sources) {
        if (cancelled) return;
        if (source.kind !== 'pdf') continue;
        if (!source.blobRef) continue;
        const scanPages = prioritizeOcrPages(getEffectiveOcrPages(source), priorityPageRef.current);
        if (scanPages.length === 0) continue;

        const blobRef = source.blobRef;
        const forcedPageSet = new Set(
          (source.forcedOcrPages ?? []).filter((page) => Number.isFinite(page) && page > 0),
        );
        const visionForcedPageSet = new Set(getVisionForcedOcrPages(source));
        const visionBackedFastPages = getVisionBackedFastOcrPages(source);
        const forcedPages = scanPages.filter((page) => forcedPageSet.has(page));
        const hasImmediateText = isStudySourceImmediatelyUsable(source);

        // per-source progress 등록 — UI 진행률 집계 대상
        sourceProgressRef.current.set(source.id, {
          ocrDone: 0, ocrTotal: scanPages.length,
          visionDone: 0, visionTotal: 0,
          ocrFinished: false, visionStarted: false, visionFinished: false,
        });
        recompute();

        // 이미 다른 곳에서 큐가 돌고 있으면 스킵 (단, 진행상황은 캐시에서 유추 어려우니
        // 그냥 ocrFinished=true 표시해서 progress 안 막음)
        if (queueRegistry.has(blobRef)) {
          const entry = queueRegistry.get(blobRef);
          if (forcedPages.length > 0) {
            entry?.ocr?.cancel();
            entry?.vision?.cancel();
            queueRegistry.delete(blobRef);
          } else {
            const added = entry?.ocr?.addPages(scanPages) ?? 0;
            entry?.ocr?.markVisionBackedPages(visionBackedFastPages);
            entry?.ocr?.prioritizePages(scanPages);
            if (added > 0 && entry?.ocr?.status !== 'running') void entry.ocr.start();
            mirrorExistingQueue(source.id, blobRef, scanPages, visionForcedPageSet, hasImmediateText, source.nativeText);
            recompute();
            continue;
          }
        }

        let cachedVisionPages: number[] | null = null;

        // 이미 모든 페이지가 OCR 캐시에 있으면 시동 불필요 (content 만 한 번 동기화)
        try {
          const completed = await getCompletedPages(blobRef);
          const allDone = scanPages.every((p) => completed.has(p));
          if (allDone) {
            // OCR 다 끝났어도 Vision 미완료 페이지가 있으면 시동 (아래 코드가 처리)
            const visionDone = await getCompletedVisionPages(blobRef);
            const ocrRecs = await getAllForBlob(blobRef);
            const scanPageSet = new Set(scanPages);
            const sparseNotVisioned = ocrRecs
              .filter((r) => scanPageSet.has(r.page) && (isWeakOcrRecord(r) || visionForcedPageSet.has(r.page)) && !visionDone.has(r.page))
              .map((r) => r.page);
            // 캐시 완료 — OCR 단계 끝
            const sp = sourceProgressRef.current.get(source.id);
            if (sp) {
              sp.ocrDone = scanPages.length;
              sp.ocrFinished = true;
              if (sparseNotVisioned.length === 0) {
                sp.visionFinished = true;
              }
            }
            await flushContentMerge(source.id, blobRef, source.nativeText, sparseNotVisioned.length === 0 || hasImmediateText ? 'ready' : 'processing');
            recompute();
            if (sparseNotVisioned.length === 0) continue;
            cachedVisionPages = sparseNotVisioned;
            // Vision 만 시동 (doc + file 필요) — 아래 try 블록이 시동
          }
        } catch { /* 캐시 조회 실패 — 정상 흐름 계속 */ }

        try {
          const blob = await getBlob(blobRef);
          if (!blob || cancelled) continue;
          const pdfjs = await pdfjsModPromise;
          const ab = await blob.arrayBuffer();
          if (cancelled) continue;
          const doc = (await pdfjs.getDocument({ data: ab }).promise) as unknown as PdfDoc;
          if (cancelled) return;

          // OCR 큐 시동
          let ocrFinished = false;
          let activeVisionCount = 0;
          const visionQueuedPages = new Set<number>();
          const completedVisionPages = await getCompletedVisionPages(blobRef);
          const visionAttemptedPages = new Set<number>(completedVisionPages);
          const pendingVisionPages = new Set<number>();
          let visionFlushTimer: number | null = null;

          const syncVisionProgress = () => {
            const sp = sourceProgressRef.current.get(source.id);
            if (!sp) return;
            const queued = Array.from(visionQueuedPages);
            sp.visionStarted = queued.length > 0;
            sp.visionTotal = queued.length;
            sp.visionDone = queued.filter((page) => visionAttemptedPages.has(page)).length;
            sp.visionFinished = queued.length === 0 || (activeVisionCount === 0 && sp.visionDone >= sp.visionTotal);
            recompute();
          };

          const finalizeIfSettled = async () => {
            if (!ocrFinished || activeVisionCount > 0 || cancelled) return;
            syncVisionProgress();
            const sp = sourceProgressRef.current.get(source.id);
            if (sp && (!sp.visionStarted || sp.visionFinished)) {
              await flushContentMerge(source.id, blobRef, source.nativeText, 'ready');
              queueRegistry.delete(blobRef);
            }
          };

          const flushPendingVision = async () => {
            if (cancelled || activeVisionCount > 0) return;
            const queuePages = prioritizeOcrPages(Array.from(pendingVisionPages), priorityPageRef.current);
            pendingVisionPages.clear();
            if (queuePages.length === 0) {
              await finalizeIfSettled();
              return;
            }
            activeVisionCount += 1;
            syncVisionProgress();

            const visionQueue = new VisionQueue(
              { blobRef, doc, file: blob, pages: queuePages, batchSize: 2, maxWidth: 2200, maxScale: 3.4, quality: 0.9, requireLayoutBlocks: true },
              {
                onPageDone: async (page) => {
                  if (cancelled) return;
                  visionAttemptedPages.add(page);
                  syncVisionProgress();
                  scheduleContentMerge(source.id, blobRef, source.nativeText, hasImmediateText ? 'ready' : 'processing');
                },
                onPageSkipped: (page, reason, err) => {
                  if (cancelled) return;
                  visionAttemptedPages.add(page);
                  syncVisionProgress();
                  console.warn('[auto-vision-skip]', { page, reason, err });
                },
                onFinish: async () => {
                  activeVisionCount = Math.max(0, activeVisionCount - 1);
                  syncVisionProgress();
                  if (pendingVisionPages.size > 0) {
                    scheduleVisionFlush(0);
                  } else {
                    await finalizeIfSettled();
                  }
                },
                onError: (e) => console.warn('[auto-vision]', e),
              },
            );
            const entry = queueRegistry.get(blobRef);
            if (entry) entry.vision = visionQueue;
            void visionQueue.start();
          };

          const scheduleVisionFlush = (delay = 350) => {
            if (visionFlushTimer !== null) window.clearTimeout(visionFlushTimer);
            visionFlushTimer = window.setTimeout(() => {
              visionFlushTimer = null;
              void flushPendingVision().catch((e) => console.warn('[auto-vision-flush]', e));
            }, delay);
          };

          const startVisionForPages = async (pages: number[]) => {
            if (cancelled || pages.length === 0) return;
            const completed = await getCompletedVisionPages(blobRef);
            for (const page of completed) {
              visionAttemptedPages.add(page);
            }
            const todo = Array.from(new Set(pages))
              .filter((page) => !completed.has(page) && !visionQueuedPages.has(page))
              .sort((a, b) => a - b);
            const prioritizedTodo = prioritizeOcrPages(todo, priorityPageRef.current);
            if (todo.length === 0) {
              syncVisionProgress();
              await finalizeIfSettled();
              return;
            }
            for (const page of prioritizedTodo) visionQueuedPages.add(page);
            for (const page of prioritizedTodo) pendingVisionPages.add(page);
            syncVisionProgress();
            if (activeVisionCount === 0) scheduleVisionFlush();
          };

          if (cachedVisionPages && cachedVisionPages.length > 0) {
            ocrFinished = true;
            queueRegistry.set(blobRef, { startedAt: Date.now() });
            localStarted.push(blobRef);
            await startVisionForPages(cachedVisionPages);
            await flushContentMerge(
              source.id,
              blobRef,
              source.nativeText,
              activeVisionCount > 0 || pendingVisionPages.size > 0 ? (hasImmediateText ? 'ready' : 'processing') : 'ready',
            );
            await finalizeIfSettled();
            continue;
          }

          const ocrQueue = new OcrQueue(
            { blobRef, doc, pages: scanPages, renderScale: 2.7, concurrency: 2, visionBackedPages: visionBackedFastPages },
            {
              onProgress: (done) => {
                const sp = sourceProgressRef.current.get(source.id);
                if (sp) { sp.ocrDone = done; }
                recompute();
              },
              onPageDone: async (_page, record) => {
                if (cancelled) return;
                scheduleContentMerge(source.id, blobRef, source.nativeText, hasImmediateText ? 'ready' : 'processing');
                if (isWeakOcrRecord(record) || visionForcedPageSet.has(record.page)) void startVisionForPages([record.page]);
              },
              onFinish: async () => {
                if (cancelled) return;
                ocrFinished = true;
                {
                  const sp = sourceProgressRef.current.get(source.id);
                  if (sp) { sp.ocrFinished = true; sp.ocrDone = scanPages.length; }
                  recompute();
                }
                // Vision 체이닝 — OCR 결과가 빈약한 페이지(< 200자)
                try {
                  const ocrRecs = await getAllForBlob(blobRef);
                  const visionDone = await getCompletedVisionPages(blobRef);
                  const scanPageSet = new Set(scanPages);
                  const sparsePages = ocrRecs
                    .filter((r) => scanPageSet.has(r.page) && (isWeakOcrRecord(r) || visionForcedPageSet.has(r.page)) && !visionDone.has(r.page) && !visionQueuedPages.has(r.page))
                    .map((r) => r.page);
                  if (sparsePages.length === 0) {
                    await finalizeIfSettled();
                    if (activeVisionCount > 0 || pendingVisionPages.size > 0) {
                      await flushContentMerge(source.id, blobRef, source.nativeText, hasImmediateText ? 'ready' : 'processing');
                    }
                    return;
                  }
                  await startVisionForPages(sparsePages);
                  await flushContentMerge(
                    source.id,
                    blobRef,
                    source.nativeText,
                    activeVisionCount > 0 || pendingVisionPages.size > 0 ? (hasImmediateText ? 'ready' : 'processing') : 'ready',
                  );
                  await finalizeIfSettled();
                  return;

                  // Vision 시동 표시
                } catch (e) {
                  console.warn('[auto-vision-chain]', e);
                  queueRegistry.delete(blobRef);
                  const sp = sourceProgressRef.current.get(source.id);
                  if (sp) { sp.visionFinished = true; }
                  recompute();
                }
              },
              onError: (e, page, fatal) => {
                console.warn('[auto-ocr]', e);
                if (!fatal) {
                  if (page) {
                    const sp = sourceProgressRef.current.get(source.id);
                    if (sp) sp.ocrDone = Math.min(scanPages.length, Math.max(sp.ocrDone, 1));
                    recompute();
                  }
                  return;
                }
                queueRegistry.delete(blobRef);
                const sp = sourceProgressRef.current.get(source.id);
                if (sp) {
                  sp.ocrFinished = true;
                  sp.visionFinished = true;
                }
                recompute();
              },
            },
          );

          queueRegistry.set(blobRef, { ocr: ocrQueue, startedAt: Date.now() });
          localStarted.push(blobRef);
          void ocrQueue.start();
        } catch (e) {
          console.warn('[auto-ocr-load]', e);
        }
      }
    })();

    // cleanup: 컴포넌트 unmount 시에도 큐는 살려둠 (작업 완료까지 진행).
    // registry 가 남아 있으면 다음 mount 가 중복 시동 안 함.
    return () => {
      cancelled = true;
      for (const poller of pollers) window.clearInterval(poller);
      for (const timer of mergeTimers.values()) window.clearTimeout(timer);
      void localStarted; // 참조만 유지 — 의도적
    };
    // notebook.sources 의 식별자만 deps 로 — content 변화에는 재실행 X
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook.id, notebook.sources.map((s) => `${s.id}:${s.blobRef ?? ''}:${s.ocrEnabled ? 1 : 0}:${(s.scanPages ?? []).join(',')}:${(s.forcedOcrPages ?? []).join(',')}`).join('|')]);

  useEffect(() => {
    if (!priorityPage) return;
    for (const source of notebook.sources) {
      if (source.kind !== 'pdf' || !source.blobRef) continue;
      const entry = queueRegistry.get(source.blobRef);
      if (!entry) continue;
      const pageOrder = prioritizeOcrPages(getEffectiveOcrPages(source), priorityPage);
      entry.ocr?.prioritizePages(pageOrder);
      entry.vision?.prioritizePages(pageOrder);
    }
  }, [priorityPage, notebook.id, notebook.sources]);

  return progress;
}

function prioritizeOcrPages(pages: number[], priorityPage?: number): number[] {
  if (!priorityPage || !pages.includes(priorityPage)) return pages;
  return [
    priorityPage,
    ...pages
      .filter((page) => page !== priorityPage)
      .sort((a, b) => Math.abs(a - priorityPage) - Math.abs(b - priorityPage) || a - b),
  ];
}

function isStudySourceImmediatelyUsable(source: StudySource): boolean {
  const nativeText = source.nativeText?.trim();
  if (nativeText && nativeText.length > 80) return true;
  return source.status === 'ready' && source.content.trim().length > 80 && !isStudySourceTextPending(source);
}
