import { useMemo, useState } from 'react';
import { Plus, Search, Star, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';

interface Props {
  pages: WikiPage[];
  loading: boolean;
  activeId: string | null;
  /** 즐겨찾기 + 최근 — 부모에서 지속화 */
  favorites: string[];
  recent: string[];
  onSelect: (id: string) => void;
  onCreate: () => void;
}

type Filter = 'all' | 'moc' | 'source' | 'draft';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all',    label: '전체' },
  { id: 'moc',    label: '🗺 MOC' },
  { id: 'source', label: '📚 출처' },
  { id: 'draft',  label: '🚧 초안' },
];

export function WikiSidebar({ pages, loading, activeId, favorites, recent, onSelect, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);
  const favoritePages = useMemo(
    () => favorites.map((id) => pageById.get(id)).filter((p): p is WikiPage => !!p),
    [favorites, pageById]
  );
  const recentPages = useMemo(
    () => recent.map((id) => pageById.get(id)).filter((p): p is WikiPage => !!p)
      .filter((p) => !favorites.includes(p.id))  // 즐겨찾기와 중복 제거
      .slice(0, 5),
    [recent, pageById, favorites]
  );

  const showQuickSections = !query.trim() && filter === 'all';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pages.filter((p) => {
      if (filter === 'moc'    && p.type !== 'moc') return false;
      if (filter === 'source' && p.type !== 'source') return false;
      if (filter === 'draft'  && p.status !== 'draft') return false;
      if (!q) return true;
      if (p.title.toLowerCase().includes(q)) return true;
      if (p.aliases.some((a) => a.toLowerCase().includes(q))) return true;
      if (p.tags.some((t) => t.toLowerCase().includes(q))) return true;
      // 본문 전문 검색 — 길이 짧은 쿼리(2자 이상)만 본문 매칭 허용해 노이즈 ↓
      if (q.length >= 2 && p.body.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [pages, query, filter]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 검색 + 새 페이지 */}
      <div className="px-3 pt-2.5 pb-2 flex items-center gap-1.5">
        <div className="flex-1 flex items-center gap-1.5 px-2 h-7 rounded-md border border-[hsl(var(--hairline))] bg-background focus-within:border-primary/50 transition-colors">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·태그·alias"
            className="flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          title="새 페이지 (Ctrl/Cmd+N)"
          aria-label="새 페이지"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 필터 */}
      <div className="px-3 pb-2 flex items-center gap-1 overflow-x-auto scrollbar-none">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              'px-2 py-0.5 rounded text-[10.5px] whitespace-nowrap transition-colors',
              filter === f.id
                ? 'bg-primary/10 text-primary font-semibold'
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
        {showQuickSections && recentPages.length > 0 && (
          <QuickSection
            icon={<Clock className="w-3 h-3" />}
            label="최근 본"
            pages={recentPages}
            activeId={activeId}
            onSelect={onSelect}
          />
        )}
        {showQuickSections && (favoritePages.length > 0 || recentPages.length > 0) && (
          <p className="px-2 pt-2 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/70">
            모든 페이지 · {pages.length}
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
            {filtered.map((p) => {
              const typeMeta = WIKI_TYPE_META[p.type];
              const statusMeta = WIKI_STATUS_META[p.status];
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors',
                      activeId === p.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground/85 hover:bg-accent',
                    )}
                  >
                    <span className="text-[14px] leading-none shrink-0" aria-hidden>{typeMeta.icon}</span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px]">{p.title}</span>
                    {p.status !== 'stable' && (
                      <span
                        className="shrink-0 text-[8.5px] px-1 py-0.5 rounded font-medium uppercase tracking-wider"
                        style={{ backgroundColor: `${statusMeta.tint}22`, color: statusMeta.tint }}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 하단 카운트 */}
      <div className="px-3 py-2 border-t border-[hsl(var(--hairline))] text-[10px] text-muted-foreground flex items-center justify-between">
        <span>{pages.length}개 페이지</span>
        {filter !== 'all' && <span>{filtered.length} 필터</span>}
      </div>
    </div>
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
      <p className="flex items-center gap-1 px-2 pt-2 pb-1 text-[9.5px] font-mono uppercase tracking-wider text-muted-foreground/70">
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
