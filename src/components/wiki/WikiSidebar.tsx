import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WikiPage, WIKI_TYPE_META, WIKI_STATUS_META } from '@/types/wiki';

interface Props {
  pages: WikiPage[];
  loading: boolean;
  activeId: string | null;
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

export function WikiSidebar({ pages, loading, activeId, onSelect, onCreate }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

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
