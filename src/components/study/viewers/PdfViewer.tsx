/**
 * PDF 뷰어 — Step 2+3 통합 구현.
 *  - 연속 스크롤(모든 페이지 placeholder, 가시 범위만 canvas 렌더)
 *  - pdf.js textLayer → 드래그 선택/복사, 검색 하이라이트
 *  - 툴바: prev/next · 페이지 점프 · 줌 · 폭 맞추기 · 검색
 *  - activePage prop 변경 시 해당 페이지로 스크롤 + 1초 강조
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Minus, Plus, Maximize2, Search, Download, X } from 'lucide-react';
import { getBlob } from '@/lib/studyBlobStore';
import { cn } from '@/lib/utils';

interface Props {
  blobRef: string;
  activePage?: number;
  onActivePageChange?: (page: number) => void;
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

export function PdfViewer({ blobRef, activePage, onActivePageChange }: Props) {
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
          // 검색 하이라이트 재적용
          applyHighlight(textLayerDiv, query);
        }
      } catch {
        renderedRef.current.delete(pageNum);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.page);
          if (!n) continue;
          if (e.isIntersecting) {
            renderPage(n);
            // 앞뒤 1페이지 선제 렌더
            if (n > 1) renderPage(n - 1);
            if (n < numPages) renderPage(n + 1);
            // 현재 페이지 추적 (가장 상단에 가까운 페이지)
            if (e.intersectionRatio > 0.4) {
              setCurrentPage((prev) => {
                if (prev !== n) onActivePageChange?.(n);
                return n;
              });
            }
          }
        }
      },
      { root, threshold: [0, 0.4, 0.8] },
    );
    for (const [, el] of pageRefs.current) io.observe(el);
    return () => io.disconnect();
  }, [doc, scale, numPages, query, onActivePageChange]);

  // activePage prop 변경 시 해당 페이지로 스크롤 + 하이라이트
  useEffect(() => {
    if (!activePage || !numPages) return;
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
    setHitCount(hits);
  }, [query, numPages, scale]);

  const zoomOut = () => { setFitMode('custom'); setScale((s) => Math.max(0.4, s - 0.15)); };
  const zoomIn = () => { setFitMode('custom'); setScale((s) => Math.min(3, s + 0.15)); };

  const jumpTo = useCallback((n: number) => {
    const el = pageRefs.current.get(Math.max(1, Math.min(numPages, n)));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [numPages]);

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

      {/* 페이지 스트림 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto px-4 py-4"
        style={{ scrollBehavior: 'smooth' }}
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
