/**
 * 일기 — /journal 라우트.
 *
 * 기능 (v1 + v1.5 UX):
 * - Today 카드 (페이지 상단 빠른 진입)
 * - 검색 (헤더 input — 본문 텍스트로 필터)
 * - 연속 작성일 streak 배지 (Things3/Twos 패턴)
 * - 키보드 단축키 'n' (모달 빠른 진입)
 * - 시간순 카드 + 월 그룹핑
 * - 모달 편집기
 *
 * 단축키:
 * - n: 새 일기 모달
 * - Ctrl+Enter: 모달 저장
 * - Esc: 모달 닫기
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Search, X, Hash, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { notify } from '@/lib/notify';
import { JournalCard } from '@/components/journal/JournalCard';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalEmpty } from '@/components/journal/JournalEmpty';
import { OnThisDayCard } from '@/components/journal/OnThisDayCard';
import { JournalRandomCard } from '@/components/journal/JournalRandomCard';
import { JournalCalendarMini } from '@/components/journal/JournalCalendarMini';
import { JournalSummaryPanel } from '@/components/journal/JournalSummaryPanel';
import { JournalWeekBoard } from '@/components/journal/JournalWeekBoard';
import { JournalYearPixels } from '@/components/journal/JournalYearPixels';
import { JournalDailyCarousel } from '@/components/journal/JournalDailyCarousel';
import { normalizeWeekAnchor } from '@/lib/journalWeek';
import { getTopTags } from '@/lib/journalTags';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { ACTIVITY_META } from '@/types/journal';

import type { JournalImage } from '@/types/journal';

type EditorMode =
  | { kind: 'create'; date?: string }
  | {
      kind: 'edit';
      id: string;
      initialBody: string;
      initialMood?: Mood;
      initialTags?: string[];
      initialFormat?: 'plain' | 'markdown';
      initialImages?: JournalImage[];
      initialActivities?: string[];
    };

const monthLabel = (date: Date): string =>
  date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' });

const monthKey = (iso: string): string => iso.slice(0, 7);

const Journal = () => {
  const navigate = useNavigate();
  const allEntries = useJournal();
  const streak = useJournalStreak(allEntries);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // 뷰 모드 — 주간 보드 / 시간순 목록. localStorage 영속.
  const [viewMode, setViewModeState] = useState<'week' | 'list'>(() => {
    if (typeof window === 'undefined') return 'week';
    const saved = window.localStorage.getItem('journal.viewMode.v1');
    return saved === 'list' ? 'list' : 'week';
  });
  const setViewMode = (mode: 'week' | 'list') => {
    setViewModeState(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('journal.viewMode.v1', mode);
    }
  };

  // 주간 보드 anchor — 현재 보고 있는 주의 ISO. 기본 = 이번 주.
  const [weekAnchor, setWeekAnchor] = useState<string>(() =>
    normalizeWeekAnchor(new Date().toISOString()),
  );

  const hasActiveFilter = !!(activeTag || activeActivity || activeDate);

  // 검색·필터·날짜 활성 시 → list 자동 전환 (week board 와 안 어울림).
  const effectiveViewMode: 'week' | 'list' =
    query.trim().length > 0 || hasActiveFilter ? 'list' : viewMode;

  // 자주 쓴 태그 5개.
  const topTags = useMemo(() => getTopTags(allEntries, 5), [allEntries]);

  // 자주 쓴 활동 5개 (사용된 것만).
  const topActivities = useMemo(() => {
    const counts = new Map<string, number>();
    allEntries.forEach((e) => {
      (e.activities ?? []).forEach((a) => {
        counts.set(a, (counts.get(a) ?? 0) + 1);
      });
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, count]) => ({ key, count }));
  }, [allEntries]);

  // 검색 + 태그 + 활동 + 날짜 필터 동시 적용.
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEntries.filter((e) => {
      if (q.length > 0 && !e.body.toLowerCase().includes(q)) return false;
      if (activeTag && !(e.tags ?? []).includes(activeTag)) return false;
      if (activeActivity && !(e.activities ?? []).includes(activeActivity)) return false;
      if (activeDate && e.date !== activeDate) return false;
      return true;
    });
  }, [allEntries, query, activeTag, activeActivity, activeDate]);

  // 월 그룹핑 (필터 후).
  const grouped = useMemo(() => {
    const map = new Map<string, JournalEntry[]>();
    filteredEntries.forEach((e) => {
      const key = monthKey(e.createdAt);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: monthLabel(new Date(`${key}-01T00:00:00`)),
      items,
    }));
  }, [filteredEntries]);

  // Streak 마일스톤 축하 — 7 / 30 / 100 / 365 도달 시 하루 1회 토스트.
  useEffect(() => {
    const MILESTONES = [7, 30, 100, 365] as const;
    if (streak <= 0) return;
    const milestone = MILESTONES.find((m) => streak === m);
    if (!milestone) return;
    if (typeof window === 'undefined') return;
    const key = `journal.streak.celebrated.${milestone}`;
    if (window.localStorage.getItem(key)) return; // 이미 축하함
    window.localStorage.setItem(key, String(Date.now()));
    const labels: Record<number, { title: string; desc: string }> = {
      7:   { title: '✨ 7일 연속!',   desc: '한 주 동안 매일 기록했어요. 좋은 습관이 자라고 있어요.' },
      30:  { title: '🔥 30일 연속!',  desc: '한 달이 쌓였어요. 자기를 돌보는 진짜 습관이에요.' },
      100: { title: '💯 100일 연속!', desc: '백 일의 기록 — 이건 정말 대단한 성취예요.' },
      365: { title: '🏆 1년 연속!',   desc: '1년 동안 매일. 당신의 한 해가 통째로 기록됐어요.' },
    };
    const label = labels[milestone];
    notify.success(label.title, { description: label.desc, duration: 6000 });
  }, [streak]);

  // 키보드 단축키.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (isTyping) return;
      if (editorMode) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setEditorMode({ kind: 'create' });
      } else if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editorMode]);

  const handleDelete = (entry: JournalEntry) => {
    // 삭제 복원 정합성 — 모든 필드 보존 (Inbox 패턴).
    const snapshot: Pick<JournalEntry, 'date' | 'body' | 'mood' | 'tags'> = {
      date: entry.date,
      body: entry.body,
      mood: entry.mood,
      tags: entry.tags,
    };
    journalStore.remove(entry.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => journalStore.add(snapshot),
      },
    });
  };

  const isEmpty = allEntries.length === 0;
  const hasResults = filteredEntries.length > 0;

  // WeekSpotlight 콜백 — entry 편집 / 빈 날 새로 작성.
  const handleWeekClickEntry = (entry: JournalEntry) => {
    setEditorMode({
      kind: 'edit',
      id: entry.id,
      initialBody: entry.body,
      initialMood: entry.mood,
      initialTags: entry.tags,
      initialFormat: entry.bodyFormat,
      initialImages: entry.images,
      initialActivities: entry.activities,
    });
  };
  const handleWeekAddForDate = (dateIso: string) => {
    setEditorMode({ kind: 'create', date: dateIso });
  };

  return (
    <div className="journal-warm-theme min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-5xl w-full mx-auto">
        {/* 마스트헤드 — 한 줄 압축, 책 표지 톤 */}
        <header className="mb-6 sm:mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-baseline gap-3 sm:gap-4 min-w-0">
              <button
                type="button"
                onClick={() => navigate('/')}
                aria-label="메인으로"
                title="메인으로"
                className="self-center inline-flex items-center justify-center h-7 w-7 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h1 className="text-[26px] sm:text-[30px] font-bold tracking-[-0.025em] leading-none text-foreground">
                일기
              </h1>
              <span className="text-[12px] font-medium tabular-nums text-muted-foreground/65 hidden sm:inline">
                {allEntries.length}개
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
            {/* 검색 input */}
            <div
              className={cn(
                'relative inline-flex items-center gap-2 h-9 px-3 rounded-lg border transition-all',
                'border-[hsl(var(--hairline))] bg-card/60 focus-within:bg-card focus-within:border-foreground/25 focus-within:shadow-[0_1px_4px_hsl(30_30%_8%/0.04)]',
                query.length > 0 ? 'w-52' : 'w-36 focus-within:w-52',
              )}
            >
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="검색"
                aria-label="일기 검색"
                className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="검색 지우기"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            {/* 뷰 모드 토글 — 주간 보드 / 시간순 목록 */}
            <div
              role="tablist"
              aria-label="뷰 모드"
              className="inline-flex items-center p-0.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/60"
              title={
                query.trim().length > 0 || hasActiveFilter
                  ? '검색·필터 시 자동 목록 뷰'
                  : '주간 / 목록'
              }
            >
              <button
                type="button"
                role="tab"
                aria-selected={effectiveViewMode === 'week'}
                onClick={() => setViewMode('week')}
                disabled={query.trim().length > 0 || hasActiveFilter}
                title="주간 보드"
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 rounded text-[12px] transition-colors',
                  effectiveViewMode === 'week'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground',
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={effectiveViewMode === 'list'}
                onClick={() => setViewMode('list')}
                title="시간순 목록"
                className={cn(
                  'inline-flex items-center justify-center h-8 w-8 rounded text-[12px] transition-colors',
                  effectiveViewMode === 'list'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 필터 토글 — 활동·태그 패널 collapse */}
            {(topActivities.length > 0 || topTags.length > 0) && (
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                aria-expanded={filterOpen}
                aria-label="필터"
                title={hasActiveFilter ? '필터 활성' : '필터'}
                className={cn(
                  'relative inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors',
                  filterOpen || hasActiveFilter
                    ? 'border-foreground/25 bg-accent text-foreground'
                    : 'border-[hsl(var(--hairline))] bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-card',
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {hasActiveFilter && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" aria-hidden />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditorMode({ kind: 'create' })}
              title="새 일기 (N)"
              className="inline-flex items-center gap-1.5 px-3.5 h-9 text-[12.5px] font-semibold rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors shadow-[0_1px_2px_hsl(30_30%_8%/0.08)]"
            >
              <Plus className="h-3.5 w-3.5" />
              오늘 일기
            </button>
          </div>
          </div>

          {/* 필터 collapse 패널 — 활동 + 태그 (검색 중이 아닐 때만) */}
          {filterOpen && query.trim().length === 0 && (topActivities.length > 0 || topTags.length > 0) && (
            <div className="mt-4 pt-4 border-t border-[hsl(var(--hairline))] flex flex-col gap-3">
              {topActivities.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] font-medium tracking-[-0.005em] text-muted-foreground font-semibold mr-1 w-10">
                    활동
                  </span>
                  {topActivities.map((a) => {
                    const meta = ACTIVITY_META[a.key];
                    const active = activeActivity === a.key;
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => setActiveActivity(active ? null : a.key)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 h-6 rounded text-[11.5px] font-medium transition-colors',
                          active
                            ? 'bg-foreground text-background'
                            : 'bg-accent text-foreground hover:bg-accent/80',
                        )}
                      >
                        <span aria-hidden>{meta?.emoji ?? '·'}</span>
                        {meta?.label ?? a.key}
                        <span className="opacity-60 tabular-nums ml-0.5">{a.count}</span>
                      </button>
                    );
                  })}
                  {activeActivity && (
                    <button
                      type="button"
                      onClick={() => setActiveActivity(null)}
                      className="inline-flex items-center gap-0.5 px-2 h-6 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                      초기화
                    </button>
                  )}
                </div>
              )}
              {topTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11.5px] font-medium tracking-[-0.005em] text-muted-foreground font-semibold mr-1 w-10">
                    태그
                  </span>
                  {topTags.map((t) => (
                    <button
                      key={t.tag}
                      type="button"
                      onClick={() => setActiveTag(activeTag === t.tag ? null : t.tag)}
                      className={cn(
                        'inline-flex items-center gap-0.5 px-2 h-6 rounded text-[11.5px] font-medium transition-colors',
                        activeTag === t.tag
                          ? 'bg-foreground text-background'
                          : 'bg-accent text-foreground hover:bg-accent/80',
                      )}
                    >
                      <Hash className="h-2.5 w-2.5 opacity-70" />
                      {t.tag}
                      <span className="opacity-60 tabular-nums ml-0.5">{t.count}</span>
                    </button>
                  ))}
                  {activeTag && (
                    <button
                      type="button"
                      onClick={() => setActiveTag(null)}
                      className="inline-flex items-center gap-0.5 px-2 h-6 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                      초기화
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </header>

        {isEmpty ? (
          <JournalEmpty onAdd={() => setEditorMode({ kind: 'create' })} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-7">
          <div className="flex flex-col gap-5 min-w-0">
            {/* ── 큰 가로 banner — 오늘의 일기 carousel (사용자 mockup 양식) ── */}
            {query.trim().length === 0 && !hasActiveFilter && (
              <JournalDailyCarousel
                allEntries={allEntries}
                onStartEntry={() => setEditorMode({ kind: 'create' })}
                onClickEntry={(entry) => setEditorMode({
                  kind: 'edit',
                  id: entry.id,
                  initialBody: entry.body,
                  initialMood: entry.mood,
                  initialTags: entry.tags,
                  initialFormat: entry.bodyFormat,
                  initialImages: entry.images,
                  initialActivities: entry.activities,
                })}
              />
            )}

            {/* ── 주간 보드 뷰 — WeekNav 제거 (사용자 요청), 주 이동은 캘린더로 ── */}
            {effectiveViewMode === 'week' && (
              <JournalWeekBoard
                entries={allEntries}
                anchorIso={weekAnchor}
                onClickEntry={handleWeekClickEntry}
                onAddForDate={handleWeekAddForDate}
              />
            )}

            {/* ── 시간순 목록 뷰 ── */}
            {effectiveViewMode === 'list' && (
              <>
                {!hasResults && query.trim().length > 0 && (
                  <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/40 py-10 px-4 text-center">
                    <p className="text-[13px] text-muted-foreground">
                      '<span className="text-foreground font-medium">{query}</span>' 으로 일치하는 일기가 없어요
                    </p>
                  </div>
                )}

                {grouped.map((group) => (
                  <section
                    key={group.key}
                    id={`journal-month-${group.key}`}
                    className="flex flex-col gap-5 scroll-mt-24"
                  >
                    {/* 월 헤더 — 책 챕터 톤 */}
                    <div className="flex items-baseline gap-3 mb-1 px-1">
                      <h2 className="text-[20px] sm:text-[22px] font-bold tracking-[-0.022em] text-foreground">
                        {group.label}
                      </h2>
                      <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
                      <span className="text-[12px] font-medium tabular-nums text-muted-foreground/70">
                        {group.items.length}개
                      </span>
                    </div>
                    <div className="flex flex-col gap-5">
                      {group.items.map((entry) => (
                        <JournalCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => setEditorMode({
                            kind: 'edit',
                            id: entry.id,
                            initialBody: entry.body,
                            initialMood: entry.mood,
                            initialTags: entry.tags,
                            initialFormat: entry.bodyFormat,
                            initialImages: entry.images,
                            initialActivities: entry.activities,
                          })}
                          onDelete={() => handleDelete(entry)}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}
          </div>
          {/* 우측 사이드 — lg 이상에서만 노출. 정보 위계: 시각 앵커 → 회상 → 통계 */}
          <aside className="hidden lg:flex flex-col gap-5 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto pr-1">
            <JournalCalendarMini
              entries={allEntries}
              selectedDate={activeDate}
              currentWeekAnchor={effectiveViewMode === 'week' ? weekAnchor : null}
              onDayClick={(d) => {
                // week 뷰에선 그 날짜의 주로 anchor 이동, list 뷰에선 날짜 필터 토글
                if (effectiveViewMode === 'week') {
                  setWeekAnchor(normalizeWeekAnchor(`${d}T00:00:00`));
                } else {
                  setActiveDate(activeDate === d ? null : d);
                }
              }}
            />
            {activeDate && effectiveViewMode === 'list' && (
              <button
                type="button"
                onClick={() => setActiveDate(null)}
                className="-mt-3 inline-flex items-center justify-center gap-1 px-2 h-7 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3 w-3" />
                날짜 필터 해제
              </button>
            )}
            {query.trim().length === 0 && (
              <>
                <OnThisDayCard
                  allEntries={allEntries}
                  onClickEntry={(entry) => setEditorMode({
                    kind: 'edit',
                    id: entry.id,
                    initialBody: entry.body,
                    initialMood: entry.mood,
                    initialTags: entry.tags,
                    initialFormat: entry.bodyFormat,
                    initialActivities: entry.activities,
                  })}
                />
                <JournalRandomCard
                  allEntries={allEntries}
                  onClickEntry={(entry) => setEditorMode({
                    kind: 'edit',
                    id: entry.id,
                    initialBody: entry.body,
                    initialMood: entry.mood,
                    initialTags: entry.tags,
                    initialFormat: entry.bodyFormat,
                    initialActivities: entry.activities,
                    initialImages: entry.images,
                  })}
                />
                <JournalYearPixels
                  entries={allEntries}
                  onDayClick={(dateIso, entry) => {
                    if (entry) {
                      setEditorMode({
                        kind: 'edit',
                        id: entry.id,
                        initialBody: entry.body,
                        initialMood: entry.mood,
                        initialTags: entry.tags,
                        initialFormat: entry.bodyFormat,
                        initialImages: entry.images,
                        initialActivities: entry.activities,
                      });
                    } else {
                      setEditorMode({ kind: 'create', date: dateIso });
                    }
                  }}
                />
              </>
            )}
            <JournalSummaryPanel entries={allEntries} />
          </aside>
          </div>
        )}
      </main>
      <JournalEditor
        open={editorMode !== null}
        mode={editorMode}
        onClose={() => setEditorMode(null)}
      />
    </div>
  );
};

export default Journal;
