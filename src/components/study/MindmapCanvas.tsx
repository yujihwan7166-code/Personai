/**
 * MindmapCanvas — 진짜 마인드맵 뷰어.
 *  - d3-hierarchy 기반 가로트리 / 방사형 레이아웃
 *  - 줌/팬, 검색, 미니맵
 *  - 노드 3-상태(이해 상태) 토글 + 진도 링
 *  - 노드 컨텍스트 메뉴: 퀴즈/플래시/채팅/원본 점프
 *  - 약한 개념 퀴즈 일괄 생성
 *
 * 데이터: meta.root(MindmapNode) + meta.userNodeStates(사용자 상태)
 * 없으면 content 마크다운을 파싱한 폴백 트리 사용.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree, cluster, type HierarchyPointNode } from 'd3-hierarchy';
import { GitBranch, Orbit, Search, X, Sparkles, MessageSquarePlus, Target, Layers, Minus, Plus, Maximize2 } from 'lucide-react';
import type { MindmapNode, MindmapMeta, MindmapNodeStatus, StudyNotebook } from '@/types/study';
import { cn } from '@/lib/utils';

/* ── Fallback: 마크다운 불릿 → MindmapNode ── */
function parseMarkdownToTree(content: string): MindmapNode | null {
  const lines = content.split('\n');
  const stack: { depth: number; node: MindmapNode }[] = [];
  let root: MindmapNode | null = null;
  let counter = 0;
  for (const line of lines) {
    const m = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (!m) continue;
    const depth = Math.floor(m[1].length / 2);
    const labelRaw = m[2].trim().replace(/\*\*([^*]+)\*\*/g, '$1');
    const node: MindmapNode = { id: `m_${counter++}`, label: labelRaw, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) {
      if (!root) root = node;
      else root.children.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }
    stack.push({ depth, node });
  }
  return root;
}

const PALETTE = ['#6366F1', '#10B981', '#F59E0B', '#0EA5E9', '#EF4444', '#8B5CF6', '#14B8A6', '#EC4899'];

function ensureBranchColors(root: MindmapNode) {
  root.children.forEach((c, i) => {
    if (!c.branchColor) c.branchColor = PALETTE[i % PALETTE.length];
  });
}

/** 자손 전체를 (조상의 branchColor 상속) 평탄화 순회. */
function walk(node: MindmapNode, parentColor: string | undefined, cb: (n: MindmapNode, color: string, depth: number) => void, depth = 0) {
  const color = node.branchColor ?? parentColor ?? '#475569';
  cb(node, color, depth);
  for (const c of node.children) walk(c, color, cb, depth + 1);
}

type Layout = 'tree' | 'radial';

/* ── 상태 아이콘 맵 ── */
const STATUS_META: Record<MindmapNodeStatus, { dot: string; label: string }> = {
  unknown: { dot: '#CBD5E1', label: '모름' },        // slate-300
  shaky: { dot: '#F59E0B', label: '헷갈림' },        // amber-500
  'got-it': { dot: '#10B981', label: '이해함' },     // emerald-500
};

function nextStatus(s: MindmapNodeStatus): MindmapNodeStatus {
  return s === 'unknown' ? 'shaky' : s === 'shaky' ? 'got-it' : 'unknown';
}

interface Props {
  /** 렌즈 출력 — content(폴백용) + meta.structured(MindmapMeta) */
  content: string;
  meta?: MindmapMeta;
  /** 노트북 + 변경 콜백 — 상태 저장용 */
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  /** [p.N] 뱃지 점프 */
  onJumpToPage?: (page: number) => void;
  /** 컨텍스트 메뉴의 "퀴즈/플래시 생성" 요청 — 상위에서 generate 호출 */
  onGenerateFromNode?: (kind: 'quiz' | 'flashcard', node: MindmapNode) => void;
}

export function MindmapCanvas({ content, meta, notebook, onChange, onJumpToPage, onGenerateFromNode }: Props) {
  const [layout, setLayout] = useState<Layout>('tree');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; node: MindmapNode } | null>(null);

  const rootData = useMemo<MindmapNode | null>(() => {
    if (meta?.root) return meta.root;
    const parsed = parseMarkdownToTree(content);
    return parsed;
  }, [meta, content]);

  // 색상 상속 주입
  useEffect(() => {
    if (rootData) ensureBranchColors(rootData);
  }, [rootData]);

  const states = (meta?.userNodeStates ?? {}) as Record<string, MindmapNodeStatus>;

  // ───── 사이즈 추적 ─────
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ───── 레이아웃 계산 ─────
  const layoutNodes = useMemo(() => {
    if (!rootData) return null;
    const h = hierarchy(rootData, (d) => d.children);
    if (layout === 'tree') {
      const t = tree<MindmapNode>().nodeSize([38, 220]);
      return t(h);
    }
    // radial
    const radius = Math.min(size.w, size.h) / 2 - 80;
    const c = cluster<MindmapNode>().size([2 * Math.PI, radius]);
    return c(h);
  }, [rootData, layout, size.w, size.h]);

  // ───── 검색 매치 집합 ─────
  const matchIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !layoutNodes) return new Set<string>();
    const matches = new Set<string>();
    layoutNodes.each((n) => {
      if (n.data.label.toLowerCase().includes(q) || (n.data.summary ?? '').toLowerCase().includes(q)) {
        matches.add(n.data.id);
        let p: typeof n | null = n.parent;
        while (p) { matches.add(p.data.id); p = p.parent; }
      }
    });
    return matches;
  }, [query, layoutNodes]);

  // ───── 진도 집계 ─────
  const progress = useMemo(() => {
    if (!rootData) return { total: 0, gotIt: 0, shaky: 0 };
    let total = 0, gotIt = 0, shaky = 0;
    walk(rootData, undefined, (n) => {
      total += 1;
      const s = states[n.id];
      if (s === 'got-it') gotIt += 1;
      else if (s === 'shaky') shaky += 1;
    });
    return { total, gotIt, shaky };
  }, [rootData, states]);

  // ───── 팬/줌 이벤트 ─────
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef<{ x: number; y: number } | null>(null);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setTransform((t) => {
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const k = Math.max(0.3, Math.min(3, t.k * factor));
      return { ...t, k };
    });
  }, []);
  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-node]')) return;
    draggingRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    setTransform((t) => ({ ...t, x: e.clientX - draggingRef.current!.x, y: e.clientY - draggingRef.current!.y }));
  };
  const onMouseUp = () => { draggingRef.current = null; };

  // 레이아웃/사이즈 변경 시 자동 센터링
  useEffect(() => {
    if (!layoutNodes) return;
    if (layout === 'tree') {
      // 루트를 왼쪽 padding 위치에 배치
      setTransform({ x: 60, y: size.h / 2, k: 1 });
    } else {
      setTransform({ x: size.w / 2, y: size.h / 2, k: 1 });
    }
  }, [layout, layoutNodes, size.w, size.h]);

  // ───── 상태 토글 ─────
  const toggleStatus = (node: MindmapNode) => {
    const current = states[node.id] ?? 'unknown';
    const next = nextStatus(current);
    const prevMeta = (notebook.lensOutputs.mindmap?.meta ?? {}) as Record<string, unknown>;
    const structured = (prevMeta.structured ?? meta ?? { root: rootData!, version: 1 }) as MindmapMeta;
    const nextUserStates: Record<string, MindmapNodeStatus> = { ...(structured.userNodeStates ?? {}) };
    if (next === 'unknown') delete nextUserStates[node.id]; else nextUserStates[node.id] = next;
    const nextStructured: MindmapMeta = { ...structured, userNodeStates: nextUserStates, version: 1 };

    const prevOutput = notebook.lensOutputs.mindmap;
    if (!prevOutput) return;
    onChange({
      ...notebook,
      lensOutputs: {
        ...notebook.lensOutputs,
        mindmap: {
          ...prevOutput,
          meta: { ...prevMeta, structured: nextStructured },
        },
      },
    });
  };

  // ───── 약한 개념(shaky) 퀴즈 ─────
  const weakNodes = useMemo(() => {
    const list: MindmapNode[] = [];
    if (!rootData) return list;
    walk(rootData, undefined, (n) => {
      if (states[n.id] === 'shaky') list.push(n);
    });
    return list;
  }, [rootData, states]);

  // ───── 렌더 ─────
  if (!rootData) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
        마인드맵 데이터가 없습니다. 다시 생성해 보세요.
      </div>
    );
  }

  const zoomIn = () => setTransform((t) => ({ ...t, k: Math.min(3, t.k * 1.2) }));
  const zoomOut = () => setTransform((t) => ({ ...t, k: Math.max(0.3, t.k / 1.2) }));
  const zoomReset = () => setTransform({
    x: layout === 'tree' ? 60 : size.w / 2,
    y: size.h / 2,
    k: 1,
  });

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 select-none">
      {/* 툴바 */}
      <div className="absolute left-2 top-2 right-2 z-10 flex items-center gap-1.5 flex-wrap">
        <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-[11px] font-semibold">
          <button
            onClick={() => setLayout('tree')}
            className={cn('flex items-center gap-1 px-2.5 py-1',
              layout === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-700')}
          >
            <GitBranch className="h-3 w-3" /> 가로트리
          </button>
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setLayout('radial')}
            className={cn('flex items-center gap-1 px-2.5 py-1',
              layout === 'radial' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-700')}
          >
            <Orbit className="h-3 w-3" /> 방사형
          </button>
        </div>

        <button
          onClick={() => setSearchOpen((v) => !v)}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-full border shadow-sm',
            searchOpen ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 hover:text-indigo-700',
          )}
          title="검색"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노드 검색"
            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11.5px] outline-none focus:border-indigo-400 w-40 shadow-sm"
          />
        )}

        {weakNodes.length > 0 && onGenerateFromNode && (
          <button
            onClick={() => {
              // 첫 번째 shaky 노드를 대상으로 즉시 퀴즈 요청. (여러 개면 상위에서 합쳐 처리)
              onGenerateFromNode('quiz', { ...weakNodes[0], label: weakNodes.map((n) => n.label).join(', ') });
            }}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-400 text-white px-3 py-1 text-[11px] font-semibold shadow-sm"
            title={`헷갈리는 ${weakNodes.length}개 개념으로 퀴즈 만들기`}
          >
            <Sparkles className="h-3 w-3" /> 약한 개념 퀴즈 {weakNodes.length}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 shadow-sm">
          <button onClick={zoomOut} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" title="축소">
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[10.5px] tabular-nums text-slate-600 w-10 text-center">{Math.round(transform.k * 100)}%</span>
          <button onClick={zoomIn} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" title="확대">
            <Plus className="h-3 w-3" />
          </button>
          <button onClick={zoomReset} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" title="맞추기">
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>

        {/* 진도 링 */}
        {progress.total > 0 && (
          <ProgressRing total={progress.total} gotIt={progress.gotIt} shaky={progress.shaky} />
        )}
      </div>

      {/* SVG 캔버스 */}
      <svg
        ref={svgRef}
        className="h-full w-full cursor-grab active:cursor-grabbing"
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={(e) => e.preventDefault()}
      >
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
          {layoutNodes && (
            <>
              {renderEdges(layoutNodes, layout)}
              {renderNodes(layoutNodes, layout, {
                states,
                matchIds,
                onToggleStatus: toggleStatus,
                onCtx: (e, node) => {
                  e.preventDefault();
                  const rect = containerRef.current?.getBoundingClientRect();
                  setCtxMenu({
                    x: e.clientX - (rect?.left ?? 0),
                    y: e.clientY - (rect?.top ?? 0),
                    node,
                  });
                },
              })}
            </>
          )}
        </g>
      </svg>

      {/* 컨텍스트 메뉴 */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setCtxMenu(null)} />
          <div
            className="absolute z-40 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5"
            style={{ left: Math.min(ctxMenu.x, (containerRef.current?.clientWidth ?? 800) - 220), top: Math.min(ctxMenu.y, (containerRef.current?.clientHeight ?? 600) - 280) }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 pt-1 pb-2 text-[11px] text-slate-500 truncate">{ctxMenu.node.label}</div>
            <CtxItem icon={<Target className="h-3.5 w-3.5" />} label="이 개념으로 퀴즈 3문항"
              onClick={() => { onGenerateFromNode?.('quiz', ctxMenu.node); setCtxMenu(null); }} />
            <CtxItem icon={<Layers className="h-3.5 w-3.5" />} label="플래시카드 1장"
              onClick={() => { onGenerateFromNode?.('flashcard', ctxMenu.node); setCtxMenu(null); }} />
            <CtxItem icon={<MessageSquarePlus className="h-3.5 w-3.5" />} label="채팅에 이 개념 보내기"
              onClick={() => {
                const body = ctxMenu.node.summary
                  ? `${ctxMenu.node.label} — ${ctxMenu.node.summary}`
                  : ctxMenu.node.label;
                window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { text: body } }));
                setCtxMenu(null);
              }} />
            {ctxMenu.node.pages && ctxMenu.node.pages.length > 0 && onJumpToPage && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                <div className="px-2 py-0.5 text-[9.5px] uppercase tracking-wide text-slate-400">원본 점프</div>
                <div className="px-1 pb-1 flex flex-wrap gap-1">
                  {ctxMenu.node.pages.map((p) => (
                    <button
                      key={p}
                      onClick={() => { onJumpToPage(p); setCtxMenu(null); }}
                      className="rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 hover:text-indigo-700 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums"
                    >
                      p.{p}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-2 py-1 flex items-center gap-2">
              <span className="text-[10.5px] text-slate-500">이해 상태:</span>
              {(['unknown', 'shaky', 'got-it'] as MindmapNodeStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { toggleStatusTo(ctxMenu.node, s, notebook, onChange, meta, rootData); setCtxMenu(null); }}
                  className={cn(
                    'h-4 w-4 rounded-full border-2',
                    (states[ctxMenu.node.id] ?? 'unknown') === s ? 'border-slate-700' : 'border-transparent',
                  )}
                  style={{ background: STATUS_META[s].dot }}
                  title={STATUS_META[s].label}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* 미니맵 */}
      {layoutNodes && (
        <Minimap
          layoutNodes={layoutNodes}
          layout={layout}
          transform={transform}
          viewport={size}
          onMove={(dx, dy) => setTransform((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))}
        />
      )}
    </div>
  );
}

/** 상태를 특정 값으로 set. (컨텍스트 메뉴용) */
function toggleStatusTo(
  node: MindmapNode,
  next: MindmapNodeStatus,
  notebook: StudyNotebook,
  onChange: (nb: StudyNotebook) => void,
  meta: MindmapMeta | undefined,
  rootData: MindmapNode,
) {
  const prevOutput = notebook.lensOutputs.mindmap;
  if (!prevOutput) return;
  const prevMeta = (prevOutput.meta ?? {}) as Record<string, unknown>;
  const structured = (prevMeta.structured ?? meta ?? { root: rootData, version: 1 }) as MindmapMeta;
  const nextUserStates: Record<string, MindmapNodeStatus> = { ...(structured.userNodeStates ?? {}) };
  if (next === 'unknown') delete nextUserStates[node.id]; else nextUserStates[node.id] = next;
  const nextStructured: MindmapMeta = { ...structured, userNodeStates: nextUserStates, version: 1 };
  onChange({
    ...notebook,
    lensOutputs: {
      ...notebook.lensOutputs,
      mindmap: { ...prevOutput, meta: { ...prevMeta, structured: nextStructured } },
    },
  });
}

function CtxItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
}

/* ── SVG 렌더러 ── */

type NodeRenderCtx = {
  states: Record<string, MindmapNodeStatus>;
  matchIds: Set<string>;
  onToggleStatus: (n: MindmapNode) => void;
  onCtx: (e: React.MouseEvent, n: MindmapNode) => void;
};

function renderEdges(root: HierarchyPointNode<MindmapNode>, layout: Layout) {
  const out: React.ReactElement[] = [];
  root.each((n) => {
    if (!n.parent) return;
    const color = (n.data.branchColor || n.parent.data.branchColor || '#94A3B8');
    const sw = Math.max(1, 3 - n.depth * 0.5);
    const d = layout === 'tree'
      ? pathCurveH(n.parent.y, n.parent.x, n.y, n.x)
      : pathCurveRadial(n.parent, n);
    out.push(
      <path
        key={`e-${n.data.id}`}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeOpacity={0.55}
      />
    );
  });
  return out;
}

function renderNodes(
  root: HierarchyPointNode<MindmapNode>,
  layout: Layout,
  ctx: NodeRenderCtx,
) {
  const out: React.ReactElement[] = [];
  root.each((n) => {
    let x: number, y: number;
    if (layout === 'tree') {
      x = n.y;
      y = n.x;
    } else {
      const [angle, r] = [n.x, n.y];
      x = Math.cos(angle - Math.PI / 2) * r;
      y = Math.sin(angle - Math.PI / 2) * r;
    }
    const data = n.data;
    const color = data.branchColor || n.parent?.data.branchColor || '#6366F1';
    const status = ctx.states[data.id] ?? 'unknown';
    const isRoot = n.depth === 0;
    const match = ctx.matchIds.has(data.id);

    out.push(
      <g key={`n-${data.id}`} data-node transform={`translate(${x},${y})`}>
        <NodeBody
          data={data}
          color={color}
          depth={n.depth}
          isRoot={isRoot}
          status={status}
          match={match}
          hasQuery={ctx.matchIds.size > 0}
          onToggleStatus={() => ctx.onToggleStatus(data)}
          onCtx={(e) => ctx.onCtx(e, data)}
        />
      </g>
    );
  });
  return out;
}

function NodeBody({
  data, color, depth, isRoot, status, match, hasQuery, onToggleStatus, onCtx,
}: {
  data: MindmapNode;
  color: string;
  depth: number;
  isRoot: boolean;
  status: MindmapNodeStatus;
  match: boolean;
  hasQuery: boolean;
  onToggleStatus: () => void;
  onCtx: (e: React.MouseEvent) => void;
}) {
  // 노드 크기/스타일
  const fontSize = isRoot ? 15 : depth === 1 ? 13 : 11.5;
  const padX = isRoot ? 14 : 10;
  const padY = isRoot ? 8 : 5;
  const labelW = estimateWidth(data.label, fontSize) + padX * 2;
  const labelH = fontSize + padY * 2;
  const bg = isRoot ? color : '#FFFFFF';
  const fg = isRoot ? '#FFFFFF' : color;
  const borderColor = isRoot ? color : color;
  const opacity = hasQuery && !match ? 0.25 : 1;

  return (
    <g opacity={opacity} onContextMenu={onCtx}>
      {/* 카드 */}
      <rect
        x={-labelW / 2}
        y={-labelH / 2}
        width={labelW}
        height={labelH}
        rx={labelH / 2}
        fill={bg}
        stroke={borderColor}
        strokeWidth={isRoot ? 2 : 1.5}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onCtx(e); }}
      />
      {/* 라벨 */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        fontWeight={isRoot ? 700 : depth === 1 ? 600 : 500}
        fill={fg}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {(data.emoji ? data.emoji + ' ' : '') + data.label}
      </text>

      {/* 상태 도트 (좌상단) */}
      <circle
        cx={-labelW / 2 + 6}
        cy={-labelH / 2 + 6}
        r={4}
        fill={STATUS_META[status].dot}
        stroke="#fff"
        strokeWidth={1.5}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
      >
        <title>{`${STATUS_META[status].label} (클릭해 변경)`}</title>
      </circle>

      {/* 검색 매치 ring */}
      {match && hasQuery && (
        <rect
          x={-labelW / 2 - 3}
          y={-labelH / 2 - 3}
          width={labelW + 6}
          height={labelH + 6}
          rx={labelH / 2 + 3}
          fill="none"
          stroke="#FACC15"
          strokeWidth={2}
        />
      )}

      {/* 페이지 뱃지 (우측) */}
      {data.pages && data.pages.length > 0 && (
        <g transform={`translate(${labelW / 2 + 6}, 0)`}>
          <rect
            x={0}
            y={-7}
            width={20 + (data.pages.length - 1) * 6}
            height={14}
            rx={3}
            fill="#F1F5F9"
            stroke="#E2E8F0"
          />
          <text
            x={4}
            y={0}
            dominantBaseline="central"
            fontSize={9}
            fill="#475569"
            style={{ pointerEvents: 'none' }}
          >
            p.{data.pages[0]}{data.pages.length > 1 ? `+${data.pages.length - 1}` : ''}
          </text>
        </g>
      )}
    </g>
  );
}

/* ── SVG path helpers ── */
function pathCurveH(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  return `M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`;
}

function pathCurveRadial(
  p: HierarchyPointNode<MindmapNode>,
  n: HierarchyPointNode<MindmapNode>,
): string {
  const [a1, r1] = [p.x - Math.PI / 2, p.y];
  const [a2, r2] = [n.x - Math.PI / 2, n.y];
  const x1 = Math.cos(a1) * r1;
  const y1 = Math.sin(a1) * r1;
  const x2 = Math.cos(a2) * r2;
  const y2 = Math.sin(a2) * r2;
  // 간단히 Bezier (중간점을 약간 당김)
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} Q${mx * 0.6},${my * 0.6} ${x2},${y2}`;
}

function estimateWidth(text: string, fontSize: number): number {
  // 한글은 거의 1em, 영문은 약 0.55em. 러프 추정.
  let units = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (code > 127) units += 1;
    else units += 0.55;
  }
  return Math.max(60, units * fontSize);
}

/* ── 진도 링 ── */

function ProgressRing({ total, gotIt, shaky }: { total: number; gotIt: number; shaky: number }) {
  const radius = 13;
  const C = 2 * Math.PI * radius;
  const p1 = total > 0 ? gotIt / total : 0;
  const p2 = total > 0 ? shaky / total : 0;
  return (
    <div className="flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 shadow-sm">
      <svg width={32} height={32} viewBox="-16 -16 32 32" className="-rotate-90">
        <circle r={radius} fill="none" stroke="#E2E8F0" strokeWidth={3} />
        {p2 > 0 && (
          <circle r={radius} fill="none" stroke="#F59E0B" strokeWidth={3}
            strokeDasharray={`${p2 * C} ${C}`}
            strokeDashoffset={-(p1 * C)}
            strokeLinecap="round"
          />
        )}
        {p1 > 0 && (
          <circle r={radius} fill="none" stroke="#10B981" strokeWidth={3}
            strokeDasharray={`${p1 * C} ${C}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="leading-tight pr-1">
        <div className="text-[10px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{gotIt}/{total}</div>
        <div className="text-[9px] text-slate-400">이해</div>
      </div>
    </div>
  );
}

/* ── 미니맵 ── */

function Minimap({
  layoutNodes, layout, transform, viewport, onMove,
}: {
  layoutNodes: HierarchyPointNode<MindmapNode>;
  layout: Layout;
  transform: { x: number; y: number; k: number };
  viewport: { w: number; h: number };
  onMove: (dx: number, dy: number) => void;
}) {
  const W = 160, H = 100;
  // 노드 영역 bounding 계산
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  layoutNodes.each((n) => {
    const [x, y] = layout === 'tree'
      ? [n.y, n.x]
      : [Math.cos(n.x - Math.PI / 2) * n.y, Math.sin(n.x - Math.PI / 2) * n.y];
    if (x < minX) minX = x; if (y < minY) minY = y;
    if (x > maxX) maxX = x; if (y > maxY) maxY = y;
  });
  const padding = 40;
  minX -= padding; minY -= padding; maxX += padding; maxY += padding;
  const bw = maxX - minX, bh = maxY - minY;
  const scale = Math.min(W / bw, H / bh);
  const vw = viewport.w / transform.k / bw * W;
  const vh = viewport.h / transform.k / bh * H;
  const vx = (-transform.x / transform.k - minX) / bw * W;
  const vy = (-transform.y / transform.k - minY) / bh * H;

  const draggingRef = useRef(false);
  return (
    <div
      className="absolute right-2 bottom-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 shadow-sm overflow-hidden"
      style={{ width: W, height: H }}
      onMouseDown={() => { draggingRef.current = true; }}
      onMouseUp={() => { draggingRef.current = false; }}
      onMouseLeave={() => { draggingRef.current = false; }}
      onMouseMove={(e) => {
        if (!draggingRef.current) return;
        onMove(-e.movementX / scale * transform.k, -e.movementY / scale * transform.k);
      }}
    >
      <svg width={W} height={H}>
        <g transform={`translate(${-minX * scale}, ${-minY * scale}) scale(${scale})`}>
          {(() => {
            const pts: React.ReactElement[] = [];
            layoutNodes.each((n) => {
              const [x, y] = layout === 'tree'
                ? [n.y, n.x]
                : [Math.cos(n.x - Math.PI / 2) * n.y, Math.sin(n.x - Math.PI / 2) * n.y];
              const color = n.data.branchColor || n.parent?.data.branchColor || '#94A3B8';
              pts.push(<circle key={n.data.id} cx={x} cy={y} r={3 / scale} fill={color} />);
            });
            return pts;
          })()}
        </g>
        <rect
          x={vx}
          y={vy}
          width={Math.min(W - vx, vw)}
          height={Math.min(H - vy, vh)}
          fill="none"
          stroke="#6366F1"
          strokeWidth={1.5}
          strokeDasharray="2 2"
        />
      </svg>
    </div>
  );
}

/** 외부에서 검색 바 닫기 버튼 등을 넣고 싶을 때 재사용용. 현재는 사용처 없음. */
export { X as _X };
