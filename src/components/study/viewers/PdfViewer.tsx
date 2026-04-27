/**
 * PDF 뷰어 — Step 2+3 통합 구현.
 *  - 연속 스크롤(모든 페이지 placeholder, 가시 범위만 canvas 렌더)
 *  - pdf.js textLayer → 드래그 선택/복사, 검색 하이라이트
 *  - 툴바: prev/next · 페이지 점프 · 줌 · 폭 맞추기 · 검색
 *  - activePage prop 변경 시 해당 페이지로 스크롤 + 1초 강조
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Search, Download, X, LayoutGrid, MessageSquarePlus } from 'lucide-react';
import { getBlob } from '@/lib/studyBlobStore';
import { getCompletedPages, getAllForBlob, type OcrRecord } from '@/lib/studyOcrStore';
import { cn } from '@/lib/utils';

interface Props {
  blobRef: string;
  activePage?: number;
  onActivePageChange?: (page: number) => void;
  /** 선택 텍스트에 대한 "질문하기" 등 액션 콜백. 없으면 선택 액션 UI 숨김. */
  onAskAboutSelection?: (text: string) => void;
  /** 스캔본 페이지 번호들. textLayer 그리기 트리거용 (OCR 결과 IDB 에서 읽음). */
  scanPages?: number[];
  /** @deprecated useStudyAutoOcr 가 큐 소유. PdfViewer 는 IDB 에서 결과만 읽음.
   *  prop 자체는 다음 PR 에서 제거. */
  ocrEnabled?: boolean;
  /** @deprecated 같이 제거 예정 */
  onOcrEnable?: (enabled: boolean) => void;
  /** @deprecated 같이 제거 예정 — content 갱신은 useStudyAutoOcr 가 책임 */
  onOcrContentUpdate?: (ocrText: string) => void;
}

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
  scanPages,
}: Props) {
  const [doc, setDoc] = useState<PdfDoc | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [fitMode, setFitMode] = useState<'width' | 'page' | 'custom'>('width');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hitCount, setHitCount] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [showThumbs, setShowThumbs] = useState(false);
  const [selAction, setSelAction] = useState<{ x: number; y: number; text: string } | null>(null);
  // OCR 결과 페이지 (textLayer 그리기 용도) — 큐 소유는 useStudyAutoOcr.
  // 이 ref 는 IDB 캐시에서 polling 으로 채워짐.
  const [ocrPagesReady, setOcrPagesReady] = useState<Set<number>>(new Set());

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const pageSizesRef = useRef<Map<number, { width: number; height: number }>>(new Map());
  const renderedRef = useRef<Set<number>>(new Set());
  const pdfjsRef = useRef<typeof import('pdfjs-dist') | null>(null);
  const containerWidthRef = useRef(0);

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
          textLayerDiv.style.width = `${Math.floor(cssViewport.width)}px`;
          textLayerDiv.style.height = `${Math.floor(cssViewport.height)}px`;
          textLayerDiv.innerHTML = '';
          // 스캔본 페이지이면서 OCR 완료된 경우 → OCR 결과로 textLayer 구성
          const isScan = (scanPages ?? []).includes(pageNum);
          if (isScan && ocrPagesReady.has(pageNum)) {
            try {
              const { getOcr } = await import('@/lib/studyOcrStore');
              const rec = await getOcr(blobRef, pageNum);
              if (rec?.words && rec.words.length > 0) {
                buildOcrTextLayer(textLayerDiv, rec.words, cssViewport.width, cssViewport.height);
              }
            } catch { /* noop */ }
          } else {
            try {
              const textContent = await page.getTextContent();
              const pdfjs = pdfjsRef.current as unknown as {
                renderTextLayer?: (opts: Record<string, unknown>) => { promise: Promise<void> };
              };
              if (pdfjs.renderTextLayer) {
                await pdfjs.renderTextLayer({
                  textContentSource: textContent,
                  container: textLayerDiv,
                  viewport: cssViewport,
                  textDivs: [],
                }).promise;
              }
            } catch {
              // textLayer 실패는 치명적이지 않음
            }
          }
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
  }, [doc, scale, numPages, query, onActivePageChange]);

  // activePage prop 변경 시 해당 페이지로 스크롤 + 하이라이트
  // 단, 내부 IO 콜백으로 activePage 가 자기 자신(currentPage)으로 되돌아오는 경우는 스킵
  // (그러지 않으면 스크롤 중에 "절반 넘으면 자동 점프" 처럼 보임)
  useEffect(() => {
    if (!activePage || !numPages) return;
    if (activePage === currentPage) return;
    const el = pageRefs.current.get(activePage);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-slate-100');
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-indigo-400', 'ring-offset-2', 'ring-offset-slate-100');
    }, 1500);
    return () => clearTimeout(t);
    // currentPage 는 의도적으로 deps 에서 제외 — 내부 스크롤이 끝난 뒤 재진입 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, numPages]);

  // 검색 쿼리 변경 시 모든 렌더된 textLayer에 하이라이트 재적용
  useEffect(() => {
    let hits = 0;
    for (const [, el] of pageRefs.current) {
      const tl = el.querySelector('.textLayer') as HTMLDivElement | null;
      if (tl) hits += applyHighlight(tl, query);
    }
    setHitCount(hits);
  }, [query, numPages, scale]);

  // 선택 해제 시 플로팅 액션 숨김
  useEffect(() => {
    const onSelChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.toString().trim().length < 2) setSelAction(null);
    };
    document.addEventListener('selectionchange', onSelChange);
    return () => document.removeEventListener('selectionchange', onSelChange);
  }, []);

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
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 flex items-center gap-1.5">
        <button
          onClick={() => setShowThumbs((v) => !v)}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-md',
            showThumbs ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          aria-label="썸네일 보기"
          title="페이지 썸네일"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
        </button>
        <div className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          onClick={() => jumpTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1 text-[11.5px] tabular-nums">
          <input
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (n >= 1 && n <= numPages) { setCurrentPage(n); jumpTo(n); }
            }}
            className="w-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-0.5 text-center outline-none focus:border-indigo-400"
          />
          <span className="text-slate-500">/ {numPages}</span>
        </div>
        <button
          onClick={() => jumpTo(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button onClick={zoomOut} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="축소"><Minus className="h-3.5 w-3.5" /></button>
        <span className="text-[11px] tabular-nums w-10 text-center text-slate-600 dark:text-slate-300">{Math.round(scale * 100)}%</span>
        <button onClick={zoomIn} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="확대"><Plus className="h-3.5 w-3.5" /></button>
        <button
          onClick={() => setFitMode((m) => (m === 'width' ? 'page' : 'width'))}
          className={cn(
            'h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1',
            fitMode === 'width' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          title="폭/페이지 맞추기 토글"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          {fitMode === 'width' ? '폭' : fitMode === 'page' ? '페이지' : '수동'}
        </button>

        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />

        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-md',
            searchOpen ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          aria-label="검색"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        {searchOpen && (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="페이지 내 검색"
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11.5px] outline-none focus:border-indigo-400 w-36"
            />
            <span className="text-[10.5px] tabular-nums text-slate-500">{hitCount} 건</span>
            <button
              onClick={() => { setQuery(''); setSearchOpen(false); }}
              className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="검색 닫기"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-1">
          {/* OCR 진행률 배지·제안 배너 제거됨 — useStudyAutoOcr 가 노트북 진입 시
              PdfProcessingScreen 으로 진행률을 별도 표시. */}
          {downloadUrl && (
            <a
              href={downloadUrl}
              download
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="원본 다운로드"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* 본문: (썸네일) + 페이지 스트림 */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
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
          onMouseUp={() => handleTextSelection(scrollRef.current, setSelAction, onAskAboutSelection)}
        >
          <div className="flex flex-col items-center gap-4">
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
              className="absolute z-20 flex items-center gap-1 rounded-full bg-slate-900 text-white shadow-xl px-1 py-1"
              style={{ left: selAction.x, top: selAction.y }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                onClick={() => {
                  onAskAboutSelection(selAction.text);
                  setSelAction(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="flex items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-medium hover:bg-white/10"
              >
                <MessageSquarePlus className="h-3 w-3" />
                이 부분 질문
              </button>
              <button
                onClick={() => {
                  void navigator.clipboard?.writeText(selAction.text);
                  setSelAction(null);
                  window.getSelection()?.removeAllRanges();
                }}
                className="rounded-full px-3 py-1 text-[11.5px] font-medium hover:bg-white/10"
                title="클립보드로 복사"
              >
                복사
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .textLayer {
          color: transparent;
          user-select: text;
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

/**
 * OCR 결과(words + 정규화 bbox)를 textLayer 용 absolute-span 들로 구성.
 * pdf.js 네이티브 textLayer 와 동일한 스타일로 렌더 (`.textLayer > span`).
 */
function buildOcrTextLayer(
  container: HTMLElement,
  words: { text: string; x0: number; y0: number; x1: number; y1: number }[],
  cssWidth: number,
  cssHeight: number,
) {
  container.innerHTML = '';
  for (const w of words) {
    if (!w.text || w.x1 <= w.x0 || w.y1 <= w.y0) continue;
    const span = document.createElement('span');
    span.textContent = w.text;
    const left = w.x0 * cssWidth;
    const top = w.y0 * cssHeight;
    const width = (w.x1 - w.x0) * cssWidth;
    const height = (w.y1 - w.y0) * cssHeight;
    span.style.position = 'absolute';
    span.style.left = `${left}px`;
    span.style.top = `${top}px`;
    span.style.width = `${width}px`;
    span.style.height = `${height}px`;
    span.style.fontSize = `${height * 0.95}px`;
    span.style.whiteSpace = 'pre';
    span.style.color = 'transparent';
    span.style.lineHeight = '1';
    container.appendChild(span);
  }
}

/**
 * 텍스트 선택 이벤트 → 플로팅 액션 툴팁 위치 계산.
 * scrollRoot 내부의 선택 영역만 대상으로 한다.
 */
function handleTextSelection(
  scrollRoot: HTMLDivElement | null,
  setSelAction: (v: { x: number; y: number; text: string } | null) => void,
  onAsk?: (t: string) => void,
) {
  if (!scrollRoot || !onAsk) return;
  // 브라우저가 선택을 세팅할 시간을 주기 위해 rAF 뒤에
  requestAnimationFrame(() => {
    const sel = window.getSelection();
    const text = sel?.toString().trim() ?? '';
    if (!sel || text.length < 2 || sel.rangeCount === 0) {
      setSelAction(null);
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
    if (r.width === 0 && r.height === 0) { setSelAction(null); return; }
    const x = Math.max(8, r.left - rootRect.left + scrollRoot.scrollLeft + r.width / 2 - 80);
    const y = Math.max(8, r.top - rootRect.top + scrollRoot.scrollTop - 36);
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
