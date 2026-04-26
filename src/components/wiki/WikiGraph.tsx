import { useMemo, useState } from 'react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  pages: WikiPage[];
  onSelect: (id: string) => void;
}

interface Node { id: string; title: string; type: WikiPage['type']; x: number; y: number; r: number; degree: number; }
interface Edge { from: string; to: string; }

/**
 * 라이트웨이트 그래프 — cytoscape 등 무거운 라이브러리 없이 SVG 로 직접 렌더.
 * 레이아웃: 타입별 클러스터(원 모양)로 배치 + 클러스터 간 적절한 간격.
 * 노드 크기: 연결 수(degree)에 비례. 색상: 타입별.
 *
 * 일상 탐색이 아니라 *품질 점검 도구* 로서의 그래프 — deep-research 의 권고와 일치.
 */
export function WikiGraph({ pages, onSelect }: Props) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const { nodes, edges, neighborMap } = useMemo(() => buildGraph(pages), [pages]);

  if (nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-[13px] text-muted-foreground">
        페이지가 없어요. 먼저 페이지를 만들어보세요.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card overflow-hidden">
      <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
        <p className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground">
          연결 그래프 · {nodes.length} 페이지 / {edges.length} 연결
        </p>
        <div className="flex items-center gap-2 text-[10px]">
          {Object.entries(WIKI_TYPE_META).map(([k, m]) => {
            const has = nodes.some((n) => n.type === k);
            if (!has) return null;
            return (
              <span key={k} className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full" style={{ background: m.tint }} />
                <span className="text-muted-foreground">{m.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      <div className="relative bg-[hsl(var(--background))]">
        <svg
          viewBox="0 0 1000 700"
          className="w-full h-[60vh]"
          aria-label="위키 페이지 연결 그래프"
        >
          {/* edges */}
          <g stroke="hsl(var(--hairline))" strokeWidth="1">
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.from);
              const b = nodes.find((n) => n.id === e.to);
              if (!a || !b) return null;
              const isHover = hoverId && (hoverId === a.id || hoverId === b.id);
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isHover ? 'hsl(var(--primary))' : 'hsl(var(--hairline))'}
                  strokeWidth={isHover ? 1.5 : 1}
                  strokeOpacity={isHover ? 0.8 : 0.5}
                />
              );
            })}
          </g>

          {/* nodes */}
          <g>
            {nodes.map((n) => {
              const meta = WIKI_TYPE_META[n.type];
              const isHover = hoverId === n.id;
              const isNeighbor = hoverId && neighborMap.get(hoverId)?.has(n.id);
              const dim = !!hoverId && !isHover && !isNeighbor;
              return (
                <g
                  key={n.id}
                  onMouseEnter={() => setHoverId(n.id)}
                  onMouseLeave={() => setHoverId(null)}
                  onClick={() => onSelect(n.id)}
                  style={{ cursor: 'pointer', opacity: dim ? 0.25 : 1, transition: 'opacity 120ms' }}
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={n.r}
                    fill={meta.tint}
                    fillOpacity={isHover ? 1 : 0.85}
                    stroke={isHover ? meta.tint : 'transparent'}
                    strokeWidth={3}
                    strokeOpacity={0.4}
                  />
                  {(isHover || n.degree >= 3) && (
                    <text
                      x={n.x}
                      y={n.y + n.r + 12}
                      textAnchor="middle"
                      fontSize={isHover ? 12 : 10}
                      fill="hsl(var(--foreground))"
                      style={{ pointerEvents: 'none', userSelect: 'none' }}
                    >
                      {n.title.length > 14 ? n.title.slice(0, 14) + '…' : n.title}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* hover 카드 */}
        {hoverId && (() => {
          const n = nodes.find((nn) => nn.id === hoverId);
          if (!n) return null;
          const p = pages.find((pp) => pp.id === hoverId);
          if (!p) return null;
          return (
            <div className="absolute bottom-3 left-3 px-3 py-2 rounded-lg bg-popover border border-[hsl(var(--hairline))] shadow-lg max-w-xs">
              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-0.5">
                {WIKI_TYPE_META[p.type].icon} {WIKI_TYPE_META[p.type].label} · 연결 {n.degree}
              </p>
              <p className="text-[12.5px] font-bold text-foreground">{p.title}</p>
            </div>
          );
        })()}
      </div>
      <p className={cn('px-3 py-1.5 text-[10px] text-muted-foreground border-t border-[hsl(var(--hairline))]')}>
        💡 노드 클릭 → 페이지 열기. 호버 시 이웃만 강조.
      </p>
    </div>
  );
}

/* ── 그래프 빌더 ── */
function buildGraph(pages: WikiPage[]): { nodes: Node[]; edges: Edge[]; neighborMap: Map<string, Set<string>> } {
  // edges: refersTo + cites + inherits 모두 합집합 (방향성 무시)
  const edgeSet = new Set<string>();
  const edges: Edge[] = [];
  const degree = new Map<string, number>();
  const neighborMap = new Map<string, Set<string>>();
  for (const p of pages) {
    const targets = new Set<string>([...p.refersTo, ...p.cites, ...p.inherits]);
    for (const t of targets) {
      if (t === p.id) continue;
      const key = p.id < t ? `${p.id}|${t}` : `${t}|${p.id}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ from: p.id, to: t });
      degree.set(p.id, (degree.get(p.id) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
      if (!neighborMap.has(p.id)) neighborMap.set(p.id, new Set());
      if (!neighborMap.has(t)) neighborMap.set(t, new Set());
      neighborMap.get(p.id)!.add(t);
      neighborMap.get(t)!.add(p.id);
    }
  }

  // 타입별 클러스터링 — 7 타입을 큰 원 둘레에 배치, 각 클러스터 내부는 작은 원
  const types = Array.from(new Set(pages.map((p) => p.type)));
  const center = { x: 500, y: 350 };
  const outerR = 240;
  const clusterCenters = new Map<string, { x: number; y: number }>();
  types.forEach((t, i) => {
    const angle = (i / Math.max(1, types.length)) * Math.PI * 2 - Math.PI / 2;
    clusterCenters.set(t, {
      x: center.x + Math.cos(angle) * outerR,
      y: center.y + Math.sin(angle) * outerR,
    });
  });

  const nodes: Node[] = pages.map((p) => {
    const c = clusterCenters.get(p.type) ?? center;
    const sameType = pages.filter((q) => q.type === p.type);
    const idx = sameType.indexOf(p);
    const localR = Math.min(60 + sameType.length * 4, 110);
    const angle = (idx / Math.max(1, sameType.length)) * Math.PI * 2;
    const d = degree.get(p.id) ?? 0;
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      x: c.x + Math.cos(angle) * localR,
      y: c.y + Math.sin(angle) * localR,
      r: 6 + Math.min(d * 1.6, 14),
      degree: d,
    };
  });

  return { nodes, edges, neighborMap };
}
