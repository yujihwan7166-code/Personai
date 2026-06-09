import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, Plus, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WikiPage, WIKI_TYPE_META, isMainDoc } from '@/types/wiki';
import { getActiveWikiPages, searchWikiPages, type WikiSearchHit } from '@/lib/wikiQuery';

interface Props {
  pages: WikiPage[];
  loading: boolean;
  activeId: string | null;
  externalQuery?: string;
  onQueryChange?: (q: string) => void;
  onSelect: (id: string) => void;
  onCreateByTitle?: (title: string) => void;
}

export function WikiSidebar({
  pages, loading, activeId, externalQuery, onQueryChange, onSelect, onCreateByTitle,
}: Props) {
  const [internalQuery, setInternalQuery] = useState('');
  const query = externalQuery ?? internalQuery;
  const cleanQuery = query.trim();
  const hasQuery = cleanQuery.length > 0;

  const setQuery = (v: string) => {
    if (onQueryChange) onQueryChange(v);
    else setInternalQuery(v);
  };

  const activePages = useMemo(() => getActiveWikiPages(pages), [pages]);
  const mainDocs = useMemo(
    () => activePages
      .filter((p) => isMainDoc(p) && p.type !== 'index')
      .slice(0, 5),
    [activePages],
  );
  const mainDocIds = useMemo(() => new Set(mainDocs.map((p) => p.id)), [mainDocs]);

  const hits = useMemo<WikiSearchHit[]>(
    () => searchWikiPages(activePages, query),
    [activePages, query],
  );

  const documentHits = useMemo(
    () => (!hasQuery && mainDocIds.size > 0
      ? hits.filter(({ page }) => !mainDocIds.has(page.id))
      : hits),
    [hasQuery, hits, mainDocIds],
  );

  const createFromQuery = () => {
    if (!cleanQuery || !onCreateByTitle) return;
    onCreateByTitle(cleanQuery);
    setQuery('');
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-3 pb-2 pt-2.5">
        <form
          className="flex h-8 items-center gap-1.5 rounded-full border border-[hsl(var(--hairline))] bg-card px-3 transition-all focus-within:border-primary/45 focus-within:ring-2 focus-within:ring-primary/15"
          onSubmit={(e) => {
            e.preventDefault();
            if (cleanQuery && documentHits.length === 0 && onCreateByTitle) {
              createFromQuery();
            }
          }}
        >
          <Search className="h-3 w-3 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="문서 검색"
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색 지우기"
              title="검색 지우기"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        {loading ? (
          <p className="px-2 py-4 text-[11px] text-muted-foreground">불러오는 중...</p>
        ) : activePages.length === 0 && !hasQuery ? (
          <EmptySearchState />
        ) : (
          <>
            {!hasQuery && mainDocs.length > 0 && (
              <QuickSection
                icon={<BookOpen className="h-3 w-3 text-primary" />}
                label="메인 문서"
                pages={mainDocs}
                activeId={activeId}
                onSelect={onSelect}
              />
            )}

            <p className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              {hasQuery ? `검색 결과 · ${documentHits.length}` : `문서 · ${documentHits.length}`}
            </p>

            {documentHits.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-[11px] text-muted-foreground">
                  {hasQuery ? '검색 결과 없음' : '표시할 문서가 없어요'}
                </p>
                {hasQuery && onCreateByTitle && (
                  <button
                    type="button"
                    onClick={createFromQuery}
                    className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary transition-colors hover:bg-primary/15"
                    title={`"${cleanQuery}" 새 문서 만들기`}
                    data-wiki-create-from-search
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">"{cleanQuery}" 새 문서 만들기</span>
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-0.5">
                {documentHits.map((hit) => (
                  <PageHitItem
                    key={hit.page.id}
                    hit={hit}
                    query={cleanQuery}
                    active={activeId === hit.page.id}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptySearchState() {
  return (
    <div className="px-2 py-4 text-center">
      <p className="whitespace-pre-line text-[11px] text-muted-foreground">
        문서가 없어요.{'\n'}+ 버튼으로 시작
      </p>
    </div>
  );
}

function PageHitItem({
  hit, query, active, onSelect,
}: {
  hit: WikiSearchHit;
  query: string;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const { page, bodySnippet, matchedAlias, matchedTag, matchedLink } = hit;
  const typeMeta = WIKI_TYPE_META[page.type];

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(page.id)}
        className={cn(
          'w-full rounded-md px-2 py-1.5 text-left transition-colors',
          active ? 'bg-primary/10 text-primary' : 'text-foreground/85 hover:bg-accent',
        )}
      >
        <div className="flex w-full items-center gap-2">
          <span className="shrink-0 text-[14px] leading-none" aria-hidden>{typeMeta.icon}</span>
          <span className="min-w-0 flex-1 truncate text-[12.5px]">
            <Highlight text={page.title} q={hit.hit === 'title' ? query : ''} />
          </span>
        </div>
        {bodySnippet && hit.hit === 'body' && (
          <p className="ml-[22px] line-clamp-2 text-[10.5px] leading-relaxed text-muted-foreground">
            <Highlight text={bodySnippet} q={query} />
          </p>
        )}
        {matchedAlias && hit.hit === 'alias' && (
          <p className="ml-[22px] text-[10.5px] text-muted-foreground">
            별칭: <Highlight text={matchedAlias} q={query} />
          </p>
        )}
        {matchedTag && hit.hit === 'tag' && (
          <p className="ml-[22px] text-[10.5px] text-muted-foreground">
            #<Highlight text={matchedTag} q={query} />
          </p>
        )}
        {matchedLink && hit.hit === 'link' && (
          <p className="ml-[22px] text-[10.5px] text-muted-foreground">
            링크: <Highlight text={matchedLink} q={query} />
          </p>
        )}
      </button>
    </li>
  );
}

function Highlight({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const ql = q.toLowerCase();
  const i = lower.indexOf(ql);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-primary/20 px-0.5 font-semibold text-primary">
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

function QuickSection({
  icon, label, pages, activeId, onSelect,
}: {
  icon: ReactNode;
  label: string;
  pages: WikiPage[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-2">
      <p className="flex items-center gap-1 px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
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
                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-left transition-colors',
                  activeId === p.id ? 'bg-primary/10 text-primary' : 'text-foreground/85 hover:bg-accent',
                )}
              >
                <span className="shrink-0 text-[12.5px] leading-none" aria-hidden>{meta.icon}</span>
                <span className="min-w-0 flex-1 truncate text-[12px]">{p.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
