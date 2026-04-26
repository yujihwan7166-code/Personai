import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Maximize2, Route, Layers, Filter as FilterIcon } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  pages: WikiPage[];
  onSelect: (id: string) => void;
  /** 진입 시 자동 선택할 페이지 id (로컬 그래프에서 '전체에서 보기' 누른 경우) */
  initialFocusId?: string | null;
}

type EdgeKind = 'refersTo' | 'cites' | 'inherits' | 'similarTo';
interface Node { id: string; title: string; type: WikiPage['type']; status: WikiPage['status']; x: number; y: number; r: number; degree: number; isolated: boolean; }
interface Edge { from: string; to: string; kind: EdgeKind; }

type ColorBy = 'type' | 'status' | 'tag';
type LayoutMode = 'cluster' | 'force';

const VB_W = 1000;
const VB_H = 700;

/**
 * 마이위키 연결 그래프 (대형판).
 *
 * 기능:
 * - 검색 매칭 강조 + 타입 필터 + 줌·팬 + 고립 노드 외곽 띠
 * - 엣지 종류별 색·점선 + 상태별 fill 차별화 + 클러스터 라벨
 * - 경로 찾기 모드 (BFS) — 두 노드 사이 최단 경로
 * - 색칠 기준 토글 (타입 / 상태 / 인기 태그)
 * - 레이아웃 토글 (cluster / force-directed simulated annealing)
 * - 모바일: 탭 = hover, 핀치/드래그 줌·팬
 *
 * 의존성 X — SVG 직접 렌더 + 표준 transform.
 */
export function WikiGraph({ pages, onSelect, initialFocusId }: Props) {
  /* ── 헤더 상태 ── */
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<WikiPage['type']>>(new Set());
  const [colorBy, setColorBy] = useState<ColorBy>('type');
  const [tagPick, setTagPick] = useState<string>('');
  const [layout, setLayout] = useState<LayoutMode>('cluster');
  const [pathMode, setPathMode] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);

  /* ── 인터랙션 상태 ── */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [stickyId, setStickyId] = useState<string | null>(null); // 모바일 탭 sticky
  const [focusId, setFocusId] = useState<string | null>(initialFocusId ?? null);

  /* ── 줌·팬 상태 ── */
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── 그래프 빌드 ── */
  const { nodes, edges, neighborMap, types, popularTags } = useMemo(() => buildGraph(pages, layout), [pages, layout]);

  /* ── 검색 매칭 ── */
  const matchSet = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const out = new Set<string>();
    for (const p of pages) {
      if (p.title.toLowerCase().includes(q)) { out.add(p.id); continue; }
      if (p.aliases.some((a) => a.toLowerCase().includes(q))) { out.add(p.id); continue; }
      if (p.tags.some((t) => t.toLowerCase().includes(q))) { out.add(p.id); continue; }
    }
    return out;
  }, [query, pages]);

  /* ── 활성 타입 필터 적용 ── */
  const visible = useMemo(() => {
    if (activeTypes.size === 0) return null;
    const out = new Set<string>();
    for (const n of nodes) if (activeTypes.has(n.type)) out.add(n.id);
    return out;
  }, [activeTypes, nodes]);

  /* ── 경로 ── */
  const pathSet = useMemo(() => {
    if (!pathStart || !pathEnd) return null;
    return bfsPath(neighborMap, pathStart, pathEnd);
  }, [pathStart, pathEnd, neighborMap]);

  /* ── 페이지·태그 색 결정 ── */
  function nodeFill(n: Node, p: WikiPage): { fill: string; stroke: string } {
    if (colorBy === 'status') {
      const meta = WIKI_STATUS_META[n.status];
      return { fill: meta.tint, stroke: meta.tint };
    }
    if (colorBy === 'tag' && tagPick) {
      const has = p.tags.includes(tagPick);
      return { fill: has ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', stroke: has ? 'hsl(var(--primary))' : 'transparent' };
    }
    const meta = WIKI_TYPE_META[n.type];
    return { fill: meta.tint, stroke: meta.tint };
  }

  function edgeStroke(kind: EdgeKind): { stroke: string; dash?: string; opacity: number } {
    switch (kind) {
      case 'refersTo':  return { stroke: 'hsl(var(--hairline))', opacity: 0.55 };
      case 'cites':     return { stroke: 'hsl(var(--wiki-link-visited))', opacity: 0.6 };
      case 'inherits':  return { stroke: 'hsl(var(--wiki-hairline-strong))', dash: '4 3', opacity: 0.7 };
      case 'similarTo': return { stroke: 'hsl(var(--muted-foreground))', dash: '2 4', opacity: 0.4 };
    }
  }

  /* ── 줌·팬 핸들러 ── */
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(3, Math.max(0.4, s * (1 + delta))));
  }
  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if ((e.target as SVGElement).closest('[data-node]')) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current) return;
    const d = dragRef.current;
    setTx(d.tx + (e.clientX - d.x) / scale);
    setTy(d.ty + (e.clientY - d.y) / scale);
  }
  function onPointerUp() { dragRef.current = null; }

  function fit() { setScale(1); setTx(0); setTy(0); }

  /* ── 키보드: 0 = fit, Esc = 모드 해제 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '0') { e.preventDefault(); fit(); }
      if (e.key === 'Escape') {
        if (pathMode) { setPathMode(false); setPathStart(null); setPathEnd(null); return; }
        if (stickyId) { setStickyId(null); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pathMode, stickyId]);

  /* ── initialFocusId 진입 시 매칭 페이지 강조 ── */
  useEffect(() => {
    if (initialFocusId) setFocusId(initialFocusId);
  }, [initialFocusId]);

  /* ── 렌더 ── */
  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[13px] text-muted-foreground">
        페이지가 없어요. 먼저 페이지를 만들어보세요.
      </div>
    );
  }

  const hoverActive = stickyId ?? hoverId;

  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden">
      {/* 헤더 — 검색 / 필터 / 색칠 / 레이아웃 / 경로 / fit */}
      <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background focus-within:border-primary/50 wiki-trans-color">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·태그·alias"
            className="w-[140px] bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground" aria-label="검색 비우기">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* 색칠 기준 */}
        <label className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
          <Layers className="w-3 h-3" />
          <select
            value={colorBy}
            onChange={(e) => setColorBy(e.target.value as ColorBy)}
            className="bg-transparent text-[11px] outline-none border border-[hsl(var(--hairline))] rounded px-1 h-6"
            aria-label="색칠 기준"
          >
            <option value="type">타입</option>
            <option value="status">상태</option>
            <option value="tag">태그</option>
          </select>
          {colorBy === 'tag' && popularTags.length > 0 && (
            <select
              value={tagPick}
              onChange={(e) => setTagPick(e.target.value)}
              className="bg-transparent text-[11px] outline-none border border-[hsl(var(--hairline))] rounded px-1 h-6"
              aria-label="태그 선택"
            >
              <option value="">태그…</option>
              {popularTags.map((t) => <option key={t} value={t}>#{t}</option>)}
            </select>
          )}
        </label>

        {/* 레이아웃 */}
        <button
          type="button"
          onClick={() => setLayout((l) => l === 'cluster' ? 'force' : 'cluster')}
          className="inline-flex items-center gap-1 px-2 h-6 rounded border border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="레이아웃 — 타입 클러스터 ↔ 자유 (force)"
        >
          {layout === 'cluster' ? '🧩 클러스터' : '🌐 자유'}
        </button>

        {/* 경로 찾기 */}
        <button
          type="button"
          onClick={() => {
            setPathMode((v) => !v);
            setPathStart(null); setPathEnd(null);
          }}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded border text-[10.5px] wiki-trans-color',
            pathMode
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title="두 페이지 사이 최단 경로 강조"
        >
          <Route className="w-3 h-3" /> 경로
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={fit}
          className="inline-flex items-center gap-1 px-2 h-6 rounded border border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="원위치 (단축키 0)"
        >
          <Maximize2 className="w-3 h-3" /> fit
        </button>
      </div>

      {/* 범례 / 타입 필터 / 엣지 종류 */}
      <div className="px-3 py-1.5 border-b border-[hsl(var(--hairline))] flex flex-wrap items-center gap-x-3 gap-y-1 bg-muted/20">
        <span className="text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/80 inline-flex items-center gap-1">
          <FilterIcon className="w-2.5 h-2.5" /> 타입
        </span>
        {types.map((k) => {
          const m = WIKI_TYPE_META[k];
          const on = activeTypes.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveTypes((prev) => {
                const next = new Set(prev);
                if (next.has(k)) next.delete(k); else next.add(k);
                return next;
              })}
              className={cn(
                'inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] wiki-trans-color',
                on ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title={`${m.label} 만 보기 토글`}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: m.tint }} />
              {m.label}
            </button>
          );
        })}
        {activeTypes.size > 0 && (
          <button
            type="button"
            onClick={() => setActiveTypes(new Set())}
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
          >전체</button>
        )}
        <span className="text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/80 ml-2">엣지</span>
        <EdgeLegend kind="refersTo" label="참조" />
        <EdgeLegend kind="cites" label="인용" />
        <EdgeLegend kind="inherits" label="계승" />
        <EdgeLegend kind="similarTo" label="유사" />
      </div>

      {/* 상태/안내 줄 */}
      <div className="px-3 py-1 border-b border-[hsl(var(--hairline))] flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>
          {nodes.length} 페이지 / {edges.length} 연결
          {visible && ` · 필터 ${visible.size}`}
          {matchSet && ` · 매칭 ${matchSet.size}`}
          {pathSet && ` · 경로 ${pathSet.size}`}
        </span>
        {pathMode && (
          <span className="text-primary">
            {pathStart ? (pathEnd ? '경로 표시 중' : '끝 노드를 클릭하세요') : '시작 노드를 클릭하세요'}
          </span>
        )}
      </div>

      {/* SVG 본체 */}
      <div className="relative bg-[hsl(var(--background))] touch-none select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-[60vh] cursor-grab active:cursor-grabbing"
          aria-label="위키 페이지 연결 그래프"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={(e) => {
            if ((e.target as Element).tagName === 'svg') setStickyId(null);
          }}
        >
          <g transform={`translate(${VB_W / 2 + tx * scale}, ${VB_H / 2 + ty * scale}) scale(${scale}) translate(${-VB_W / 2}, ${-VB_H / 2})`}>
            {/* 클러스터 라벨 (cluster 모드에서만) */}
            {layout === 'cluster' && nodes.length > 0 && types.map((k) => {
              const m = WIKI_TYPE_META[k];
              const sample = nodes.find((n) => n.type === k && !n.isolated);
              if (!sample) return null;
              const cx = sample.cx ?? sample.x;
              const cy = sample.cy ?? sample.y;
              const count = nodes.filter((n) => n.type === k).length;
              return (
                <text
                  key={k}
                  x={cx}
                  y={cy - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fill={m.tint}
                  fillOpacity={0.45}
                  fontWeight={700}
                  letterSpacing="0.06em"
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {m.icon} {m.label.toUpperCase()} · {count}
                </text>
              );
            })}

            {/* 고립 영역 라벨 */}
            {nodes.some((n) => n.isolated) && (
              <text
                x={VB_W / 2}
                y={36}
                textAnchor="middle"
                fontSize={10.5}
                fill="hsl(var(--muted-foreground))"
                fillOpacity={0.7}
                fontWeight={700}
                letterSpacing="0.1em"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                🪐 고립 {nodes.filter((n) => n.isolated).length}
              </text>
            )}

            {/* 엣지 */}
            <g>
              {edges.map((e, i) => {
                const a = nodes.find((n) => n.id === e.from);
                const b = nodes.find((n) => n.id === e.to);
                if (!a || !b) return null;
                if (visible && (!visible.has(a.id) || !visible.has(b.id))) return null;
                const stroke = edgeStroke(e.kind);
                const inPath = pathSet && pathSet.has(a.id) && pathSet.has(b.id);
                const isHover = hoverActive && (hoverActive === a.id || hoverActive === b.id);
                const dim = (hoverActive && !isHover) || (matchSet && (!matchSet.has(a.id) && !matchSet.has(b.id)));
                return (
                  <line
                    key={i}
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    stroke={inPath ? 'hsl(var(--primary))' : isHover ? 'hsl(var(--primary))' : stroke.stroke}
                    strokeWidth={inPath ? 2 : isHover ? 1.5 : 1}
                    strokeOpacity={dim ? 0.12 : (inPath ? 0.95 : isHover ? 0.85 : stroke.opacity)}
                    strokeDasharray={inPath ? undefined : stroke.dash}
                    style={{ transition: 'stroke-opacity 120ms' }}
                  />
                );
              })}
            </g>

            {/* 노드 */}
            <g>
              {nodes.map((n) => {
                if (visible && !visible.has(n.id)) return null;
                const p = pages.find((pp) => pp.id === n.id)!;
                const meta = WIKI_TYPE_META[n.type];
                const isHover = hoverActive === n.id;
                const isNeighbor = hoverActive ? !!neighborMap.get(hoverActive)?.has(n.id) : false;
                const inPath = pathSet?.has(n.id) ?? false;
                const matched = matchSet ? matchSet.has(n.id) : true;
                const isFocus = focusId === n.id;
                const dim = (hoverActive && !isHover && !isNeighbor) || (matchSet && !matched);
                const { fill, stroke } = nodeFill(n, p);

                // 상태별 차별: draft = 빈 원, archived = opacity ↓
                const isDraft = n.status === 'draft';
                const isArchived = n.status === 'archived';
                const isStable = n.status === 'stable';

                return (
                  <g
                    key={n.id}
                    data-node
                    onMouseEnter={() => setHoverId(n.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pathMode) {
                        if (!pathStart) { setPathStart(n.id); return; }
                        if (!pathEnd) { setPathEnd(n.id); return; }
                        setPathStart(n.id); setPathEnd(null);
                        return;
                      }
                      // 모바일 sticky toggle: 첫 탭 hover 카드, 둘째 탭 진입
                      if (stickyId === n.id) onSelect(n.id);
                      else setStickyId(n.id);
                      // 데스크톱은 즉시 진입
                      if (window.matchMedia('(hover: hover)').matches) onSelect(n.id);
                    }}
                    style={{ cursor: 'pointer', opacity: dim ? 0.22 : isArchived ? 0.55 : 1, transition: 'opacity 120ms' }}
                  >
                    {/* focus 링 */}
                    {isFocus && (
                      <circle cx={n.x} cy={n.y} r={n.r + 6} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeOpacity={0.55} />
                    )}
                    <circle
                      cx={n.x} cy={n.y}
                      r={Math.max(n.r, 8)}
                      fill={isDraft ? 'transparent' : fill}
                      fillOpacity={isStable ? 1 : isDraft ? 0 : 0.78}
                      stroke={isDraft ? stroke : (isHover || inPath || isFocus ? stroke : 'transparent')}
                      strokeWidth={isDraft ? 1.5 : 3}
                      strokeOpacity={isDraft ? 0.9 : 0.45}
                    />
                    {(isHover || isFocus || n.degree >= 3 || matched && !!matchSet) && (
                      <text
                        x={n.x}
                        y={n.y + Math.max(n.r, 8) + 12}
                        textAnchor="middle"
                        fontSize={isHover || isFocus ? 12 : 10}
                        fill="hsl(var(--foreground))"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {n.title.length > 16 ? n.title.slice(0, 16) + '…' : n.title}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* hover/sticky 카드 */}
        {hoverActive && (() => {
          const n = nodes.find((nn) => nn.id === hoverActive);
          if (!n) return null;
          const p = pages.find((pp) => pp.id === hoverActive);
          if (!p) return null;
          const tMeta = WIKI_TYPE_META[p.type];
          const sMeta = WIKI_STATUS_META[p.status];
          return (
            <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-popover border border-[hsl(var(--hairline))] shadow-lg max-w-xs">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                {tMeta.icon} {tMeta.label} · 연결 {n.degree}
                <span className="ml-1.5" style={{ color: sMeta.tint }}>{sMeta.label}</span>
              </p>
              <p className="text-[12.5px] font-bold text-foreground">{p.title}</p>
              {p.tags.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[280px]">
                  {p.tags.slice(0, 5).map((t) => `#${t}`).join(' ')}
                </p>
              )}
              {stickyId && (
                <p className="text-[9.5px] text-muted-foreground/70 mt-1">탭 한 번 더 = 페이지 열기</p>
              )}
            </div>
          );
        })()}
      </div>

      <p className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-[hsl(var(--hairline))] flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span>💡 휠 = 줌, 드래그 = 팬, 0 = 원위치</span>
        <span>·</span>
        <span>노드 클릭 = 페이지</span>
        <span>·</span>
        <span>경로 모드 = 두 노드 선택</span>
      </p>
    </div>
  );
}

function EdgeLegend({ kind, label }: { kind: EdgeKind; label: string }) {
  const colorMap: Record<EdgeKind, { stroke: string; dash?: string }> = {
    refersTo:  { stroke: 'hsl(var(--hairline))' },
    cites:     { stroke: 'hsl(var(--wiki-link-visited))' },
    inherits:  { stroke: 'hsl(var(--wiki-hairline-strong))', dash: '4 3' },
    similarTo: { stroke: 'hsl(var(--muted-foreground))', dash: '2 4' },
  };
  const c = colorMap[kind];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <svg width="14" height="6" viewBox="0 0 14 6">
        <line x1="0" y1="3" x2="14" y2="3" stroke={c.stroke} strokeWidth="1.5" strokeDasharray={c.dash} />
      </svg>
      {label}
    </span>
  );
}

/* ── BFS 최단 경로 ── */
function bfsPath(neighborMap: Map<string, Set<string>>, start: string, end: string): Set<string> | null {
  if (start === end) return new Set([start]);
  const visited = new Set<string>([start]);
  const parent = new Map<string, string>();
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const nb = neighborMap.get(cur);
    if (!nb) continue;
    for (const next of nb) {
      if (visited.has(next)) continue;
      visited.add(next);
      parent.set(next, cur);
      if (next === end) {
        const out = new Set<string>([end]);
        let p: string | undefined = end;
        while ((p = parent.get(p!)) !== undefined) {
          out.add(p);
          if (p === start) break;
        }
        return out;
      }
      queue.push(next);
    }
  }
  return null;
}

/* ── 그래프 빌더 — cluster + force-directed (간소화 simulated annealing) ── */
type NodeWithCenter = Node & { cx?: number; cy?: number };
function buildGraph(pages: WikiPage[], layout: LayoutMode): { nodes: NodeWithCenter[]; edges: Edge[]; neighborMap: Map<string, Set<string>>; types: WikiPage['type'][]; popularTags: string[] } {
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const degree = new Map<string, number>();
  const neighborMap = new Map<string, Set<string>>();
  const idSet = new Set(pages.map((p) => p.id));

  function addEdge(from: string, to: string, kind: EdgeKind) {
    if (from === to || !idSet.has(from) || !idSet.has(to)) return;
    const key = from < to ? `${from}|${to}|${kind}` : `${to}|${from}|${kind}`;
    if (edgeSet.has(key)) return;
    edgeSet.add(key);
    edges.push({ from, to, kind });
    degree.set(from, (degree.get(from) ?? 0) + 1);
    degree.set(to, (degree.get(to) ?? 0) + 1);
    if (!neighborMap.has(from)) neighborMap.set(from, new Set());
    if (!neighborMap.has(to)) neighborMap.set(to, new Set());
    neighborMap.get(from)!.add(to);
    neighborMap.get(to)!.add(from);
  }

  for (const p of pages) {
    for (const t of p.refersTo)  addEdge(p.id, t, 'refersTo');
    for (const t of p.cites)     addEdge(p.id, t, 'cites');
    for (const t of p.inherits)  addEdge(p.id, t, 'inherits');
    for (const t of p.similarTo) addEdge(p.id, t, 'similarTo');
  }

  const types = Array.from(new Set(pages.map((p) => p.type)));
  const tagCount = new Map<string, number>();
  for (const p of pages) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  const popularTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);

  // 고립: degree === 0
  const connectedPages = pages.filter((p) => (degree.get(p.id) ?? 0) > 0);
  const isolatedPages = pages.filter((p) => (degree.get(p.id) ?? 0) === 0);

  let nodes: NodeWithCenter[];
  if (layout === 'cluster' || pages.length > 200) {
    nodes = layoutCluster(connectedPages, isolatedPages, types, degree);
  } else {
    nodes = layoutForce(connectedPages, isolatedPages, neighborMap, degree);
  }

  return { nodes, edges, neighborMap, types, popularTags };
}

function layoutCluster(connected: WikiPage[], isolated: WikiPage[], types: WikiPage['type'][], degree: Map<string, number>): NodeWithCenter[] {
  const center = { x: VB_W / 2, y: VB_H / 2 + 12 };
  const outerR = 240;
  const clusterCenters = new Map<WikiPage['type'], { x: number; y: number }>();
  const visibleTypes = types.filter((t) => connected.some((p) => p.type === t));
  visibleTypes.forEach((t, i) => {
    const angle = (i / Math.max(1, visibleTypes.length)) * Math.PI * 2 - Math.PI / 2;
    clusterCenters.set(t, {
      x: center.x + Math.cos(angle) * outerR,
      y: center.y + Math.sin(angle) * outerR,
    });
  });

  const out: NodeWithCenter[] = connected.map((p) => {
    const c = clusterCenters.get(p.type) ?? center;
    const sameType = connected.filter((q) => q.type === p.type);
    const idx = sameType.indexOf(p);
    const localR = Math.min(60 + sameType.length * 4, 110);
    const angle = (idx / Math.max(1, sameType.length)) * Math.PI * 2;
    const d = degree.get(p.id) ?? 0;
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      x: c.x + Math.cos(angle) * localR,
      y: c.y + Math.sin(angle) * localR,
      cx: c.x, cy: c.y,
      r: 6 + Math.min(d * 1.6, 14),
      degree: d,
      isolated: false,
    };
  });

  // 고립 — 외곽 띠 (top)
  const isoY = 70;
  const isoStartX = 90;
  const isoEndX = VB_W - 90;
  const isoStep = (isoEndX - isoStartX) / Math.max(1, isolated.length);
  isolated.forEach((p, i) => {
    out.push({
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      x: isoStartX + i * isoStep,
      y: isoY,
      r: 5,
      degree: 0,
      isolated: true,
    });
  });

  return out;
}

/** 가벼운 force-directed — 외부 라이브러리 없이 ~80 iter simulated annealing.
 *  대용량(>200)은 cluster 로 자동 폴백. */
function layoutForce(connected: WikiPage[], isolated: WikiPage[], neighborMap: Map<string, Set<string>>, degree: Map<string, number>): NodeWithCenter[] {
  const n = connected.length;
  const cx = VB_W / 2, cy = VB_H / 2 + 12;
  const seed = (s: number) => () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const rnd = seed(connected.reduce((a, p) => a + p.id.charCodeAt(0), 1));
  const pos = new Map<string, { x: number; y: number }>();
  connected.forEach((p, i) => {
    const angle = (i / n) * Math.PI * 2;
    const r = 100 + rnd() * 120;
    pos.set(p.id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  });
  const ITER = 80;
  const k = 70;
  for (let it = 0; it < ITER; it++) {
    const cooling = 1 - it / ITER;
    const disp = new Map<string, { x: number; y: number }>();
    for (const p of connected) disp.set(p.id, { x: 0, y: 0 });
    // 반발
    for (let i = 0; i < n; i++) {
      const a = connected[i];
      const ap = pos.get(a.id)!;
      for (let j = i + 1; j < n; j++) {
        const b = connected[j];
        const bp = pos.get(b.id)!;
        const dx = ap.x - bp.x, dy = ap.y - bp.y;
        const dist2 = dx * dx + dy * dy + 0.01;
        const f = (k * k) / dist2;
        const dist = Math.sqrt(dist2);
        const ux = dx / dist, uy = dy / dist;
        disp.get(a.id)!.x += ux * f;
        disp.get(a.id)!.y += uy * f;
        disp.get(b.id)!.x -= ux * f;
        disp.get(b.id)!.y -= uy * f;
      }
    }
    // 인력 — 인접
    for (const a of connected) {
      const nb = neighborMap.get(a.id);
      if (!nb) continue;
      const ap = pos.get(a.id)!;
      for (const bid of nb) {
        const bp = pos.get(bid);
        if (!bp) continue;
        const dx = ap.x - bp.x, dy = ap.y - bp.y;
        const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
        const f = (dist * dist) / k;
        const ux = dx / dist, uy = dy / dist;
        disp.get(a.id)!.x -= ux * f;
        disp.get(a.id)!.y -= uy * f;
      }
    }
    // 적용 + 중심 인력
    const maxStep = 30 * cooling;
    for (const a of connected) {
      const d = disp.get(a.id)!;
      const dist = Math.sqrt(d.x * d.x + d.y * d.y) + 0.01;
      const step = Math.min(maxStep, dist);
      const p = pos.get(a.id)!;
      p.x += (d.x / dist) * step;
      p.y += (d.y / dist) * step;
      // 약한 중심 인력
      p.x += (cx - p.x) * 0.01;
      p.y += (cy - p.y) * 0.01;
      // 경계 클램프
      p.x = Math.max(80, Math.min(VB_W - 80, p.x));
      p.y = Math.max(110, Math.min(VB_H - 60, p.y));
    }
  }

  const out: NodeWithCenter[] = connected.map((p) => {
    const pp = pos.get(p.id)!;
    const d = degree.get(p.id) ?? 0;
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      x: pp.x, y: pp.y,
      r: 6 + Math.min(d * 1.6, 14),
      degree: d,
      isolated: false,
    };
  });
  // 고립 — 동일 외곽
  const isoY = 70;
  const isoStartX = 90;
  const isoEndX = VB_W - 90;
  const isoStep = (isoEndX - isoStartX) / Math.max(1, isolated.length);
  isolated.forEach((p, i) => {
    out.push({
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      x: isoStartX + i * isoStep,
      y: isoY,
      r: 5,
      degree: 0,
      isolated: true,
    });
  });
  return out;
}
