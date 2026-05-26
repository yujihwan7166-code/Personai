/**
 * PDF 뷰어 — Step 2+3 통합 구현.
 *  - 연속 스크롤(모든 페이지 placeholder, 가시 범위만 canvas 렌더)
 *  - pdf.js textLayer → 드래그 선택/복사, 검색 하이라이트
 *  - 툴바: prev/next · 페이지 점프 · 줌 · 폭 맞추기 · 검색
 *  - activePage prop 변경 시 해당 페이지로 스크롤 + 1초 강조
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Search, Download, X, LayoutGrid, MessageSquarePlus, RotateCcw, ScanText, CheckCircle2, AlertCircle, FileText, Copy } from 'lucide-react';
import { getBlob } from '@/lib/studyBlobStore';
import { deleteOcrForBlob, deleteOcrPages, getCompletedPages, getOcr, getAllForBlob, type OcrRecord } from '@/lib/studyOcrStore';
import { deleteVisionForBlob, deleteVisionPages, getAllVisionForBlob, getVision, type VisionTextBlock } from '@/lib/studyVisionStore';
import { analyzeOcrRecord, chooseMergedPageText, isNativeTextUseful, isUsefulVisionText, summarizeOcrDiagnostics, type OcrDiagnosticsSummary } from '@/lib/studyOcrQuality';
import { extractPdfTextContentForStudy } from '@/lib/fileConvert/converters/pdf';
import { cn } from '@/lib/utils';
import type { AutoOcrProgress } from '@/hooks/useStudyAutoOcr';

interface Props {
  blobRef: string;
  activePage?: number;
  onActivePageChange?: (page: number) => void;
  /** 선택 텍스트에 대한 "질문하기" 등 액션 콜백. 없으면 선택 액션 UI 숨김. */
  onAskAboutSelection?: (text: string) => void;
  /** 스캔본 페이지 번호들. textLayer 그리기 트리거용 (OCR 결과 IDB 에서 읽음). */
  scanPages?: number[];
  analysisProgress?: AutoOcrProgress;
  /** @deprecated useStudyAutoOcr 가 큐 소유. PdfViewer 는 IDB 에서 결과만 읽음.
   *  prop 자체는 다음 PR 에서 제거. */
  ocrEnabled?: boolean;
  /** @deprecated 같이 제거 예정 */
  onOcrEnable?: (enabled: boolean, forcePages?: number[]) => void;
  /** @deprecated 같이 제거 예정 — content 갱신은 useStudyAutoOcr 가 책임 */
  onOcrContentUpdate?: (ocrText: string) => void;
}

type PageTextStatus = 'native' | 'ocr' | 'vision' | 'waiting' | 'none';
type PageReaderSource = PageTextStatus | 'loading' | 'vision';

type MergedPageText = {
  text: string;
  nativeText: string;
  ocrText: string;
  visionText: string;
};

type PdfDoc = {
  numPages: number;
  getPage: (n: number) => Promise<PdfPage>;
};
type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  getTextContent: () => Promise<unknown>;
};

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;
async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const mod = await import('pdfjs-dist');
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = workerUrl;
      return mod;
    })();
  }
  return pdfjsPromise;
}

/** idle 시점 워커/모듈 prewarm. 앱 진입 시 호출해두면 첫 PDF 오픈 지연 감소. */
export function warmupPdfJs() {
  if (pdfjsPromise) return;
  const idle = (cb: () => void) =>
    (typeof window !== 'undefined' && 'requestIdleCallback' in window)
      ? (window as unknown as { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(cb)
      : setTimeout(cb, 1500);
  idle(() => { void loadPdfJs(); });
}

export function PdfViewer({
  blobRef, activePage, onActivePageChange, onAskAboutSelection,
  scanPages, analysisProgress, onOcrEnable,
}: Props) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hitCount, setHitCount] = useState(0);
  const [searchResults, setSearchResults] = useState<Array<{ page: number; snippet: string }>>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [searching, setSearching] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showThumbs, setShowThumbs] = useState(false);
  const [selAction, setSelAction] = useState<{ x: number; y: number; text: string } | null>(null);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const [ocrIssue, setOcrIssue] = useState<string | null>(null);
  const [pageTextStatus, setPageTextStatus] = useState<Record<number, PageTextStatus>>({});
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerText, setReaderText] = useState('');
  const [readerSource, setReaderSource] = useState<PageReaderSource>('loading');
  const [ocrDiagnostics, setOcrDiagnostics] = useState<OcrDiagnosticsSummary | null>(null);
  // OCR 결과 페이지 (textLayer 그리기 용도) — 큐 소유는 useStudyAutoOcr.
  // 이 ref 는 IDB 캐시에서 polling 으로 채워짐.
  const [ocrPagesReady, setOcrPagesReady] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageSizesRef = useRef<Map<number, { width: number; height: number }>>(new Map());
  const renderedRef = useRef<Set<number>>(new Set());
  const nativeTextCacheRef = useRef<Map<number, string>>(new Map());
  const nativeTextPromiseRef = useRef<Map<number, Promise<string>>>(new Map());
  const mergedTextCacheRef = useRef<Map<number, MergedPageText>>(new Map());
  const mergedTextPromiseRef = useRef<Map<number, Promise<MergedPageText>>>(new Map());
  const pdfjsRef = useRef<typeof import('pdfjs-dist') | null>(null);
  const containerWidthRef = useRef(0);
  const currentPageRef = useRef(currentPage);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  const updatePageTextStatus = useCallback((page: number, status: PageTextStatus) => {
    setPageTextStatus((prev) => (prev[page] === status ? prev : { ...prev, [page]: status }));
  }, []);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    setPageTextStatus({});
    nativeTextCacheRef.current.clear();
    nativeTextPromiseRef.current.clear();
    mergedTextCacheRef.current.clear();
    mergedTextPromiseRef.current.clear();
  }, [blobRef]);

  useEffect(() => {
    mergedTextCacheRef.current.clear();
    mergedTextPromiseRef.current.clear();
  }, [ocrPagesReady, ocrDiagnostics?.corrected, ocrDiagnostics?.pending, ocrDiagnostics?.weak]);

  const cacheNativeText = useCallback((page: number, textContent: unknown): string => {
    const text = getTextContentPlain(textContent).replace(/\s+/g, ' ').trim();
    nativeTextCacheRef.current.set(page, text);
    return text;
  }, []);

  const getNativePageText = useCallback(async (pageNum: number): Promise<string> => {
    const cached = nativeTextCacheRef.current.get(pageNum);
    if (cached !== undefined) return cached;
    const pending = nativeTextPromiseRef.current.get(pageNum);
    if (pending) return pending;
    if (!doc) return '';

    const promise = (async () => {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      return cacheNativeText(pageNum, textContent);
    })();
    nativeTextPromiseRef.current.set(pageNum, promise);
    try {
      return await promise;
    } finally {
      nativeTextPromiseRef.current.delete(pageNum);
    }
  }, [cacheNativeText, doc]);

  const getMergedPageText = useCallback(async (pageNum: number): Promise<MergedPageText> => {
    const cached = mergedTextCacheRef.current.get(pageNum);
    if (cached) return cached;
    const pending = mergedTextPromiseRef.current.get(pageNum);
    if (pending) return pending;

    const promise = (async () => {
      const nativeText = await getNativePageText(pageNum);
      const shouldReadFallbacks = scanPages?.includes(pageNum) || nativeText.replace(/\s/g, '').length < 180;
      const [ocrRecord, visionRecord] = shouldReadFallbacks
        ? await Promise.all([getOcr(blobRef, pageNum), getVision(blobRef, pageNum)])
        : [null, null] as const;
      const ocrText = (ocrRecord?.text ?? '').trim();
      const visionText = (visionRecord?.text ?? '').trim();
      const text = chooseMergedPageText({
        nativeText,
        ocrRecord: ocrRecord ?? undefined,
        visionText,
      });
      return { text, nativeText, ocrText, visionText };
    })();
    mergedTextPromiseRef.current.set(pageNum, promise);
    try {
      const result = await promise;
      mergedTextCacheRef.current.set(pageNum, result);
      return result;
    } finally {
      mergedTextPromiseRef.current.delete(pageNum);
    }
  }, [blobRef, getNativePageText, scanPages]);

  // 초기 로드: blob → pdf.js document
  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;
    (async () => {
      try {
        const blob = await getBlob(blobRef);
        if (!blob) throw new Error('파일을 찾을 수 없습니다.');
        // (Vision 큐는 useStudyAutoOcr 가 소유 — PdfViewer 는 blob 보존 불필요)
        currentUrl = URL.createObjectURL(blob);
        setDownloadUrl(currentUrl);
        const pdfjs = await loadPdfJs();
        pdfjsRef.current = pdfjs;
        const ab = await blob.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: ab });
        const d = await loadingTask.promise;
        if (cancelled) return;
        setDoc(d as unknown as PdfDoc);
        setNumPages(d.numPages);
        // 각 페이지 viewport 미리 캐시 (scale=1 기준) — placeholder 높이 계산
        const firstPage = await d.getPage(1);
        const vp = firstPage.getViewport({ scale: 1 });
        for (let i = 1; i <= d.numPages; i++) {
          pageSizesRef.current.set(i, { width: vp.width, height: vp.height });
        }
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'PDF 로딩 실패');
      }
    })();
    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [blobRef]);

  // 컨테이너 크기 추적 (폭 맞추기 스케일 계산)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const compute = () => {
      rafId = null;
      containerWidthRef.current = el.clientWidth;
      if (fitMode === 'width') {
        const pageW = pageSizesRef.current.get(1)?.width ?? 612;
        const s = Math.max(0.5, Math.min(3, (el.clientWidth - 48) / pageW));
        // 임계값 이하 변화는 무시 → 드래그 중 피드백 루프/진동 방지
        setScale((prev) => (Math.abs(prev - s) < 0.01 ? prev : s));
      } else if (fitMode === 'page') {
        const size = pageSizesRef.current.get(1);
        if (size) {
          const sw = (el.clientWidth - 48) / size.width;
          const sh = (el.clientHeight - 48) / size.height;
          const s = Math.max(0.3, Math.min(3, Math.min(sw, sh)));
          setScale((prev) => (Math.abs(prev - s) < 0.01 ? prev : s));
        }
      }
    };
    const schedule = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(compute);
    };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [fitMode, numPages]);

  // 스케일 바뀌면 기존 캔버스 무효화 → 다시 렌더
  useEffect(() => {
    renderedRef.current.clear();
    for (const [, el] of pageRefs.current) {
      const canvas = el.querySelector('canvas');
      if (canvas) {
        const c = canvas as HTMLCanvasElement;
        c.getContext('2d')?.clearRect(0, 0, c.width, c.height);
        c.dataset.rendered = '';
      }
      const tl = el.querySelector('.textLayer') as HTMLDivElement | null;
      if (tl) tl.innerHTML = '';
    }
    // 가시 페이지 다시 렌더 트리거
    setTimeout(() => scrollRef.current?.dispatchEvent(new Event('scroll')), 0);
  }, [scale]);

  // 가시 페이지 감지 + 렌더
  useEffect(() => {
    if (!doc || !scrollRef.current) return;
    const root = scrollRef.current;

    const renderPage = async (pageNum: number) => {
      if (renderedRef.current.has(pageNum)) return;
      const wrapper = pageRefs.current.get(pageNum);
      if (!wrapper) return;
      renderedRef.current.add(pageNum);
      try {
        const page = await doc.getPage(pageNum);
        // 디스플레이 DPR 과 '최소 2x super-sampling' 중 큰 값 사용.
        // 일반 1x 모니터에서도 canvas 를 CSS 크기의 2배 해상도로 그려 텍스트가 또렷하게 보이도록 한다.
        const dpr = window.devicePixelRatio || 1;
        const QUALITY = Math.max(dpr, 2);
        const viewport = page.getViewport({ scale: scale * QUALITY });
        const cssViewport = page.getViewport({ scale });
        const canvas = wrapper.querySelector('canvas') as HTMLCanvasElement;
        if (!canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(cssViewport.width)}px`;
        canvas.style.height = `${Math.floor(cssViewport.height)}px`;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // 캔버스 다운샘플링 시 선형 보간 품질 업
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        await page.render({ canvasContext: ctx, viewport }).promise;

        // Text layer
        const textLayerDiv = wrapper.querySelector('.textLayer') as HTMLDivElement | null;
        if (textLayerDiv && pdfjsRef.current) {
          let textStatus: PageTextStatus = 'none';
          const pageNeedsOcr = (scanPages ?? []).includes(pageNum);
          textLayerDiv.style.width = `${Math.floor(cssViewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(cssViewport.height)}px`;
          textLayerDiv.innerHTML = '';
          // Prefer the PDF's own text layer so selectable text works immediately.
          // OCR is only a fallback for pages that are truly image-only.
          let nativeText = '';
          let nativeTextContent: unknown = null;
          try {
            nativeTextContent = await page.getTextContent();
            nativeText = cacheNativeText(pageNum, nativeTextContent);
            if (nativeText.length > 0) {
              const rendered = await renderNativeTextLayer(textLayerDiv, nativeTextContent, cssViewport, pdfjsRef.current);
              if (rendered) textStatus = 'native';
            }
          } catch {
            // Native text layer failure is not fatal; OCR fallback may still work.
          }
          // OCR 이 네이티브 텍스트보다 더 풍부하면 OCR textLayer 를 우선 사용한다.
          // 문제지/스캔본처럼 네이티브 텍스트가 일부만 잡히는 PDF 에서 드래그 선택 체감을 개선한다.
          let ocrRecord: OcrRecord | null = null;
          if (pageNeedsOcr && ocrPagesReady.has(pageNum)) {
            try {
              ocrRecord = await getOcr(blobRef, pageNum);
              const ocrText = (ocrRecord?.text ?? '').replace(/\s+/g, ' ').trim();
              const nativeLayerText = (textLayerDiv.textContent ?? '').replace(/\s+/g, ' ').trim();
              const shouldUseOcrLayer =
                !!ocrText
                && (
                  !nativeLayerText
                  || ocrText.length > nativeText.length + 20
                  || (nativeText.length < 80 && ocrText.length > nativeText.length)
                );
              if (shouldUseOcrLayer) {
                buildOcrTextLayer(textLayerDiv, ocrRecord?.words ?? [], cssViewport.width, cssViewport.height, ocrText);
                if ((textLayerDiv.textContent ?? '').trim()) textStatus = 'ocr';
              }
            } catch { /* noop */ }
          }
          const hasUsefulNativeLayer = isNativeTextUseful(nativeText);
          if (pageNeedsOcr) {
            try {
              const vision = await getVision(blobRef, pageNum);
              const visionText = (vision?.text ?? '').trim();
              const chosenText = chooseMergedPageText({
                nativeText,
                ocrRecord: ocrRecord ?? undefined,
                visionText,
              });
              if (
                isUsefulVisionText(visionText)
                && chosenText === visionText
                && (
                  textStatus !== 'native'
                  || !hasUsefulNativeLayer
                  || visionText.replace(/\s/g, '').length > nativeText.replace(/\s/g, '').length * 1.18
                )
              ) {
                buildVisionTextLayer(textLayerDiv, visionText, cssViewport.width, cssViewport.height, vision?.blocks);
                if ((textLayerDiv.textContent ?? '').trim()) textStatus = 'vision';
              } else if (
                isUsefulVisionText(visionText)
                && vision?.blocks?.length
                && textStatus !== 'none'
              ) {
                const added = appendSupplementalVisionBlocks(
                  textLayerDiv,
                  vision.blocks,
                  cssViewport.width,
                  cssViewport.height,
                );
                if (added > 0) textStatus = 'vision';
              }
            } catch { /* noop */ }
          }
          if (!(textLayerDiv.textContent ?? '').trim()) {
            try {
              nativeTextContent = nativeTextContent ?? await page.getTextContent();
              if (!nativeText) nativeText = cacheNativeText(pageNum, nativeTextContent);
              const rendered = await renderNativeTextLayer(textLayerDiv, nativeTextContent, cssViewport, pdfjsRef.current);
              if (rendered) textStatus = 'native';
            } catch {
              // textLayer 실패는 치명적이지 않음
            }
          }
          if (textStatus === 'none' && pageNeedsOcr && !ocrPagesReady.has(pageNum)) {
            textStatus = 'waiting';
          }
          updatePageTextStatus(pageNum, textStatus);
          // 검색 하이라이트 재적용
          applyHighlight(textLayerDiv, query);
        }
      } catch {
        renderedRef.current.delete(pageNum);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        // 1) 보이는 페이지는 렌더 큐에 추가 (앞뒤 1페이지 선제 렌더 포함)
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (!n || !e.isIntersecting) continue;
          renderPage(n);
          if (n > 1) renderPage(n - 1);
          if (n < numPages) renderPage(n + 1);
        }
        // 2) "현재 페이지" 는 이번 배치에서 가시 비율이 가장 큰 1개만 선택.
        //    여러 페이지가 동시에 교차 영역에 진입해도 winner 는 유일.
        let best: { n: number; ratio: number } | null = null;
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (!n || !e.isIntersecting) continue;
          if (!best || e.intersectionRatio > best.ratio) {
            best = { n, ratio: e.intersectionRatio };
          }
        }
        if (best && best.ratio >= 0.4) {
          setCurrentPage((prev) => {
            if (prev !== best!.n) onActivePageChange?.(best!.n);
            return best!.n;
          });
        }
      },
      { root, threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    for (const [, el] of pageRefs.current) io.observe(el);
    return () => io.disconnect();
  }, [doc, scale, numPages, query, onActivePageChange, blobRef, cacheNativeText, ocrPagesReady, scanPages, updatePageTextStatus]);

  // activePage prop 변경 시 해당 페이지로 스크롤 + 하이라이트
  // 단, 내부 IO 콜백으로 activePage 가 자기 자신(currentPage)으로 되돌아오는 경우는 스킵
  // (그러지 않으면 스크롤 중에 "절반 넘으면 자동 점프" 처럼 보임)
  useEffect(() => {
    if (!activePage || !numPages) return;
    if (activePage === currentPageRef.current) return;
    const el = pageRefs.current.get(activePage);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-slate-100');
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-slate-100');
    }, 1500);
    return () => clearTimeout(t);
  }, [activePage, numPages]);

  // 검색 쿼리 변경 시 모든 렌더된 textLayer에 하이라이트 재적용
  useEffect(() => {
    let hits = 0;
    for (const [, el] of pageRefs.current) {
      const tl = el.querySelector('.textLayer') as HTMLDivElement | null;
      if (tl) hits += applyHighlight(tl, query);
    }
    if (!doc) setHitCount(hits);
  }, [query, numPages, scale]);

  useEffect(() => {
    setSearchIndex(0);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const q = query.trim().toLowerCase();
    if (!doc || q.length < 1) {
      setSearchResults([]);
      setHitCount(0);
      setSearchIndex(0);
      setSearching(false);
      return;
    }
    setSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        const next: Array<{ page: number; snippet: string }> = [];
        try {
          for (let pageNum = 1; pageNum <= numPages; pageNum += 1) {
            if (cancelled) return;
            const { text } = await getMergedPageText(pageNum);
            const lower = text.toLowerCase();
            let from = 0;
            while (next.length < 200) {
              const idx = lower.indexOf(q, from);
              if (idx < 0) break;
              const start = Math.max(0, idx - 22);
              const end = Math.min(text.length, idx + q.length + 34);
              next.push({ page: pageNum, snippet: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}` });
              from = idx + Math.max(q.length, 1);
            }
            if (next.length >= 200) break;
          }
        } finally {
          if (!cancelled) {
            setSearchResults(next);
            setHitCount(next.length);
            setSearchIndex((prev) => Math.min(prev, Math.max(0, next.length - 1)));
            setSearching(false);
          }
        }
      })();
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [doc, getMergedPageText, numPages, query]);

  // 선택 해제 시 플로팅 액션 숨김
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length < 2) setSelAction(null);
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

  useEffect(() => {
    if (!readerOpen || !doc || !currentPage) return;
    let cancelled = false;
    setReaderSource('loading');
    setReaderText('');

    void (async () => {
      try {
        const { text, ocrText, visionText } = await getMergedPageText(currentPage);
        if (cancelled) return;
        setReaderText(text);
        if (text) {
          if (visionText && text === visionText) setReaderSource('vision');
          else if (ocrText && text === ocrText) setReaderSource('ocr');
          else setReaderSource('native');
        } else if (scanPages?.includes(currentPage) && !ocrPagesReady.has(currentPage)) {
          setReaderSource('waiting');
        } else {
          setReaderSource('none');
        }
      } catch {
        if (!cancelled) {
          setReaderText('');
          setReaderSource('none');
        }
      }
    })();

    return () => { cancelled = true; };
  }, [currentPage, doc, getMergedPageText, ocrPagesReady, readerOpen, scanPages]);

  // OCR 결과 페이지 폴링 — useStudyAutoOcr 가 큐를 소유하고 IDB 에 결과 쌓는다.
  // PdfViewer 는 IDB 만 읽어서 textLayer 그리기 (드래그/검색용).
  // 1초 간격 폴링: 큐가 짧게 끝날 수도 있고 길게 갈 수도 있어 충분.
  useEffect(() => {
    if (!blobRef) return;
    let cancelled = false;
    let lastSize = 0;

    const poll = async () => {
      if (cancelled) return;
      try {
        const completed = await getCompletedPages(blobRef);
        if (cancelled) return;
        if (completed.size !== lastSize) {
          setOcrPagesReady(completed);
          // 새로 완료된 페이지의 textLayer 강제 재렌더
          for (const page of completed) {
            if (renderedRef.current.has(page)) renderedRef.current.delete(page);
          }
          setTimeout(() => scrollRef.current?.dispatchEvent(new Event('scroll')), 0);
          lastSize = completed.size;
        }
      } catch { /* IDB 조회 실패 — 다음 폴링 시도 */ }
    };

    void poll(); // 즉시 한 번
    const totalScan = (scanPages ?? []).length;
    // OCR 대상이 있으면 폴링 (1s 간격, 모두 완료되면 자동 정지)
    const interval = totalScan > 0 ? setInterval(() => {
      void poll().then(() => {
        if (lastSize >= totalScan) {
          clearInterval(interval);
        }
      });
    }, 1000) : null;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [blobRef, scanPages]);

  useEffect(() => {
    if (!blobRef || !scanPages || scanPages.length === 0) {
      setOcrDiagnostics(null);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const [records, visionRecords] = await Promise.all([
        getAllForBlob(blobRef),
        getAllVisionForBlob(blobRef),
      ]);
      if (cancelled) return;
      const pageSet = new Set(scanPages);
      const visionTextByPage = new Map(
        visionRecords
          .filter((record) => pageSet.has(record.page))
          .map((record) => [record.page, record.text] as const),
      );
      setOcrDiagnostics(summarizeOcrDiagnostics(
        records.filter((record) => pageSet.has(record.page)),
        visionTextByPage,
        scanPages,
      ));
    };
    void refresh();
    const poller = window.setInterval(() => {
      void refresh();
    }, 1500);
    return () => {
      cancelled = true;
      window.clearInterval(poller);
    };
  }, [blobRef, scanPages]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!blobRef || !scanPages?.includes(currentPage) || !ocrPagesReady.has(currentPage)) {
        setOcrIssue(null);
        return;
      }
      const rec = await getOcr(blobRef, currentPage);
      if (cancelled) return;
      const quality = analyzeOcrRecord(rec);
      if (!rec || quality.reason === 'empty') {
        setOcrIssue(`p.${currentPage} OCR 결과 없음`);
        return;
      }
      if (quality.reason === 'short-text' || quality.reason === 'few-words') {
        setOcrIssue(`p.${currentPage} 인식 부족`);
        return;
      }
      if (quality.reason === 'low-confidence') {
        setOcrIssue(`p.${currentPage} 인식 신뢰도 낮음`);
        return;
      }
      setOcrIssue(null);
    })();
    return () => { cancelled = true; };
  }, [blobRef, currentPage, ocrPagesReady, scanPages]);

  // currentPage 기준 ±2 외 페이지 canvas 메모리 해제 — 대용량 PDF 에서 RAM 폭증 방지
  useEffect(() => {
    if (!numPages) return;
    const KEEP = 2;
    for (const [n, el] of pageRefs.current) {
      if (Math.abs(n - currentPage) <= KEEP) continue;
      if (!renderedRef.current.has(n)) continue;
      const canvas = el.querySelector('canvas') as HTMLCanvasElement | null;
      if (canvas && canvas.width > 0) {
        // width=0 으로 내리면 백킹 버퍼가 해제됨.
        canvas.width = 0;
        canvas.height = 0;
      }
      // text layer 는 용량이 작아 유지 — 검색 하이라이트 유지 목적
      renderedRef.current.delete(n);
    }
  }, [currentPage, numPages]);

  const zoomOut = () => { setFitMode('custom'); setScale((s) => Math.max(0.4, s - 0.15)); };
  const zoomIn = () => { setFitMode('custom'); setScale((s) => Math.min(3, s + 0.15)); };
  const resetZoom = () => { setFitMode('width'); };

  const jumpTo = useCallback((n: number) => {
    const el = pageRefs.current.get(Math.max(1, Math.min(numPages, n)));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [numPages]);

  const jumpToSearchResult = useCallback((delta: number) => {
    if (searchResults.length === 0) return;
    const nextIndex = (searchIndex + delta + searchResults.length) % searchResults.length;
    const result = searchResults[nextIndex];
    setSearchIndex(nextIndex);
    setCurrentPage(result.page);
    jumpTo(result.page);
  }, [jumpTo, searchIndex, searchResults]);

  const resetRenderedTextLayers = useCallback((pages?: number[]) => {
    const pageSet = pages ? new Set(pages) : null;
    if (!pageSet) {
      renderedRef.current.clear();
      mergedTextCacheRef.current.clear();
      mergedTextPromiseRef.current.clear();
    } else {
      for (const page of pageSet) {
        renderedRef.current.delete(page);
        mergedTextCacheRef.current.delete(page);
        mergedTextPromiseRef.current.delete(page);
      }
    }
    for (const [page, el] of pageRefs.current) {
      if (pageSet && !pageSet.has(page)) continue;
      const tl = el.querySelector('.textLayer') as HTMLDivElement | null;
      if (tl) tl.innerHTML = '';
    }
  }, []);

  const reanalyzePdf = useCallback(async () => {
    await deleteOcrForBlob(blobRef);
    await deleteVisionForBlob(blobRef);
    setOcrPagesReady(new Set());
    setOcrIssue(null);
    resetRenderedTextLayers();
    onOcrEnable?.(false);
    window.setTimeout(() => onOcrEnable?.(true), 50);
    window.setTimeout(() => scrollRef.current?.dispatchEvent(new Event('scroll')), 80);
  }, [blobRef, onOcrEnable, resetRenderedTextLayers]);

  const reanalyzeCurrentPage = useCallback(async () => {
    await Promise.all([
      deleteOcrPages(blobRef, [currentPage]),
      deleteVisionPages(blobRef, [currentPage]),
    ]);
    setOcrPagesReady((prev) => {
      const next = new Set(prev);
      next.delete(currentPage);
      return next;
    });
    setOcrIssue(null);
    resetRenderedTextLayers([currentPage]);
    onOcrEnable?.(false);
    window.setTimeout(() => onOcrEnable?.(true, [currentPage]), 50);
    window.setTimeout(() => {
      scrollRef.current?.dispatchEvent(new Event('scroll'));
      jumpTo(currentPage);
    }, 80);
  }, [blobRef, currentPage, jumpTo, onOcrEnable, resetRenderedTextLayers]);

  // 키보드 네비게이션 + Ctrl+F — 뷰어(scrollRef)에 포커스가 있거나 내부 요소에서 이벤트 발생 시
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !numPages) return;
    const onKey = (e: KeyboardEvent) => {
      // 검색 입력 / number input 안에서는 가로채지 않음
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') {
        // Ctrl+F 는 input 안에서도 뷰어 검색으로 통일
        if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
          e.preventDefault();
          setSearchOpen(true);
        }
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        setSearchOpen(true);
        return;
      }
      if (mod && (e.key === '=' || e.key === '+')) {
        e.preventDefault(); zoomIn(); return;
      }
      if (mod && e.key === '-') {
        e.preventDefault(); zoomOut(); return;
      }
      if (mod && e.key === '0') {
        e.preventDefault(); resetZoom(); return;
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault(); jumpTo(currentPage - 1); return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault(); jumpTo(currentPage + 1); return;
      }
      if (e.key === 'Home') { e.preventDefault(); jumpTo(1); return; }
      if (e.key === 'End') { e.preventDefault(); jumpTo(numPages); return; }
    };
    root.addEventListener('keydown', onKey);
    return () => root.removeEventListener('keydown', onKey);
  }, [currentPage, numPages, jumpTo]);

  const pageList = useMemo(() => Array.from({ length: numPages }, (_, i) => i + 1), [numPages]);
  const analysisStatus = useMemo(() => {
    if (!analysisProgress || !analysisProgress.isProcessing) return null;
    const total = analysisProgress.ocrTotal + analysisProgress.visionTotal;
    const done = analysisProgress.ocrDone + analysisProgress.visionDone;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const label = analysisProgress.phase === 'vision' ? '그림 분석' : '텍스트 분석';
    return { label, pct, done, total };
  }, [analysisProgress]);
  const ocrReadiness = useMemo(() => {
    const total = scanPages?.length ?? 0;
    if (total === 0) return null;
    const ready = Math.min(ocrPagesReady.size, total);
    return {
      ready,
      total,
      done: ready >= total,
      label: ready >= total ? '텍스트 선택 준비' : `텍스트 선택 ${ready}/${total}`,
    };
  }, [ocrPagesReady, scanPages]);
  const currentTextMeta = getPageTextStatusMeta(pageTextStatus[currentPage]);
  const effectiveOcrIssue = pageTextStatus[currentPage] === 'native' ? null : ocrIssue;
  const shouldShowTextAssist =
    !!currentTextMeta
    && (currentTextMeta.status === 'waiting' || currentTextMeta.status === 'none' || !!effectiveOcrIssue);
  const ocrDiagnosticsTitle = useMemo(() => {
    if (!ocrDiagnostics || ocrDiagnostics.total === 0) return '';
    const confidence = ocrDiagnostics.avgConfidence === null ? '신뢰도 계산 중' : `평균 신뢰도 ${ocrDiagnostics.avgConfidence}%`;
    const seconds = ocrDiagnostics.totalDurationMs > 0 ? ` · ${Math.round(ocrDiagnostics.totalDurationMs / 100) / 10}초` : '';
    const weak = ocrDiagnostics.weakPages.length > 0 ? ` · 약한 페이지 p.${ocrDiagnostics.weakPages.join(', p.')}` : '';
    const pending = ocrDiagnostics.pendingPages.length > 0 ? ` · 대기 p.${ocrDiagnostics.pendingPages.join(', p.')}` : '';
    const corrected = ocrDiagnostics.corrected > 0 ? ` · Vision 보정 ${ocrDiagnostics.corrected}` : '';
    const pass = ocrDiagnostics.avgPassCount !== null ? ` · pass ${ocrDiagnostics.avgPassCount}` : '';
    const expensive = ocrDiagnostics.expensiveFallbackPages.length > 0 ? ` · fallback p.${ocrDiagnostics.expensiveFallbackPages.join(', p.')}` : '';
    const slowest = ocrDiagnostics.slowestPage ? ` · slowest p.${ocrDiagnostics.slowestPage.page} ${Math.round(ocrDiagnostics.slowestPage.durationMs / 100) / 10}s` : '';
    return `OCR 품질 ${ocrDiagnostics.strong + ocrDiagnostics.corrected}/${ocrDiagnostics.total} · ${confidence}${seconds}${pass}${slowest}${corrected}${pending}${weak}${expensive}`;
  }, [ocrDiagnostics]);
  const jumpToFirstWeakOcrPage = useCallback(() => {
    const page = ocrDiagnostics?.weakPages[0] ?? ocrDiagnostics?.pendingPages[0];
    if (!page) return;
    setCurrentPage(page);
    jumpTo(page);
  }, [jumpTo, ocrDiagnostics]);

  const runSelectionAssist = (mode: 'ask' | 'summary' | 'explain' | 'quiz', text: string) => {
    const trimmed = text.replace(/\s+/g, ' ').trim();
    if (!trimmed) return;
    if (mode === 'ask') {
      onAskAboutSelection?.(trimmed);
    } else {
      const prompt = mode === 'summary'
        ? `p.${currentPage}에서 선택한 부분을 핵심 개념 중심으로 짧게 요약해줘. 중요한 용어와 시험 포인트가 있으면 따로 정리해줘.\n\n${trimmed}`
        : mode === 'explain'
          ? `p.${currentPage}에서 선택한 부분을 처음 보는 사람도 이해할 수 있게 쉽게 풀어서 설명해줘. 그림이나 표 해석이 필요하면 같이 설명해줘.\n\n${trimmed}`
          : `p.${currentPage}에서 선택한 부분으로 바로 풀 수 있는 확인 문제 3개를 만들고, 각 문제의 정답과 짧은 해설을 붙여줘.\n\n${trimmed}`;
      window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { prompt } }));
    }
    setSelAction(null);
    window.getSelection()?.removeAllRanges();
  };

  if (err) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-[12px] text-red-600 mb-2">PDF 로딩 실패: {err}</p>
          {downloadUrl && (
            <a href={downloadUrl} download className="text-[11.5px] text-indigo-600 hover:underline">원본 다운로드</a>
          )}
        </div>
      </div>
    );
  }
  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center text-[12px] text-slate-500">
        <span className="inline-block h-3 w-3 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin mr-2" />
        PDF 불러오는 중…
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* 툴바 */}
      <div className="shrink-0 border-b border-slate-200 bg-white/95 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-900/95">
        <div className="study-scroll-row flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              onClick={() => setShowThumbs((v) => !v)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-colors',
                showThumbs ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
              aria-label="썸네일 보기"
              title="페이지 썸네일"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              onClick={() => jumpTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="이전 페이지"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex h-8 items-center gap-1 px-1 text-[11.5px] tabular-nums">
              <input
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (n >= 1 && n <= numPages) { setCurrentPage(n); jumpTo(n); }
                }}
                className="h-6 w-10 rounded-md border border-slate-200 bg-white px-1 text-center outline-none transition-colors focus:border-indigo-400 dark:border-slate-700 dark:bg-slate-900"
              />
              <span className="pr-1 text-slate-500">/ {numPages}</span>
            </div>
            <button
              onClick={() => jumpTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="다음 페이지"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => setReaderOpen((v) => !v)}
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-[11px] font-semibold transition-colors',
              readerOpen
                ? 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
            )}
            title="현재 페이지 텍스트 보기"
            aria-label="현재 페이지 텍스트 보기"
            aria-pressed={readerOpen}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          {ocrDiagnostics && ocrDiagnostics.total > 0 && (
            <button
              onClick={jumpToFirstWeakOcrPage}
              disabled={ocrDiagnostics.weakPages.length === 0 && ocrDiagnostics.pendingPages.length === 0}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-semibold transition-colors',
                ocrDiagnostics.weakPages.length > 0 || ocrDiagnostics.pendingPages.length > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 disabled:cursor-default dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
              )}
              title={ocrDiagnosticsTitle}
              aria-label={ocrDiagnosticsTitle || 'OCR 품질'}
            >
              {ocrDiagnostics.weakPages.length > 0 || ocrDiagnostics.pendingPages.length > 0 ? <AlertCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              OCR {ocrDiagnostics.strong + ocrDiagnostics.corrected}/{ocrDiagnostics.total}
            </button>
          )}

          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
            <button onClick={zoomOut} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="축소"><Minus className="h-3.5 w-3.5" /></button>
            <span className="min-w-10 px-0.5 text-center text-[11px] tabular-nums text-slate-600 dark:text-slate-300">{Math.round(scale * 100)}%</span>
            <button onClick={zoomIn} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="확대"><Plus className="h-3.5 w-3.5" /></button>
          </div>

          <div className="inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
            <button
              onClick={() => setFitMode((m) => (m === 'width' ? 'page' : 'width'))}
              className={cn(
                'h-8 rounded-lg px-2 text-[11px] font-semibold flex items-center gap-1 transition-colors',
                fitMode === 'width' ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
              title="폭/페이지 맞추기 토글"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              {fitMode === 'width' ? '폭' : fitMode === 'page' ? '페이지' : '수동'}
            </button>
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className={cn(
                'h-8 w-8 flex items-center justify-center rounded-lg transition-colors',
                searchOpen ? 'bg-white text-indigo-700 shadow-sm dark:bg-slate-800 dark:text-indigo-300' : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800',
              )}
              aria-label="검색"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </div>

          {searchOpen && (
            <div className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    jumpToSearchResult(e.shiftKey ? -1 : 1);
                  }
                }}
                placeholder="페이지 검색"
                className="h-8 w-32 rounded-lg bg-transparent px-2 text-[11.5px] outline-none focus:bg-slate-50 dark:focus:bg-slate-800"
              />
              <span
                className="max-w-20 truncate px-1 text-[10.5px] tabular-nums text-slate-500"
                title={searchResults[searchIndex]?.snippet}
              >
                {searching ? '검색 중' : hitCount > 0 ? `${searchIndex + 1}/${hitCount}` : '0건'}
              </span>
              <button
                onClick={() => jumpToSearchResult(-1)}
                disabled={hitCount === 0}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                aria-label="이전 검색 결과"
                title="이전 검색 결과"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                onClick={() => jumpToSearchResult(1)}
                disabled={hitCount === 0}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                aria-label="다음 검색 결과"
                title="다음 검색 결과"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => { setQuery(''); setSearchOpen(false); }}
                className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="검색 닫기"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <div className="ml-auto inline-flex shrink-0 items-center gap-0.5 rounded-xl border border-slate-200 bg-slate-50/80 p-0.5 dark:border-slate-800 dark:bg-slate-950/40">
            {scanPages && scanPages.length > 0 && (
              <button
                onClick={reanalyzePdf}
                className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="OCR 다시 분석"
                aria-label="OCR 다시 분석"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            {/* OCR 상태 문구는 툴바에서 제외한다. 좁은 PDF 패널에서는 상태 배지가 잘려 보이므로,
                필요한 안내는 아래 PdfTextAssistBanner 에서만 보여준다. */}
            {downloadUrl && (
              <a
                href={downloadUrl}
                download
                className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                title="원본 다운로드"
              >
                <Download className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 본문: (썸네일) + 페이지 스트림 */}
      <div className="relative flex-1 min-h-0 flex overflow-hidden">
        {showThumbs && doc && (
          <ThumbnailSidebar
            doc={doc}
            numPages={numPages}
            currentPage={currentPage}
            onJump={(n) => jumpTo(n)}
          />
        )}
        <div
          ref={scrollRef}
          tabIndex={0}
          className="relative flex-1 min-w-0 overflow-auto px-4 py-4 outline-none focus-visible:ring-1 focus-visible:ring-indigo-300"
          style={{ scrollBehavior: 'smooth' }}
          onMouseDown={(e) => {
            pointerDownRef.current = { x: e.clientX, y: e.clientY };
            setSelectionHint(null);
          }}
          onMouseUp={(e) => {
            const down = pointerDownRef.current;
            const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
            pointerDownRef.current = null;
            handleTextSelection(
              scrollRef.current,
              setSelAction,
              onAskAboutSelection,
              moved > 8 ? () => {
                const message = getSelectionEmptyMessage(pageTextStatus[currentPage], analysisStatus);
                if (!message) return;
                setSelectionHint(message);
                window.setTimeout(() => setSelectionHint((prev) => (prev === message ? null : prev)), 2800);
              } : undefined,
            );
          }}
        >
          <div className="flex flex-col items-center gap-4">
            {shouldShowTextAssist && currentTextMeta && (
              <PdfTextAssistBanner
                meta={currentTextMeta}
                analysisStatus={analysisStatus}
                ocrReadiness={ocrReadiness}
                ocrIssue={effectiveOcrIssue}
                onOpenReader={() => setReaderOpen(true)}
                onReanalyze={scanPages && scanPages.length > 0 ? reanalyzeCurrentPage : undefined}
              />
            )}
            {pageList.map((n) => {
              const size = pageSizesRef.current.get(n);
              const w = (size?.width ?? 612) * scale;
              const h = (size?.height ?? 792) * scale;
              return (
                <div
                  key={n}
                  data-page={n}
                  ref={(el) => {
                    if (el) pageRefs.current.set(n, el);
                    else pageRefs.current.delete(n);
                  }}
                  className="relative bg-white shadow-md rounded-sm transition-shadow"
                  style={{ width: w, height: h }}
                >
                  <div className="absolute top-1 right-2 text-[10px] tabular-nums text-slate-400 bg-white/70 px-1.5 rounded pointer-events-none select-none">
                    p.{n}
                  </div>
                  <canvas className="block" />
                  <div
                    className="textLayer absolute inset-0 overflow-hidden opacity-100 leading-none"
                    style={{ lineHeight: 1 }}
                  />
                </div>
              );
            })}
          </div>

          {/* 선택 텍스트 플로팅 액션 */}
          {selAction && onAskAboutSelection && (
            <div
              className="absolute z-20 flex items-center gap-1 rounded-2xl bg-slate-950/95 px-1.5 py-1.5 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
              style={{ left: selAction.x, top: selAction.y }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                onClick={() => runSelectionAssist('ask', selAction.text)}
                className="flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11.5px] font-medium hover:bg-white/10"
              >
                <MessageSquarePlus className="h-3 w-3" />
                질문
              </button>
              <button
                onClick={() => runSelectionAssist('summary', selAction.text)}
                className="flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11.5px] font-medium hover:bg-white/10"
                title="선택한 부분 요약"
              >
                <ScanText className="h-3 w-3" />
                요약
              </button>
              <button
                onClick={() => runSelectionAssist('explain', selAction.text)}
                className="flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11.5px] font-medium hover:bg-white/10"
                title="선택한 부분 쉽게 설명"
              >
                <FileText className="h-3 w-3" />
                쉽게
              </button>
              <button
                onClick={() => runSelectionAssist('quiz', selAction.text)}
                className="flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11.5px] font-medium hover:bg-white/10"
                title="선택한 부분으로 문제 만들기"
              >
                <CheckCircle2 className="h-3 w-3" />
                퀴즈
              </button>
              <span className="mx-0.5 h-5 w-px bg-white/15" />
              {[
                ['yellow', '#fde047', 'important'],
                ['pink', '#f9a8d4', 'confusing'],
                ['blue', '#93c5fd', 'review'],
                ['green', '#86efac', 'memorize'],
              ].map(([color, swatch, label]) => (
                <button
                  key={color}
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('study:addHighlight', {
                      detail: { text: selAction.text, color, page: currentPage },
                    }));
                    setSelAction(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="h-6 w-6 rounded-full border border-white/25 hover:scale-105"
                  style={{ backgroundColor: swatch }}
                  title={label}
                  aria-label={`${label} 하이라이트`}
                />
              ))}
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(selAction.text);
                  setSelAction(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="flex h-7 items-center gap-1 rounded-xl px-2.5 text-[11.5px] font-medium hover:bg-white/10"
                title="클립보드로 복사"
              >
                <Copy className="h-3 w-3" />
                복사
              </button>
            </div>
          )}

          {selectionHint && (
            <div className="pointer-events-none sticky bottom-4 z-20 mx-auto mt-4 flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-[11.5px] font-semibold text-slate-600 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-200">
              <ScanText className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              <span>{selectionHint}</span>
            </div>
          )}
        </div>
        {readerOpen && (
          <PdfPageTextPanel
            page={currentPage}
            text={readerText}
            source={readerSource}
            onClose={() => setReaderOpen(false)}
            onAskText={onAskAboutSelection}
            onSummarize={(text) => {
              window.dispatchEvent(new CustomEvent('study:askSelection', {
                detail: {
                  prompt: `p.${currentPage} 내용을 핵심 개념 중심으로 요약하고, 시험에 나올 만한 포인트를 따로 정리해줘.\n\n${text}`,
                },
              }));
            }}
          />
        )}
      </div>

      <style>{`
        .textLayer {
          color: transparent;
          user-select: text;
          z-index: 2;
          pointer-events: auto;
        }
        .textLayer > span, .textLayer > br {
          color: transparent;
          position: absolute;
          white-space: pre;
          cursor: text;
          transform-origin: 0% 0%;
        }
        .textLayer ::selection { background: rgba(99, 102, 241, 0.35); }
        .textLayer mark.hlt {
          background: rgba(250, 204, 21, 0.55);
          color: transparent;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
}

/**
 * textLayer 내부 span 의 텍스트에서 query 를 <mark class="hlt"> 로 감싼다.
 * 반환: 매칭 건수.
 */
function applyHighlight(container: HTMLElement, query: string): number {
  const q = query.trim();
  // 이전 하이라이트 제거
  container.querySelectorAll('mark.hlt').forEach((m) => {
    const parent = m.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(m.textContent ?? ''), m);
      parent.normalize();
    }
  });
  if (q.length < 1) return 0;
  const spans = container.querySelectorAll('span');
  const rx = new RegExp(escapeRegExp(q), 'gi');
  let count = 0;
  spans.forEach((span) => {
    const text = span.textContent ?? '';
    if (!text) return;
    if (!rx.test(text)) { rx.lastIndex = 0; return; }
    rx.lastIndex = 0;
    let html = '';
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      html += escapeHtml(text.slice(last, m.index));
      html += `<mark class="hlt">${escapeHtml(m[0])}</mark>`;
      last = m.index + m[0].length;
      count += 1;
      if (m[0].length === 0) rx.lastIndex++;
    }
    html += escapeHtml(text.slice(last));
    span.innerHTML = html;
  });
  return count;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function getTextContentPlain(textContent: unknown): string {
  return extractPdfTextContentForStudy(textContent as { items?: unknown[] });
}

async function renderNativeTextLayer(
  container: HTMLDivElement,
  textContent: unknown,
  viewport: unknown,
  pdfjs: typeof import('pdfjs-dist') | null,
): Promise<boolean> {
  container.innerHTML = '';
  container.style.setProperty('--scale-factor', String((viewport as { scale?: number })?.scale ?? 1));

  const renderer = pdfjs as unknown as {
    renderTextLayer?: (opts: Record<string, unknown>) => { promise?: Promise<void> } | Promise<void>;
  };

  if (renderer?.renderTextLayer) {
    try {
      const task = renderer.renderTextLayer({
        textContentSource: textContent,
        container,
        viewport,
        textDivs: [],
      });
      if (task && typeof (task as { promise?: Promise<void> }).promise?.then === 'function') {
        await (task as { promise: Promise<void> }).promise;
      } else {
        await task;
      }
      if ((container.textContent ?? '').trim()) return true;
    } catch {
      container.innerHTML = '';
    }
  }

  buildSimpleNativeTextLayer(container, textContent, viewport, pdfjs);
  return !!(container.textContent ?? '').trim();
}

function buildSimpleNativeTextLayer(
  container: HTMLElement,
  textContent: unknown,
  viewport: unknown,
  pdfjs: typeof import('pdfjs-dist') | null,
) {
  const items = (textContent as { items?: Array<unknown>; styles?: Record<string, { ascent?: number; descent?: number }> })?.items;
  if (!Array.isArray(items)) return;
  const vp = viewport as {
    scale?: number;
    transform?: number[];
    width?: number;
    height?: number;
  };
  const transformUtil = (pdfjs as unknown as { Util?: { transform?: (a: number[], b: number[]) => number[] } } | null)?.Util?.transform;
  if (!transformUtil || !Array.isArray(vp.transform)) return;

  for (const item of items) {
    const textItem = item as {
      str?: string;
      transform?: number[];
      width?: number;
      height?: number;
      fontName?: string;
    };
    const text = textItem.str ?? '';
    if (!text.trim() || !Array.isArray(textItem.transform)) continue;

    const tx = transformUtil(vp.transform, textItem.transform);
    const fontHeight = Math.max(1, Math.hypot(tx[2] ?? 0, tx[3] ?? 0) || (textItem.height ?? 10) * (vp.scale ?? 1));
    const style = (textContent as { styles?: Record<string, { ascent?: number; descent?: number }> })?.styles?.[textItem.fontName ?? ''];
    const ascent = typeof style?.ascent === 'number'
      ? style.ascent
      : typeof style?.descent === 'number'
      ? 1 + style.descent
      : 0.8;

    const span = document.createElement('span');
    span.textContent = text;
    span.style.left = `${tx[4] ?? 0}px`;
    span.style.top = `${(tx[5] ?? 0) - fontHeight * ascent}px`;
    span.style.fontSize = `${fontHeight}px`;
    span.style.fontFamily = 'sans-serif';
    span.style.transform = `scaleX(${computeTextScale(textItem, fontHeight, vp.scale ?? 1)})`;
    span.style.transformOrigin = '0% 0%';
    span.style.whiteSpace = 'pre';
    span.style.color = 'transparent';
    container.appendChild(span);
  }
}

function computeTextScale(item: { str?: string; width?: number }, fontHeight: number, viewportScale: number) {
  const text = item.str ?? '';
  const expectedWidth = (item.width ?? 0) * viewportScale;
  const roughWidth = Math.max(1, text.length * fontHeight * 0.55);
  if (!expectedWidth || !Number.isFinite(expectedWidth)) return 1;
  return Math.max(0.25, Math.min(4, expectedWidth / roughWidth));
}

function getPageTextStatusMeta(status?: PageTextStatus) {
  if (!status) return null;
  if (status === 'native') {
    return {
      status,
      label: '드래그 선택 가능',
      title: 'PDF 원본 텍스트 레이어로 바로 선택할 수 있어요.',
      className: 'border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
      dotClassName: 'bg-emerald-500',
    };
  }
  if (status === 'ocr') {
    return {
      status,
      label: 'OCR 선택 가능',
      title: 'OCR 결과로 만든 텍스트 레이어를 선택할 수 있어요.',
      className: 'border-indigo-100 bg-indigo-50 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200',
      dotClassName: 'bg-indigo-500',
    };
  }
  if (status === 'vision') {
    return {
      status,
      label: 'Vision 선택 가능',
      title: 'Vision 보정 텍스트로 만든 선택 레이어가 적용되었어요.',
      className: 'border-sky-100 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200',
      dotClassName: 'bg-sky-500',
    };
  }
  if (status === 'waiting') {
    return {
      status,
      label: 'OCR 대기 중',
      title: '이 페이지는 분석이 끝나면 드래그 선택이 가능해져요.',
      className: 'border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
      dotClassName: 'bg-amber-500 animate-pulse',
    };
  }
  return {
    status,
    label: '선택 텍스트 없음',
    title: '이 페이지에는 선택 가능한 텍스트 레이어가 아직 없어요.',
    className: 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
    dotClassName: 'bg-slate-300',
  };
}

function PdfTextAssistBanner({
  meta,
  analysisStatus,
  ocrReadiness,
  ocrIssue,
  onOpenReader,
  onReanalyze,
}: {
  meta: NonNullable<ReturnType<typeof getPageTextStatusMeta>>;
  analysisStatus: { label: string; pct: number; done: number; total: number } | null;
  ocrReadiness: { ready: number; total: number; done: boolean; label: string } | null;
  ocrIssue: string | null;
  onOpenReader: () => void;
  onReanalyze?: () => void;
}) {
  const isWaiting = meta.status === 'waiting';
  const isNone = meta.status === 'none';
  const tone = ocrIssue ? 'warning' : isWaiting ? 'working' : 'quiet';
  const Icon = tone === 'warning' ? AlertCircle : isWaiting ? ScanText : CheckCircle2;
  const title = ocrIssue
    ? '이 페이지의 OCR 품질이 낮아 보여요'
    : isWaiting
    ? '드래그 선택을 준비하고 있어요'
    : '이 페이지에는 선택 가능한 텍스트가 없어요';
  const description = ocrIssue
    ? '문제지나 스캔본처럼 글자가 작거나 흐린 페이지는 일부 글자를 놓칠 수 있어요. 필요하면 재분석을 눌러 다시 읽어보세요.'
    : isWaiting
    ? '분석이 끝나면 PDF 위에 투명 텍스트 레이어가 붙어서 글씨를 드래그하고 질문으로 보낼 수 있어요.'
    : '원본 PDF 자체에 텍스트가 없거나 아직 OCR 대상이 아닌 페이지일 수 있어요. 검색·질문 정확도가 낮으면 재분석을 시도해보세요.';

  return (
    <div
      className={cn(
        'sticky top-3 z-20 mx-auto w-[min(520px,calc(100%-24px))] rounded-2xl border px-3 py-2 shadow-lg backdrop-blur',
        tone === 'warning'
          ? 'border-amber-200/80 bg-amber-50/90 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/80 dark:text-amber-100'
          : tone === 'working'
          ? 'border-indigo-200/80 bg-white/95 text-indigo-800 dark:border-indigo-900/50 dark:bg-slate-950/90 dark:text-indigo-100'
          : 'border-slate-200 bg-white/95 text-slate-700 dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-200',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/80 ring-1 dark:bg-slate-900/80',
            tone === 'warning'
              ? 'text-amber-600 ring-amber-100 dark:text-amber-200 dark:ring-amber-900/50'
              : tone === 'working'
              ? 'text-indigo-600 ring-indigo-100 dark:text-indigo-200 dark:ring-indigo-900/50'
              : 'text-slate-500 ring-slate-200 dark:text-slate-300 dark:ring-slate-700',
          )}
        >
          <Icon className={cn('h-4 w-4', isWaiting && 'animate-pulse')} />
        </div>
        <div className="min-w-[220px] flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-bold">{title}</p>
            {analysisStatus && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-bold tabular-nums ring-1 ring-current/10 dark:bg-slate-900/70">
                {analysisStatus.label} {analysisStatus.pct}%
              </span>
            )}
            {!analysisStatus && ocrReadiness && (
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10.5px] font-bold tabular-nums ring-1 ring-current/10 dark:bg-slate-900/70">
                OCR {ocrReadiness.ready}/{ocrReadiness.total}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10.8px] leading-relaxed opacity-80">{description}</p>
        </div>
        <button
          onClick={onOpenReader}
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-[11px] font-bold text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
        >
          <FileText className="h-3.5 w-3.5" />
          텍스트 보기
        </button>
        {onReanalyze && (ocrIssue || isNone) && (
          <button
            onClick={onReanalyze}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            재분석
          </button>
        )}
      </div>
    </div>
  );
}

function PdfPageTextPanel({
  page,
  text,
  source,
  onClose,
  onAskText,
  onSummarize,
}: {
  page: number;
  text: string;
  source: PageReaderSource;
  onClose: () => void;
  onAskText?: (text: string) => void;
  onSummarize: (text: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const hasText = text.trim().length > 0;
  const label = source === 'loading'
    ? '불러오는 중'
    : source === 'ocr'
    ? 'OCR 텍스트'
    : source === 'vision'
    ? 'Vision 보정 텍스트'
    : source === 'native'
    ? 'PDF 텍스트'
    : source === 'waiting'
    ? 'OCR 대기 중'
    : '텍스트 없음';

  const captureSelection = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().replace(/\s+/g, ' ').trim() ?? '';
    const anchor = selection?.anchorNode;
    const focus = selection?.focusNode;
    if (
      !selected ||
      !anchor ||
      !focus ||
      !panelRef.current?.contains(anchor) ||
      !panelRef.current?.contains(focus)
    ) {
      setSelectedText('');
      return;
    }
    setSelectedText(selected.slice(0, 1200));
  };

  const ask = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || !onAskText) return;
    onAskText(trimmed);
    window.getSelection()?.removeAllRanges();
    setSelectedText('');
  };

  const copy = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    void navigator.clipboard?.writeText(trimmed);
  };

  return (
    <aside
      className={cn(
        'absolute inset-x-3 bottom-3 z-30 flex max-h-[52%] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
        'dark:border-slate-800 dark:bg-slate-900',
      )}
      aria-label="현재 페이지 텍스트"
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-200">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-bold text-slate-900 dark:text-slate-100">p.{page} 텍스트</p>
          <p className="text-[10.5px] font-medium text-slate-500 dark:text-slate-400">{label}</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label="텍스트 패널 닫기"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap gap-1.5 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
        <button
          onClick={() => ask(selectedText || text)}
          disabled={!hasText || !onAskText}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          {selectedText ? '선택 질문' : '페이지 질문'}
        </button>
        <button
          onClick={() => onSummarize(text)}
          disabled={!hasText}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
        >
          <ScanText className="h-3.5 w-3.5" />
          요약
        </button>
        <button
          onClick={() => copy(selectedText || text)}
          disabled={!hasText}
          className="inline-flex h-7 items-center gap-1.5 rounded-full border border-slate-200 px-2.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:text-slate-200"
        >
          <Copy className="h-3.5 w-3.5" />
          복사
        </button>
      </div>

      <div
        ref={panelRef}
        onMouseUp={captureSelection}
        onKeyUp={captureSelection}
        className="min-h-0 flex-1 overflow-auto px-4 py-3 text-[12.5px] leading-relaxed text-slate-700 selection:bg-indigo-200/80 dark:text-slate-200 dark:selection:bg-indigo-500/35"
      >
        {source === 'loading' && (
          <div className="flex items-center gap-2 text-slate-500">
            <span className="h-3 w-3 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
            텍스트를 불러오는 중이에요.
          </div>
        )}
        {source === 'waiting' && (
          <p className="text-slate-500 dark:text-slate-400">OCR 분석이 끝나면 이곳에서 페이지 글을 드래그해서 질문할 수 있어요.</p>
        )}
        {source !== 'loading' && source !== 'waiting' && !hasText && (
          <p className="text-slate-500 dark:text-slate-400">이 페이지에서 읽을 수 있는 텍스트를 아직 찾지 못했어요. 필요하면 OCR 재분석을 시도해 보세요.</p>
        )}
        {hasText && <p className="whitespace-pre-wrap break-words">{text}</p>}
      </div>
    </aside>
  );
}

function getSelectionEmptyMessage(
  status: PageTextStatus | undefined,
  analysisStatus: { label: string; pct: number; done: number; total: number } | null,
) {
  if (status === 'native' || status === 'ocr' || status === 'vision') return null;
  if (status === 'waiting') {
    return analysisStatus
      ? `아직 ${analysisStatus.label} 중이에요. 완료되면 드래그 선택이 가능해져요.`
      : '아직 OCR 결과를 기다리는 중이에요. 잠시 뒤 다시 드래그해보세요.';
  }
  if (status === 'none') return '이 페이지에는 아직 선택 가능한 텍스트 레이어가 없어요.';
  return '페이지 렌더링이 끝난 뒤 다시 드래그해보세요.';
}

/**
 * OCR 결과(words + 정규화 bbox)를 textLayer 용 absolute-span 들로 구성.
 * pdf.js 네이티브 textLayer 와 동일한 스타일로 렌더 (`.textLayer > span`).
 */
function buildOcrTextLayer(
  container: HTMLElement,
  words: { text: string; x0: number; y0: number; x1: number; y1: number }[],
  cssWidth: number,
  cssHeight: number,
  sourceText = '',
) {
  container.innerHTML = '';
  for (const w of words) {
    if (!w.text || w.x1 <= w.x0 || w.y1 <= w.y0) continue;
    const span = document.createElement('span');
    span.textContent = `${w.text} `;
    const left = w.x0 * cssWidth;
    const top = w.y0 * cssHeight;
    const width = (w.x1 - w.x0) * cssWidth;
    const height = (w.y1 - w.y0) * cssHeight;
    const fontSize = Math.max(5, height * 0.95);
    const text = `${w.text} `;
    const roughTextWidth = Math.max(1, text.length * fontSize * 0.55);
    const scaleX = Math.max(0.25, Math.min(4, width / roughTextWidth));
    span.style.position = 'absolute';
    span.style.left = `${left}px`;
    span.style.top = `${top}px`;
    span.style.width = `${width}px`;
    span.style.height = `${height}px`;
    span.style.fontSize = `${fontSize}px`;
    span.style.whiteSpace = 'pre';
    span.style.color = 'transparent';
    span.style.lineHeight = '1';
    span.style.transform = `scaleX(${scaleX})`;
    span.style.transformOrigin = '0% 0%';
    container.appendChild(span);
  }
  if (hasEnoughTextLayerCoverage(container.textContent ?? '', sourceText)) return;
  appendLooseTextLayer(container, sourceText, cssWidth, cssHeight);
}

/**
 * 텍스트 선택 이벤트 → 플로팅 액션 툴팁 위치 계산.
 * scrollRoot 내부의 선택 영역만 대상으로 한다.
 */
function buildVisionTextLayer(
  container: HTMLElement,
  text: string,
  cssWidth: number,
  cssHeight: number,
  blocks?: VisionTextBlock[],
) {
  container.innerHTML = '';
  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      if (!block.text || block.x1 <= block.x0 || block.y1 <= block.y0) continue;
      const span = document.createElement('span');
      const left = block.x0 * cssWidth;
      const top = block.y0 * cssHeight;
      const width = Math.max(10, (block.x1 - block.x0) * cssWidth);
      const height = Math.max(10, (block.y1 - block.y0) * cssHeight);
      const fontSize = Math.max(7, Math.min(18, height * 0.72));
      span.textContent = block.text;
      span.style.position = 'absolute';
      span.style.left = `${left}px`;
      span.style.top = `${top}px`;
      span.style.width = `${width}px`;
      span.style.minHeight = `${height}px`;
      span.style.fontSize = `${fontSize}px`;
      span.style.whiteSpace = 'pre-wrap';
      span.style.color = 'transparent';
      span.style.lineHeight = '1.25';
      span.style.userSelect = 'text';
      container.appendChild(span);
    }
    if (hasEnoughTextLayerCoverage(container.textContent ?? '', text)) return;
  }

  appendLooseTextLayer(container, text, cssWidth, cssHeight);
}

function appendSupplementalVisionBlocks(
  container: HTMLElement,
  blocks: VisionTextBlock[],
  cssWidth: number,
  cssHeight: number,
): number {
  let existing = normalizeSelectableLayerText(container.textContent ?? '');
  const seen = new Set<string>();
  let added = 0;

  for (const block of blocks) {
    const rawText = block.text?.trim();
    if (!rawText || block.x1 <= block.x0 || block.y1 <= block.y0) continue;
    const key = normalizeSelectableLayerText(rawText);
    const positionKey = [
      key,
      Math.round(block.x0 * 100),
      Math.round(block.y0 * 100),
      Math.round(block.x1 * 100),
      Math.round(block.y1 * 100),
    ].join(':');
    if (!key || seen.has(positionKey) || (key.length >= 3 && existing.includes(key))) continue;

    const left = block.x0 * cssWidth;
    const top = block.y0 * cssHeight;
    const width = Math.max(8, (block.x1 - block.x0) * cssWidth);
    const height = Math.max(8, (block.y1 - block.y0) * cssHeight);
    const fontSize = Math.max(6, Math.min(16, height * 0.74));
    const span = document.createElement('span');
    span.textContent = rawText;
    span.dataset.source = 'vision-supplement';
    span.style.position = 'absolute';
    span.style.left = `${left}px`;
    span.style.top = `${top}px`;
    span.style.width = `${width}px`;
    span.style.minHeight = `${height}px`;
    span.style.fontSize = `${fontSize}px`;
    span.style.whiteSpace = 'pre-wrap';
    span.style.color = 'transparent';
    span.style.lineHeight = '1.22';
    span.style.userSelect = 'text';
    container.appendChild(span);

    seen.add(positionKey);
    existing += key;
    added += 1;
  }

  return added;
}

function appendLooseTextLayer(
  container: HTMLElement,
  text: string,
  cssWidth: number,
  cssHeight: number,
) {
  const lines = normalizeTextForLooseLayer(text);
  if (lines.length === 0) return;
  const fontSize = Math.max(9, Math.min(14, cssWidth / 58));
  const lineHeight = fontSize * 1.55;
  const left = Math.max(18, cssWidth * 0.06);
  const top = Math.max(18, cssHeight * 0.055);
  const width = Math.max(80, cssWidth - left * 2);
  const maxLines = Math.max(8, Math.floor((cssHeight - top * 2) / lineHeight));
  const visibleLines = lines.slice(0, maxLines);

  for (let index = 0; index < visibleLines.length; index += 1) {
    const span = document.createElement('span');
    span.textContent = visibleLines[index];
    span.style.position = 'absolute';
    span.style.left = `${left}px`;
    span.style.top = `${top + index * lineHeight}px`;
    span.style.width = `${width}px`;
    span.style.height = `${lineHeight}px`;
    span.style.fontSize = `${fontSize}px`;
    span.style.whiteSpace = 'pre';
    span.style.color = 'transparent';
    span.style.lineHeight = `${lineHeight}px`;
    span.style.userSelect = 'text';
    container.appendChild(span);
  }

  if (lines.length > visibleLines.length) {
    const rest = document.createElement('span');
    rest.textContent = lines.slice(visibleLines.length).join('\n');
    rest.style.position = 'absolute';
    rest.style.left = `${left}px`;
    rest.style.top = `${top + visibleLines.length * lineHeight}px`;
    rest.style.width = `${width}px`;
    rest.style.height = `${Math.max(lineHeight, cssHeight - (top + visibleLines.length * lineHeight) - top)}px`;
    rest.style.fontSize = `${fontSize}px`;
    rest.style.whiteSpace = 'pre-wrap';
    rest.style.color = 'transparent';
    rest.style.lineHeight = `${lineHeight}px`;
    rest.style.userSelect = 'text';
    container.appendChild(rest);
  }
}

function hasEnoughTextLayerCoverage(layerText: string, sourceText: string): boolean {
  const source = normalizeSelectableLayerText(normalizeTextForLooseLayer(sourceText).join(' '));
  const layer = normalizeSelectableLayerText(layerText);
  if (!layer) return false;
  if (source.length < 80) return true;
  if (layer.length >= source.length * 0.72) return true;
  return source.includes(layer) && layer.length >= source.length * 0.58;
}

function normalizeSelectableLayerText(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .toLowerCase();
}

function normalizeTextForLooseLayer(text: string): string[] {
  const cleaned = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^#{1,6}\s*/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .filter(Boolean);
  return cleaned.length > 0
    ? cleaned
    : text.replace(/\s+/g, ' ').trim().match(/.{1,42}(\s|$)/g)?.map((line) => line.trim()) ?? [];
}

function handleTextSelection(
  scrollRoot: HTMLDivElement | null,
  setSelAction: (v: { x: number; y: number; text: string } | null) => void,
  onAsk?: (t: string) => void,
  onEmptySelection?: () => void,
) {
  if (!scrollRoot || !onAsk) return;
  // 브라우저가 선택을 세팅할 시간을 주기 위해 rAF 뒤에
  requestAnimationFrame(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!sel || text.length < 2 || sel.rangeCount === 0) {
      setSelAction(null);
      onEmptySelection?.();
      return;
    }
    const range = sel.getRangeAt(0);
    const rootRect = scrollRoot.getBoundingClientRect();
    // 선택 영역이 scrollRoot 내부인지 확인
    const node = range.startContainer instanceof Element
      ? range.startContainer
      : range.startContainer.parentElement;
    if (!node || !scrollRoot.contains(node)) { setSelAction(null); return; }

    const r = range.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) { setSelAction(null); onEmptySelection?.(); return; }
    const toolbarWidth = 430;
    const rawX = r.left - rootRect.left + scrollRoot.scrollLeft + r.width / 2 - toolbarWidth / 2;
    const maxX = scrollRoot.scrollLeft + Math.max(8, rootRect.width - toolbarWidth - 12);
    const x = Math.max(scrollRoot.scrollLeft + 8, Math.min(rawX, maxX));
    const y = Math.max(8, r.top - rootRect.top + scrollRoot.scrollTop - 44);
    setSelAction({ x, y, text });
  });
}

/* ─── 썸네일 사이드바 ─── */

interface ThumbProps {
  doc: PdfDoc;
  numPages: number;
  currentPage: number;
  onJump: (n: number) => void;
}

function ThumbnailSidebar({ doc, numPages, currentPage, onJump }: ThumbProps) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const thumbRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const activeRef = useRef<HTMLDivElement | null>(null);
  const renderedRef = useRef<Set<number>>(new Set());

  // 활성 페이지가 바뀌면 썸네일 영역에서도 해당 위치로 스크롤
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [currentPage]);

  const renderThumb = useCallback(async (n: number) => {
    if (renderedRef.current.has(n)) return;
    renderedRef.current.add(n);
    const canvas = thumbRefs.current.get(n);
    if (!canvas) { renderedRef.current.delete(n); return; }
    try {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 0.2 });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const renderVp = page.getViewport({ scale: 0.2 * dpr });
      canvas.width = Math.floor(renderVp.width);
      canvas.height = Math.floor(renderVp.height);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) { renderedRef.current.delete(n); return; }
      await page.render({ canvasContext: ctx, viewport: renderVp }).promise;
    } catch {
      renderedRef.current.delete(n);
    }
  }, [doc]);

  // IO 기반 lazy 썸네일 렌더
  useEffect(() => {
    const root = listRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const n = Number((e.target as HTMLElement).dataset.thumb);
          if (!n) continue;
          void renderThumb(n);
        }
      },
      { root, threshold: 0, rootMargin: '200px' },
    );
    root.querySelectorAll<HTMLElement>('[data-thumb]').forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [numPages, renderThumb]);

  return (
    <div
      ref={listRef}
      className="w-[140px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto py-2 px-2 space-y-2"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((n) => {
        const active = n === currentPage;
        return (
          <div
            key={n}
            ref={active ? activeRef : undefined}
            data-thumb={n}
            onClick={() => onJump(n)}
            className={cn(
              'group cursor-pointer',
              active ? 'ring-2 ring-indigo-500 rounded' : '',
            )}
          >
            <div className="relative bg-slate-100 dark:bg-slate-800 rounded overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center" style={{ aspectRatio: '0.77' }}>
              <canvas
                ref={(el) => {
                  if (el) thumbRefs.current.set(n, el);
                  else thumbRefs.current.delete(n);
                }}
                className="block max-w-full"
              />
            </div>
            <div className={cn('mt-1 text-[10px] tabular-nums text-center', active ? 'text-indigo-600 font-bold' : 'text-slate-500')}>
              {n}
            </div>
          </div>
        );
      })}
    </div>
  );
}
