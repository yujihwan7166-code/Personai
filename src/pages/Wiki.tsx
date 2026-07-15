/**
 * 마이위키 라이트 (/wiki) — 2026-07-15 전면 개편.
 *
 * 개념 다이어트: 타입·상태·메인문서·정리보드·템플릿·팔레트 전부 제거.
 * 남긴 것 = 제목 · 본문 · [[링크]] · 백링크 · 태그 · ⭐.
 *
 * UX 3원칙:
 *  1) 검색창 = 생성창 — 치면 검색, 없으면 Enter 로 그 제목의 문서가 바로 생긴다.
 *  2) 편집/보기 모드 없음 — 문서를 열면 항상 편집 가능 (자동 저장).
 *  3) [[ 가 전부 — 본문에서 [[ 치면 기존 문서 자동완성, 없는 링크는 붉게 → 클릭 시 생성.
 *
 * 데이터 계층(wikiStore·useWikiPages)은 기존 그대로 재사용 — 일기·플래너·AI 비서 연동과
 * 기존 문서 데이터가 안 깨진다. upsertPage 가 refersTo 갱신·개명 링크 복구·히스토리까지 처리.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Globe, Star, Search, Plus, Trash2, X, Link2, CornerDownLeft } from 'lucide-react';
import '@/styles/wiki.css';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { createEmptyWikiPage, extractWikiLinks, type WikiPage } from '@/types/wiki';
import { useWikiPages } from '@/hooks/useWikiPages';
import { useWikiFavorites } from '@/hooks/useWikiFavorites';
import { tokenMatchAll } from '@/lib/textSearch';

function fmtRelative(ts: number): string {
  const d = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
  if (d <= 0) return '오늘';
  if (d === 1) return '어제';
  if (d < 7) return `${d}일 전`;
  if (d < 30) return `${Math.floor(d / 7)}주 전`;
  return new Date(ts).toLocaleDateString('ko-KR', { year: '2-digit', month: 'numeric', day: 'numeric' });
}

const Wiki = () => {
  const { pages, loading, upsertPage, deletePage, getBacklinks, findByTitle } = useWikiPages();
  const { favorites, toggleFavorite, isFavorite, recordView, purge } = useWikiFavorites();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const activePage = activeId ? pages.find((p) => p.id === activeId) ?? null : null;

  // 활성 페이지 열람 기록
  useEffect(() => {
    if (activeId) recordView(activeId);
  }, [activeId, recordView]);

  // 목록 — 보관 문서 제외, 검색 필터, ⭐ 우선 + 최신순
  const list = useMemo(() => {
    const favSet = new Set(favorites);
    const alive = pages.filter((p) => p.status !== 'archived');
    const q = query.trim();
    const filtered = q ? alive.filter((p) => tokenMatchAll(`${p.title} ${p.tags.join(' ')}`, q)) : alive;
    return [...filtered].sort((a, b) => {
      const fa = favSet.has(a.id) ? 1 : 0;
      const fb = favSet.has(b.id) ? 1 : 0;
      if (fa !== fb) return fb - fa;
      return b.updatedAt - a.updatedAt;
    });
  }, [pages, favorites, query]);

  /** 제목이 정확히 일치하는 문서가 목록에 있나 (Enter 생성 힌트용). */
  const exactMatch = useMemo(() => {
    const q = query.trim();
    return q ? findByTitle(q) : undefined;
  }, [query, findByTitle]);

  /** 제목으로 열기 — 없으면 그 제목으로 즉시 생성 (검색창=생성창, 링크 클릭 공용). */
  const openOrCreate = useCallback(async (rawTitle: string) => {
    const title = rawTitle.trim();
    if (!title) return;
    const found = findByTitle(title);
    if (found) {
      setActiveId(found.id);
    } else {
      const next = createEmptyWikiPage({ title, status: 'draft' });
      await upsertPage(next);
      setActiveId(next.id);
      notify.success(`'${title}' 문서를 만들었어요`, { duration: 1600 });
    }
    setQuery('');
  }, [findByTitle, upsertPage]);

  const handleDelete = useCallback(async (page: WikiPage) => {
    const backlinks = getBacklinks(page.id);
    const warn = backlinks.length > 0 ? `\n\n이 문서를 가리키는 문서가 ${backlinks.length}개 있어요.` : '';
    if (!confirm(`'${page.title}' 문서를 삭제할까요?${warn}`)) return;
    await deletePage(page.id);
    purge(page.id);
    setActiveId(null);
    notify.success('삭제했어요');
  }, [getBacklinks, deletePage, purge]);

  const commitPatch = useCallback((id: string, patch: Partial<WikiPage>) => {
    const cur = pages.find((p) => p.id === id);
    if (!cur) return;
    void upsertPage({ ...cur, ...patch });
  }, [pages, upsertPage]);

  const allTitles = useMemo(
    () => pages.filter((p) => p.status !== 'archived').map((p) => p.title),
    [pages],
  );

  const searchInput = (extra?: string) => (
    <div className={cn('relative', extra)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim()) {
            e.preventDefault();
            void openOrCreate(query);
          }
        }}
        placeholder="검색하거나, 새 제목 입력 후 Enter"
        className="w-full rounded-xl border border-[hsl(var(--input))] bg-card py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[hsl(var(--wiki-blue))]"
      />
      {query.trim() && !exactMatch && (
        <span className="pointer-events-none absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[11px] font-semibold text-[hsl(var(--wiki-blue))]">
          <CornerDownLeft className="h-3 w-3" /> 새 문서
        </span>
      )}
    </div>
  );

  return (
    <div className="wikilite-theme flex min-h-dvh bg-background text-foreground">
      {/* ───────── 좌 사이드바 (lg+) ───────── */}
      <aside className="hidden w-[264px] shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[hsl(var(--surface-1))] px-4 pb-5 pt-4 lg:flex">
        {/* 락업 */}
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-[hsl(var(--wiki-blue)/0.25)] bg-[hsl(var(--wiki-blue)/0.10)] text-[hsl(var(--wiki-blue))]">
            <Globe className="h-6 w-6" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold leading-tight tracking-[0.01em] text-foreground">마이위키</h1>
            <p className="truncate text-[12.5px] leading-tight text-muted-foreground">
              {pages.length > 0 ? `${pages.length}개 문서가 서로 엮여요` : '연결되는 지식 베이스'}
            </p>
          </div>
        </div>

        {/* 검색 = 생성 */}
        {searchInput('mb-3')}

        {/* 문서 목록 */}
        <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {loading ? null : list.length === 0 ? (
            <p className="px-2 py-6 text-center text-[12px] leading-relaxed text-muted-foreground">
              {query.trim()
                ? <>일치하는 문서가 없어요.<br />Enter 로 새로 만들 수 있어요.</>
                : <>아직 문서가 없어요.<br />위에 제목을 입력하고 Enter.</>}
            </p>
          ) : (
            list.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { setActiveId(p.id); setQuery(''); }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors',
                  activeId === p.id
                    ? 'bg-[hsl(var(--wiki-blue)/0.12)] text-[hsl(var(--wiki-blue))]'
                    : 'text-foreground hover:bg-accent',
                )}
              >
                {isFavorite(p.id) && (
                  <Star className="h-3 w-3 shrink-0 text-amber-400" fill="currentColor" />
                )}
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{p.title}</span>
                <span className={cn('shrink-0 text-[11px]', activeId === p.id ? 'text-[hsl(var(--wiki-blue))]' : 'text-muted-foreground/70')}>
                  {fmtRelative(p.updatedAt)}
                </span>
              </button>
            ))
          )}
        </nav>
      </aside>

      {/* ───────── 본문 ───────── */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        {/* 모바일 — 검색·생성 + 최근 칩 */}
        <div className="border-b border-[hsl(var(--hairline))] p-3 lg:hidden">
          {searchInput()}
          {list.length > 0 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
              {list.slice(0, 12).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                    activeId === p.id ? 'bg-[hsl(var(--wiki-blue))] text-white' : 'bg-[hsl(var(--surface-3))] text-muted-foreground')}
                >
                  {p.title}
                </button>
              ))}
            </div>
          )}
        </div>

        {activePage ? (
          <DocView
            key={activePage.id}
            page={activePage}
            backlinks={getBacklinks(activePage.id)}
            allTitles={allTitles}
            findByTitle={findByTitle}
            isFav={isFavorite(activePage.id)}
            onToggleFav={() => toggleFavorite(activePage.id)}
            onCommit={(patch) => commitPatch(activePage.id, patch)}
            onDelete={() => { void handleDelete(activePage); }}
            onOpenTitle={(t) => { void openOrCreate(t); }}
          />
        ) : (
          <HomeEmpty
            hasPages={pages.length > 0}
            recent={list.slice(0, 8)}
            onOpen={(id) => setActiveId(id)}
          />
        )}
      </main>
    </div>
  );
};

/* ───────────────────────── 문서 화면 — 항상 편집 가능 ───────────────────────── */

function DocView({
  page, backlinks, allTitles, findByTitle, isFav, onToggleFav, onCommit, onDelete, onOpenTitle,
}: {
  page: WikiPage;
  backlinks: WikiPage[];
  allTitles: string[];
  findByTitle: (t: string) => WikiPage | undefined;
  isFav: boolean;
  onToggleFav: () => void;
  onCommit: (patch: Partial<WikiPage>) => void;
  onDelete: () => void;
  onOpenTitle: (title: string) => void;
}) {
  const [title, setTitle] = useState(page.title);
  const [body, setBody] = useState(page.body);
  const [tagInput, setTagInput] = useState('');
  // 자동완성 — [[ 뒤 입력 중인 질의 (null 이면 닫힘)
  const [acQuery, setAcQuery] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const bodyRef = useRef(body);
  bodyRef.current = body;
  const savedBodyRef = useRef(page.body);
  savedBodyRef.current = page.body;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

  // 본문 자동 저장 — 700ms 디바운스
  useEffect(() => {
    const t = setTimeout(() => {
      if (bodyRef.current !== savedBodyRef.current) commitRef.current({ body: bodyRef.current });
    }, 700);
    return () => clearTimeout(t);
  }, [body]);

  // 문서 이탈(언마운트) 시 미저장분 플러시 — key={page.id} 라 페이지 전환 = 언마운트
  useEffect(() => () => {
    if (bodyRef.current !== savedBodyRef.current) commitRef.current({ body: bodyRef.current });
  }, []);

  const commitTitle = () => {
    const t = title.trim();
    if (!t) { setTitle(page.title); return; }
    if (t !== page.title) onCommit({ title: t });
  };

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/^#/, '');
    if (!t || page.tags.includes(t)) { setTagInput(''); return; }
    onCommit({ tags: [...page.tags, t] });
    setTagInput('');
  };

  // ── [[ 자동완성 ──
  const refreshAutocomplete = (value: string, cursor: number) => {
    const before = value.slice(0, cursor);
    const m = before.match(/\[\[([^\][\n]*)$/);
    setAcQuery(m ? m[1] : null);
  };

  const acMatches = useMemo(() => {
    if (acQuery === null) return [];
    const q = acQuery.trim().toLowerCase();
    return allTitles
      .filter((t) => t.toLowerCase() !== page.title.toLowerCase())
      .filter((t) => (q ? t.toLowerCase().includes(q) : true))
      .slice(0, 6);
  }, [acQuery, allTitles, page.title]);

  const insertLink = (linkTitle: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cursor = ta.selectionStart;
    const before = body.slice(0, cursor);
    const m = before.match(/\[\[([^\][\n]*)$/);
    if (!m) return;
    const start = cursor - m[1].length;
    const after = body.slice(cursor);
    const closed = after.startsWith(']]') ? after.slice(2) : after;
    const next = `${body.slice(0, start)}${linkTitle}]]${closed}`;
    setBody(next);
    setAcQuery(null);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + linkTitle.length + 2;
      ta.setSelectionRange(pos, pos);
    });
  };

  // 본문 속 링크 → 칩 (존재 = 파랑 / 미존재 = 붉은 대시)
  const linkTitles = useMemo(() => {
    const seen = new Set<string>();
    return extractWikiLinks(body).filter((t) => {
      const k = t.toLowerCase();
      if (seen.has(k) || k === page.title.toLowerCase()) return false;
      seen.add(k);
      return true;
    });
  }, [body, page.title]);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-16 pt-6 sm:px-8">
      {/* 메타 줄 */}
      <div className="mb-1 flex items-center gap-2 text-[12px] text-muted-foreground">
        <span>{fmtRelative(page.updatedAt)} 수정</span>
        <button
          type="button"
          onClick={onToggleFav}
          aria-label={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
          className="-m-1 ml-auto p-1"
        >
          <Star className={cn('h-[17px] w-[17px]', isFav ? 'text-amber-400' : 'text-muted-foreground/50 hover:text-muted-foreground')} fill={isFav ? 'currentColor' : 'none'} />
        </button>
        <button type="button" onClick={onDelete} aria-label="문서 삭제" className="-m-1 p-1 text-muted-foreground/50 transition-colors hover:text-rose-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 제목 — 항상 편집 */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitTitle(); textareaRef.current?.focus(); } }}
        placeholder="제목"
        className="w-full bg-transparent text-[28px] font-extrabold tracking-[-0.02em] text-foreground outline-none placeholder:text-muted-foreground/40"
      />

      {/* 태그 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {page.tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-md bg-[hsl(var(--foreground)/0.05)] px-2 py-0.5 text-[12px] text-muted-foreground">
            #{t}
            <button type="button" onClick={() => onCommit({ tags: page.tags.filter((x) => x !== t) })} aria-label={`${t} 제거`} className="hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
          onBlur={() => tagInput && addTag(tagInput)}
          placeholder="+ 태그"
          className="w-20 bg-transparent py-0.5 text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      {/* 본문 — 항상 편집 + [[ 자동완성 */}
      <div className="relative mt-4">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            refreshAutocomplete(e.target.value, e.target.selectionStart);
          }}
          onKeyDown={(e) => { if (e.key === 'Escape') setAcQuery(null); }}
          onClick={(e) => refreshAutocomplete(body, (e.target as HTMLTextAreaElement).selectionStart)}
          onBlur={() => setTimeout(() => setAcQuery(null), 150)}
          placeholder={'자유롭게 적어요.\n[[ 를 입력하면 다른 문서로 연결돼요.'}
          rows={Math.max(14, body.split('\n').length + 2)}
          className="w-full resize-none bg-transparent text-[15px] leading-[1.85] text-foreground outline-none placeholder:text-muted-foreground/45"
        />

        {/* 자동완성 드롭다운 */}
        {acQuery !== null && acMatches.length > 0 && (
          <div className="absolute left-0 top-full z-20 -mt-2 w-72 overflow-hidden rounded-xl border border-[hsl(var(--hairline))] bg-popover shadow-lg">
            {acMatches.map((t) => (
              <button
                key={t}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertLink(t); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-foreground transition-colors hover:bg-[hsl(var(--wiki-blue)/0.08)]"
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--wiki-blue))]" />
                <span className="truncate">{t}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 연결된 문서 */}
      {linkTitles.length > 0 && (
        <section className="mt-6 border-t border-[hsl(var(--hairline))] pt-4">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">연결된 문서</h2>
          <div className="flex flex-wrap gap-1.5">
            {linkTitles.map((t) => {
              const exists = !!findByTitle(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => onOpenTitle(t)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors',
                    exists
                      ? 'bg-[hsl(var(--wiki-blue)/0.10)] text-[hsl(var(--wiki-blue))] hover:bg-[hsl(var(--wiki-blue)/0.18)]'
                      : 'border border-dashed border-[hsl(var(--wiki-missing)/0.5)] text-[hsl(var(--wiki-missing))] hover:bg-[hsl(var(--wiki-missing)/0.08)]',
                  )}
                  title={exists ? '문서 열기' : '아직 없는 문서 — 클릭해서 만들기'}
                >
                  {!exists && <Plus className="h-3 w-3" />}
                  {t}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 이 문서를 언급한 곳 (백링크) */}
      {backlinks.length > 0 && (
        <section className="mt-6 border-t border-[hsl(var(--hairline))] pt-4">
          <h2 className="mb-2 text-[12px] font-bold uppercase tracking-wider text-muted-foreground/70">이 문서를 언급한 곳</h2>
          <div className="space-y-0.5">
            {backlinks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => onOpenTitle(b.title)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent"
              >
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{b.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground/70">{fmtRelative(b.updatedAt)}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ───────────────────────── 빈 화면 ───────────────────────── */

function HomeEmpty({ hasPages, recent, onOpen }: {
  hasPages: boolean;
  recent: WikiPage[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pt-14 sm:px-8">
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--wiki-blue)/0.10)] text-[hsl(var(--wiki-blue))]">
          <Globe className="h-8 w-8" strokeWidth={1.6} />
        </span>
        <h2 className="text-[20px] font-extrabold text-foreground">
          {hasPages ? '문서를 골라 이어서 써요' : '첫 문서를 만들어요'}
        </h2>
        <p className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-muted-foreground">
          {hasPages
            ? '왼쪽 목록에서 열거나, 검색창에 새 제목을 입력하고 Enter.'
            : <>검색창에 제목을 입력하고 Enter 하면 바로 시작돼요.<br />본문에서 <b className="font-semibold text-foreground">[[</b> 를 치면 문서끼리 연결됩니다.</>}
        </p>
      </div>

      {recent.length > 0 && (
        <div className="mt-10 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {recent.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              className="rounded-xl border border-[hsl(var(--hairline))] bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--wiki-blue)/0.45)] hover:shadow-[0_5px_16px_-8px_hsl(var(--foreground)/0.18)]"
            >
              <span className="block truncate text-[13px] font-bold text-foreground">{p.title}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">{fmtRelative(p.updatedAt)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Wiki;
