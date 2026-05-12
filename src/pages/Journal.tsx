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
import { Plus, Search, X, Hash, SlidersHorizontal, BarChart3 } from 'lucide-react';
import { PageSwitcher } from '@/components/PageSwitcher';
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
import { JournalTodayHero } from '@/components/journal/JournalTodayHero';
import { JournalActivityInsights } from '@/components/journal/JournalActivityInsights';
import { JournalStatsDialog } from '@/components/journal/JournalStatsDialog';
import { getTopTags } from '@/lib/journalTags';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { ACTIVITY_META } from '@/types/journal';

import type { JournalImage, Weather } from '@/types/journal';

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
      initialWeather?: Weather;
      initialSleepHours?: number;
      initialEnergy?: 1 | 2 | 3 | 4 | 5;
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
  const [statsOpen, setStatsOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const hasActiveFilter = !!(activeTag || activeActivity || activeDate);

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

  // 오늘 entry — Today hero 가 사용
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayEntries = useMemo(
    () => allEntries.filter((e) => e.date === todayKey),
    [allEntries, todayKey],
  );

  const openEdit = (entry: JournalEntry) => {
    setEditorMode({
      kind: 'edit',
      id: entry.id,
      initialBody: entry.body,
      initialMood: entry.mood,
      initialTags: entry.tags,
      initialFormat: entry.bodyFormat,
      initialImages: entry.images,
      initialActivities: entry.activities,
      initialWeather: entry.weather,
      initialSleepHours: entry.sleepHours,
      initialEnergy: entry.energy,
    });
  };

  return (
    <div className="journal-warm-theme min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 px-4 sm:px-8 py-6 sm:py-9 max-w-5xl w-full mx-auto">
        <div className="flex justify-end mb-4 sm:mb-5">
          <PageSwitcher current="journal" />
        </div>

        {/* 마스트헤드 — TODAY eyebrow + 오늘의 일기 타이틀 + 날짜 (좌) / 검색·필터·통계·CTA (우) */}
        <header className="mb-6 sm:mb-7">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 타이틀 영역 — 좌측 */}
            <div className="min-w-0 shrink-0">
              <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-primary/70 mb-1">
                TODAY
              </div>
              <div className="flex items-baseline gap-2.5 flex-wrap">
                <h1 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight text-foreground leading-none">
                  오늘의 일기
                </h1>
                <span className="text-[12.5px] font-medium tabular-nums text-muted-foreground/75">
                  {(() => {
                    const d = new Date();
                    const wd = '일월화수목금토'[d.getDay()];
                    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${wd}요일`;
                  })()}
                </span>
                {streak > 0 && (
                  <span
                    className="hidden sm:inline-flex items-center gap-1 text-[11.5px] font-medium tabular-nums text-primary/85"
                    title={`${streak}일 연속 기록`}
                  >
                    <span aria-hidden>🔥</span>
                    {streak}일
                  </span>
                )}
                <span className="text-[11.5px] font-medium tabular-nums text-muted-foreground/55 hidden md:inline">
                  · {allEntries.length}편
                </span>
              </div>
            </div>

            {/* 도구 그룹 — 우측 정렬, 한 묶음 */}
            <div className="flex items-center gap-2 ml-auto">
              {/* 검색 — ring-inset 으로 옆 버튼 영역 침범 방지 */}
              <div
                className={cn(
                  'relative inline-flex items-center gap-2 h-9 px-3 rounded-lg border w-44 sm:w-56 shrink-0',
                  'border-[hsl(var(--hairline))] bg-card/60 focus-within:border-primary/35 focus-within:ring-1 focus-within:ring-inset focus-within:ring-primary/25 transition-shadow',
                )}
              >
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="검색…"
                  aria-label="일기 검색"
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-muted-foreground"
                  style={{ outline: 'none', boxShadow: 'none' }}
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
              {/* 필터 — 라벨 텍스트 추가해서 정체성 명확 */}
              {(topActivities.length > 0 || topTags.length > 0) && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setFilterOpen((v) => !v)}
                  aria-expanded={filterOpen}
                  aria-label="필터"
                  title={hasActiveFilter ? '필터 활성' : '필터'}
                  className={cn(
                    'relative inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border text-[12px] font-medium transition-colors outline-none focus:outline-none focus-visible:outline-none shrink-0',
                    filterOpen || hasActiveFilter
                      ? 'border-primary/35 bg-primary/10 text-primary'
                      : 'border-[hsl(var(--hairline))] bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-card',
                  )}
                  style={{ outline: 'none', boxShadow: 'none' }}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>필터</span>
                  {hasActiveFilter && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tabular-nums">
                      {(activeActivity ? 1 : 0) + (activeTag ? 1 : 0)}
                    </span>
                  )}
                </button>
              )}
              {/* 통계 — 전체 일기 통계 모달 */}
              {allEntries.length > 0 && (
                <button
                  type="button"
                  onClick={() => setStatsOpen(true)}
                  title="전체 통계"
                  aria-label="전체 통계"
                  className="inline-flex items-center gap-1.5 px-2.5 h-9 rounded-lg border text-[12px] font-medium transition-colors border-[hsl(var(--hairline))] bg-card/60 text-muted-foreground hover:text-foreground hover:border-foreground/20 hover:bg-card shrink-0"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span>통계</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditorMode({ kind: 'create' })}
                title="새 일기 (N)"
                className="inline-flex items-center gap-1.5 px-3.5 h-9 text-[12.5px] font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-[0_2px_8px_-2px_hsl(265_50%_30%/0.25)] shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">오늘의 일기</span>
              </button>
            </div>
          </div>

          {/* 필터 카드 — 컴팩트: 슬림 헤더 + 슬림 행 */}
          {filterOpen && query.trim().length === 0 && (topActivities.length > 0 || topTags.length > 0) && (
            <div className="mt-3 rounded-xl border border-[hsl(var(--hairline))] bg-card/70 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)] overflow-hidden">
              {/* 카드 헤더 — h-7 슬림 */}
              <div className="px-3 h-7 flex items-center justify-between border-b border-[hsl(var(--hairline))] bg-primary/[0.04]">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[-0.005em] text-foreground/85">
                  <SlidersHorizontal className="h-3 w-3 text-primary/80" />
                  필터
                  {hasActiveFilter && (
                    <span className="inline-flex items-center justify-center min-w-[15px] h-3.5 px-1 rounded-full bg-primary/12 text-primary text-[9.5px] font-bold tabular-nums">
                      {(activeActivity ? 1 : 0) + (activeTag ? 1 : 0)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-0.5">
                  {hasActiveFilter && (
                    <button
                      type="button"
                      onClick={() => { setActiveActivity(null); setActiveTag(null); }}
                      className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <X className="h-2.5 w-2.5" />
                      모두 초기화
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setFilterOpen(false)}
                    aria-label="필터 닫기"
                    title="닫기"
                    className="inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>

              {/* 카드 본문 — 슬림 row, 칩 h-6 */}
              <div className="px-3 py-1.5 flex flex-col">
                {topActivities.length > 0 && (
                  <div className="flex items-center gap-2.5 py-1">
                    <span className="shrink-0 w-10 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold">
                      활동
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {topActivities.map((a) => {
                        const meta = ACTIVITY_META[a.key];
                        const active = activeActivity === a.key;
                        return (
                          <button
                            key={a.key}
                            type="button"
                            onClick={() => setActiveActivity(active ? null : a.key)}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 h-6 rounded-full text-[11px] font-medium border transition-colors',
                              active
                                ? 'bg-primary/12 text-primary border-primary/35'
                                : 'bg-background text-foreground/75 border-[hsl(var(--hairline))] hover:text-foreground hover:bg-accent hover:border-foreground/15',
                            )}
                          >
                            <span aria-hidden>{meta?.emoji ?? '·'}</span>
                            {meta?.label ?? a.key}
                            <span className="opacity-55 tabular-nums ml-0.5">{a.count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {topActivities.length > 0 && topTags.length > 0 && (
                  <div className="border-t border-[hsl(var(--hairline))] -mx-3" aria-hidden />
                )}
                {topTags.length > 0 && (
                  <div className="flex items-center gap-2.5 py-1">
                    <span className="shrink-0 w-10 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold">
                      태그
                    </span>
                    <div className="flex flex-wrap gap-1 flex-1">
                      {topTags.map((t) => (
                        <button
                          key={t.tag}
                          type="button"
                          onClick={() => setActiveTag(activeTag === t.tag ? null : t.tag)}
                          className={cn(
                            'inline-flex items-center gap-0.5 px-2 h-6 rounded-full text-[11px] font-medium border transition-colors',
                            activeTag === t.tag
                              ? 'bg-primary/12 text-primary border-primary/35'
                              : 'bg-background text-foreground/75 border-[hsl(var(--hairline))] hover:text-foreground hover:bg-accent hover:border-foreground/15',
                          )}
                        >
                          <Hash className="h-2.5 w-2.5 opacity-70" />
                          {t.tag}
                          <span className="opacity-55 tabular-nums ml-0.5">{t.count}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        {isEmpty ? (
          <JournalEmpty onAdd={() => setEditorMode({ kind: 'create' })} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-7">
          <div className="flex flex-col gap-5 min-w-0">

            {/* 검색 결과 없을 때 안내 */}
            {!hasResults && query.trim().length > 0 && (
              <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/40 py-10 px-4 text-center">
                <p className="text-[13px] text-muted-foreground">
                  '<span className="text-foreground font-medium">{query}</span>' 으로 일치하는 일기가 없어요
                </p>
              </div>
            )}

            {/* ── 오늘 Hero — 검색·필터 없을 때만 ── */}
            {!hasActiveFilter && query.trim().length === 0 && (
              <JournalTodayHero
                todayEntries={todayEntries}
                onCreate={() => setEditorMode({ kind: 'create' })}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            )}

            {/* ── 시간순 feed (월 챕터 그룹핑) ── */}
            {grouped.map((group) => {
              const [yearStr, monthStr] = group.key.split('-');
              const monthLabelStr = `${Number(monthStr)}월`;
              // 오늘 hero 가 별도로 보여주는 entry 는 feed 에서 제외 (중복 방지)
              const showTodayHero = !hasActiveFilter && query.trim().length === 0;
              const items = showTodayHero
                ? group.items.filter((e) => e.date !== todayKey)
                : group.items;
              if (items.length === 0) return null;
              return (
                <section
                  key={group.key}
                  id={`journal-month-${group.key}`}
                  className="flex flex-col gap-5 scroll-mt-24"
                >
                  {/* 월 챕터 — 연도 eyebrow + serif 월 + 가는 라인 */}
                  <div className="mb-1 px-1">
                    <div className="text-[10px] font-semibold tracking-[0.22em] uppercase text-muted-foreground/55 mb-1.5">
                      {yearStr}
                    </div>
                    <div className="flex items-baseline gap-3">
                      <h2 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-tight text-foreground/90 leading-none">
                        {monthLabelStr}
                      </h2>
                      <span className="flex-1 border-b border-[hsl(var(--hairline))] translate-y-[-4px]" aria-hidden />
                      <span className="text-[11px] font-medium tabular-nums text-muted-foreground/65">
                        {items.length}편
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {items.map((entry) => (
                      <JournalCard
                        key={entry.id}
                        entry={entry}
                        onEdit={() => openEdit(entry)}
                        onDelete={() => handleDelete(entry)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          {/* 우측 사이드 — lg 이상에서만 노출. 정보 위계: 시각 앵커 → 회상 → 통계 */}
          <aside className="hidden lg:flex flex-col gap-5">
            <JournalCalendarMini
              entries={allEntries}
              selectedDate={activeDate}
              currentWeekAnchor={null}
              onDayClick={(d) => setActiveDate(activeDate === d ? null : d)}
            />
            {activeDate && (
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
                    initialWeather: entry.weather,
                    initialSleepHours: entry.sleepHours,
                    initialEnergy: entry.energy,
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
                    initialWeather: entry.weather,
                    initialSleepHours: entry.sleepHours,
                    initialEnergy: entry.energy,
                    initialImages: entry.images,
                  })}
                />
                <JournalActivityInsights entries={allEntries} />
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
      <JournalStatsDialog
        open={statsOpen}
        onClose={() => setStatsOpen(false)}
        entries={allEntries}
        streak={streak}
      />
    </div>
  );
};

export default Journal;
