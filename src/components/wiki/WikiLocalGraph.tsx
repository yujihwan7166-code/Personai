import { useMemo } from 'react';
import { type WikiPage, WIKI_TYPE_META } from '@/types/wiki';

interface Props {
  page: WikiPage;
  allPages: WikiPage[];
  onSelect: (id: string) => void;
}

/**
 * 로컬 그래프 — 현재 페이지 + 1-hop 이웃만 표시.
 * 전체 그래프(WikiGraph)가 *품질 점검 도구*라면, 이건 *읽으면서 흘끗* 보는 사이드.
 * SVG 직접 렌더 (의존성 X). 라디얼 레이아웃.
 */
export function WikiLocalGraph({ page, allPages, onSelect }: Props) {
  const { center, neighbors } = useMemo(() => {
    const idMap = new Map(allPages.map((p) => [p.id, p]));
    const titleMap = new Map<string, WikiPage>();
    for (const p of allPages) {
      titleMap.set(p.title.toLowerCase(), p);
      for (const a of p.aliases) titleMap.set(a.toLowerCase(), p);
    }

    // 나가는 링크: refersTo + cites
    const outgoing = new Set<string>();
    for (const id of [...page.refersTo, ...page.cites]) {
      if (idMap.has(id)) outgoing.add(id);
    }

    // 들어오는 링크: 다른 페이지가 이 페이지를 참조
    const incoming = new Set<string>();
    for (const p of allPages) {
      if (p.id === page.id) continue;
      if (p.refersTo.includes(page.id) || p.cites.includes(page.id)) incoming.add(p.id);
    }

    const ids = new Set([...outgoing, ...incoming]);
    const list = [...ids].map((id) => idMap.get(id)).filter((p): p is WikiPage => !!p);

    return { center: page, neighbors: list.slice(0, 12) };
  }, [page, allPages]);

  if (neighbors.length === 0) {
    return (
      <div className="rounded-md border border-[hsl(var(--hairline))] bg-card p-3 text-[11px] text-muted-foreground/80 text-center">
        이 페이지는 아직 다른 페이지와 연결되지 않았어요.
      </div>
    );
  }

  // 라디얼 레이아웃 — 중심 + 동심원
  const W = 280, H = 220;
  const cx = W / 2, cy = H / 2;
  const radius = 78;
  const cMeta = WIKI_TYPE_META[center.type];

  return (
    <div className="rounded-md border border-[hsl(var(--hairline))] bg-card overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-[hsl(var(--hairline))] flex items-center justify-between">
        <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          이웃 그래프
        </p>
        <span className="text-[10px] text-muted-foreground/70">{neighbors.length}개 연결</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]" aria-label="로컬 그래프">
        {/* 엣지 */}
        <g stroke="hsl(var(--hairline))" strokeWidth="1">
          {neighbors.map((n, i) => {
            const angle = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + Math.cos(angle) * radius;
            const y = cy + Math.sin(angle) * radius;
            return <line key={n.id} x1={cx} y1={cy} x2={x} y2={y} />;
          })}
        </g>
        {/* 이웃 노드 */}
        {neighbors.map((n, i) => {
          const angle = (i / neighbors.length) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * radius;
          const y = cy + Math.sin(angle) * radius;
          const meta = WIKI_TYPE_META[n.type];
          return (
            <g
              key={n.id}
              className="cursor-pointer wiki-trans-color"
              onClick={() => onSelect(n.id)}
              role="button"
              aria-label={n.title}
            >
              <title>{n.title}</title>
              <circle cx={x} cy={y} r={6} fill={meta.tint} stroke="hsl(var(--background))" strokeWidth="1.5" />
            </g>
          );
        })}
        {/* 중심 노드 */}
        <g>
          <title>{center.title}</title>
          <circle cx={cx} cy={cy} r={10} fill={cMeta.tint} stroke="hsl(var(--background))" strokeWidth="2" />
          <circle cx={cx} cy={cy} r={14} fill="none" stroke={cMeta.tint} strokeOpacity="0.4" strokeWidth="1" />
        </g>
      </svg>
      {/* 이웃 리스트 — 한 줄씩 */}
      <ul className="px-1 py-1 max-h-[140px] overflow-y-auto">
        {neighbors.map((n) => {
          const meta = WIKI_TYPE_META[n.type];
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onSelect(n.id)}
                className="w-full flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-accent text-left wiki-trans-color"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: meta.tint }} aria-hidden />
                <span className="flex-1 truncate text-[11.5px] text-foreground/85">{n.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
