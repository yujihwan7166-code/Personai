import { useMemo } from 'react';
import { Network } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';
import { cn } from '@/lib/utils';

interface Props {
  page: WikiPage;
  allPages: WikiPage[];
  onSelect: (id: string) => void;
  /** '전체 그래프에서 보기' 클릭 시 — 부모가 view 전환 + 현재 페이지 focus */
  onOpenInGlobal?: (centerId: string) => void;
}

type EdgeKind = 'refersTo' | 'cites' | 'inherits' | 'similarTo' | 'parentMocs';

function edgeStrokeMini(kind: EdgeKind): { stroke: string; dash?: string } {
  switch (kind) {
    case 'refersTo':  return { stroke: 'hsl(var(--hairline))' };
    case 'cites':     return { stroke: 'hsl(var(--wiki-link-visited))' };
    case 'inherits':  return { stroke: 'hsl(var(--wiki-hairline-strong))', dash: '3 2' };
    case 'similarTo': return { stroke: 'hsl(var(--muted-foreground))', dash: '1.5 3' };
    case 'parentMocs': return { stroke: 'hsl(var(--primary))', dash: '5 2' };
  }
}

/**
 * 로컬 그래프 — 현재 페이지 + 1-hop 이웃만 표시.
 * 전체 그래프(WikiGraph)와 시각·동작 일관성:
 *   - 같은 엣지 종류 색·점선
 *   - 같은 상태 차별 (draft = 빈 원, archived = opacity ↓)
 *   - 헤더 '전체에서 보기' 진입점
 */
export function WikiLocalGraph({ page, allPages, onSelect, onOpenInGlobal }: Props) {
  const { neighbors, edges } = useMemo(() => {
    const idMap = new Map(allPages.map((p) => [p.id, p]));

    type NB = { page: WikiPage; kind: EdgeKind; direction: 'out' | 'in' };
    const all: NB[] = [];

    // 나가는 — refersTo / cites / inherits / similarTo
    const buckets: Array<[string[], EdgeKind]> = [
      [page.refersTo, 'refersTo'],
      [page.cites,    'cites'],
      [page.inherits, 'inherits'],
      [page.similarTo,'similarTo'],
      [page.parentMocs, 'parentMocs'],
    ];
    const seen = new Set<string>();
    for (const [arr, kind] of buckets) {
      for (const id of arr) {
        if (!idMap.has(id) || id === page.id) continue;
        const key = id + '|' + kind + '|out';
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ page: idMap.get(id)!, kind, direction: 'out' });
      }
    }
    // 들어오는
    for (const p of allPages) {
      if (p.id === page.id) continue;
      const incomingKinds: EdgeKind[] = [];
      if (p.refersTo.includes(page.id))  incomingKinds.push('refersTo');
      if (p.cites.includes(page.id))     incomingKinds.push('cites');
      if (p.inherits.includes(page.id))  incomingKinds.push('inherits');
      if (p.similarTo.includes(page.id)) incomingKinds.push('similarTo');
      if (p.parentMocs.includes(page.id)) incomingKinds.push('parentMocs');
      for (const kind of incomingKinds) {
        const key = p.id + '|' + kind + '|in';
        if (seen.has(key)) continue;
        seen.add(key);
        all.push({ page: p, kind, direction: 'in' });
      }
    }

    // 동일 페이지의 다중 엣지 종류는 첫 번째만 (시각 단순화)
    const uniq = new Map<string, NB>();
    for (const x of all) if (!uniq.has(x.page.id)) uniq.set(x.page.id, x);
    const nb = [...uniq.values()].slice(0, 12);
    return { neighbors: nb, edges: nb };
  }, [page, allPages]);

  const cMeta = WIKI_TYPE_META[page.type];

  if (neighbors.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-card/76 shadow-[0_14px_34px_-30px_hsl(30_15%_8%/0.55)]">
        <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
          <p className="text-[11px] font-bold text-foreground">이웃 그래프</p>
        </div>
        <p className="p-3 text-[11px] text-muted-foreground/80 text-center">
          이 문서는 아직 다른 문서와 연결되지 않았어요.
        </p>
        {onOpenInGlobal && (
          <button
            type="button"
            onClick={() => onOpenInGlobal(page.id)}
            className="w-full inline-flex items-center justify-center gap-1 px-2 h-7 border-t border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
          >
            <Network className="h-3 w-3" /> 전체 그래프에서 보기
          </button>
        )}
      </div>
    );
  }

  // 라디얼 레이아웃 — 중심 + 동심원
  const W = 280, H = 220;
  const cx = W / 2, cy = H / 2;
  const radius = 78;

  return (
    <div className="overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-card/76 shadow-[0_14px_34px_-30px_hsl(30_15%_8%/0.55)]">
      <div className="px-3 py-2 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
        <p className="text-[11px] font-bold text-foreground">
          이웃 그래프
        </p>
        <span className="text-[10px] text-muted-foreground/70">{neighbors.length}개 연결</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" aria-label="로컬 그래프">
        {/* 엣지 */}
        {edges.map((n, i) => {
          const angle = (i / edges.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const s = edgeStrokeMini(n.kind);
          return (
            <line
              key={n.page.id + '|' + n.kind}
              x1={cx} y1={cy} x2={x} y2={y}
              stroke={s.stroke} strokeWidth="1" strokeDasharray={s.dash} strokeOpacity="0.7"
            />
          );
        })}
        {/* 이웃 노드 */}
        {neighbors.map((n, i) => {
          const angle = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const meta = WIKI_TYPE_META[n.page.type];
          const isDraft = n.page.status === 'draft';
          const isArchived = n.page.status === 'archived';
          return (
            <g
              key={n.page.id}
              className="cursor-pointer wiki-trans-color"
              onClick={() => onSelect(n.page.id)}
              role="button"
              aria-label={n.page.title}
              style={{ opacity: isArchived ? 0.55 : 1 }}
            >
              <title>{n.page.title} · {WIKI_STATUS_META[n.page.status].label}</title>
              <circle
                cx={x} cy={y} r={6}
                fill={isDraft ? 'transparent' : meta.tint}
                fillOpacity={isDraft ? 0 : 0.85}
                stroke={isDraft ? meta.tint : 'hsl(var(--background))'}
                strokeWidth={isDraft ? 1.5 : 1.5}
              />
            </g>
          );
        })}
        {/* 중심 노드 */}
        <g>
          <title>{page.title}</title>
          <circle cx={cx} cy={cy} r={10} fill={cMeta.tint} stroke="hsl(var(--background))" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={cMeta.tint} strokeOpacity="0.4" strokeWidth="1" />
        </g>
      </svg>
      {/* 이웃 리스트 — 한 줄씩 (엣지 종류 dot 도 노출) */}
      <ul className="px-1 py-1 max-h-[140px] overflow-y-auto">
        {neighbors.map((n) => {
          const meta = WIKI_TYPE_META[n.page.type];
          const e = edgeStrokeMini(n.kind);
          return (
            <li key={n.page.id + '|' + n.kind}>
              <button
                type="button"
                onClick={() => onSelect(n.page.id)}
                className={cn(
                  'w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-accent text-left wiki-trans-color',
                  n.page.status === 'archived' && 'opacity-60',
                )}
                title={`${n.direction === 'out' ? '나가는' : '들어오는'} ${n.kind}`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.tint }} aria-hidden />
                <span className="flex-1 truncate text-[11.5px] text-foreground/85">{n.page.title}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" className="shrink-0">
                  <line x1="0" y1="3" x2="10" y2="3" stroke={e.stroke} strokeWidth="1.5" strokeDasharray={e.dash} />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
      {onOpenInGlobal && (
        <button
          type="button"
          onClick={() => onOpenInGlobal(page.id)}
          className="w-full inline-flex items-center justify-center gap-1 px-2 h-7 border-t border-[hsl(var(--hairline))] text-[10.5px] text-muted-foreground hover:bg-accent hover:text-foreground wiki-trans-color"
        >
          <Network className="h-3 w-3" /> 전체 그래프에서 보기
        </button>
      )}
    </div>
  );
}
