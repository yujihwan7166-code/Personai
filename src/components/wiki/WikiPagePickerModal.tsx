import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Plus, Hash, FileText } from 'lucide-react';
import { type WikiPage, WIKI_TYPE_META, USER_FACING_TYPES, type WikiPageType } from '@/types/wiki';
import { cn } from '@/lib/utils';
import { getActiveWikiPages, searchWikiPages, type WikiSearchHit } from '@/lib/wikiQuery';

type Mode = 'search' | 'id' | 'new';

const isLikelyUrl = (value: string): boolean =>
  /^(https?:\/\/|mailto:|tel:|#|\/)/i.test(value)
  || /^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(value);

interface Props {
  open: boolean;
  pages: WikiPage[];
  excludeId?: string;
  initialQuery?: string;
  /** 기존 페이지 선택 시 호출 */
  onPick: (page: WikiPage) => void;
  /** 새 문서를 만들고 현재 글에 연결 — 부모가 문서 생성 후 그 문서 객체를 반환 */
  onCreateAndLink?: (title: string, type: WikiPageType) => Promise<WikiPage> | WikiPage;
  /** 웹 URL 연결. 선택 텍스트가 있으면 그 텍스트에, 없으면 URL 텍스트로 삽입. */
  onPickUrl?: (url: string, label?: string) => void;
  onClose: () => void;
}

/**
 * 페이지 picker — 3 모드 탭:
 * 1. 검색 (기존 페이지)
 * 2. ID 입력 (w_xxx 직접)
 * 3. 새로 만들고 연결
 */
export function WikiPagePickerModal({
  open, pages, excludeId, initialQuery = '', onPick, onCreateAndLink, onPickUrl, onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState(initialQuery);
  const [typeFilter, setTypeFilter] = useState<WikiPageType | 'all'>('all');
  const [activeIdx, setActiveIdx] = useState(0);
  const [idInput, setIdInput] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<WikiPageType>('concept');
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setMode('search');
    setQuery(initialQuery);
    setTypeFilter('all');
    setActiveIdx(0);
    setIdInput('');
    setNewTitle(initialQuery);  // 선택 텍스트가 새 문서 제목 후보
    setNewType('concept');
    setBusy(false);
    const t = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, initialQuery, onClose]);

  /* 전체 페이지 (excludeId/보관 제외, 최근 수정 desc) — 둘러보기 fallback 용 */
  const allPages = useMemo(() => {
    const list = getActiveWikiPages(pages).filter((p) => p.id !== excludeId);
    list.sort((a, b) => b.updatedAt - a.updatedAt);
    return list;
  }, [pages, excludeId]);

  /* type 필터 적용 */
  const typeFiltered = useMemo(() => {
    if (typeFilter === 'all') return allPages;
    return allPages.filter((p) => p.type === typeFilter);
  }, [allPages, typeFilter]);

  /* 검색 후보 — 쿼리 없으면 전체, 있으면 title·alias·tag·link·body 통합 검색 */
  const candidates = useMemo(() => {
    if (mode !== 'search') return [];
    const q = query.trim().toLowerCase();
    if (!q) return typeFiltered;
    return searchWikiPages(typeFiltered, q).map((hit) => hit.page);
  }, [query, typeFiltered, mode]);

  const candidateHits = useMemo(() => {
    if (mode !== 'search') return [];
    const q = query.trim().toLowerCase();
    if (!q) return typeFiltered.map((page, index) => ({ page, hit: 'none' as const, score: -index }));
    return searchWikiPages(typeFiltered, q);
  }, [query, typeFiltered, mode]);

  const exactPage = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return typeFiltered.some((p) =>
      p.title.trim().toLowerCase() === q
      || p.aliases.some((alias) => alias.trim().toLowerCase() === q),
    );
  }, [query, typeFiltered]);
  const canCreateFromSearch = Boolean(onCreateAndLink && query.trim() && !exactPage);
  const canPickUrl = Boolean(onPickUrl && isLikelyUrl(query.trim()));

  /* 쿼리는 있지만 매치 0 → 전체 둘러보기 fallback 표시 */
  const showFallback = mode === 'search' && query.trim().length > 0 && candidates.length === 0 && typeFiltered.length > 0;

  /* ID 매칭 */
  const idMatch = useMemo(() => {
    const t = idInput.trim();
    if (!t) return null;
    return pages.find((p) => p.id === t) ?? null;
  }, [idInput, pages]);

  useEffect(() => { setActiveIdx(0); }, [query, mode]);

  if (!open) return null;

  const tabs: Array<{ id: Mode; label: string; icon: React.ReactNode }> = [
    { id: 'search', label: '문서 찾기', icon: <Search className="w-3 h-3" /> },
    { id: 'new',    label: '새 문서',  icon: <Plus className="w-3 h-3" /> },
  ];

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title || !onCreateAndLink || busy) return;
    setBusy(true);
    try {
      const page = await onCreateAndLink(title, newType);
      onPick(page);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateFromSearch() {
    const title = query.trim();
    if (!title || !onCreateAndLink || busy) return;
    setBusy(true);
    try {
      const page = await onCreateAndLink(title, 'concept');
      onPick(page);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 wiki-z-modal-backdrop bg-black/40 backdrop-blur-sm flex items-start justify-center pt-[12vh] px-4"
      role="dialog"
      aria-label="문서 또는 링크 연결"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 탭 row */}
        <div className="flex border-b border-[hsl(var(--hairline))]">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setMode(t.id)}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-1 h-9 text-[11.5px] wiki-trans-color',
                mode === t.id
                  ? 'bg-primary/5 text-primary font-bold border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground border-b-2 border-transparent',
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <button
            type="button"
            onClick={onClose}
            className="px-3 inline-flex items-center text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="닫기"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 탭 컨텐츠 */}
        {mode === 'search' && (
          <>
            <div className="flex items-center gap-1.5 px-3 h-11 border-b border-[hsl(var(--hairline))]">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(candidates.length - 1, i + 1)); }
                  else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
                  else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (candidates[activeIdx]) onPick(candidates[activeIdx]);
                    else if (canPickUrl) onPickUrl?.(query.trim());
                    else if (canCreateFromSearch) void handleCreateFromSearch();
                  }
                  else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
                }}
                placeholder="연결할 문서 이름이나 URL"
                className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/60"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="검색어 지우기"
                  title="검색어 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-[10px] text-muted-foreground/70 hidden sm:inline">Enter 선택</span>
            </div>

            {/* Type 필터 row 제거됨 — 사용자 '타입' 미사용 의견 반영. 검색은 제목/본문으로만. */}
            <div className="hidden flex items-center gap-1 px-3 py-2 border-b border-[hsl(var(--hairline))] overflow-x-auto">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={cn(
                  'inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] shrink-0 wiki-trans-color',
                  typeFilter === 'all'
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                전체
                <span className="text-[10px] tabular-nums opacity-70">{allPages.length}</span>
              </button>
              {USER_FACING_TYPES.map((t) => {
                const m = WIKI_TYPE_META[t];
                const count = allPages.filter((p) => p.type === t).length;
                if (count === 0) return null;
                const active = typeFilter === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTypeFilter(t)}
                    className={cn(
                      'inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] shrink-0 wiki-trans-color',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <span className="text-[12px] leading-none" aria-hidden>{m.icon}</span>
                    {m.label}
                    <span className="text-[10px] tabular-nums opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-[50vh] overflow-y-auto py-1">
              {/* 1) 정상 결과 */}
              {candidateHits.length > 0 && candidateHits.map(({ page: p, hit, bodySnippet, matchedAlias, matchedTag, matchedLink }, i) => {
                const meta = WIKI_TYPE_META[p.type];
                const active = i === activeIdx;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => onPick(p)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-left wiki-trans-color',
                      active ? 'bg-accent text-foreground' : 'text-foreground/85 hover:bg-accent',
                    )}
                  >
                    <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate text-[12.5px]">{p.title}</span>
                      {bodySnippet && (
                        <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">{bodySnippet}</span>
                      )}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0">
                      {formatHitMeta(hit, meta.label, matchedAlias, matchedTag, matchedLink)}
                    </span>
                  </button>
                );
              })}

              {canPickUrl && (
                <div className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => onPickUrl?.(query.trim())}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 wiki-trans-color"
                  >
                    <Hash className="h-3.5 w-3.5" />
                    웹 링크로 연결
                  </button>
                </div>
              )}

              {/* 2) 일치 없음 + fallback (전체 둘러보기) */}
              {showFallback && (
                <>
                  <p className="px-4 py-3 text-center text-[11.5px] text-muted-foreground">
                    "<span className="text-foreground/80">{query.trim()}</span>" 와 일치하는 문서가 없어요. 아래에서 골라보세요.
                  </p>
                  {canCreateFromSearch && (
                    <div className="px-3 pb-2">
                      <button
                        type="button"
                        onClick={() => { void handleCreateFromSearch(); }}
                        disabled={busy}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 wiki-trans-color"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        "{query.trim()}" 새 문서로 만들고 연결
                      </button>
                    </div>
                  )}
                  <div className="px-3 py-1 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 border-t border-[hsl(var(--hairline))]">
                    {typeFilter === 'all' ? '전체 문서' : `${WIKI_TYPE_META[typeFilter].label} 문서`}
                  </div>
                  {typeFiltered.map((p) => {
                    const meta = WIKI_TYPE_META[p.type];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onPick(p)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-foreground/85 hover:bg-accent wiki-trans-color"
                      >
                        <span className="text-[14px] leading-none shrink-0" aria-hidden>{meta.icon}</span>
                        <span className="flex-1 min-w-0 truncate text-[12.5px]">{p.title}</span>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">{meta.label}</span>
                      </button>
                    );
                  })}
                </>
              )}

              {/* 3) 전체가 0개 (페이지 자체가 없음) */}
              {candidates.length === 0 && !showFallback && (
                <div className="px-4 py-6 text-center">
                  <p className="text-[12px] text-muted-foreground">
                    {query.trim()
                      ? '일치하는 문서가 없어요'
                      : typeFilter === 'all'
                        ? '문서가 아직 없어요. 새 문서 탭에서 시작하세요.'
                        : `${WIKI_TYPE_META[typeFilter].label} 문서가 없어요.`}
                  </p>
                  {canCreateFromSearch && (
                    <button
                      type="button"
                      onClick={() => { void handleCreateFromSearch(); }}
                      disabled={busy}
                      className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-primary hover:bg-primary/15 disabled:opacity-50 wiki-trans-color"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">"{query.trim()}" 새 문서로 만들고 연결</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {mode === 'id' && (
          <div className="p-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1.5">
              문서 코드 입력
            </p>
            <input
              ref={inputRef}
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && idMatch) { e.preventDefault(); onPick(idMatch); }
                else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
              }}
              placeholder="w_abc123… (문서 정보에서 복사)"
              className="w-full px-3 py-2 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] font-mono outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
            />
            <p className="mt-2 text-[10.5px] text-muted-foreground/80">
              문서 정보 영역에서 복사한 코드를 붙여넣을 수 있어요.
            </p>
            {idInput.trim() && (
              <div className="mt-3">
                {idMatch ? (
                  <button
                    type="button"
                    onClick={() => onPick(idMatch)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-primary/40 bg-primary/5 hover:bg-primary/10 text-left wiki-trans-color"
                  >
                    <span className="text-[16px] leading-none" aria-hidden>{WIKI_TYPE_META[idMatch.type].icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-bold text-foreground truncate">{idMatch.title}</span>
                      <span className="block text-[10.5px] font-mono text-muted-foreground">{idMatch.id}</span>
                    </span>
                    <span className="text-[10.5px] text-primary font-bold">선택 →</span>
                  </button>
                ) : (
                  <p className="text-[11.5px] text-rose-600 dark:text-rose-400">
                    이 문서를 찾을 수 없어요
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'new' && (
          <div className="p-4 space-y-3">
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70 mb-1.5">
                새 문서 제목
              </p>
              <input
                ref={inputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTitle.trim()) { e.preventDefault(); void handleCreate(); }
                  else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
                }}
                placeholder="새 문서 제목"
                className="w-full px-3 py-2 rounded-md border border-[hsl(var(--hairline))] bg-background text-[13px] outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 wiki-trans-color"
              />
            </div>
            {/* 타입 선택 제거됨 — 자동 'concept' 으로 생성. 풍부한 템플릿은 /wiki 홈의 새 문서 모달에서. */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newTitle.trim() || busy || !onCreateAndLink}
              className={cn(
                'w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-[12.5px] font-semibold wiki-trans-color',
                newTitle.trim() && !busy
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              {busy ? '만드는 중…' : '새 문서로 만들고 연결'}
            </button>
            <p className="text-[10.5px] text-muted-foreground/80">
              새 문서를 만든 뒤 현재 글에 바로 연결합니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatHitMeta(
  hit: WikiSearchHit['hit'],
  fallback: string,
  matchedAlias?: string,
  matchedTag?: string,
  matchedLink?: string,
): string {
  if (hit === 'alias' && matchedAlias) return `별칭 · ${matchedAlias}`;
  if (hit === 'tag' && matchedTag) return `#${matchedTag}`;
  if (hit === 'link' && matchedLink) return `링크 · ${matchedLink}`;
  if (hit === 'body') return '본문';
  if (hit === 'title') return '제목';
  return fallback;
}
