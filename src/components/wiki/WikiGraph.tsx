import { useEffect, useMemo, useRef, useState, useReducer, useCallback } from 'react';
import { Search, X, Maximize2, Route, Layers, Filter as FilterIcon, SlidersHorizontal, Pause, Play, Group } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  pages: WikiPage[];
  onSelect: (id: string) => void;
  /** 진입 시 자동 선택할 페이지 id (로컬 그래프에서 '전체에서 보기' 누른 경우) */
  initialFocusId?: string | null;
}

type EdgeKind = 'refersTo' | 'cites' | 'inherits' | 'similarTo';
interface Edge { from: string; to: string; kind: EdgeKind; }
type ColorBy = 'type' | 'status' | 'tag';
type LayoutMode = 'cluster' | 'force';

interface SimNode {
  id: string;
  type: WikiPage['type'];
  status: WikiPage['status'];
  // 위치·속도 — 매 tick 갱신
  x: number; y: number; vx: number; vy: number;
  // 드래그 시 임시 고정
  fx?: number | null; fy?: number | null;
  // 시각
  r: number; degree: number;
  isolated: boolean;
  // 클러스터 시드(클러스터 모드의 attract 타깃)
  cx: number; cy: number;
  // 등장 애니메이션 — 0~1, age 가 1 되면 만개
  age: number;
}

const VB_W = 1000;
const VB_H = 700;
const STORAGE_KEY = 'wiki_graph_state_v2';

interface PersistedState {
  scale: number; tx: number; ty: number;
  layout: LayoutMode;
  colorBy: ColorBy;
  tagPick: string;
  hullsOn: boolean;
  paused: boolean;
  forces: { center: number; repel: number; link: number; distance: number };
}

const DEFAULT_FORCES = { center: 0.025, repel: 70, link: 0.4, distance: 80 };

function loadState(): Partial<PersistedState> {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
function saveState(s: PersistedState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

/**
 * 마이위키 연결 그래프 (라이브 시뮬레이션 판).
 *
 * 기능:
 * - 지속적 force 시뮬레이션 + reheat (Logseq 톤 — 살아있는 느낌)
 * - 노드 드래그 (fx/fy 임시 고정, drop 시 해제)
 * - hover 시 이웃 약한 attract (반응)
 * - 태그 그룹 Soft Hull (Catmull-Rom 부드러운 외곽)
 * - 곡선 엣지 (bezier) + 종류별 색·점선
 * - 새 노드 등장 애니메이션 (scale 0→1)
 * - 클릭 ripple
 * - fit 부드러운 복귀 (300ms ease)
 * - Force 슬라이더 패널 (center / repel / link / distance) — 실시간
 * - 일시정지 / 재가동 토글
 * - 검색 매칭 강조 + 타입 필터 + 줌·팬 + 경로 찾기 (BFS) + 색칠 기준 + 상태 차별
 *
 * 의존성 X — d3-force 등 외부 라이브러리 미사용.
 */
export function WikiGraph({ pages, onSelect, initialFocusId }: Props) {
  const persisted = useRef<Partial<PersistedState>>(loadState()).current;

  /* ── 헤더 상태 ── */
  const [query, setQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<WikiPage['type']>>(new Set());
  const [colorBy, setColorBy] = useState<ColorBy>(persisted.colorBy ?? 'type');
  const [tagPick, setTagPick] = useState<string>(persisted.tagPick ?? '');
  const [layout, setLayout] = useState<LayoutMode>(persisted.layout ?? 'cluster');
  const [hullsOn, setHullsOn] = useState<boolean>(persisted.hullsOn ?? false);
  const [paused, setPaused] = useState<boolean>(persisted.paused ?? false);
  const [pathMode, setPathMode] = useState(false);
  const [pathStart, setPathStart] = useState<string | null>(null);
  const [pathEnd, setPathEnd] = useState<string | null>(null);
  const [showForcePanel, setShowForcePanel] = useState(false);
  const [forces, setForces] = useState(persisted.forces ?? DEFAULT_FORCES);

  /* ── 인터랙션 ── */
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [stickyId, setStickyId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(initialFocusId ?? null);

  /* ── 줌·팬 ── */
  const [scale, setScale] = useState(persisted.scale ?? 1);
  const [tx, setTx] = useState(persisted.tx ?? 0);
  const [ty, setTy] = useState(persisted.ty ?? 0);
  const dragRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  /* ── 노드 드래그 ── */
  const nodeDragRef = useRef<{ id: string; offX: number; offY: number; moved: boolean } | null>(null);

  /* ── 시뮬레이션 ── */
  const nodesRef = useRef<Map<string, SimNode>>(new Map());
  const edgesRef = useRef<Edge[]>([]);
  const neighborMapRef = useRef<Map<string, Set<string>>>(new Map());
  const alphaRef = useRef<number>(0.3);
  const alphaTargetRef = useRef<number>(0.05);
  const forcesRef = useRef(forces);
  forcesRef.current = forces;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const hoverIdRef = useRef<string | null>(null);
  hoverIdRef.current = hoverId;
  const layoutRef = useRef<LayoutMode>(layout);
  layoutRef.current = layout;

  /* ── 클릭 ripple 큐 ── */
  const ripplesRef = useRef<Array<{ id: number; x: number; y: number; t0: number }>>([]);
  const rippleSeqRef = useRef(0);

  /* ── 메타 (페이지·태그) ── */
  const { types, popularTags, pageById, tagsToNodes } = useMemo(() => {
    const types = Array.from(new Set(pages.map((p) => p.type)));
    const tagCount = new Map<string, number>();
    for (const p of pages) for (const t of p.tags) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
    const popular = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t);
    const byId = new Map(pages.map((p) => [p.id, p]));
    const tagToNodes = new Map<string, Set<string>>();
    for (const p of pages) for (const t of p.tags) {
      if (!tagToNodes.has(t)) tagToNodes.set(t, new Set());
      tagToNodes.get(t)!.add(p.id);
    }
    return { types, popularTags: popular, pageById: byId, tagsToNodes: tagToNodes };
  }, [pages]);

  /* ── 페이지/엣지 → 그래프 ── */
  useEffect(() => {
    // 엣지·이웃맵 빌드
    const edgeSet = new Set<string>();
    const edges: Edge[] = [];
    const neighborMap = new Map<string, Set<string>>();
    const idSet = new Set(pages.map((p) => p.id));
    const degree = new Map<string, number>();
    function add(from: string, to: string, kind: EdgeKind) {
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
      for (const t of p.refersTo)  add(p.id, t, 'refersTo');
      for (const t of p.cites)     add(p.id, t, 'cites');
      for (const t of p.inherits)  add(p.id, t, 'inherits');
      for (const t of p.similarTo) add(p.id, t, 'similarTo');
    }
    edgesRef.current = edges;
    neighborMapRef.current = neighborMap;

    // 클러스터 시드 위치
    const visibleTypes = types.filter((t) => pages.some((p) => p.type === t && (degree.get(p.id) ?? 0) > 0));
    const center = { x: VB_W / 2, y: VB_H / 2 + 12 };
    const outerR = 240;
    const clusterCenters = new Map<WikiPage['type'], { x: number; y: number }>();
    visibleTypes.forEach((t, i) => {
      const angle = (i / Math.max(1, visibleTypes.length)) * Math.PI * 2 - Math.PI / 2;
      clusterCenters.set(t, {
        x: center.x + Math.cos(angle) * outerR,
        y: center.y + Math.sin(angle) * outerR,
      });
    });

    // 새 노드는 클러스터 근처에 시드, 기존 노드는 위치 보존
    const prev = nodesRef.current;
    const next = new Map<string, SimNode>();
    const isolatedY = 70;
    let isoIdx = 0;
    const isolatedTotal = pages.filter((p) => (degree.get(p.id) ?? 0) === 0).length;
    const isoStartX = 90;
    const isoEndX = VB_W - 90;
    const isoStep = (isoEndX - isoStartX) / Math.max(1, isolatedTotal);

    for (const p of pages) {
      const d = degree.get(p.id) ?? 0;
      const isolated = d === 0;
      const c = clusterCenters.get(p.type) ?? center;
      const existing = prev.get(p.id);
      let x: number, y: number, age: number;
      if (existing) {
        x = existing.x; y = existing.y; age = existing.age;
      } else {
        // 신규 — 약간 흩뿌려서 등장
        const jitter = () => (Math.random() - 0.5) * 30;
        if (isolated) {
          x = isoStartX + (isoIdx++) * isoStep;
          y = isolatedY;
        } else {
          x = c.x + jitter();
          y = c.y + jitter();
        }
        age = 0; // 등장 애니메이션 시작
      }
      next.set(p.id, {
        id: p.id,
        type: p.type,
        status: p.status,
        x, y, vx: 0, vy: 0,
        fx: existing?.fx ?? null,
        fy: existing?.fy ?? null,
        r: 6 + Math.min(d * 1.6, 14),
        degree: d,
        isolated,
        cx: c.x, cy: c.y,
        age,
      });
    }
    nodesRef.current = next;
    alphaRef.current = 0.4; // 새 노드 합류 시 reheat
  }, [pages, types]);

  /* ── 검색·필터 셋 ── */
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

  const visibleSet = useMemo(() => {
    if (activeTypes.size === 0) return null;
    const out = new Set<string>();
    for (const p of pages) if (activeTypes.has(p.type)) out.add(p.id);
    return out;
  }, [activeTypes, pages]);

  const pathSet = useMemo(() => {
    if (!pathStart || !pathEnd) return null;
    return bfsPath(neighborMapRef.current, pathStart, pathEnd);
  }, [pathStart, pathEnd]);

  /* ── rAF 시뮬레이션 루프 ── */
  const [, bumpTick] = useReducer((x: number) => (x + 1) | 0, 0);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    let raf: number = 0;
    const tick = (now: number) => {
      const dt = lastFrameRef.current ? Math.min(33, now - lastFrameRef.current) : 16;
      lastFrameRef.current = now;
      if (!pausedRef.current) {
        simulateStep(dt);
      }
      bumpTick();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
     
  }, []);

  /* ── 시뮬레이션 한 스텝 ── */
  function simulateStep(dt: number) {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const { center: centerStr, repel, link: linkStr, distance } = forcesRef.current;
    const alpha = alphaRef.current;
    // 식어가기
    const decay = 0.0228; // d3 의 default
    alphaRef.current = alpha + (alphaTargetRef.current - alpha) * decay;

    // 등장 age 진행 (320ms 만개)
    for (const n of nodes.values()) {
      if (n.age < 1) n.age = Math.min(1, n.age + dt / 320);
    }

    if (alpha < 0.001) return;

    const nodeArr = Array.from(nodes.values());
    const N = nodeArr.length;

    // 반발 (모든 쌍, O(N^2) — 200 노드까지 안전)
    for (let i = 0; i < N; i++) {
      const a = nodeArr[i];
      if (a.fx != null && a.fy != null) continue;
      for (let j = i + 1; j < N; j++) {
        const b = nodeArr[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist2 = dx * dx + dy * dy + 0.01;
        const f = (repel * repel) / dist2;
        const dist = Math.sqrt(dist2);
        const ux = dx / dist, uy = dy / dist;
        const force = f * alpha;
        a.vx += ux * force;
        a.vy += uy * force;
        if (b.fx == null || b.fy == null) {
          b.vx -= ux * force;
          b.vy -= uy * force;
        }
        // 충돌 회피 — r×2 보다 가까우면 강한 추가 반발
        const minDist = a.r + b.r + 4;
        if (dist < minDist) {
          const overlap = (minDist - dist) * 0.5;
          a.x += ux * overlap;
          a.y += uy * overlap;
          if (b.fx == null || b.fy == null) {
            b.x -= ux * overlap;
            b.y -= uy * overlap;
          }
        }
      }
    }

    // 인력 — 엣지
    const linkActiveScale = layoutRef.current === 'cluster' ? 0.8 : 1.0;
    for (const e of edges) {
      const a = nodes.get(e.from);
      const b = nodes.get(e.to);
      if (!a || !b) continue;
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
      const targetDist = distance;
      const f = (dist - targetDist) * linkStr * alpha * linkActiveScale;
      const ux = dx / dist, uy = dy / dist;
      if (a.fx == null || a.fy == null) {
        a.vx -= ux * f;
        a.vy -= uy * f;
      }
      if (b.fx == null || b.fy == null) {
        b.vx += ux * f;
        b.vy += uy * f;
      }
    }

    // hover 한 노드의 이웃 약한 추가 attract
    const hoverId = hoverIdRef.current;
    if (hoverId) {
      const h = nodes.get(hoverId);
      const nb = neighborMapRef.current.get(hoverId);
      if (h && nb) {
        for (const id of nb) {
          const n = nodes.get(id);
          if (!n || n.fx != null) continue;
          const dx = h.x - n.x, dy = h.y - n.y;
          const dist = Math.sqrt(dx * dx + dy * dy + 0.01);
          const f = 0.04 * alpha * dist;
          n.vx += (dx / dist) * f;
          n.vy += (dy / dist) * f;
        }
      }
    }

    // 중심·클러스터 인력
    const isCluster = layoutRef.current === 'cluster';
    for (const n of nodeArr) {
      if (n.fx != null && n.fy != null) continue;
      // 중심 인력 (모든 노드)
      const cx0 = VB_W / 2, cy0 = VB_H / 2 + 12;
      n.vx += (cx0 - n.x) * centerStr * alpha;
      n.vy += (cy0 - n.y) * centerStr * alpha;
      // 클러스터 모드에서 추가 attract → 자기 타입 클러스터 시드
      if (isCluster && !n.isolated) {
        n.vx += (n.cx - n.x) * 0.04 * alpha;
        n.vy += (n.cy - n.y) * 0.04 * alpha;
      }
      // 고립은 외곽 띠로 살짝 끌기
      if (n.isolated) {
        n.vy += (70 - n.y) * 0.06 * alpha;
      }
    }

    // 위치 갱신 + 마찰
    const friction = 0.6;
    for (const n of nodeArr) {
      if (n.fx != null && n.fy != null) {
        n.x = n.fx; n.y = n.fy;
        n.vx = 0; n.vy = 0;
        continue;
      }
      n.vx *= friction;
      n.vy *= friction;
      // 속도 캡 — 폭주 방지
      const maxV = 18;
      n.vx = Math.max(-maxV, Math.min(maxV, n.vx));
      n.vy = Math.max(-maxV, Math.min(maxV, n.vy));
      n.x += n.vx * (dt / 16);
      n.y += n.vy * (dt / 16);
      // 경계 클램프
      n.x = Math.max(60, Math.min(VB_W - 60, n.x));
      n.y = Math.max(50, Math.min(VB_H - 40, n.y));
    }
  }

  /* ── 노드 색 ── */
  function nodeFill(n: SimNode, p: WikiPage): { fill: string; stroke: string } {
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

  /* ── reheat helper ── */
  const reheat = useCallback((target = 0.3) => {
    alphaRef.current = Math.max(alphaRef.current, target);
    alphaTargetRef.current = 0.05;
  }, []);

  /* ── 줌·팬 핸들러 ── */
  function onWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setScale((s) => Math.min(3, Math.max(0.4, s * (1 + delta))));
  }

  /* ── 부드러운 fit ── */
  const fitAnimRef = useRef<number>(0);
  function fit() {
    cancelAnimationFrame(fitAnimRef.current);
    const startScale = scale, startTx = tx, startTy = ty;
    const t0 = performance.now();
    const dur = 320;
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = ease(t);
      setScale(startScale + (1 - startScale) * e);
      setTx(startTx + (0 - startTx) * e);
      setTy(startTy + (0 - startTy) * e);
      if (t < 1) fitAnimRef.current = requestAnimationFrame(step);
    };
    fitAnimRef.current = requestAnimationFrame(step);
  }

  /* ── SVG pointer 좌표 → viewBox 좌표 ── */
  const screenToVB = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const r = pt.matrixTransform(ctm.inverse());
    // 우리의 트리 transform 역적용
    const cx = VB_W / 2 + tx * scale;
    const cy = VB_H / 2 + ty * scale;
    return {
      x: (r.x - cx) / scale + VB_W / 2,
      y: (r.y - cy) / scale + VB_H / 2,
    };
  }, [scale, tx, ty]);

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const target = e.target as SVGElement;
    const nodeEl = target.closest('[data-node-id]') as SVGElement | null;
    if (nodeEl) {
      const id = nodeEl.getAttribute('data-node-id');
      if (id) {
        const n = nodesRef.current.get(id);
        if (n) {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          const p = screenToVB(e.clientX, e.clientY);
          nodeDragRef.current = { id, offX: n.x - p.x, offY: n.y - p.y, moved: false };
          n.fx = n.x; n.fy = n.y;
          reheat(0.4);
          return;
        }
      }
    }
    // pan
    if ((e.target as Element).tagName === 'svg' || (e.target as Element).tagName === 'rect') {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      dragRef.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (nodeDragRef.current) {
      const drag = nodeDragRef.current;
      const n = nodesRef.current.get(drag.id);
      if (n) {
        const p = screenToVB(e.clientX, e.clientY);
        const nx = p.x + drag.offX;
        const ny = p.y + drag.offY;
        if (Math.abs(nx - (n.fx ?? n.x)) > 2 || Math.abs(ny - (n.fy ?? n.y)) > 2) {
          drag.moved = true;
        }
        n.fx = nx; n.fy = ny;
        reheat(0.5);
      }
      return;
    }
    if (dragRef.current) {
      const d = dragRef.current;
      setTx(d.tx + (e.clientX - d.x) / scale);
      setTy(d.ty + (e.clientY - d.y) / scale);
    }
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    if (nodeDragRef.current) {
      const drag = nodeDragRef.current;
      const n = nodesRef.current.get(drag.id);
      if (n) {
        n.fx = null; n.fy = null;
        if (!drag.moved) {
          // 클릭으로 처리
          handleNodeClick(drag.id, e.clientX, e.clientY);
        }
      }
      nodeDragRef.current = null;
      reheat(0.2);
    }
    dragRef.current = null;
  }

  function handleNodeClick(id: string, clientX: number, clientY: number) {
    // ripple 추가
    const p = screenToVB(clientX, clientY);
    const rid = ++rippleSeqRef.current;
    ripplesRef.current.push({ id: rid, x: p.x, y: p.y, t0: performance.now() });

    if (pathMode) {
      if (!pathStart) { setPathStart(id); reheat(); return; }
      if (!pathEnd) { setPathEnd(id); reheat(); return; }
      setPathStart(id); setPathEnd(null);
      return;
    }
    // sticky/desktop
    if (window.matchMedia('(hover: hover)').matches) {
      onSelect(id);
    } else {
      if (stickyId === id) onSelect(id);
      else setStickyId(id);
    }
  }

  /* ── 키보드 ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (e.key === '0') { e.preventDefault(); fit(); }
      if (e.key === ' ') { e.preventDefault(); setPaused((v) => !v); }
      if (e.key === 'Escape') {
        if (pathMode) { setPathMode(false); setPathStart(null); setPathEnd(null); return; }
        if (stickyId) { setStickyId(null); return; }
        if (showForcePanel) { setShowForcePanel(false); return; }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathMode, stickyId, showForcePanel]);

  /* ── 검색 변할 때 reheat ── */
  useEffect(() => { if (query) reheat(0.2); }, [query, reheat]);
  useEffect(() => { reheat(0.3); }, [layout, colorBy, hullsOn, reheat]);

  /* ── focus 진입 ── */
  useEffect(() => {
    if (initialFocusId) {
      setFocusId(initialFocusId);
      reheat(0.3);
    }
  }, [initialFocusId, reheat]);

  /* ── 영구 저장 ── */
  useEffect(() => {
    saveState({ scale, tx, ty, layout, colorBy, tagPick, hullsOn, paused, forces });
  }, [scale, tx, ty, layout, colorBy, tagPick, hullsOn, paused, forces]);

  /* ── ripple 정리 ── */
  useEffect(() => {
    const i = setInterval(() => {
      const now = performance.now();
      ripplesRef.current = ripplesRef.current.filter((r) => now - r.t0 < 900);
    }, 300);
    return () => clearInterval(i);
  }, []);

  /* ── Hull 데이터 ── */
  const hullData = useMemo(() => {
    if (!hullsOn) return [];
    // 상위 태그 3개 — 노드 5개 이상인 것만
    const eligible = popularTags
      .filter((t) => (tagsToNodes.get(t)?.size ?? 0) >= 4)
      .slice(0, 3);
    const palette = ['hsl(262 70% 55%)', 'hsl(150 55% 42%)', 'hsl(45 85% 50%)'];
    return eligible.map((tag, i) => ({
      tag,
      color: palette[i],
      ids: tagsToNodes.get(tag)!,
    }));
  }, [hullsOn, popularTags, tagsToNodes]);

  /* ── 렌더 ── */
  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[13px] text-muted-foreground">
        페이지가 없어요. 먼저 페이지를 만들어보세요.
      </div>
    );
  }

  const hoverActive = stickyId ?? hoverId;
  const nodes = Array.from(nodesRef.current.values());
  const edges = edgesRef.current;

  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden">
      {/* 헤더 */}
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

        <label className="hidden sm:inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
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

        <button
          type="button"
          onClick={() => setLayout((l) => l === 'cluster' ? 'force' : 'cluster')}
          className="hidden sm:inline-flex items-center gap-1 px-2 h-6 rounded border border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="레이아웃 — 클러스터 ↔ 자유"
        >
          {layout === 'cluster' ? '🧩 클러스터' : '🌐 자유'}
        </button>

        <button
          type="button"
          onClick={() => setHullsOn((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded border text-[10.5px] wiki-trans-color',
            hullsOn ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title="태그 그룹 영역 표시"
        >
          <Group className="w-3 h-3" /> 그룹
        </button>

        <button
          type="button"
          onClick={() => { setPathMode((v) => !v); setPathStart(null); setPathEnd(null); }}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded border text-[10.5px] wiki-trans-color',
            pathMode ? 'border-primary/40 bg-primary/10 text-primary'
                     : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title="두 페이지 사이 최단 경로"
        >
          <Route className="w-3 h-3" /> 경로
        </button>

        <button
          type="button"
          onClick={() => setShowForcePanel((v) => !v)}
          className={cn(
            'inline-flex items-center gap-1 px-2 h-6 rounded border text-[10.5px] wiki-trans-color',
            showForcePanel ? 'border-primary/40 bg-primary/10 text-primary'
                           : 'border-[hsl(var(--hairline))] text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
          title="Force 슬라이더"
        >
          <SlidersHorizontal className="w-3 h-3" />
        </button>

        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          className="inline-flex items-center gap-1 px-2 h-6 rounded border border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title={paused ? '시뮬레이션 재가동 (Space)' : '시뮬레이션 일시정지 (Space)'}
        >
          {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={fit}
          className="inline-flex items-center gap-1 px-2 h-6 rounded border border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          title="원위치 (0)"
        >
          <Maximize2 className="w-3 h-3" /> fit
        </button>
      </div>

      {/* Force 슬라이더 패널 */}
      {showForcePanel && (
        <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] bg-muted/20 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
          <ForceSlider label="🌌 중심력" value={forces.center} min={0} max={0.1} step={0.005}
            onChange={(v) => { setForces((f) => ({ ...f, center: v })); reheat(); }} />
          <ForceSlider label="🚫 반발" value={forces.repel} min={20} max={200} step={5}
            onChange={(v) => { setForces((f) => ({ ...f, repel: v })); reheat(); }} />
          <ForceSlider label="🔗 인력" value={forces.link} min={0.05} max={1.5} step={0.05}
            onChange={(v) => { setForces((f) => ({ ...f, link: v })); reheat(); }} />
          <ForceSlider label="📏 거리" value={forces.distance} min={30} max={200} step={5}
            onChange={(v) => { setForces((f) => ({ ...f, distance: v })); reheat(); }} />
          <button
            type="button"
            onClick={() => { setForces(DEFAULT_FORCES); reheat(); }}
            className="col-span-full text-[10px] text-muted-foreground hover:text-foreground underline justify-self-end"
          >리셋</button>
        </div>
      )}

      {/* 범례 + 타입 필터 */}
      <div className="px-3 py-1.5 border-b border-[hsl(var(--hairline))] flex flex-wrap items-center gap-x-3 gap-y-1 bg-muted/10">
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
            >
              <span className="w-2 h-2 rounded-full" style={{ background: m.tint }} />
              {m.label}
            </button>
          );
        })}
        {activeTypes.size > 0 && (
          <button type="button" onClick={() => setActiveTypes(new Set())}
            className="text-[10px] text-muted-foreground hover:text-foreground underline">전체</button>
        )}
        <span className="hidden md:inline text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/80 ml-2">엣지</span>
        <span className="hidden md:inline-flex items-center gap-2">
          <EdgeLegend kind="refersTo" label="참조" />
          <EdgeLegend kind="cites" label="인용" />
          <EdgeLegend kind="inherits" label="계승" />
          <EdgeLegend kind="similarTo" label="유사" />
        </span>
      </div>

      {/* 상태 줄 */}
      <div className="px-3 py-1 border-b border-[hsl(var(--hairline))] flex items-center justify-between text-[10.5px] text-muted-foreground">
        <span>
          {nodes.length} 페이지 / {edges.length} 연결
          {visibleSet && ` · 필터 ${visibleSet.size}`}
          {matchSet && ` · 매칭 ${matchSet.size}`}
          {pathSet && ` · 경로 ${pathSet.size}`}
        </span>
        {pathMode && (
          <span className="text-primary">
            {pathStart ? (pathEnd ? '경로 표시 중' : '끝 노드 클릭') : '시작 노드 클릭'}
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
          {/* 옅은 그리드 */}
          <defs>
            <pattern id="wgGrid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="hsl(var(--hairline))" strokeOpacity="0.08" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#wgGrid)" />

          <g transform={`translate(${VB_W / 2 + tx * scale}, ${VB_H / 2 + ty * scale}) scale(${scale}) translate(${-VB_W / 2}, ${-VB_H / 2})`}>
            {/* Hulls (뒤쪽) */}
            {hullData.map((h) => {
              const pts: Array<{ x: number; y: number }> = [];
              for (const id of h.ids) {
                const n = nodesRef.current.get(id);
                if (n) pts.push({ x: n.x, y: n.y });
              }
              if (pts.length < 3) return null;
              const path = softHullPath(pts, 30);
              if (!path) return null;
              // 라벨 위치 — hull 의 가장 위쪽
              const top = pts.reduce((acc, p) => p.y < acc.y ? p : acc, pts[0]);
              return (
                <g key={h.tag}>
                  <path d={path} fill={h.color} fillOpacity={0.07} stroke={h.color} strokeOpacity={0.25} strokeWidth={1.5} />
                  <text x={top.x} y={top.y - 36} textAnchor="middle" fontSize="11" fontWeight="700"
                        fill={h.color} fillOpacity="0.9" letterSpacing="0.06em" style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    🏷 #{h.tag} · {pts.length}
                  </text>
                </g>
              );
            })}

            {/* 클러스터 라벨 (cluster + hulls off 일 때만) */}
            {layout === 'cluster' && !hullsOn && nodes.length > 0 && types.map((k) => {
              const m = WIKI_TYPE_META[k];
              const sample = nodes.find((n) => n.type === k && !n.isolated);
              if (!sample) return null;
              const cnt = nodes.filter((n) => n.type === k).length;
              return (
                <text key={k} x={sample.cx} y={sample.cy - 70} textAnchor="middle" fontSize={11}
                      fill={m.tint} fillOpacity={0.45} fontWeight={700} letterSpacing="0.06em"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  {m.icon} {m.label.toUpperCase()} · {cnt}
                </text>
              );
            })}

            {/* 고립 라벨 */}
            {nodes.some((n) => n.isolated) && (
              <text x={VB_W / 2} y={36} textAnchor="middle" fontSize={10.5}
                    fill="hsl(var(--muted-foreground))" fillOpacity={0.7}
                    fontWeight={700} letterSpacing="0.1em"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}>
                🪐 고립 {nodes.filter((n) => n.isolated).length}
              </text>
            )}

            {/* 엣지 — 곡선 */}
            <g>
              {edges.map((e, i) => {
                const a = nodesRef.current.get(e.from);
                const b = nodesRef.current.get(e.to);
                if (!a || !b) return null;
                if (visibleSet && (!visibleSet.has(a.id) || !visibleSet.has(b.id))) return null;
                const stroke = edgeStroke(e.kind);
                const inPath = pathSet && pathSet.has(a.id) && pathSet.has(b.id);
                const isHover = hoverActive && (hoverActive === a.id || hoverActive === b.id);
                const dim = (hoverActive && !isHover) || (matchSet && (!matchSet.has(a.id) && !matchSet.has(b.id)));
                // 노드 경계에서 시작·종료
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;
                const ux = dx / dist, uy = dy / dist;
                const sx = a.x + ux * a.r, sy = a.y + uy * a.r;
                const ex = b.x - ux * b.r, ey = b.y - uy * b.r;
                // 곡선 control point — 수직 오프셋
                const mx = (sx + ex) / 2, my = (sy + ey) / 2;
                const offset = Math.min(dist * 0.08, 24);
                const cpx = mx - uy * offset;
                const cpy = my + ux * offset;
                return (
                  <path
                    key={i}
                    d={`M ${sx} ${sy} Q ${cpx} ${cpy} ${ex} ${ey}`}
                    fill="none"
                    stroke={inPath ? 'hsl(var(--primary))' : isHover ? 'hsl(var(--primary))' : stroke.stroke}
                    strokeWidth={inPath ? 2 : isHover ? 1.5 : 1}
                    strokeOpacity={dim ? 0.1 : (inPath ? 0.95 : isHover ? 0.85 : stroke.opacity)}
                    strokeDasharray={inPath ? undefined : stroke.dash}
                    style={{ transition: 'stroke-opacity 120ms' }}
                  />
                );
              })}
            </g>

            {/* Ripples */}
            <g>
              {ripplesRef.current.map((r) => {
                const dt = (performance.now() - r.t0) / 900;
                if (dt > 1) return null;
                const radius = 8 + dt * 60;
                const op = (1 - dt) * 0.5;
                return (
                  <circle key={r.id} cx={r.x} cy={r.y} r={radius}
                          fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeOpacity={op} />
                );
              })}
            </g>

            {/* 노드 */}
            <g>
              {nodes.map((n) => {
                if (visibleSet && !visibleSet.has(n.id)) return null;
                const p = pageById.get(n.id);
                if (!p) return null;
                const isHover = hoverActive === n.id;
                const isNeighbor = hoverActive ? !!neighborMapRef.current.get(hoverActive)?.has(n.id) : false;
                const inPath = pathSet?.has(n.id) ?? false;
                const matched = matchSet ? matchSet.has(n.id) : true;
                const isFocus = focusId === n.id;
                const dim = (hoverActive && !isHover && !isNeighbor) || (matchSet && !matched);
                const { fill, stroke } = nodeFill(n, p);
                const isDraft = n.status === 'draft';
                const isArchived = n.status === 'archived';
                const isStable = n.status === 'stable';
                // 등장 애니메이션
                const ageScale = 0.4 + 0.6 * easeOutBack(n.age);
                const r = Math.max(n.r, 8) * ageScale;
                // 줌인 시 라벨 더 노출
                const showLabel = isHover || isFocus || (matched && !!matchSet) || n.degree >= 3 || scale >= 1.6;

                return (
                  <g
                    key={n.id}
                    data-node-id={n.id}
                    onMouseEnter={() => { setHoverId(n.id); reheat(0.15); }}
                    onMouseLeave={() => setHoverId(null)}
                    style={{ cursor: 'grab', opacity: dim ? 0.22 : isArchived ? 0.55 : n.age, transition: 'opacity 120ms' }}
                  >
                    {/* focus 링 — amber 톤으로 hover/path 와 구분 */}
                    {isFocus && (
                      <circle cx={n.x} cy={n.y} r={r + 7} fill="none" stroke="hsl(38 90% 55%)" strokeWidth={2.5} strokeOpacity={0.7}>
                        <animate attributeName="r" values={`${r + 7};${r + 11};${r + 7}`} dur="1.6s" repeatCount="indefinite" />
                      </circle>
                    )}
                    {/* 호흡 (hover/focus 시 추가 외곽 ring) */}
                    {(isHover || inPath) && (
                      <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke={stroke} strokeWidth={2} strokeOpacity={0.4} />
                    )}
                    <circle
                      cx={n.x} cy={n.y} r={r}
                      fill={isDraft ? 'transparent' : fill}
                      fillOpacity={isStable ? 1 : isDraft ? 0 : 0.78}
                      stroke={isDraft ? stroke : (isHover || inPath || isFocus ? stroke : 'transparent')}
                      strokeWidth={isDraft ? 1.5 : 3}
                      strokeOpacity={isDraft ? 0.9 : 0.45}
                      strokeDasharray={isDraft ? '3 2' : undefined}
                    />
                    {showLabel && (
                      <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                            fontSize={isHover || isFocus ? 12 : 10}
                            fill="hsl(var(--foreground))"
                            style={{ pointerEvents: 'none', userSelect: 'none' }}>
                        {p.title.length > 16 ? p.title.slice(0, 16) + '…' : p.title}
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
          const n = nodesRef.current.get(hoverActive);
          if (!n) return null;
          const p = pageById.get(hoverActive);
          if (!p) return null;
          const tMeta = WIKI_TYPE_META[p.type];
          const sMeta = WIKI_STATUS_META[p.status];
          const preview = p.body.replace(/^[#>\s\n]+/g, '').replace(/\n+/g, ' ').slice(0, 80);
          return (
            <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-popover border border-[hsl(var(--hairline))] shadow-lg max-w-xs z-10">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                {tMeta.icon} {tMeta.label} · 연결 {n.degree}
                <span className="ml-1.5" style={{ color: sMeta.tint }}>{sMeta.label}</span>
              </p>
              <p className="text-[12.5px] font-bold text-foreground">{p.title}</p>
              {preview && (
                <p className="text-[10.5px] text-muted-foreground/90 mt-0.5 line-clamp-2 leading-relaxed">
                  {preview}…
                </p>
              )}
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
        <span>💡 휠 = 줌 · 드래그 빈 곳 = 팬 · 노드 끌기 = 위치 잡기</span>
        <span>·</span>
        <span>0 = fit · Space = 정지</span>
      </p>
    </div>
  );
}

function ForceSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5 text-[10.5px] text-muted-foreground">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        <span className="font-mono text-foreground/80">{Number.isInteger(value) ? value : value.toFixed(2)}</span>
      </span>
      <input type="range" value={value} min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1 accent-primary" />
    </label>
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

/* ── BFS ── */
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

/* ── Soft Hull (Catmull-Rom spline through padded points) ── */
function softHullPath(pts: Array<{ x: number; y: number }>, padding: number): string | null {
  if (pts.length < 3) return null;
  // centroid
  let cx = 0, cy = 0;
  for (const p of pts) { cx += p.x; cy += p.y; }
  cx /= pts.length; cy /= pts.length;
  // 각도 정렬
  const sorted = [...pts].sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
  // padding 으로 외곽 밀기
  const padded = sorted.map((p) => {
    const dx = p.x - cx, dy = p.y - cy;
    const d = Math.sqrt(dx * dx + dy * dy) + 0.01;
    return { x: p.x + (dx / d) * padding, y: p.y + (dy / d) * padding };
  });
  // Catmull-Rom → cubic bezier (closed)
  const n = padded.length;
  const path: string[] = [];
  path.push(`M ${padded[0].x.toFixed(1)} ${padded[0].y.toFixed(1)}`);
  for (let i = 0; i < n; i++) {
    const p0 = padded[(i - 1 + n) % n];
    const p1 = padded[i];
    const p2 = padded[(i + 1) % n];
    const p3 = padded[(i + 2) % n];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    path.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
  }
  path.push('Z');
  return path.join(' ');
}

/* ── easeOutBack — 노드 등장 — 살짝 튕김 ── */
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
