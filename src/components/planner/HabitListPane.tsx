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
  ArrowUpDown, Flame, MoreHorizontal, Pin, Plus, Search, Zap,
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

  // 검색·필터·정렬 적용된 list
  const visibleHabits = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = habits;
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
  }, [habits, query, todayOnly, sortKey, allCheckins, todayKey]);

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
      {/* 헤더 — 제목 + 7일 도트 + 검색/정렬/today/+ */}
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-[hsl(var(--hairline))] bg-card">
        <span className="text-[15px] font-bold tracking-tight text-foreground">습관</span>
        <span className="text-[12px] text-foreground/55 tabular-nums">{visibleHabits.length}/{habits.length}</span>

        {/* 주 진행률 도트 7개 + 30일 라벨 (가운데) */}
        <div className="flex-1 flex items-center justify-center gap-1 min-w-0">
          {weekDays.map((d, i) => {
            const dk = toDateKey(d);
            const isToday = dk === todayKey;
            const isPast = dk < todayKey;
            const prog = dayProgress[i];
            return (
              <div key={d.toISOString()} className="flex items-center justify-center w-[36px]">
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
          <div className="ml-1 text-[9.5px] font-mono uppercase tracking-wide text-foreground/45 whitespace-nowrap">최근 30일</div>
        </div>

        <div className="flex items-center gap-0.5">
          {/* 검색 */}
          {showSearch ? (
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (!query) setShowSearch(false); }}
              placeholder="검색"
              className="h-7 w-32 px-2 text-[12px] rounded-md border border-foreground/15 bg-card focus:border-foreground/40 focus:outline-none"
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
                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                : 'text-foreground/65 hover:text-foreground hover:bg-accent',
            )}
          >
            오늘만
          </button>

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
              <DropdownMenuLabel className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55">정렬</DropdownMenuLabel>
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

      {/* 카드형 행 리스트 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
        {habits.length === 0 ? (
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
              className="mt-3 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-foreground/20 text-[12.5px] text-foreground/65 hover:text-foreground hover:border-foreground/40 transition-colors"
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
                  'rounded-xl bg-card px-3.5 py-3 cursor-pointer transition-all',
                  'border shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
                  isSelected
                    ? 'border-blue-500/60 ring-1 ring-blue-500/30'
                    : 'border-[hsl(var(--hairline))] hover:border-foreground/20 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]',
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
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] tabular-nums text-foreground/55">
                      <span className="inline-flex items-center gap-0.5">
                        <Zap className="h-3 w-3" />
                        {streak}일들
                      </span>
                      <span className="inline-flex items-center gap-0.5">
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

                {/* 7개 dot */}
                {weekDays.map((d) => {
                  const dk = toDateKey(d);
                  const sched = isScheduledOn(habit, dk);
                  const ci = checkinMap.get(dk);
                  const isToday = dk === todayKey;
                  const isFuture = dk > todayKey;
                  return (
                    <div key={dk} className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
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
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem onSelect={() => onEdit(habit)}>편집</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
                        {habit.pinned ? '핀 해제' : '핀 고정'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onSelect={() => habitStore.archive(habit.id)}>
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
