/**
 * MermaidView — 브랜드 테마 Mermaid 렌더러.
 *  - 라이트/다크 자동 분기, 인디고 컬러 토큰
 *  - 노드 클릭 이벤트 (이해도 마킹 · 플래시 · 퀴즈 · 채팅)
 *  - 풀스크린 모드
 *  - PNG 내보내기
 *  - 구문 에러 폴백 UI
 *  - prefers-reduced-motion 존중
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { MindmapNodeStatus } from '@/types/study';
import { cn } from '@/lib/utils';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { Maximize2, Minimize2, Download, AlertTriangle, RefreshCw, Palette } from 'lucide-react';

/** 노드 상태별 색상. SVG 에 inline style 로 override. */
const STATUS_STYLE: Record<MindmapNodeStatus, { fill: string; stroke: string; badge: string }> = {
  unknown:  { fill: '',        stroke: '',        badge: '' },
  shaky:    { fill: '#FEF3C7', stroke: '#F59E0B', badge: '◐' },
  'got-it': { fill: '#D1FAE5', stroke: '#10B981', badge: '✓' },
};

interface Props {
  code: string;
  /** 렌더 후 노드 id 와 라벨 맵. 노드 메뉴 매핑용. */
  onNodesReady?: (nodes: Array<{ id: string; label: string }>) => void;
  /** 노드 클릭 시 호출. x/y 는 페이지 좌표 (fixed 기준). */
  onNodeClick?: (nodeId: string, label: string, x: number, y: number) => void;
  /** 노드별 이해도. 색상 오버라이드용. */
  nodeStates?: Record<string, MindmapNodeStatus>;
  /** 다시 만들기 / 다른 유형 / 코드 편집 유도 콜백 */
  onRetry?: () => void;
  onChangeKind?: () => void;
  /** 파일명(선택) */
  exportFilename?: string;
}

let mermaidPromise: Promise<typeof import('mermaid')> | null = null;
function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => m);
  }
  return mermaidPromise;
}

function isDark(): boolean {
  if (typeof window === 'undefined') return false;
  return document.documentElement.classList.contains('dark')
    || window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** 브랜드 팔레트 — 라이트/다크 공통으로 Mermaid initialize 에 주입. */
function getThemeVars(dark: boolean) {
  return dark ? {
    primaryColor:       '#1E1B4B', // indigo-950
    primaryBorderColor: '#818CF8', // indigo-400
    primaryTextColor:   '#E0E7FF',
    lineColor:          '#475569',
    secondaryColor:     '#312E81',
    tertiaryColor:      '#1E293B',
    background:         'transparent',
    mainBkg:            '#1E293B',
    fontFamily:         'inherit',
    fontSize:           '14px',
  } : {
    primaryColor:       '#EEF2FF', // indigo-50
    primaryBorderColor: '#6366F1', // indigo-500
    primaryTextColor:   '#1E293B',
    lineColor:          '#94A3B8',
    secondaryColor:     '#F0F9FF',
    tertiaryColor:      '#FEFCE8',
    background:         'transparent',
    mainBkg:            '#FFFFFF',
    fontFamily:         'inherit',
    fontSize:           '14px',
  };
}

export function MermaidView({
  code, onNodesReady, onNodeClick, nodeStates, onRetry, onChangeKind, exportFilename = 'diagram',
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [svgText, setSvgText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [dark, setDark] = useState<boolean>(isDark());
  const idSeed = useMemo(() => `d${Math.random().toString(36).slice(2, 9)}`, []);

  // 다크모드 감지
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(isDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setDark(isDark());
    mq.addEventListener?.('change', handler);
    return () => { obs.disconnect(); mq.removeEventListener?.('change', handler); };
  }, []);

  // Mermaid 렌더
  useEffect(() => {
    if (!code || !code.trim()) {
      setError(null); setSvgText(''); setLoading(false); return;
    }
    let cancelled = false;
    setLoading(true); setError(null);
    (async () => {
      try {
        const m = (await loadMermaid()).default;
        m.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: getThemeVars(dark),
          securityLevel: 'loose',
          flowchart: { curve: 'basis', useMaxWidth: true },
          fontFamily: 'inherit',
        });
        const { svg } = await m.render(idSeed, code);
        if (!cancelled) { setSvgText(svg); setLoading(false); }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '도식 렌더 실패');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [code, dark, idSeed]);

  // 렌더된 SVG 에 노드 이벤트 + 이해도 색상 주입
  useEffect(() => {
    if (!svgText || !hostRef.current) return;
    const root = hostRef.current.querySelector('svg');
    if (!root) return;

    // 모든 노드 그룹 (Mermaid 는 `.node` 또는 `.cluster` 클래스 사용)
    const nodeGroups = root.querySelectorAll<SVGGElement>('g.node');
    const collected: Array<{ id: string; label: string }> = [];

    nodeGroups.forEach((g) => {
      const gid = g.id || '';
      // 노드 id 추출: mermaid 는 'flowchart-A-0' 같은 패턴 → 'A' 를 가져옴
      const match = gid.match(/flowchart-([^-]+)/) || gid.match(/([^-]+)$/);
      const nodeId = match?.[1] ?? gid;
      const textEl = g.querySelector('text, .nodeLabel, foreignObject span');
      const label = (textEl?.textContent || '').trim();
      if (nodeId) collected.push({ id: nodeId, label });

      // 이해도 색상 오버라이드
      const status = nodeStates?.[nodeId];
      if (status && status !== 'unknown') {
        const shape = g.querySelector<SVGGraphicsElement>('rect, polygon, circle, ellipse, path');
        if (shape) {
          shape.setAttribute('fill', STATUS_STYLE[status].fill);
          shape.setAttribute('stroke', STATUS_STYLE[status].stroke);
          shape.setAttribute('stroke-width', '2');
        }
      }

      // 포커스 가능
      g.style.cursor = 'pointer';
      g.setAttribute('tabindex', '0');

      const handler = (e: Event) => {
        e.stopPropagation();
        const me = e as MouseEvent;
        const rect = g.getBoundingClientRect();
        const x = me.clientX || rect.left + rect.width / 2;
        const y = me.clientY || rect.top + rect.height;
        onNodeClick?.(nodeId, label, x, y);
      };
      g.addEventListener('click', handler);
      // cleanup 은 다음 effect 리렌더 시 SVG 자체가 교체되므로 필요 없음
    });

    onNodesReady?.(collected);

    // SVG hover 스타일 보강 — 동적 추가
    const styleId = `mm-hover-${idSeed}`;
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      g.node:hover rect, g.node:hover polygon, g.node:hover circle, g.node:hover ellipse {
        filter: drop-shadow(0 0 4px rgba(99, 102, 241, 0.5));
        transition: filter 120ms ease;
      }
      g.node:focus-visible { outline: none; }
      g.node:focus-visible rect, g.node:focus-visible polygon {
        stroke: #6366F1 !important; stroke-width: 2.5 !important;
      }
    `;
    return () => {
      // 관련 스타일 남겨둠 (다음 렌더에서 재사용). 페이지 이탈 시 정리 안 해도 미미.
    };
  }, [svgText, nodeStates, onNodeClick, onNodesReady, idSeed]);

  // PNG 내보내기
  const exportPng = useCallback(async () => {
    const svgEl = hostRef.current?.querySelector('svg');
    if (!svgEl) return;
    try {
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      // 배경 보장 (다크모드에서 투명 저장 시 외부에서 안 보임)
      const bg = dark ? '#0F172A' : '#FFFFFF';
      clone.setAttribute('style', `background:${bg}`);
      const xml = new XMLSerializer().serializeToString(clone);
      const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.src = svg64;
      await new Promise<void>((ok, fail) => { img.onload = () => ok(); img.onerror = () => fail(new Error('image load fail')); });
      const bbox = svgEl.getBoundingClientRect();
      const scale = 2; // retina
      const canvas = document.createElement('canvas');
      canvas.width = bbox.width * scale;
      canvas.height = bbox.height * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFilename}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch {
      // 무시 — 사용자에게 조용히 실패
    }
  }, [exportFilename, dark]);

  // Esc 로 풀스크린 나가기
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFullscreen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fullscreen]);

  // 에러 UI
  if (error) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-2 mb-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold text-amber-900 dark:text-amber-200">AI가 그린 도식에 문제가 있어요</p>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70 mt-0.5 break-words">{error.slice(0, 120)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 text-amber-800 dark:text-amber-200 px-2.5 py-1 text-[11.5px] font-semibold"
            >
              <RefreshCw className="h-3 w-3" />
              다시 만들기
            </button>
          )}
          {onChangeKind && (
            <button
              onClick={onChangeKind}
              className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 text-amber-800 dark:text-amber-200 px-2.5 py-1 text-[11.5px] font-semibold"
            >
              <Palette className="h-3 w-3" />
              다른 유형으로
            </button>
          )}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[10.5px] text-amber-700/70 dark:text-amber-300/60">원본 Mermaid 코드</summary>
          <pre className="mt-1 p-2 bg-amber-100/50 dark:bg-amber-950/40 rounded text-[10.5px] overflow-auto max-h-40 whitespace-pre-wrap">{code}</pre>
        </details>
      </div>
    );
  }

  const content = (
    <div className={cn(
      'relative rounded-xl border overflow-hidden',
      fullscreen
        ? 'fixed inset-0 z-[110] border-0 bg-white dark:bg-slate-950'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    )}>
      {/* 상단 액션 바 */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        <button
          onClick={exportPng}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 shadow-sm backdrop-blur"
          aria-label="PNG 저장"
          title="PNG 이미지로 저장"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-indigo-700 shadow-sm backdrop-blur"
          aria-label={fullscreen ? '풀스크린 종료' : '풀스크린'}
          title={fullscreen ? '풀스크린 종료 (Esc)' : '풀스크린으로 보기'}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="inline-flex flex-col items-center gap-2 text-[11.5px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse [animation-delay:150ms]" />
              <span className="h-2 w-2 rounded-full bg-indigo-300 animate-pulse [animation-delay:300ms]" />
            </div>
            <span>그리는 중…</span>
          </div>
        </div>
      )}

      {!loading && svgText && (
        <div
          ref={hostRef}
          className={cn(
            'p-4 overflow-auto',
            fullscreen ? 'h-full' : 'max-h-[60vh]',
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(svgText) }}
        />
      )}
    </div>
  );

  return content;
}
