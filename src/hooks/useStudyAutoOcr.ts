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
import { useEffect, useRef } from 'react';
import { getBlob } from '@/lib/studyBlobStore';
import { OcrQueue } from '@/lib/studyOcrQueue';
import { getCompletedPages, getAllForBlob } from '@/lib/studyOcrStore';
import { VisionQueue } from '@/lib/studyVisionQueue';
import { getAllVisionForBlob, getCompletedVisionPages } from '@/lib/studyVisionStore';
import type { StudyNotebook } from '@/types/study';

interface RegistryEntry {
  ocr: OcrQueue;
  vision?: VisionQueue;
  startedAt: number;
}

/** blobRef → 진행 중 큐. 모듈 레벨 — 같은 PDF 가 여러 곳에서 시동되어도 1개만. */
const queueRegistry = new Map<string, RegistryEntry>();

interface PdfDoc {
  getPage: (n: number) => Promise<{
    getViewport: (opts: { scale: number }) => { width: number; height: number };
    render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  }>;
  numPages: number;
}

/** OCR + Vision 결과를 페이지별로 병합. Vision 우선, 없으면 OCR. [p.N] 페이지 마커 부여. */
async function buildCombinedContent(blobRef: string): Promise<string> {
  const [ocrRecs, visionRecs] = await Promise.all([
    getAllForBlob(blobRef),
    getAllVisionForBlob(blobRef),
  ]);
  const visionMap = new Map<number, string>();
  for (const v of visionRecs) visionMap.set(v.page, v.text);
  const pages = new Set<number>([
    ...ocrRecs.map((r) => r.page),
    ...visionRecs.map((r) => r.page),
  ]);
  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted.map((p) => {
    const v = visionMap.get(p);
    if (v) return `[p.${p}] ${v}`;
    const ocr = ocrRecs.find((r) => r.page === p);
    return ocr ? `[p.${p}] ${ocr.text}` : '';
  }).filter(Boolean).join('\n\n');
}

/**
 * 노트북의 PDF 소스에 대해 OCR + Vision 자동 시동.
 *
 * @param notebook 현재 열려 있는 노트북
 * @param onSourceContentUpdate (sourceId, combinedContent) — 결과로 source.content 업데이트
 */
export function useStudyAutoOcr(
  notebook: StudyNotebook,
  onSourceContentUpdate: (sourceId: string, content: string) => void,
) {
  // 최신 콜백을 ref 로 보관 — useEffect 가 매번 재시동되지 않도록
  const callbackRef = useRef(onSourceContentUpdate);
  useEffect(() => { callbackRef.current = onSourceContentUpdate; }, [onSourceContentUpdate]);

  useEffect(() => {
    let cancelled = false;
    const localStarted: string[] = [];

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
        if (!source.ocrEnabled) continue;
        const scanPages = source.scanPages ?? [];
        if (scanPages.length === 0) continue;

        const blobRef = source.blobRef;

        // 이미 다른 곳에서 큐가 돌고 있으면 스킵
        if (queueRegistry.has(blobRef)) continue;

        // 이미 모든 페이지가 OCR 캐시에 있으면 시동 불필요 (content 만 한 번 동기화)
        try {
          const completed = await getCompletedPages(blobRef);
          const allDone = scanPages.every((p) => completed.has(p));
          if (allDone) {
            const combined = await buildCombinedContent(blobRef);
            if (combined && !cancelled) callbackRef.current(source.id, combined);
            // OCR 다 끝났어도 Vision 미완료 페이지가 있으면 시동 (아래 코드가 처리)
            const visionDone = await getCompletedVisionPages(blobRef);
            const ocrRecs = await getAllForBlob(blobRef);
            const sparseNotVisioned = ocrRecs
              .filter((r) => (r.text?.length ?? 0) < 200 && !visionDone.has(r.page))
              .map((r) => r.page);
            if (sparseNotVisioned.length === 0) continue;
            // Vision 만 시동 (doc + file 필요)
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
          const ocrQueue = new OcrQueue(
            { blobRef, doc, pages: scanPages, renderScale: 1.8, concurrency: 2 },
            {
              onPageDone: async () => {
                if (cancelled) return;
                const combined = await buildCombinedContent(blobRef);
                if (combined && !cancelled) callbackRef.current(source.id, combined);
              },
              onFinish: async () => {
                if (cancelled) return;
                // Vision 체이닝 — OCR 결과가 빈약한 페이지(< 200자)
                try {
                  const ocrRecs = await getAllForBlob(blobRef);
                  const visionDone = await getCompletedVisionPages(blobRef);
                  const sparsePages = ocrRecs
                    .filter((r) => (r.text?.length ?? 0) < 200 && !visionDone.has(r.page))
                    .map((r) => r.page);
                  if (sparsePages.length === 0) return;

                  const visionQueue = new VisionQueue(
                    { blobRef, doc, file: blob, pages: sparsePages, batchSize: 4, maxWidth: 1024, quality: 0.72 },
                    {
                      onPageDone: async () => {
                        if (cancelled) return;
                        const combined = await buildCombinedContent(blobRef);
                        if (combined && !cancelled) callbackRef.current(source.id, combined);
                      },
                      onFinish: () => {
                        // 큐 정리는 registry 지움
                        queueRegistry.delete(blobRef);
                      },
                      onError: (e) => console.warn('[auto-vision]', e),
                    },
                  );
                  const entry = queueRegistry.get(blobRef);
                  if (entry) entry.vision = visionQueue;
                  void visionQueue.start();
                } catch (e) {
                  console.warn('[auto-vision-chain]', e);
                  queueRegistry.delete(blobRef);
                }
              },
              onError: (e) => console.warn('[auto-ocr]', e),
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
      void localStarted; // 참조만 유지 — 의도적
    };
    // notebook.sources 의 식별자만 deps 로 — content 변화에는 재실행 X
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebook.id, notebook.sources.map((s) => `${s.id}:${s.blobRef ?? ''}:${s.ocrEnabled ? 1 : 0}`).join('|')]);
}
