/**
 * 좌측 습관 list pane — TickTick 스타일 재디자인.
 *
 * 구조:
 *   상단:    [요일/날짜/진행률링] × 7  ── 각 날의 전체 완료율 도넛
 *   본문:    카드 형태 행 × N        ── 각 행 = 둥근 흰 카드 + 보더
 *   카드 안: emoji circle | 제목 + streak | 7개 dot | ⋯
 */
import { useMemo, useState } from 'react';
import {
  Archive, ArchiveRestore, ArrowUpDown, Flame, MoreHorizontal, Pin, Plus, Search, Trash2, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS, type TaskListColor } from '@/types/planner';
import type { Habit, HabitCheckin, HabitFreq } from '@/types/habit';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { habitStore } from '@/services/planner/habitStore';
import {
  currentStreak, isScheduledOn, maxStreak, toDateKey,
} from '@/lib/planner/habitStats';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HabitDayDot } from './HabitDayDot';
import { HabitDayProgress } from './HabitDayProgress';
import { HabitHeatStrip } from './HabitHeatStrip';

type SortKey = 'order' | 'streak' | 'name';
const SORT_LABEL: Record<SortKey, string> = {
  order: '추가순',
  streak: 'streak 순',
  name: '이름순',
};

const STARTER_PACKS: Array<{ title: string; emoji: string; color: TaskListColor; freq: HabitFreq }> = [
  { title: '운동',     emoji: '💪', color: 'rose',   freq: 'daily' },
  { title: '물 마시기', emoji: '💧', color: 'blue',   freq: 'daily' },
  { title: '독서 30분', emoji: '📚', color: 'amber',  freq: 'daily' },
  { title: '명상 10분', emoji: '🧘', color: 'violet', freq: 'daily' },
  { title: '일기 쓰기', emoji: '✍️', color: 'green',  freq: 'daily' },
  { title: '식단 관리', emoji: '🥗', color: 'teal',   freq: 'daily' },
];

interface HabitListPaneProps {
  habits: Habit[];
  allCheckins: HabitCheckin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onEdit: (habit: Habit) => void;
}

const WEEKDAY_KO = ['일', '월', '화', '수', '목', '금', '토'];

export const HabitListPane = ({
  habits, allCheckins, selectedId, onSelect, onAdd, onEdit,
}: HabitListPaneProps) => {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('order');
  const [todayOnly, setTodayOnly] = useState(false);

  // 이번 주 (월~일) 7일 dateKeys.
  const weekDays = useMemo(() => {
    const monday = new Date(today);
    const dow = today.getDay();
    const diffToMon = dow === 0 ? -6 : 1 - dow;
    monday.setDate(today.getDate() + diffToMon);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  // 활성 / 보관 분리 — 활성만 메인 list 에 표시, 보관 habits 는 popover 에서.
  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);
  const archivedHabits = useMemo(
    () => habits.filter((h) => h.archived).sort((a, b) => (b.archivedAt ?? '').localeCompare(a.archivedAt ?? '')),
    [habits],
  );

  // 검색·필터·정렬 적용된 list
  const visibleHabits = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = activeHabits;
    if (q) arr = arr.filter((h) => h.title.toLowerCase().includes(q));
    if (todayOnly) arr = arr.filter((h) => isScheduledOn(h, todayKey));
    if (sortKey === 'name') {
      arr = [...arr].sort((a, b) => a.title.localeCompare(b.title, 'ko'));
    } else if (sortKey === 'streak') {
      const cache = new Map<string, number>();
      const streakOf = (h: Habit) => {
        if (cache.has(h.id)) return cache.get(h.id)!;
        const cs = currentStreak(h, allCheckins.filter((c) => c.habitId === h.id));
        cache.set(h.id, cs);
        return cs;
      };
      arr = [...arr].sort((a, b) => streakOf(b) - streakOf(a));
    }
    // 'order' = 기본 sortOrder (이미 store 에서 sort)
    return arr;
  }, [activeHabits, query, todayOnly, sortKey, allCheckins, todayKey]);

  // 각 날의 (스케줄, 완료) — 진행률 링.
  const dayProgress = useMemo(() => {
    const checkinByKey = new Map<string, HabitCheckin>();
    for (const c of allCheckins) checkinByKey.set(`${c.habitId}|${c.date}`, c);
    return weekDays.map((d) => {
      const dk = toDateKey(d);
      let scheduled = 0;
      let completed = 0;
      for (const h of habits) {
        if (!isScheduledOn(h, dk)) continue;
        scheduled++;
        const ci = checkinByKey.get(`${h.id}|${dk}`);
        const tpd = Math.max(1, h.schedule.timesPerDay ?? 1);
        if (ci && (ci.count ?? 0) >= tpd) completed++;
      }
      return { dk, completed, scheduled };
    });
  }, [habits, allCheckins, weekDays]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-card/30">
      {/* 헤더 — 카드 행과 동일한 grid 컬럼. h-16 (64px) 으로 HabitDayProgress (60px) 가 안에 완전히 포함되도록. */}
      <div className="shrink-0 grid grid-cols-[1fr_repeat(7,40px)_72px_28px] gap-1 items-center px-3.5 h-12 border-b hairline bg-card">
        {/* col 1: 제목 + 액션 버튼들 */}
        <div className="min-w-0 flex items-baseline gap-2">
          <span className="font-display text-[20px] font-semibold tracking-tight text-foreground leading-none">
            습관
          </span>
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {visibleHabits.length}/{activeHabits.length}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
          {/* 검색 */}
          {showSearch ? (
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query) setShowSearch(false); }}
              placeholder="검색"
              className="h-7 w-32 px-2 text-[12px] rounded-md border hairline bg-card focus:border-primary/45 focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowSearch(true)}
              aria-label="검색"
              title="검색"
              className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}

          {/* 오늘만 */}
          <button
            type="button"
            onClick={() => setTodayOnly((v) => !v)}
            aria-pressed={todayOnly}
            title="오늘 스케줄만"
            className={cn(
              'inline-flex h-7 px-2 items-center justify-center rounded text-[11px] font-semibold transition-colors',
              todayOnly
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            오늘만
          </button>

          {/* 보관함 — Popover 로 보관된 습관 list 띄우기 */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="습관 보관함"
                className="inline-flex h-7 px-2 items-center justify-center gap-1 rounded text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <Archive className="h-3 w-3" />
                보관함
                {archivedHabits.length > 0 && (
                  <span className="text-[10.5px] tabular-nums opacity-70">{archivedHabits.length}</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="w-80 p-0 overflow-hidden">
              <ArchivePopoverBody habits={archivedHabits} allCheckins={allCheckins} />
            </PopoverContent>
          </Popover>

          {/* 정렬 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="정렬"
                title={`정렬: ${SORT_LABEL[sortKey]}`}
                className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuLabel className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">정렬</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <DropdownMenuItem
                  key={k}
                  onSelect={() => setSortKey(k)}
                  className={cn('cursor-pointer', sortKey === k && 'bg-accent font-semibold')}
                >
                  {SORT_LABEL[k]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* + 추가 */}
          <button
            type="button"
            onClick={onAdd}
            aria-label="새 습관"
            title="새 습관"
            className="inline-flex h-7 w-7 items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          </div>
        </div>

        {/* col 2-8: 요일 헤더 (월4 화5 ...) — 카드 행 도트와 같은 컬럼.
            오늘 칸은 self-stretch + amber tint 로 column band 시작. */}
        {weekDays.map((d, i) => {
          const dk = toDateKey(d);
          const isToday = dk === todayKey;
          const isPast = dk < todayKey;
          const prog = dayProgress[i];
          return (
            <div
              key={d.toISOString()}
              className={cn(
                'self-stretch flex items-center justify-center',
                isToday && 'bg-amber-300/[0.22]',
              )}
            >
              <HabitDayProgress
                weekday={WEEKDAY_KO[d.getDay()]}
                day={d.getDate()}
                completed={prog.completed}
                scheduled={prog.scheduled}
                isToday={isToday}
                isPast={isPast}
              />
            </div>
          );
        })}

        {/* col 9: "최근 30일" — 카드 행의 heat strip 위 */}
        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-foreground/60 text-center whitespace-nowrap">최근 30일</div>

        {/* col 10: ⋯ 메뉴 자리 — 카드 행의 메뉴 컬럼과 정렬 */}
        <div />
      </div>

      {/* 테이블 행 리스트 — divide-y 로 행 사이에만 hairline. 마지막 행 아래엔 라인 없음. */}
      <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-[hsl(var(--hairline))]">
        {activeHabits.length === 0 ? (
          <div className="p-2">
            <div className="text-[13px] text-foreground/70 font-medium mb-2">
              한 번에 시작하기 — 스타터 팩
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {STARTER_PACKS.map((p) => (
                <button
                  key={p.title}
                  type="button"
                  onClick={() => {
                    habitStore.add({
                      title: p.title,
                      emoji: p.emoji,
                      color: p.color,
                      schedule: { freq: p.freq },
                      startDate: toDateKey(new Date()),
                    });
                  }}
                  style={{
                    backgroundColor: `color-mix(in oklab, ${TASK_LIST_COLORS[p.color].stripe} 14%, hsl(var(--background)))`,
                    borderColor: `color-mix(in oklab, ${TASK_LIST_COLORS[p.color].stripe} 30%, transparent)`,
                  }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left hover:brightness-105 transition-all"
                >
                  <span className="text-[18px]">{p.emoji}</span>
                  <span className="text-[13px] font-medium text-foreground">{p.title}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onAdd}
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-[hsl(var(--hairline))] text-[12.5px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              직접 만들기
            </button>
          </div>
        ) : visibleHabits.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-foreground/55">
            {todayOnly ? '오늘 예정된 습관이 없어요' : query ? '일치하는 습관 없음' : ''}
          </div>
        ) : (
          visibleHabits.map((habit) => {
            const checkins = allCheckins.filter((c) => c.habitId === habit.id);
            const checkinMap = new Map(checkins.map((c) => [c.date, c]));
            const streak = currentStreak(habit, checkins);
            const max = maxStreak(habit, checkins);
            const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;
            const isSelected = habit.id === selectedId;
            const timesPerDay = Math.max(1, habit.schedule.timesPerDay ?? 1);

            return (
              <div
                key={habit.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(habit.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(habit.id);
                  }
                }}
                className={cn(
                  'group relative grid grid-cols-[1fr_repeat(7,40px)_72px_28px] gap-1 items-center',
                  'px-3.5 py-3 cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary/5'
                    : 'hover:bg-accent/50',
                )}
              >
                {/* 좌: emoji + 제목 + meta */}
                <div className="min-w-0 flex items-center gap-3">
                  <span
                    className="h-10 w-10 inline-flex items-center justify-center rounded-full text-[20px] shrink-0"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${stripe} 28%, hsl(var(--background)))`,
                    }}
                  >
                    {habit.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-foreground truncate">
                        {habit.title}
                      </span>
                      {habit.pinned && <Pin className="h-3 w-3 text-foreground/55" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5" title="현재 연속">
                        <Zap className="h-3 w-3" />
                        {streak}일
                      </span>
                      <span className="inline-flex items-center gap-0.5" title="최고 연속">
                        <Flame className="h-3 w-3" />
                        {max}일
                      </span>
                      {timesPerDay > 1 && habit.unit && (
                        <span className="text-foreground/45">
                          {timesPerDay}{habit.unit}/일
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 7개 dot — 오늘 칸은 self-stretch + amber tint 로 column band 연속 */}
                {weekDays.map((d) => {
                  const dk = toDateKey(d);
                  const sched = isScheduledOn(habit, dk);
                  const ci = checkinMap.get(dk);
                  const isToday = dk === todayKey;
                  const isFuture = dk > todayKey;
                  return (
                    <div
                      key={dk}
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        'self-stretch flex items-center justify-center -my-3 py-3',
                        isToday && 'bg-amber-300/[0.22]',
                      )}
                    >
                      <HabitDayDot
                        scheduled={sched}
                        count={ci?.count ?? 0}
                        timesPerDay={timesPerDay}
                        color={habit.color}
                        isToday={isToday}
                        isFuture={isFuture}
                        size="md"
                        ariaLabel={`${habit.title} ${dk}`}
                        onClick={() => habitCheckinStore.toggle(habit.id, dk, timesPerDay)}
                      />
                    </div>
                  );
                })}

                {/* 30일 heat strip */}
                <div className="flex items-center justify-end pr-1" title="최근 30일">
                  <HabitHeatStrip habit={habit} checkins={checkins} />
                </div>

                {/* ⋯ 메뉴 */}
                <div onClick={(e) => e.stopPropagation()} className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-label="메뉴"
                        className="h-6 w-6 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onSelect={() => onEdit(habit)}>편집</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
                        {habit.pinned ? '핀 해제' : '핀 고정'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => habitStore.archive(habit.id)}>
                        <Archive className="h-3.5 w-3.5 mr-2" />
                        보관함으로
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/** 보관함 popover 본문 — 보관된 습관 list + 복원 / 영구 삭제 액션. */
const ArchivePopoverBody = ({
  habits,
  allCheckins,
}: {
  habits: Habit[];
  allCheckins: HabitCheckin[];
}) => {
  return (
    <div className="flex flex-col">
      {/* 헤더 */}
      <header className="flex items-baseline justify-between gap-2 px-3.5 pt-3 pb-2 border-b hairline">
        <h3 className="font-display text-[15px] font-semibold tracking-tight text-foreground leading-none inline-flex items-center gap-1.5">
          <Archive className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
          습관 보관함
        </h3>
        <span className="text-[11px] tabular-nums text-muted-foreground font-medium">
          {habits.length}개
        </span>
      </header>

      {/* 본문 */}
      <div className="px-2 py-2 max-h-[320px] overflow-y-auto">
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
            <p className="text-[12.5px] font-medium text-foreground/80">보관된 습관이 없어요</p>
            <p className="mt-1 text-[11px] text-muted-foreground max-w-[220px] leading-snug">
              잠시 쉬는 습관·끝낸 습관은 ⋯ 메뉴에서 보관함으로 옮기면 기록은 보존돼요.
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {habits.map((habit) => {
              const checkins = allCheckins.filter((c) => c.habitId === habit.id);
              const max = maxStreak(habit, checkins);
              const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;
              return (
                <div
                  key={habit.id}
                  className="group flex items-center gap-2 px-2 py-2 rounded-md hover:bg-accent/50 transition-colors"
                >
                  <span
                    className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[15px] shrink-0"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${stripe} 28%, hsl(var(--background)))`,
                    }}
                  >
                    {habit.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground truncate">{habit.title}</div>
                    <div className="flex items-center gap-2 mt-0.5 text-[10.5px] tabular-nums text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5" title="최고 연속">
                        <Flame className="h-3 w-3" />
                        {max}일
                      </span>
                      {habit.archivedAt && (
                        <span className="text-muted-foreground/70" title="보관 시점">
                          {new Date(habit.archivedAt).toLocaleDateString('ko-KR', {
                            year: '2-digit', month: 'numeric', day: 'numeric',
                          })} 보관
                        </span>
                      )}
                    </div>
                  </div>
                  {/* hover 액션 — 복원 / 영구 삭제 */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
                    <button
                      type="button"
                      onClick={() => habitStore.unarchive(habit.id)}
                      aria-label="다시 시작"
                      title="다시 시작"
                      className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <ArchiveRestore className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (typeof window !== 'undefined' && window.confirm(
                          `"${habit.title}" 을(를) 영구 삭제할까요?\n체크인 기록도 함께 사라져 복구할 수 없어요.`,
                        )) {
                          habitStore.remove(habit.id);
                        }
                      }}
                      aria-label="영구 삭제"
                      title="영구 삭제"
                      className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
