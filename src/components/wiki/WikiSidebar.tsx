import { useMemo, useState } from 'react';
import { Search, Star, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META, isMainDoc } from '@/types/wiki';

interface Props {
  pages: WikiPage[];
  loading: boolean;
  activeId: string | null;
  favorites: string[];
  /** 외부에서 검색어 주입 — 태그 클릭 등 (선택). undefined 면 internal state. */
  externalQuery?: string;
  onQueryChange?: (q: string) => void;
  onSelect: (id: string) => void;
}

type Filter = 'all' | 'moc' | 'active' | 'stable' | 'recent';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all',    label: '전체' },
  { id: 'moc',    label: '메인' },
  { id: 'active', label: '작업중' },
  { id: 'stable', label: '완성' },
  { id: 'recent', label: '최근 수정' },
];

/** '최근 수정' 필터 임계 — 7일. */
const RECENT_EDIT_MS = 7 * 24 * 60 * 60 * 1000;

export function WikiSidebar({
  pages, loading, activeId, favorites,
  externalQuery, onQueryChange, onSelect,
}: Props) {
  const [internalQuery, setInternalQuery] = useState('');
  const query = externalQuery ?? internalQuery;
  const setQuery = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    else setInternalQuery(v);
  };
  const [filter, setFilter] = useState<Filter>('all');

  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const favoritePages = useMemo(
    () => favorites.map((id) => pageById.get(id)).filter((p): p is WikiPage => !!p),
    [favorites, pageById]
  );
  // 메인 문서 — 즐겨찾기에 없는 메인 5개 (대문 진입 없이 빠른 pivot)
  const mainDocs = useMemo(
    () => pages
      .filter((p) => isMainDoc(p) && p.type !== 'index')
      .filter((p) => !favorites.includes(p.id))
      .slice(0, 5),
    [pages, favorites]
  );
  // 인기 태그 — 사용 빈도 top 10
  const topTags = useMemo(() => {
    const cnt = new Map<string, number>();
    for (const p of pages) for (const t of p.tags) cnt.set(t, (cnt.get(t) ?? 0) + 1);
    return [...cnt.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [pages]);

  const showQuickSections = !query.trim() && filter === 'all';

  type HitKind = 'title' | 'alias' | 'tag' | 'body' | 'none';
  interface FilteredPage { page: WikiPage; hit: HitKind; bodySnippet?: string; matchedAlias?: string; matchedTag?: string }

  const filtered = useMemo<FilteredPage[]>(() => {
    const q = query.trim().toLowerCase();
    const out: FilteredPage[] = [];
    for (const p of pages) {
      if (filter === 'moc'    && !(p.isMain || p.type === 'moc')) continue;
      if (filter === 'active' && p.status !== 'active') continue;
      if (filter === 'stable' && p.status !== 'stable') continue;
      if (filter === 'recent' && Date.now() - p.updatedAt > RECENT_EDIT_MS) continue;
      if (!q) { out.push({ page: p, hit: 'none' }); continue; }
      if (p.title.toLowerCase().includes(q)) { out.push({ page: p, hit: 'title' }); continue; }
      const aHit = p.aliases.find((a) => a.toLowerCase().includes(q));
      if (aHit) { out.push({ page: p, hit: 'alias', matchedAlias: aHit }); continue; }
      const tHit = p.tags.find((t) => t.toLowerCase().includes(q));
      if (tHit) { out.push({ page: p, hit: 'tag', matchedTag: tHit }); continue; }
      if (q.length >= 2) {
        const lower = p.body.toLowerCase();
        const idx = lower.indexOf(q);
        if (idx >= 0) {
          const start = Math.max(0, idx - 30);
          const end = Math.min(p.body.length, idx + q.length + 30);
          const prefix = start > 0 ? '…' : '';
          const suffix = end < p.body.length ? '…' : '';
          out.push({
            page: p,
            hit: 'body',
            bodySnippet: prefix + p.body.slice(start, end).replace(/\s+/g, ' ').trim() + suffix,
          });
        }
      }
    }
    return out;
  }, [pages, query, filter]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 검색 — 새 페이지는 헤더 + 버튼 / Ctrl+N / 명령 팔레트로 접근 */}
      <div className="px-3 pt-2.5 pb-2 flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 px-3 h-8 rounded-full border border-[hsl(var(--hairline))] bg-card focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·태그·alias"
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색 지우기"
              title="지우기 (Esc)"
              className="text-muted-foreground/70 hover:text-foreground text-[11px] shrink-0"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* 필터 — pill segmented */}
      <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-2.5 h-6 inline-flex items-center justify-center rounded-full text-[10.5px] whitespace-nowrap font-semibold transition-all',
              filter === f.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-1.5 pb-3">
        {/* 즐겨찾기 + 최근 — 검색·필터 X 일 때만 */}
        {showQuickSections && favoritePages.length > 0 && (
          <QuickSection
            icon={<Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
            label="즐겨찾기"
            pages={favoritePages}
            activeId={activeId}
            onSelect={onSelect}
          />
        )}
        {showQuickSections && mainDocs.length > 0 && (
          <QuickSection
            icon={<BookOpen className="w-3 h-3 text-primary" />}
            label="메인 문서"
            pages={mainDocs}
            activeId={activeId}
            onSelect={onSelect}
          />
        )}
        {showQuickSections && (favoritePages.length > 0 || mainDocs.length > 0) && (
          <p className="px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            모든 페이지 · {pages.length}
          </p>
        )}
        {!showQuickSections && query.trim() && filtered.length > 0 && (
          <p className="px-2 pt-1 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            검색 결과 {filtered.length}건
          </p>
        )}

        {loading ? (
          <p className="px-2 py-4 text-[11px] text-muted-foreground">불러오는 중…</p>
        ) : filtered.length === 0 ? (
          <p className="px-2 py-4 text-[11px] text-muted-foreground text-center">
            {pages.length === 0 ? '페이지가 없어요.\n+ 버튼으로 시작' : '검색 결과 없음'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map(({ page: p, hit, bodySnippet, matchedAlias, matchedTag }) => {
              const typeMeta = WIKI_TYPE_META[p.type];
              const statusMeta = WIKI_STATUS_META[p.status];
              const q = query.trim();
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className={cn(
                      'w-full flex flex-col gap-0.5 px-2 py-1.5 rounded-md text-left transition-colors',
                      activeId === p.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/85 hover:bg-accent',
                    )}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-[14px] leading-none shrink-0" aria-hidden>{typeMeta.icon}</span>
                      <span className="flex-1 min-w-0 truncate text-[12.5px]">
                        <Highlight text={p.title} q={hit === 'title' ? q : ''} />
                      </span>
                      {p.status !== 'stable' && (
                        <span
                          className="shrink-0 text-[8.5px] px-1 py-0.5 rounded font-medium uppercase tracking-wider"
                          style={{ backgroundColor: `${statusMeta.tint}22`, color: statusMeta.tint }}
                        >
                          {statusMeta.label}
                        </span>
                      )}
                    </div>
                    {hit === 'body' && bodySnippet && (
                      <p className="ml-[22px] text-[10.5px] text-muted-foreground line-clamp-2 leading-relaxed">
                        <Highlight text={bodySnippet} q={q} />
                      </p>
                    )}
                    {hit === 'alias' && matchedAlias && (
                      <p className="ml-[22px] text-[10.5px] text-muted-foreground">
                        alias: <Highlight text={matchedAlias} q={q} />
                      </p>
                    )}
                    {hit === 'tag' && matchedTag && (
                      <p className="ml-[22px] text-[10.5px] text-muted-foreground">
                        #<Highlight text={matchedTag} q={q} />
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 인기 태그 패널 — 검색·필터 X 일 때만, 활성 태그 5개 이상일 때만 */}
      {showQuickSections && topTags.length > 0 && (
        <div className="shrink-0 px-3 pt-2 pb-2.5 border-t border-[hsl(var(--hairline))]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1.5">
            🏷 인기 태그
          </p>
          <div className="flex flex-wrap gap-1">
            {topTags.map(([tag, n]) => (
              <button
                key={tag}
                type="button"
                onClick={() => setQuery(tag)}
                title={`#${tag} (${n}건) — 클릭하면 검색`}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-accent/60 text-foreground/80 text-[10.5px] font-medium hover:bg-primary/10 hover:text-primary transition-colors"
              >
                #{tag}
                <span className="text-[9.5px] tabular-nums opacity-70">{n}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 하단 카운트 행 제거됨 — Wiki.tsx 의 footer 에서 설정 버튼과 같은 줄에 노출. */}
    </div>
  );
}

/** 검색어 매칭 부분만 강조 — 위키 link tint 와 같은 토큰. */
function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const i = lower.indexOf(ql);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-primary/20 text-primary px-0.5 rounded font-semibold">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/* ── 즐겨찾기·최근 섹션 ── */
function QuickSection({
  icon, label, pages, activeId, onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  pages: WikiPage[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="flex items-center gap-1 px-2 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
        {icon}
        {label} · {pages.length}
      </p>
      <ul className="space-y-0.5">
        {pages.map((p) => {
          const meta = WIKI_TYPE_META[p.type];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-1 rounded-md text-left transition-colors',
                  activeId === p.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-foreground/85 hover:bg-accent',
                )}
              >
                <span className="text-[12.5px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                <span className="flex-1 min-w-0 truncate text-[12px]">{p.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
