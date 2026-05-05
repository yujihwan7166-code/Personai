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
import { ChevronLeft, Plus, Search, Flame, X, Hash } from 'lucide-react';
import { useJournal, useTodayJournal } from '@/hooks/useJournal';
import { useJournalStreak } from '@/hooks/useJournalStreak';
import { journalStore } from '@/services/journalStore';
import { notify } from '@/lib/notify';
import { JournalCard } from '@/components/journal/JournalCard';
import { JournalEditor } from '@/components/journal/JournalEditor';
import { JournalEmpty } from '@/components/journal/JournalEmpty';
import { TodayCard } from '@/components/journal/TodayCard';
import { OnThisDayCard } from '@/components/journal/OnThisDayCard';
import { JournalRandomCard } from '@/components/journal/JournalRandomCard';
import { JournalCalendarMini } from '@/components/journal/JournalCalendarMini';
import { JournalSummaryPanel } from '@/components/journal/JournalSummaryPanel';
import { getTopTags } from '@/lib/journalTags';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { ACTIVITY_META } from '@/types/journal';

import type { JournalImage } from '@/types/journal';

type EditorMode =
  | { kind: 'create' }
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
  const todayEntries = useTodayJournal();
  const streak = useJournalStreak(allEntries);
  const [editorMode, setEditorMode] = useState<EditorMode | null>(null);
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeActivity, setActiveActivity] = useState<string | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="journal-warm-theme min-h-screen bg-background text-foreground flex flex-col">
      <main className="flex-1 px-4 sm:px-8 py-8 sm:py-12 max-w-5xl w-full mx-auto">
        {/* 출판물 톤 마스트헤드 — NYT/Bear/Newsreader 패턴 */}
        <header className="mb-8 sm:mb-10 pb-5 sm:pb-7 border-b-2 border-[hsl(var(--hairline))]">
          {/* 상단 micro nav — 신문 보조 라벨 */}
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex items-center gap-1 text-[10.5px] text-muted-foreground hover:text-foreground transition-colors font-mono uppercase tracking-[0.18em]"
              aria-label="메인으로"
            >
              <ChevronLeft className="h-3 w-3" />
              <span>메인</span>
            </button>
            <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80">
              일기 · {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </span>
          </div>

          {/* 마스트헤드 — 큰 serif H1 + meta */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4 sm:gap-5 flex-wrap">
              <h1
                className="text-[40px] sm:text-[52px] font-bold tracking-tight leading-none text-foreground"
                style={{
                  fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
                  letterSpacing: '-0.02em',
                }}
              >
                일기
              </h1>
              {streak > 0 && (
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[11.5px] font-semibold tabular-nums mb-1.5"
                  title={`${streak}일 연속 작성`}
                >
                  <Flame className="h-3 w-3" />
                  {streak}일 연속
                </span>
              )}
              <span
                className="text-[11px] font-mono uppercase tracking-[0.18em] text-muted-foreground/80 mb-2 hidden sm:inline"
              >
                {allEntries.length} 페이지
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
            {/* 검색 input */}
            <div
              className={cn(
                'relative inline-flex items-center gap-1.5 h-9 px-3 rounded-md border transition-all',
                'border-[hsl(var(--hairline))] bg-card focus-within:border-foreground/30',
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
            <button
              type="button"
              onClick={() => setEditorMode({ kind: 'create' })}
              title="새 일기 (N)"
              className="inline-flex items-center gap-1.5 px-4 h-9 text-[13px] font-semibold rounded-md bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <Plus className="h-3.5 w-3.5" />
              오늘 일기
            </button>
          </div>
          </div>
        </header>

        {isEmpty ? (
          <JournalEmpty onAdd={() => setEditorMode({ kind: 'create' })} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
          <div className="flex flex-col gap-6 min-w-0">
            {/* Today 카드 + On This Day — 검색 중이 아닐 때만 노출 */}
            {query.trim().length === 0 && (
              <>
                <TodayCard
                  todayEntries={todayEntries}
                  onAdd={() => setEditorMode({ kind: 'create' })}
                />
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
                {/* 활동 필터 칩 (자주 쓴 5개) */}
                {topActivities.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold mr-1">
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

                {/* 태그 필터 칩 (자주 쓴 5개) */}
                {topTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-muted-foreground font-semibold mr-1">
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
              </>
            )}

            {!hasResults && query.trim().length > 0 && (
              <div className="rounded-xl border border-dashed border-[hsl(var(--hairline))] bg-card/40 py-10 px-4 text-center">
                <p className="text-[13px] text-muted-foreground">
                  '<span className="text-foreground font-medium">{query}</span>' 으로 일치하는 일기가 없어요
                </p>
              </div>
            )}

            {grouped.map((group) => (
              <section key={group.key} className="flex flex-col gap-4">
                {/* 월 헤더 — 책 챕터 톤 */}
                <div className="flex items-baseline gap-4 mb-1 px-1 pt-2">
                  <h2
                    className="text-[24px] sm:text-[26px] font-bold tracking-tight text-foreground"
                    style={{
                      fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif',
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {group.label}
                  </h2>
                  <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
                  <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] tabular-nums text-muted-foreground/70">
                    {group.items.length} 페이지
                  </span>
                </div>
                <div className="flex flex-col gap-4">
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
          </div>
          {/* 우측 사이드 — lg 이상에서만 노출 */}
          <aside className="hidden lg:flex flex-col gap-4 sticky top-8 self-start max-h-[calc(100vh-4rem)] overflow-y-auto">
            <JournalCalendarMini
              entries={allEntries}
              selectedDate={activeDate}
              onDayClick={(d) => setActiveDate(activeDate === d ? null : d)}
            />
            {activeDate && (
              <button
                type="button"
                onClick={() => setActiveDate(null)}
                className="inline-flex items-center justify-center gap-1 px-2 h-7 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="h-3 w-3" />
                날짜 필터 해제
              </button>
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
