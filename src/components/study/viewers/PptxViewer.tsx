/**
 * PPTX 뷰어 — Step 5+6.
 *  - 자체 파서(`pptxParse`) → shape 트리를 상대좌표 div 로 렌더
 *  - 좌측 필름스트립 + 메인 슬라이드 영역 (유니브 AI 스타일)
 *  - 슬라이드 뷰는 `aspect-video` 고정, 내부는 %로 배치
 *  - 툴바: prev/next · 번호 · 다운로드 · 검색
 *  - activeSlide prop 동기화, onActiveSlideChange 역방향
 *  - 파싱 실패 시 텍스트 폴백 카드
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Search, X } from 'lucide-react';
import { getBlob } from '@/lib/studyBlobStore';
import { parsePptx, disposePptx, type PptxDoc, type PptxShape } from '@/lib/pptxParse';
import { cn } from '@/lib/utils';

interface Props {
  blobRef: string;
  activeSlide?: number;
  onActiveSlideChange?: (slide: number) => void;
}

export function PptxViewer({ blobRef, activeSlide, onActiveSlideChange }: Props) {
  const [doc, setDoc] = useState<PptxDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [current, setCurrent] = useState(1);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let dlUrl: string | null = null;
    let parsed: PptxDoc | null = null;
    (async () => {
      try {
        const blob = await getBlob(blobRef);
        if (!blob) throw new Error('파일을 찾을 수 없습니다.');
        dlUrl = URL.createObjectURL(blob);
        setDownloadUrl(dlUrl);
        parsed = await parsePptx(blob);
        if (cancelled) { disposePptx(parsed); return; }
        setDoc(parsed);
      } catch (e: unknown) {
        if (!cancelled) setErr(e instanceof Error ? e.message : '파싱 실패');
      }
    })();
    return () => {
      cancelled = true;
      if (parsed) disposePptx(parsed);
      if (dlUrl) URL.revokeObjectURL(dlUrl);
    };
  }, [blobRef]);

  useEffect(() => {
    if (activeSlide && activeSlide !== current && doc && activeSlide >= 1 && activeSlide <= doc.slides.length) {
      setCurrent(activeSlide);
    }
  }, [activeSlide, current, doc]);

  useEffect(() => {
    onActiveSlideChange?.(current);
  }, [current, onActiveSlideChange]);

  if (err) {
    return (
      <div className="h-full flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-[12px] text-red-600 mb-2">PPT 렌더 실패: {err}</p>
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
        슬라이드 파싱 중…
      </div>
    );
  }

  const total = doc.slides.length;
  const slide = doc.slides[current - 1];
  const jump = (n: number) => setCurrent(Math.max(1, Math.min(total, n)));
  const aspect = doc.widthPx / doc.heightPx;

  return (
    <div className="h-full flex flex-col bg-slate-100 dark:bg-slate-950">
      {/* 툴바 */}
      <div className="shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 flex items-center gap-1.5">
        <button onClick={() => jump(current - 1)} disabled={current <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1 text-[11.5px] tabular-nums">
          <input type="number" min={1} max={total} value={current}
            onChange={(e) => jump(Number(e.target.value))}
            className="w-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-1 py-0.5 text-center outline-none focus:border-indigo-400" />
          <span className="text-slate-500">/ {total}</span>
        </div>
        <button onClick={() => jump(current + 1)} disabled={current >= total}
          className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30">
          <ChevronRight className="h-4 w-4" />
        </button>
        <div className="mx-2 h-5 w-px bg-slate-200 dark:bg-slate-700" />
        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-md',
            searchOpen ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300' : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800',
          )}
          title="검색"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        {searchOpen && (
          <>
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="슬라이드 내 검색"
              className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-0.5 text-[11.5px] outline-none focus:border-indigo-400 w-36" />
            <button onClick={() => { setQuery(''); setSearchOpen(false); }}
              className="h-6 w-6 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-3 w-3" />
            </button>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {downloadUrl && (
            <a href={downloadUrl} download className="h-7 w-7 flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800" title="다운로드">
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 필름스트립 */}
        <div className="w-[130px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto py-2 px-2 space-y-1.5">
          {doc.slides.map((s) => {
            const matches = query.trim() && s.text.toLowerCase().includes(query.trim().toLowerCase());
            return (
              <button
                key={s.index}
                onClick={() => jump(s.index)}
                className={cn(
                  'w-full group',
                  s.index === current ? 'ring-2 ring-indigo-500 rounded' : '',
                )}
              >
                <div
                  className={cn(
                    'relative bg-white rounded border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm',
                    matches ? 'outline outline-2 outline-yellow-300' : '',
                  )}
                  style={{ aspectRatio: aspect }}
                >
                  <SlideCanvas slide={s} doc={doc} scale={0.12} query={query} />
                </div>
                <div className={cn('mt-1 text-[10px] tabular-nums', s.index === current ? 'text-indigo-600 font-bold' : 'text-slate-500')}>
                  {s.index}
                </div>
              </button>
            );
          })}
        </div>

        {/* 메인 슬라이드 */}
        <div className="flex-1 min-w-0 overflow-auto flex items-center justify-center p-6">
          <div
            className="relative bg-white shadow-xl rounded"
            style={{ aspectRatio: aspect, width: 'min(100%, 1100px)' }}
          >
            <SlideCanvas slide={slide} doc={doc} query={query} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 슬라이드 내용을 상대좌표 div 트리로 렌더.
 * `scale` 이 작으면 폰트도 함께 줄여서 썸네일로 사용 가능.
 */
function SlideCanvas({
  slide, doc, scale = 1, query,
}: {
  slide: { shapes: PptxShape[] };
  doc: PptxDoc;
  scale?: number;
  query?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [baseWidth, setBaseWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let rafId: number | null = null;
    const compute = () => {
      rafId = null;
      const w = el.clientWidth;
      setBaseWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    };
    const schedule = () => { if (rafId == null) rafId = requestAnimationFrame(compute); };
    schedule();
    const ro = new ResizeObserver(schedule);
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  // 폰트 px 스케일: pptx 원본 폭을 기준으로 비례. 원본 폭 = doc.widthPx
  const fontScale = baseWidth > 0 ? (baseWidth / doc.widthPx) * scale : 1;
  const q = query?.trim().toLowerCase() ?? '';

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      {slide.shapes.map((s, i) => {
        const style: React.CSSProperties = {
          position: 'absolute',
          left: `${s.x * 100}%`,
          top: `${s.y * 100}%`,
          width: `${s.w * 100}%`,
          height: `${s.h * 100}%`,
        };
        if (s.kind === 'image') {
          return <img key={i} src={s.src} alt="" style={style} className="object-contain" />;
        }
        if (s.kind === 'geom') {
          const geomStyle: React.CSSProperties = {
            ...style,
            background: s.fill ?? 'transparent',
            border: s.stroke ? `1px solid ${s.stroke}` : undefined,
            borderRadius: s.preset === 'ellipse' || s.preset === 'oval' ? '50%' : s.preset === 'roundRect' ? '8px' : undefined,
          };
          return <div key={i} style={geomStyle} />;
        }
        // text
        return (
          <div key={i} style={style} className="p-1 flex flex-col justify-start leading-tight">
            {s.paragraphs.map((p, pi) => (
              <div
                key={pi}
                style={{ textAlign: p.align }}
              >
                {p.runs.map((r, ri) => {
                  const sz = (r.sizePt ?? 18) * 1.3333 * fontScale; // pt→px (96/72)
                  const textStyle: React.CSSProperties = {
                    fontSize: `${sz}px`,
                    fontWeight: r.bold ? 700 : 400,
                    fontStyle: r.italic ? 'italic' : undefined,
                    textDecoration: r.underline ? 'underline' : undefined,
                    color: r.color ?? '#0f172a',
                    whiteSpace: 'pre-wrap',
                  };
                  return (
                    <span key={ri} style={textStyle}>
                      {q ? highlightText(r.text, q) : r.text}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function highlightText(text: string, q: string): React.ReactNode {
  if (!q || !text) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let last = 0;
  let idx = lower.indexOf(q);
  let key = 0;
  while (idx !== -1) {
    if (idx > last) parts.push(text.slice(last, idx));
    parts.push(
      <mark key={key++} className="bg-yellow-300/70 rounded-sm">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    last = idx + q.length;
    idx = lower.indexOf(q, last);
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

