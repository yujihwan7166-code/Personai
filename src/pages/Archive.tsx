/**
 * 아카이브 — 내 보관소 방 (/archive).
 * 좌: 컬렉션(=양식) 사이드바 · 우: 마스트헤드 + 형태칩 + 통합검색 + masonry/타임라인.
 * 저장 UX: 양식 골라 필드 채우기 (AI 채우기 선택). 검색: 키워드 + AI 시맨틱.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Archive as ArchiveIcon, Library, Plus, Home, Star, Search, Sparkles, Loader2, X, Settings, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { KIND_LABEL, type ArchiveCollection, type ArchiveItem, type ArchiveKind } from '@/types/archive';
import { archiveStore } from '@/services/archiveStore';
import { useArchive } from '@/hooks/useArchive';
import { tokenMatchAll } from '@/lib/textSearch';
import { aiSemanticSearch } from '@/lib/archive/ai';
import { ArchiveCard } from '@/components/archive/ArchiveCard';
import { ArchiveDetailPanel } from '@/components/archive/ArchiveDetailPanel';
import { ArchiveNewItemDialog } from '@/components/archive/ArchiveNewItemDialog';
import { ArchiveCollectionEditor } from '@/components/archive/ArchiveCollectionEditor';
import { ArchiveCollectionManager } from '@/components/archive/ArchiveCollectionManager';
import { ArchiveAllTagsDialog } from '@/components/archive/ArchiveAllTagsDialog';

type ViewKey = 'all' | 'starred' | string; // string = collectionId
const KINDS: ArchiveKind[] = ['note', 'image', 'file', 'link'];

function searchable(it: ArchiveItem): string {
  return [it.title, it.note, it.domain, it.fileName, it.tags.join(' '), it.fields?.map((f) => f.value).join(' ')]
    .filter(Boolean).join(' ');
}

export default function Archive() {
  const { items, collections } = useArchive();

  const [view, setView] = useState<ViewKey>('all');
  const [kind, setKind] = useState<ArchiveKind | null>(null);
  const [mode, setMode] = useState<'list' | 'timeline'>('list');
  const [query, setQuery] = useState('');
  const [aiResults, setAiResults] = useState<ArchiveItem[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // 컬렉션 편집기 — null이면 닫힘, { collection: null } 이면 새로 만들기, { collection } 이면 편집.
  const [editor, setEditor] = useState<{ collection: ArchiveCollection | null } | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [allTagsOpen, setAllTagsOpen] = useState(false);

  const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;
  // 삭제된 항목이 선택돼 있으면 닫기
  useEffect(() => {
    if (selectedId && !items.some((i) => i.id === selectedId)) setSelectedId(null);
  }, [items, selectedId]);

  // 컬렉션별 개수
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) m.set(it.collectionId, (m.get(it.collectionId) ?? 0) + 1);
    return m;
  }, [items]);

  const starredCount = useMemo(() => items.filter((i) => i.starred).length, [items]);
  const monthCount = useMemo(() => {
    const ym = new Date().toISOString().slice(0, 7);
    return items.filter((i) => i.createdAt.startsWith(ym)).length;
  }, [items]);

  // 태그 빈도 (전체 항목 기준) — 상위 노출 + 전체 목록 + 저장 자동완성 소스
  const tagEntries = useMemo(() => {
    const m = new Map<string, number>();
    for (const it of items) for (const t of it.tags) m.set(t, (m.get(t) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [items]);
  const topTags = tagEntries.slice(0, 10);
  const allTagNames = useMemo(() => tagEntries.map(([t]) => t), [tagEntries]);

  // 컬렉션/별표 + 형태 필터
  const scoped = useMemo(() => {
    let list = items;
    if (view === 'starred') list = list.filter((i) => i.starred);
    else if (view !== 'all') list = list.filter((i) => i.collectionId === view);
    if (kind) list = list.filter((i) => i.kind === kind);
    if (activeTag) list = list.filter((i) => i.tags.includes(activeTag));
    return list;
  }, [items, view, kind, activeTag]);

  // 검색 적용 (AI 결과 우선, 없으면 키워드)
  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return scoped;
    if (aiResults) {
      const ids = new Set(aiResults.map((i) => i.id));
      return scoped.filter((i) => ids.has(i.id));
    }
    return scoped.filter((i) => tokenMatchAll(searchable(i), q));
  }, [scoped, query, aiResults]);

  const runAiSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setAiLoading(true);
    try {
      const res = await aiSemanticSearch(q, scoped);
      setAiResults(res);
      if (res.length === 0) notify.info('AI가 관련 항목을 못 찾았어요', { description: '키워드로 다시 찾아볼게요' });
    } catch {
      setAiResults(null);
      notify.error('AI 검색을 못 했어요', { description: '키워드 검색으로 대신 보여줄게요' });
    } finally {
      setAiLoading(false);
    }
  };

  const onQueryChange = (v: string) => {
    setQuery(v);
    if (aiResults) setAiResults(null); // 질의 바뀌면 AI 결과 무효화 → 키워드로
  };

  const addCollection = () => setEditor({ collection: null });

  const openNew = () => {
    setDialogOpen(true);
  };

  const viewTitle =
    view === 'all' ? '전체 보기'
    : view === 'starred' ? '별표 모음'
    : collections.find((c) => c.id === view)?.name ?? '전체 보기';

  const defaultCollectionId = view !== 'all' && view !== 'starred' ? view : undefined;

  return (
    <div className="archive-theme flex min-h-dvh bg-[#f8f4ec] text-foreground dark:bg-background">
      {/* ───────── 좌 사이드바 (lg+) ───────── */}
      <aside className="hidden w-[256px] shrink-0 flex-col border-r border-[hsl(var(--hairline))] bg-[#f5efe0] dark:bg-[hsl(var(--surface-1))] px-4 pb-5 pt-4 lg:flex">
        {/* 헤더 — 34px 흰 마크 + 제목 + 부제 (확정 크롬) */}
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] bg-white text-[hsl(var(--archive-sepia))] shadow-[0_1px_2px_rgba(60,45,20,0.09)]">
            <Library className="h-[18px] w-[18px]" strokeWidth={1.9} />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] font-bold leading-tight tracking-[-0.01em] text-[#191c20] dark:text-foreground">아카이브</div>
            <div className="truncate text-[12px] leading-tight text-[#9a8f7a]">무엇이든 담아두는 보관소</div>
          </div>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="mb-4 flex items-center justify-center gap-1.5 rounded-xl bg-[hsl(var(--archive-sepia))] py-2 text-[14px] font-bold text-white shadow-sm transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> 새 항목 저장
        </button>

        <NavRow icon={<Home className="h-4 w-4" />} label="전체 보기" count={items.length} active={view === 'all'} onClick={() => setView('all')} />
        <NavRow icon={<Star className="h-4 w-4" />} label="별표 모음" count={starredCount} active={view === 'starred'} onClick={() => setView('starred')} />

        <div className="mt-5 mb-1 flex items-center justify-between pl-2.5 pr-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">컬렉션</span>
          <button
            type="button"
            onClick={() => setManagerOpen(true)}
            className="rounded-md p-1 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
            title="컬렉션 관리 — 순서·편집·삭제"
            aria-label="컬렉션 관리"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {collections.map((c) => (
            <NavRow
              key={c.id}
              emoji={c.emoji}
              label={c.name}
              count={counts.get(c.id) ?? 0}
              active={view === c.id}
              onClick={() => setView(c.id)}
            />
          ))}
          <button
            type="button"
            onClick={addCollection}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> 새 컬렉션
          </button>

          {/* 태그 — 상위 10개 + 모든 태그(검색). 위 형태칩과 안 겹치게 사이드바에. */}
          {topTags.length > 0 && (
            <div className="mt-4">
              <div className="mb-1.5 flex items-center gap-1.5 px-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                <Tag className="h-3 w-3" /> 태그
              </div>
              <div className="flex flex-wrap gap-1 px-1">
                {topTags.map(([t, n]) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setActiveTag((cur) => (cur === t ? null : t))}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-colors',
                      activeTag === t
                        ? 'bg-[hsl(var(--archive-sepia))] text-white'
                        : 'bg-[hsl(var(--surface-2))] text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    #{t}<span className="text-[10px] opacity-70">{n}</span>
                  </button>
                ))}
              </div>
              {allTagNames.length > topTags.length && (
                <button
                  type="button"
                  onClick={() => setAllTagsOpen(true)}
                  className="mt-1.5 px-2.5 text-[11.5px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  모든 태그 {allTagNames.length}개 →
                </button>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* ───────── 메인 ───────── */}
      <main className="min-w-0 flex-1 px-5 py-6 sm:px-7">
        {/* 마스트헤드 */}
        <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h1 className="text-[24px] font-extrabold tracking-[-0.02em] text-foreground">{viewTitle}</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {items.length === 0
                ? '아직 비어 있어요 — 무엇이든 저장해 보세요'
                : <>저장한 항목 {items.length}개{monthCount > 0 && <> · 이번 달 +{monthCount}</>}</>}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* 뷰 토글 */}
            <div className="flex overflow-hidden rounded-lg border border-[hsl(var(--hairline))]">
              {(['list', 'timeline'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn('px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    mode === m ? 'bg-[hsl(var(--archive-sepia))] text-white' : 'text-muted-foreground hover:bg-accent')}
                >
                  {m === 'list' ? '목록' : '타임라인'}
                </button>
              ))}
            </div>

            {/* 통합 검색 */}
            <div className="relative w-[300px] max-w-[46vw]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runAiSearch(); }}
                placeholder="검색하거나, AI에게 물어보세요"
                className="w-full rounded-xl border border-[hsl(var(--input))] bg-card py-2 pl-9 pr-16 text-[13px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-[hsl(var(--archive-sepia))]"
              />
              <button
                type="button"
                onClick={runAiSearch}
                disabled={aiLoading || !query.trim()}
                title="AI 시맨틱 검색"
                className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-lg bg-[hsl(var(--archive-sepia)/0.12)] px-2 py-1 text-[11px] font-bold text-[hsl(var(--archive-sepia))] transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                AI
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 컬렉션 칩 (lg 미만) */}
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
          <MobileChip label="전체" active={view === 'all'} onClick={() => setView('all')} />
          <MobileChip label="⭐ 별표" active={view === 'starred'} onClick={() => setView('starred')} />
          {collections.map((c) => (
            <MobileChip key={c.id} label={`${c.emoji ?? ''} ${c.name}`.trim()} active={view === c.id} onClick={() => setView(c.id)} />
          ))}
        </div>

        {/* 형태 칩 (+ 활성 태그 필터 — 구분선으로 축 분리) */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <KindChip label="전체" active={kind === null} onClick={() => setKind(null)} />
          {KINDS.map((k) => (
            <KindChip key={k} label={KIND_LABEL[k]} active={kind === k} onClick={() => setKind(kind === k ? null : k)} />
          ))}
          {activeTag && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px bg-[hsl(var(--hairline))]" />
              <button
                type="button"
                onClick={() => setActiveTag(null)}
                className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--archive-sepia))] px-3 py-1.5 text-[13px] font-semibold text-white"
                title="태그 필터 해제"
              >
                #{activeTag} <X className="h-3 w-3" />
              </button>
            </>
          )}
        </div>

        {/* AI 결과 배너 */}
        {aiResults && query.trim() && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-[hsl(var(--archive-sepia)/0.08)] px-3 py-2 text-[12.5px] text-[hsl(var(--archive-sepia))]">
            <Sparkles className="h-3.5 w-3.5" />
            AI 검색 결과 {aiResults.length}개
            <button type="button" onClick={() => setAiResults(null)} className="ml-auto flex items-center gap-1 font-semibold hover:underline">
              <X className="h-3 w-3" /> 지우기
            </button>
          </div>
        )}

        {/* 본문 */}
        {visible.length === 0 ? (
          <EmptyState hasItems={items.length > 0} onNew={openNew} />
        ) : mode === 'timeline' ? (
          <Timeline items={visible} onOpen={(i) => setSelectedId(i.id)} onStar={(id) => archiveStore.toggleStar(id)} onTagClick={setActiveTag} />
        ) : (
          <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
            {visible.map((it) => (
              <ArchiveCard key={it.id} item={it} onOpen={(i) => setSelectedId(i.id)} onToggleStar={(id) => archiveStore.toggleStar(id)} onTagClick={setActiveTag} />
            ))}
          </div>
        )}
      </main>

      {/* 저장 다이얼로그 */}
      <ArchiveNewItemDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        collections={collections}
        defaultCollectionId={defaultCollectionId}
        allTags={allTagNames}
      />

      {/* 상세 패널 */}
      {selectedItem && (
        <ArchiveDetailPanel item={selectedItem} collections={collections} onClose={() => setSelectedId(null)} />
      )}

      {/* 컬렉션 만들기·편집기 (사이드바 '새 컬렉션') */}
      {editor && (
        <ArchiveCollectionEditor
          open
          collection={editor.collection}
          itemCount={editor.collection ? (counts.get(editor.collection.id) ?? 0) : 0}
          onClose={() => setEditor(null)}
        />
      )}

      {/* 컬렉션 관리 — 순서변경·편집·삭제 한 곳에서 */}
      <ArchiveCollectionManager
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
        collections={collections}
        counts={counts}
      />

      {/* 모든 태그 — 검색되는 전체 목록 */}
      <ArchiveAllTagsDialog
        open={allTagsOpen}
        onClose={() => setAllTagsOpen(false)}
        tagEntries={tagEntries}
        activeTag={activeTag}
        onPick={(t) => { setActiveTag(t); setAllTagsOpen(false); }}
      />
    </div>
  );
}

/* ── 사이드바 행 ── */
function NavRow({ icon, emoji, label, count, active, onClick, onSettings }: {
  icon?: React.ReactNode; emoji?: string; label: string; count: number; active: boolean; onClick: () => void; onSettings?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={onClick}
        className={cn('flex h-[38px] w-full items-center gap-2.5 rounded-[9px] px-3 text-[14px] font-medium transition-colors',
          onSettings && 'pr-8',
          active ? 'bg-white font-semibold text-[hsl(var(--archive-sepia))] shadow-[0_1px_2px_rgba(60,45,20,0.09)] dark:bg-white/10' : 'text-foreground/70 hover:bg-white/45 dark:hover:bg-white/5')}
      >
        {emoji ? <span className="w-5 text-center text-[14px]">{emoji}</span> : <span className="w-5 text-center">{icon}</span>}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <span className={cn('text-[12px] font-semibold transition-opacity', onSettings && 'group-hover:opacity-0',
          active ? 'text-[hsl(var(--archive-sepia))]' : 'text-muted-foreground/70')}>{count}</span>
      </button>
      {onSettings && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSettings(); }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
          title="컬렉션 설정"
          aria-label={`${label} 설정`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function KindChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
        active ? 'border-foreground bg-foreground text-background' : 'border-[hsl(var(--hairline))] bg-card text-muted-foreground hover:bg-accent')}
    >
      {label}
    </button>
  );
}

function MobileChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
        active ? 'bg-[hsl(var(--archive-sepia))] text-white' : 'bg-[hsl(var(--surface-2))] text-muted-foreground')}
    >
      {label}
    </button>
  );
}

/* ── 타임라인 ── */
function Timeline({ items, onOpen, onStar, onTagClick }: { items: ArchiveItem[]; onOpen: (i: ArchiveItem) => void; onStar: (id: string) => void; onTagClick: (tag: string) => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, ArchiveItem[]>();
    for (const it of items) {
      const key = it.createdAt.slice(0, 7);
      (m.get(key) ?? m.set(key, []).get(key)!).push(it);
    }
    return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [items]);

  return (
    <div className="space-y-8">
      {groups.map(([ym, list]) => {
        const [y, mo] = ym.split('-');
        return (
          <section key={ym}>
            <h2 className="mb-3 text-[15px] font-bold text-foreground">{y}년 {Number(mo)}월 <span className="ml-1 text-[12px] font-medium text-muted-foreground">{list.length}개</span></h2>
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 xl:columns-4">
              {list.map((it) => (
                <ArchiveCard key={it.id} item={it} onOpen={onOpen} onToggleStar={onStar} onTagClick={onTagClick} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ── 빈 상태 ── */
function EmptyState({ hasItems, onNew }: { hasItems: boolean; onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[hsl(var(--hairline))] py-20 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--archive-sepia)/0.1)] text-[hsl(var(--archive-sepia))]">
        <ArchiveIcon className="h-7 w-7" />
      </span>
      <p className="text-[15px] font-bold text-foreground">{hasItems ? '조건에 맞는 항목이 없어요' : '아직 저장한 게 없어요'}</p>
      <p className="mt-1 text-[13px] text-muted-foreground">{hasItems ? '필터를 바꾸거나 검색어를 지워보세요' : '서류·링크·사진·메모 무엇이든 던져 넣어요'}</p>
      {!hasItems && (
        <button type="button" onClick={onNew} className="mt-4 flex items-center gap-1.5 rounded-xl bg-[hsl(var(--archive-sepia))] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> 첫 항목 저장
        </button>
      )}
    </div>
  );
}
