/**
 * MindmapCanvas — 진짜 마인드맵 뷰어.
 *  - d3-hierarchy 기반 가로트리 / 방사형 레이아웃
 *  - 줌/팬, 검색, 미니맵, 레이아웃 전환 애니메이션
 *  - 키보드 내비게이션 (↑↓←→/Enter/Space/F/Esc/?)
 *  - 이해도 3-상태 토글 + undo 스택 + 토스트
 *  - 노드 포커스(격리) 모드 + breadcrumb
 *  - 자식 접기/펼치기 (depth ≥ 2 기본 접힘, +N 뱃지)
 *  - 컨텍스트 메뉴: 즉답 그룹(상태/격리/페이지) + AI 그룹(퀴즈/플래시/채팅)
 *  - prefers-reduced-motion 존중, aria treeitem role
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, tree, cluster, type HierarchyPointNode } from 'd3-hierarchy';
import {
  GitBranch, Orbit, Search, Sparkles, MessageSquarePlus, Target, Layers,
  Minus, Plus, Maximize2, Focus, Undo2, ChevronRight, CornerUpLeft,
  BarChart3,
} from 'lucide-react';
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

/** 전체 노드 기본 접기 상태(depth ≥ 2의 자식 있는 노드) 계산. */
function initialCollapsed(root: MindmapNode): Set<string> {
  const s = new Set<string>();
  walk(root, undefined, (n, _c, depth) => {
    if (depth >= 2 && n.children.length > 0) s.add(n.id);
  });
  return s;
}

/** 노드 id → 부모/자식 전체 개수(접힌 것 포함) 맵. */
function buildIndex(root: MindmapNode) {
  const parentOf = new Map<string, string | null>();
  const totalDesc = new Map<string, number>();
  const byId = new Map<string, MindmapNode>();
  const visit = (n: MindmapNode, p: string | null): number => {
    parentOf.set(n.id, p);
    byId.set(n.id, n);
    let total = 0;
    for (const c of n.children) total += 1 + visit(c, n.id);
    totalDesc.set(n.id, total);
    return total;
  };
  visit(root, null);
  return { parentOf, totalDesc, byId };
}

type Layout = 'tree' | 'radial';

/* ── 상태 아이콘 ── */
const STATUS_META: Record<MindmapNodeStatus, { dot: string; label: string; glyph: string }> = {
  unknown: { dot: '#CBD5E1', label: '모름',   glyph: '●' },
  shaky:   { dot: '#F59E0B', label: '헷갈림', glyph: '◐' },
  'got-it':{ dot: '#10B981', label: '이해함', glyph: '✓' },
};

function nextStatus(s: MindmapNodeStatus): MindmapNodeStatus {
  return s === 'unknown' ? 'shaky' : s === 'shaky' ? 'got-it' : 'unknown';
}

interface Props {
  content: string;
  meta?: MindmapMeta;
  notebook: StudyNotebook;
  onChange: (nb: StudyNotebook) => void;
  onJumpToPage?: (page: number) => void;
  onGenerateFromNode?: (kind: 'quiz' | 'flashcard' | 'diagram', node: MindmapNode) => void;
}

type HistoryEntry = { nodeId: string; prev: MindmapNodeStatus; next: MindmapNodeStatus };

export function MindmapCanvas({ content, meta, notebook, onChange, onJumpToPage, onGenerateFromNode }: Props) {
  const [layout, setLayout] = useState<Layout>('tree');
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; node: MindmapNode } | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; onUndo?: () => void } | null>(null);
  const historyRef = useRef<HistoryEntry[]>([]);

  const rootData = useMemo<MindmapNode | null>(() => {
    if (meta?.root) return meta.root;
    return parseMarkdownToTree(content);
  }, [meta, content]);

  // 색상 상속 + 접기 기본값 주입
  useEffect(() => {
    if (!rootData) return;
    ensureBranchColors(rootData);
    setCollapsed(initialCollapsed(rootData));
  }, [rootData]);

  // 인덱스 (부모/자손수)
  const index = useMemo(() => rootData ? buildIndex(rootData) : null, [rootData]);

  const states = useMemo(
    () => (meta?.userNodeStates ?? {}) as Record<string, MindmapNodeStatus>,
    [meta?.userNodeStates],
  );

  // ── reduced-motion ──
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  // ── 사이즈 추적 ──
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

  // ── 레이아웃 계산 (접힌 노드는 children 무시) ──
  const layoutNodes = useMemo(() => {
    if (!rootData) return null;
    const h = hierarchy(rootData, (d) => collapsed.has(d.id) ? null : d.children);
    if (layout === 'tree') {
      const t = tree<MindmapNode>().nodeSize([38, 220]);
      return t(h);
    }
    const radius = Math.min(size.w, size.h) / 2 - 80;
    const c = cluster<MindmapNode>().size([2 * Math.PI, radius]);
    return c(h);
  }, [rootData, layout, size.w, size.h, collapsed]);

  // 좌표 맵 (키보드 네비용)
  const posMap = useMemo(() => {
    const m = new Map<string, { x: number; y: number; depth: number }>();
    if (!layoutNodes) return m;
    layoutNodes.each((n) => {
      const [x, y] = layout === 'tree'
        ? [n.y, n.x]
        : [Math.cos(n.x - Math.PI / 2) * n.y, Math.sin(n.x - Math.PI / 2) * n.y];
      m.set(n.data.id, { x, y, depth: n.depth });
    });
    return m;
  }, [layoutNodes, layout]);

  // 검색 매치
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

  // 격리 대상 집합 (선택 + 조상 + 직계 자식)
  const isolatedSet = useMemo(() => {
    if (!isolatedId || !index) return null;
    const s = new Set<string>([isolatedId]);
    // 조상
    let cur: string | null = isolatedId;
    while (cur) {
      const p = index.parentOf.get(cur) ?? null;
      if (p) s.add(p);
      cur = p;
    }
    // 직계 자식
    const node = index.byId.get(isolatedId);
    node?.children.forEach((c) => s.add(c.id));
    return s;
  }, [isolatedId, index]);

  // breadcrumb 체인
  const breadcrumb = useMemo(() => {
    if (!isolatedId || !index) return [];
    const chain: { id: string; label: string }[] = [];
    let cur: string | null = isolatedId;
    while (cur) {
      const n = index.byId.get(cur);
      if (n) chain.unshift({ id: n.id, label: n.label });
      cur = index.parentOf.get(cur) ?? null;
    }
    return chain;
  }, [isolatedId, index]);

  // 진도
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

  // ── 팬/줌 ──
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

  // transform 애니메이션 헬퍼
  const animRef = useRef<number | null>(null);
  const animateTransformTo = useCallback((target: { x: number; y: number; k: number }, duration = 300) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (reducedMotion || duration <= 0) { setTransform(target); return; }
    const start = performance.now();
    let from = { x: 0, y: 0, k: 1 };
    setTransform((t) => { from = { ...t }; return t; });
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setTransform({
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        k: from.k + (target.k - from.k) * e,
      });
      if (p < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [reducedMotion]);

  // 레이아웃 변경 시 애니메이션 센터링
  useEffect(() => {
    if (!layoutNodes) return;
    const target = layout === 'tree'
      ? { x: 60, y: size.h / 2, k: 1 }
      : { x: size.w / 2, y: size.h / 2, k: 1 };
    animateTransformTo(target, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  // 초기/사이즈 변경 시 즉시 센터링 (애니메이션 없이)
  const didInitRef = useRef(false);
  useEffect(() => {
    if (!layoutNodes || size.w === 0) return;
    if (didInitRef.current) return;
    didInitRef.current = true;
    setTransform(layout === 'tree'
      ? { x: 60, y: size.h / 2, k: 1 }
      : { x: size.w / 2, y: size.h / 2, k: 1 });
  }, [layoutNodes, size.w, size.h, layout]);

  // 특정 노드로 줌핏
  const focusNode = useCallback((id: string, withZoom = false) => {
    const p = posMap.get(id);
    if (!p) return;
    setFocusedId(id);
    if (withZoom) {
      const k = Math.max(1, Math.min(1.4, transform.k));
      animateTransformTo({ x: size.w / 2 - p.x * k, y: size.h / 2 - p.y * k, k }, 300);
    } else {
      // 화면 밖이면 가볍게 당기기
      const sx = p.x * transform.k + transform.x;
      const sy = p.y * transform.k + transform.y;
      const pad = 80;
      if (sx < pad || sx > size.w - pad || sy < pad || sy > size.h - pad) {
        animateTransformTo({ x: size.w / 2 - p.x * transform.k, y: size.h / 2 - p.y * transform.k, k: transform.k }, 250);
      }
    }
  }, [posMap, transform, size, animateTransformTo]);

  // ── 상태 변경 (공통) ──
  const applyStatus = useCallback((nodeId: string, next: MindmapNodeStatus) => {
    const prevOutput = notebook.lensOutputs.mindmap;
    if (!prevOutput || !rootData) return;
    const prevMeta = (prevOutput.meta ?? {}) as Record<string, unknown>;
    const structured = (prevMeta.structured ?? meta ?? { root: rootData, version: 1 }) as MindmapMeta;
    const prev = (structured.userNodeStates?.[nodeId] ?? 'unknown') as MindmapNodeStatus;
    const nextUserStates: Record<string, MindmapNodeStatus> = { ...(structured.userNodeStates ?? {}) };
    if (next === 'unknown') delete nextUserStates[nodeId]; else nextUserStates[nodeId] = next;
    const nextStructured: MindmapMeta = { ...structured, userNodeStates: nextUserStates, version: 1 };
    onChange({
      ...notebook,
      lensOutputs: {
        ...notebook.lensOutputs,
        mindmap: { ...prevOutput, meta: { ...prevMeta, structured: nextStructured } },
      },
    });
    return prev;
  }, [notebook, onChange, meta, rootData]);

  // 토글 + 히스토리
  const toggleStatus = useCallback((node: MindmapNode) => {
    const current = states[node.id] ?? 'unknown';
    const next = nextStatus(current);
    const prev = applyStatus(node.id, next);
    if (prev !== undefined) {
      historyRef.current.push({ nodeId: node.id, prev, next });
      if (historyRef.current.length > 30) historyRef.current.shift();
      setToast({
        msg: `'${STATUS_META[next].label}'으로 표시됨`,
        onUndo: () => {
          applyStatus(node.id, prev);
          historyRef.current.pop();
          setToast(null);
        },
      });
    }
  }, [states, applyStatus]);

  const setStatusTo = useCallback((node: MindmapNode, next: MindmapNodeStatus) => {
    const prev = applyStatus(node.id, next);
    if (prev !== undefined && prev !== next) {
      historyRef.current.push({ nodeId: node.id, prev, next });
      setToast({
        msg: `'${STATUS_META[next].label}'으로 표시됨`,
        onUndo: () => {
          applyStatus(node.id, prev);
          historyRef.current.pop();
          setToast(null);
        },
      });
    }
  }, [applyStatus]);

  // 토스트 자동 닫기
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── 접기 토글 ──
  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

  // ── 약한 개념 ──
  const weakNodes = useMemo(() => {
    const list: MindmapNode[] = [];
    if (!rootData) return list;
    walk(rootData, undefined, (n) => {
      if (states[n.id] === 'shaky') list.push(n);
    });
    return list;
  }, [rootData, states]);

  // ── 키보드 내비게이션 ──
  const rootId = rootData?.id ?? null;
  const moveFocus = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    if (!index || !rootId) return;
    const current = focusedId ?? rootId;
    const p = posMap.get(current);
    if (!p) return;

    if (layout === 'tree') {
      if (dir === 'right') {
        // 현재 노드의 첫 자식
        const node = index.byId.get(current);
        if (node && node.children.length > 0 && !collapsed.has(current)) {
          focusNode(node.children[0].id);
          return;
        }
      }
      if (dir === 'left') {
        const parent = index.parentOf.get(current);
        if (parent) focusNode(parent);
        return;
      }
      // up/down: 동일 x(=depth) 레벨에서 y가 가장 가까운 다른 노드
      let best: { id: string; dy: number } | null = null;
      posMap.forEach((v, id) => {
        if (id === current) return;
        const dy = dir === 'up' ? p.y - v.y : v.y - p.y;
        const dx = Math.abs(v.x - p.x);
        if (dy <= 0) return;
        const score = dy + dx * 0.4;
        if (!best || score < best.dy) best = { id, dy: score };
      });
      if (best) focusNode(best.id);
    } else {
      // radial: 반경/각도 기반 근접
      let best: { id: string; score: number } | null = null;
      posMap.forEach((v, id) => {
        if (id === current) return;
        const dx = v.x - p.x;
        const dy = v.y - p.y;
        if (dir === 'right' && dx <= 0) return;
        if (dir === 'left' && dx >= 0) return;
        if (dir === 'up' && dy >= 0) return;
        if (dir === 'down' && dy <= 0) return;
        const score = Math.hypot(dx, dy);
        if (!best || score < best.score) best = { id, score };
      });
      if (best) focusNode(best.id);
    }
  }, [focusedId, index, posMap, layout, rootId, collapsed, focusNode]);

  const [cheatOpen, setCheatOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 마인드맵 컨테이너 내부/자기자신이 포커스일 때만 반응
      const el = containerRef.current;
      if (!el) return;
      const active = document.activeElement as HTMLElement | null;
      const withinMindmap = el === active || (active ? el.contains(active) : false);
      if (!withinMindmap) return;

      const target = e.target as HTMLElement;
      const inInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if (e.key === 'Escape') {
        if (ctxMenu) { setCtxMenu(null); return; }
        if (cheatOpen) { setCheatOpen(false); return; }
        if (searchOpen) { setSearchOpen(false); setQuery(''); return; }
        if (isolatedId) { setIsolatedId(null); return; }
        if (focusedId) { setFocusedId(null); return; }
        return;
      }

      if (inInput) return;

      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        const last = historyRef.current.pop();
        if (last) {
          applyStatus(last.nodeId, last.prev);
          setToast({ msg: '되돌렸습니다' });
        }
        return;
      }

      if (e.key === '?' || (e.shiftKey && e.key === '/')) { setCheatOpen(v => !v); return; }
      if (e.key === '/') { e.preventDefault(); setSearchOpen(true); return; }

      if (!focusedId && rootId) setFocusedId(rootId);
      const curId = focusedId ?? rootId;
      if (!curId) return;
      const curNode = index?.byId.get(curId);

      if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus('up'); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus('down'); return; }
      if (e.key === 'ArrowLeft') { e.preventDefault(); moveFocus('left'); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); moveFocus('right'); return; }

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (curNode) {
          if (curNode.children.length > 0) toggleCollapse(curNode.id);
          else toggleStatus(curNode);
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!curNode) return;
        const p = posMap.get(curNode.id);
        if (!p) return;
        const rect = containerRef.current?.getBoundingClientRect();
        setCtxMenu({
          x: (rect ? rect.width / 2 : 300),
          y: (rect ? rect.height / 2 : 200),
          node: curNode,
        });
        return;
      }
      if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (curNode) focusNode(curNode.id, true);
        return;
      }
      if (e.key.toLowerCase() === 'i') {
        e.preventDefault();
        if (curNode) setIsolatedId((prev) => prev === curNode.id ? null : curNode.id);
        return;
      }
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (curNode) toggleStatus(curNode);
        return;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [focusedId, rootId, index, moveFocus, toggleCollapse, toggleStatus, focusNode, applyStatus, posMap, ctxMenu, cheatOpen, searchOpen, isolatedId]);

  // 검색 점프: 쿼리 바뀔 때 첫 매치로 애니메이션
  useEffect(() => {
    if (!query.trim() || !layoutNodes) return;
    const q = query.trim().toLowerCase();
    let firstMatch: string | null = null;
    layoutNodes.each((n) => {
      if (firstMatch) return;
      if (n.data.label.toLowerCase().includes(q)) firstMatch = n.data.id;
    });
    if (firstMatch) focusNode(firstMatch, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // ───── 렌더 ─────
  if (!rootData) {
    return (
      <div className="flex h-full items-center justify-center text-[12px] text-slate-500">
        마인드맵 데이터가 없습니다. 다시 생성해 보세요.
      </div>
    );
  }

  const zoomIn = () => animateTransformTo({ ...transform, k: Math.min(3, transform.k * 1.2) }, 180);
  const zoomOut = () => animateTransformTo({ ...transform, k: Math.max(0.3, transform.k / 1.2) }, 180);
  const zoomReset = () => animateTransformTo({ x: layout === 'tree' ? 60 : size.w / 2, y: size.h / 2, k: 1 }, 300);

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-950 select-none outline-none"
      tabIndex={0}
      role="tree"
      aria-label="학습 마인드맵"
    >
      {/* 툴바 */}
      <div className="absolute left-2 top-2 right-2 z-10 flex items-center gap-1.5 flex-wrap">
        <div className="inline-flex rounded-full border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900 shadow-sm text-[11px] font-semibold">
          <button
            onClick={() => setLayout('tree')}
            className={cn('flex items-center gap-1 px-2.5 py-1',
              layout === 'tree' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-700')}
            aria-pressed={layout === 'tree'}
          >
            <GitBranch className="h-3 w-3" /> 가로트리
          </button>
          <div className="w-px bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setLayout('radial')}
            className={cn('flex items-center gap-1 px-2.5 py-1',
              layout === 'radial' ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-700')}
            aria-pressed={layout === 'radial'}
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
          aria-label="노드 검색"
          title="검색 (/)"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="노드 검색"
            aria-label="노드 검색 입력"
            className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-[11.5px] outline-none focus:border-indigo-400 w-40 shadow-sm"
          />
        )}

        {weakNodes.length > 0 && onGenerateFromNode && (
          <button
            onClick={() => {
              onGenerateFromNode('quiz', { ...weakNodes[0], label: weakNodes.map((n) => n.label).join(', ') });
            }}
            className="inline-flex items-center gap-1 rounded-full bg-amber-500 hover:bg-amber-400 text-white px-3 py-1 text-[11px] font-semibold shadow-sm"
            title={`헷갈리는 ${weakNodes.length}개 개념으로 퀴즈 만들기`}
          >
            <Sparkles className="h-3 w-3" /> 약한 개념 퀴즈 {weakNodes.length}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 shadow-sm">
          <button onClick={zoomOut} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" aria-label="축소" title="축소">
            <Minus className="h-3 w-3" />
          </button>
          <span className="text-[10.5px] tabular-nums text-slate-600 w-10 text-center" aria-hidden>{Math.round(transform.k * 100)}%</span>
          <button onClick={zoomIn} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" aria-label="확대" title="확대">
            <Plus className="h-3 w-3" />
          </button>
          <button onClick={zoomReset} className="h-5 w-5 flex items-center justify-center text-slate-500 hover:text-slate-900" aria-label="맞추기" title="맞추기">
            <Maximize2 className="h-3 w-3" />
          </button>
        </div>

        {progress.total > 0 && (
          <ProgressRing total={progress.total} gotIt={progress.gotIt} shaky={progress.shaky} />
        )}

        <button
          onClick={() => setCheatOpen(true)}
          className="h-7 w-7 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:text-indigo-700 shadow-sm text-[11px] font-bold"
          aria-label="단축키 안내"
          title="단축키 (?)"
        >
          ?
        </button>
      </div>

      {/* breadcrumb (격리 모드) */}
      {isolatedId && breadcrumb.length > 0 && (
        <div className="absolute left-2 top-12 z-10 flex items-center gap-1 rounded-full border border-indigo-200 bg-white/95 dark:bg-slate-900/95 dark:border-indigo-800 px-2 py-1 shadow-sm text-[11px] max-w-[calc(100%-1rem)] overflow-hidden">
          <button
            onClick={() => setIsolatedId(null)}
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold"
            title="격리 해제 (Esc)"
          >
            <CornerUpLeft className="h-3 w-3" /> 전체 보기
          </button>
          <span className="text-slate-300">·</span>
          <div className="flex items-center gap-0.5 min-w-0 overflow-hidden">
            {breadcrumb.map((b, i) => (
              <span key={b.id} className="flex items-center gap-0.5 min-w-0">
                {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 flex-shrink-0" />}
                <button
                  onClick={() => setIsolatedId(b.id)}
                  className={cn(
                    'truncate px-1 rounded',
                    i === breadcrumb.length - 1
                      ? 'font-semibold text-slate-800 dark:text-slate-100'
                      : 'text-slate-500 hover:text-indigo-700',
                  )}
                  style={{ maxWidth: 140 }}
                >
                  {b.label}
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

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
              {renderEdges(layoutNodes, layout, isolatedSet)}
              {renderNodes(layoutNodes, layout, {
                states,
                matchIds,
                focusedId,
                isolatedSet,
                collapsed,
                reducedMotion,
                onToggleStatus: toggleStatus,
                onToggleCollapse: toggleCollapse,
                onDoubleClick: (node) => setIsolatedId((prev) => prev === node.id ? null : node.id),
                onFocus: (id) => setFocusedId(id),
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

      {/* 컨텍스트 메뉴 — 즉답/AI 그룹 분리 */}
      {ctxMenu && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setCtxMenu(null)} />
          <div
            role="menu"
            className="absolute z-40 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5"
            style={{
              left: Math.min(ctxMenu.x, (containerRef.current?.clientWidth ?? 800) - 236),
              top: Math.min(ctxMenu.y, (containerRef.current?.clientHeight ?? 600) - 340),
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2 pt-1 pb-2 text-[11px] text-slate-500 truncate">{ctxMenu.node.label}</div>

            {/* 즉답 그룹 */}
            <div className="px-2 py-1 flex items-center gap-2">
              <span className="text-[10.5px] text-slate-500 w-14">이해 상태</span>
              {(['unknown', 'shaky', 'got-it'] as MindmapNodeStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusTo(ctxMenu.node, s); setCtxMenu(null); }}
                  className={cn(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] text-white',
                    (states[ctxMenu.node.id] ?? 'unknown') === s ? 'border-slate-700' : 'border-transparent',
                  )}
                  style={{ background: STATUS_META[s].dot }}
                  aria-label={STATUS_META[s].label}
                  title={STATUS_META[s].label}
                >
                  <span aria-hidden>{STATUS_META[s].glyph}</span>
                </button>
              ))}
            </div>

            <CtxItem
              icon={<Focus className="h-3.5 w-3.5" />}
              label={isolatedId === ctxMenu.node.id ? '격리 해제' : '이 가지만 보기'}
              hint="I"
              onClick={() => {
                setIsolatedId((prev) => prev === ctxMenu.node.id ? null : ctxMenu.node.id);
                setCtxMenu(null);
              }}
            />

            {ctxMenu.node.children.length > 0 && (
              <CtxItem
                icon={<Layers className="h-3.5 w-3.5" />}
                label={collapsed.has(ctxMenu.node.id) ? `펼치기 (${ctxMenu.node.children.length})` : '접기'}
                hint="Space"
                onClick={() => { toggleCollapse(ctxMenu.node.id); setCtxMenu(null); }}
              />
            )}

            {ctxMenu.node.pages && ctxMenu.node.pages.length > 0 && onJumpToPage && (
              <div className="px-2 py-1">
                <div className="text-[9.5px] uppercase tracking-wide text-slate-400 mb-1">원본 점프</div>
                <div className="flex flex-wrap gap-1">
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
              </div>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
            <div className="px-2 py-0.5 text-[9.5px] uppercase tracking-wide text-slate-400 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-indigo-500" /> AI 생성
            </div>
            <CtxItem
              icon={<Target className="h-3.5 w-3.5" />}
              label="이 개념으로 퀴즈 3문항"
              onClick={() => { onGenerateFromNode?.('quiz', ctxMenu.node); setCtxMenu(null); }}
            />
            <CtxItem
              icon={<Layers className="h-3.5 w-3.5" />}
              label="플래시카드 1장"
              onClick={() => { onGenerateFromNode?.('flashcard', ctxMenu.node); setCtxMenu(null); }}
            />
            <CtxItem
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              label="도식으로 보기"
              onClick={() => { onGenerateFromNode?.('diagram', ctxMenu.node); setCtxMenu(null); }}
            />
            <CtxItem
              icon={<MessageSquarePlus className="h-3.5 w-3.5" />}
              label="채팅에 이 개념 보내기"
              onClick={() => {
                const body = ctxMenu.node.summary
                  ? `${ctxMenu.node.label} — ${ctxMenu.node.summary}`
                  : ctxMenu.node.label;
                window.dispatchEvent(new CustomEvent('study:askSelection', { detail: { text: body } }));
                setCtxMenu(null);
              }}
            />
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

      {/* 토스트 */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1.5 text-[11.5px] shadow-lg"
        >
          <span>{toast.msg}</span>
          {toast.onUndo && (
            <button
              onClick={toast.onUndo}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 hover:bg-white/25 px-2 py-0.5 text-[11px] font-semibold"
            >
              <Undo2 className="h-3 w-3" /> 되돌리기 <kbd className="ml-1 text-[9.5px] opacity-70">Ctrl+Z</kbd>
            </button>
          )}
        </div>
      )}

      {/* 단축키 치트시트 */}
      {cheatOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40" onClick={() => setCheatOpen(false)}>
          <div
            className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl p-4 w-[360px] text-[12px] text-slate-700 dark:text-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold text-[13px] mb-2">마인드맵 단축키</div>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
              <Kbd>↑ ↓ ← →</Kbd><span>노드 간 이동</span>
              <Kbd>Enter</Kbd><span>컨텍스트 메뉴 열기</span>
              <Kbd>Space</Kbd><span>자식 접기/펼치기 (없으면 상태 토글)</span>
              <Kbd>S</Kbd><span>이해도 토글</span>
              <Kbd>F</Kbd><span>이 노드에 줌핏</span>
              <Kbd>I</Kbd><span>이 가지만 보기 (격리)</span>
              <Kbd>/</Kbd><span>검색 열기</span>
              <Kbd>Ctrl+Z</Kbd><span>이해도 변경 되돌리기</span>
              <Kbd>Esc</Kbd><span>격리/검색/포커스 해제</span>
              <Kbd>?</Kbd><span>이 창 열기/닫기</span>
            </div>
            <div className="mt-3 text-right">
              <button onClick={() => setCheatOpen(false)} className="text-[11.5px] text-indigo-600 hover:text-indigo-800 font-semibold">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[10.5px] font-semibold tabular-nums">
      {children}
    </kbd>
  );
}

function CtxItem({
  icon, label, hint, onClick,
}: { icon: React.ReactNode; label: string; hint?: string; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <span className="text-slate-400">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {hint && <kbd className="text-[9.5px] text-slate-400">{hint}</kbd>}
    </button>
  );
}

/* ── SVG 렌더러 ── */

type NodeRenderCtx = {
  states: Record<string, MindmapNodeStatus>;
  matchIds: Set<string>;
  focusedId: string | null;
  isolatedSet: Set<string> | null;
  collapsed: Set<string>;
  reducedMotion: boolean;
  onToggleStatus: (n: MindmapNode) => void;
  onToggleCollapse: (id: string) => void;
  onDoubleClick: (n: MindmapNode) => void;
  onFocus: (id: string) => void;
  onCtx: (e: React.MouseEvent, n: MindmapNode) => void;
};

function renderEdges(
  root: HierarchyPointNode<MindmapNode>,
  layout: Layout,
  isolatedSet: Set<string> | null,
) {
  const out: React.ReactElement[] = [];
  root.each((n) => {
    if (!n.parent) return;
    const color = (n.data.branchColor || n.parent.data.branchColor || '#94A3B8');
    const sw = Math.max(1, 3 - n.depth * 0.5);
    const d = layout === 'tree'
      ? pathCurveH(n.parent.y, n.parent.x, n.y, n.x)
      : pathCurveRadial(n.parent, n);
    const dim = isolatedSet && !(isolatedSet.has(n.data.id) && isolatedSet.has(n.parent.data.id));
    out.push(
      <path
        key={`e-${n.data.id}`}
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeOpacity={dim ? 0.1 : 0.55}
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
    if (layout === 'tree') { x = n.y; y = n.x; }
    else {
      const [angle, r] = [n.x, n.y];
      x = Math.cos(angle - Math.PI / 2) * r;
      y = Math.sin(angle - Math.PI / 2) * r;
    }
    const data = n.data;
    const color = data.branchColor || n.parent?.data.branchColor || '#6366F1';
    const status = ctx.states[data.id] ?? 'unknown';
    const isRoot = n.depth === 0;
    const match = ctx.matchIds.has(data.id);
    const dim = ctx.isolatedSet ? !ctx.isolatedSet.has(data.id) : false;
    const focused = ctx.focusedId === data.id;
    const isCollapsed = ctx.collapsed.has(data.id);
    // hasChildren: 원본 데이터 기준(접혔어도 자식 존재)
    const hasChildren = data.children.length > 0;
    // 전체 자손 개수(접혔을 때 표시용)
    const collapsedCount = isCollapsed ? data.children.length : 0;

    out.push(
      <g
        key={`n-${data.id}`}
        data-node
        transform={`translate(${x},${y})`}
        style={{
          transition: ctx.reducedMotion ? undefined : 'transform 300ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 200ms',
        }}
      >
        <NodeBody
          data={data}
          color={color}
          depth={n.depth}
          isRoot={isRoot}
          status={status}
          match={match}
          hasQuery={ctx.matchIds.size > 0}
          dim={dim}
          focused={focused}
          hasChildren={hasChildren}
          isCollapsed={isCollapsed}
          collapsedCount={collapsedCount}
          reducedMotion={ctx.reducedMotion}
          onToggleStatus={() => ctx.onToggleStatus(data)}
          onToggleCollapse={() => ctx.onToggleCollapse(data.id)}
          onCtx={(e) => ctx.onCtx(e, data)}
          onClick={() => ctx.onFocus(data.id)}
          onDoubleClick={() => ctx.onDoubleClick(data)}
        />
      </g>
    );
  });
  return out;
}

function NodeBody({
  data, color, depth, isRoot, status, match, hasQuery, dim, focused, hasChildren, isCollapsed, collapsedCount, reducedMotion,
  onToggleStatus, onToggleCollapse, onCtx, onClick, onDoubleClick,
}: {
  data: MindmapNode;
  color: string;
  depth: number;
  isRoot: boolean;
  status: MindmapNodeStatus;
  match: boolean;
  hasQuery: boolean;
  dim: boolean;
  focused: boolean;
  hasChildren: boolean;
  isCollapsed: boolean;
  collapsedCount: number;
  reducedMotion: boolean;
  onToggleStatus: () => void;
  onToggleCollapse: () => void;
  onCtx: (e: React.MouseEvent) => void;
  onClick: () => void;
  onDoubleClick: () => void;
}) {
  const fontSize = isRoot ? 15 : depth === 1 ? 13 : 11.5;
  const padX = isRoot ? 14 : 10;
  const padY = isRoot ? 8 : 5;
  const labelW = estimateWidth(data.label, fontSize) + padX * 2;
  const labelH = fontSize + padY * 2;
  const bg = isRoot ? color : '#FFFFFF';
  const fg = isRoot ? '#FFFFFF' : color;
  const opacity = dim ? 0.12 : (hasQuery && !match ? 0.25 : 1);

  return (
    <g
      opacity={opacity}
      onContextMenu={onCtx}
      role="treeitem"
      aria-level={depth + 1}
      aria-expanded={hasChildren ? !isCollapsed : undefined}
      aria-selected={focused}
      aria-label={`${data.label}${hasChildren ? ` · 자식 ${data.children.length}개${isCollapsed ? ' (접힘)' : ''}` : ''} · 이해도 ${status}`}
    >
      {/* 포커스 링 */}
      {focused && (
        <rect
          x={-labelW / 2 - 5}
          y={-labelH / 2 - 5}
          width={labelW + 10}
          height={labelH + 10}
          rx={labelH / 2 + 5}
          fill="none"
          stroke="#6366F1"
          strokeWidth={2.5}
          style={reducedMotion ? undefined : { animation: 'mm-pulse 1.6s ease-in-out infinite' }}
        />
      )}

      {/* 카드 */}
      <rect
        x={-labelW / 2}
        y={-labelH / 2}
        width={labelW}
        height={labelH}
        rx={labelH / 2}
        fill={bg}
        stroke={color}
        strokeWidth={isRoot ? 2 : 1.5}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onDoubleClick={(e) => { e.stopPropagation(); onDoubleClick(); }}
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
        {data.label}
      </text>

      {/* 상태 도트 + 글리프 (좌상단, 색각 이중화) */}
      <g
        transform={`translate(${-labelW / 2 + 6}, ${-labelH / 2 + 6})`}
        style={{ cursor: 'pointer' }}
        onClick={(e) => { e.stopPropagation(); onToggleStatus(); }}
      >
        <circle r={6} fill={STATUS_META[status].dot} stroke="#fff" strokeWidth={1.5} />
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={7.5}
          fontWeight={700}
          fill="#fff"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {STATUS_META[status].glyph}
        </text>
        <title>{`${STATUS_META[status].label} (S)`}</title>
      </g>

      {/* 접기/펼치기 토글 (자식이 있을 때만, 우하단) */}
      {hasChildren && (
        <g
          transform={`translate(${labelW / 2 - 2}, ${labelH / 2 - 2})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onToggleCollapse(); }}
        >
          <circle r={7} fill="#fff" stroke={color} strokeWidth={1.5} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={9}
            fontWeight={700}
            fill={color}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {isCollapsed ? '+' : '−'}
          </text>
          <title>{isCollapsed ? `펼치기 (${collapsedCount})` : '접기'}</title>
        </g>
      )}

      {/* 접힌 상태 자식 수 뱃지 */}
      {isCollapsed && collapsedCount > 0 && (
        <g transform={`translate(${labelW / 2 + 10}, 0)`}>
          <rect x={0} y={-7} width={22} height={14} rx={7} fill={color} opacity={0.15} />
          <text x={11} y={0} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={color}>
            +{collapsedCount}
          </text>
        </g>
      )}

      {/* 검색 매치 링 */}
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

      {/* 페이지 뱃지 (우측, 접힘 뱃지와 충돌 방지해 아래쪽으로 이동) */}
      {data.pages && data.pages.length > 0 && (
        <g transform={`translate(${labelW / 2 + 6}, ${isCollapsed ? 14 : 0})`}>
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
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} Q${mx * 0.6},${my * 0.6} ${x2},${y2}`;
}

function estimateWidth(text: string, fontSize: number): number {
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
    <div
      className="flex items-center gap-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 shadow-sm"
      role="status"
      aria-label={`이해 진도: ${gotIt}/${total}, 헷갈림 ${shaky}`}
    >
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
      aria-hidden
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

/* 포커스 링 pulse 키프레임 — 전역 1회 주입 */
if (typeof document !== 'undefined' && !document.getElementById('mm-keyframes')) {
  const s = document.createElement('style');
  s.id = 'mm-keyframes';
  s.textContent = `@keyframes mm-pulse { 0%,100% { stroke-opacity: 1; } 50% { stroke-opacity: 0.5; } }`;
  document.head.appendChild(s);
}
