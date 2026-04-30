/**
 * 습관 히트맵 — GitHub contribution graph 패턴.
 *
 * 좌측: 반복 task 리스트 (선택)
 * 우측: 선택된 task 의 365일 격자
 *   - done occurrence: 진한 색 (green)
 *   - missed (예정됐는데 done X): 옅은 빨강
 *   - 예정 없음: 빈 칸
 *   - 미래: 미래 색조
 *
 * 클릭 가능 — 그 날 day 뷰로 이동.
 */
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { taskListStore } from '@/services/planner/taskListStore';
import { pomodoroSessionLog, PLANNER_POMODORO_LOG_CHANGED } from '@/services/planner/pomodoroSessionLog';
import { computeStreakStats } from '@/lib/planner/streak';
import { expandRecurrence } from '@/lib/planner/recurrence';
import { TASK_LIST_COLORS, type PlannerTask, PLANNER_TASK_CHANGED, PLANNER_LIST_CHANGED } from '@/types/planner';

interface HabitHeatmapProps {
  anchorIso: string;
  onDayClick?: (dayIso: string) => void;
}

const DAY_MS = 86_400_000;

export const HabitHeatmap = ({ anchorIso, onDayClick }: HabitHeatmapProps) => {
  const year = useMemo(() => new Date(anchorIso).getFullYear(), [anchorIso]);

  // 모든 반복 task 마스터.
  const [recurring, setRecurring] = useState<PlannerTask[]>([]);
  useEffect(() => {
    const refresh = () => {
      setRecurring(taskStore.list().filter((t) => Boolean(t.recurrence)));
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  // 포모도로 세션 로그 — virtual habit 으로 통합.
  const [pomodoroDays, setPomodoroDays] = useState<Map<string, number>>(new Map());
  useEffect(() => {
    const refresh = () => {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year + 1, 0, 1);
      const records = pomodoroSessionLog.listByRange(yearStart, yearEnd);
      const map = new Map<string, number>();
      for (const r of records) {
        const d = new Date(r.startedAt);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      }
      setPomodoroDays(map);
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_POMODORO_LOG_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_POMODORO_LOG_CHANGED, refresh);
  }, [year]);

  // 사용자 lists (color 매핑용).
  const [lists, setLists] = useState(() => taskListStore.list());
  useEffect(() => {
    const refresh = () => setLists(taskListStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_LIST_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_LIST_CHANGED, refresh);
  }, []);
  const listColorMap = useMemo(() => new Map(lists.map((l) => [l.id, l.color])), [lists]);

  // 선택된 task — virtual '__pomodoro__' 또는 task id.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (!selectedId) {
      // 포모도로 데이터가 있으면 그걸 우선, 없으면 첫 반복.
      if (pomodoroDays.size > 0) setSelectedId('__pomodoro__');
      else if (recurring.length > 0) setSelectedId(recurring[0].id);
    }
    if (selectedId && selectedId !== '__pomodoro__' && !recurring.find((t) => t.id === selectedId)) {
      setSelectedId(recurring[0]?.id ?? (pomodoroDays.size > 0 ? '__pomodoro__' : null));
    }
  }, [recurring, selectedId, pomodoroDays]);

  const isPomodoroSelected = selectedId === '__pomodoro__';
  const selectedTask = !isPomodoroSelected ? recurring.find((t) => t.id === selectedId) : undefined;

  const stats = useMemo(
    () => (selectedTask ? computeStreakStats(selectedTask) : null),
    [selectedTask],
  );

  // 격자 데이터 — 1월 1일 ~ 12월 31일.
  // 셀 = { date, planned, done, isFuture }.
  const grid = useMemo(() => {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 포모도로 모드 — 매일 가능, 그날 세션이 있으면 done.
    if (isPomodoroSelected) {
      const cells: Array<{
        date: Date;
        iso: string;
        planned: boolean;
        done: boolean;
        isFuture: boolean;
        isToday: boolean;
        intensity: number; // 포모도로 횟수 (색 농도용)
      }> = [];
      let cursor = new Date(yearStart);
      while (cursor.getTime() < yearEnd.getTime()) {
        const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
        const count = pomodoroDays.get(key) ?? 0;
        cells.push({
          date: new Date(cursor),
          iso: cursor.toISOString(),
          planned: true,
          done: count > 0,
          isFuture: cursor.getTime() > today.getTime(),
          isToday: cursor.getTime() === today.getTime(),
          intensity: count,
        });
        cursor = new Date(cursor.getTime() + DAY_MS);
      }
      return cells;
    }

    if (!selectedTask) return [];

    const expanded = expandRecurrence(selectedTask, yearStart, yearEnd);
    const plannedDays = new Map<string, string>(); // dayKey → occurrenceIso
    for (const inst of expanded) {
      const d = new Date(inst.occurrenceStartIso);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      plannedDays.set(key, inst.occurrenceStartIso);
    }

    const completions = selectedTask.seriesCompletions ?? {};
    const cells: Array<{
      date: Date;
      iso: string;
      planned: boolean;
      done: boolean;
      isFuture: boolean;
      isToday: boolean;
      intensity?: number;
    }> = [];
    let cursor = new Date(yearStart);
    while (cursor.getTime() < yearEnd.getTime()) {
      const key = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
      const occurrenceIso = plannedDays.get(key);
      const planned = !!occurrenceIso;
      const done = planned && !!completions[occurrenceIso!];
      cells.push({
        date: new Date(cursor),
        iso: cursor.toISOString(),
        planned,
        done,
        isFuture: cursor.getTime() > today.getTime(),
        isToday: cursor.getTime() === today.getTime(),
      });
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
    return cells;
  }, [selectedTask, year, isPomodoroSelected, pomodoroDays]);

  // 53주 × 7일 격자로 재구성 — GitHub style.
  // 첫 주는 1월 1일이 있는 주 (해당 주의 일요일부터 시작).
  const weeks = useMemo(() => {
    if (grid.length === 0) return [];
    const result: Array<Array<typeof grid[number] | null>> = [];
    const firstDay = grid[0].date.getDay(); // 0 = 일요일
    let week: Array<typeof grid[number] | null> = Array(firstDay).fill(null);
    for (const cell of grid) {
      week.push(cell);
      if (week.length === 7) {
        result.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      result.push(week);
    }
    return result;
  }, [grid]);

  if (recurring.length === 0 && pomodoroDays.size === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <span className="text-3xl mb-3" aria-hidden>📊</span>
        <p className="text-[14px] font-semibold text-foreground mb-1.5">아직 반복 항목이 없어요</p>
        <p className="text-[12px] text-muted-foreground leading-snug max-w-md">
          매주·매일 반복하는 운동·공부·습관을 등록하거나<br />
          포모도로 집중을 시작하면 히트맵이 채워져요
        </p>
      </div>
    );
  }

  // task list color → cell 색상. 포모도로면 rose, 없으면 emerald.
  const accentColor = (() => {
    if (isPomodoroSelected) return 'hsl(0 70% 55%)'; // pomodoro rose
    if (selectedTask?.listId) {
      const c = listColorMap.get(selectedTask.listId);
      if (c) return TASK_LIST_COLORS[c].stripe;
    }
    return 'hsl(140 50% 45%)'; // emerald default
  })();

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* 좌측 — 반복 task + 포모도로 virtual entry */}
      <div className="w-56 shrink-0 flex flex-col min-h-0 gap-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold px-1">
          습관 항목
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-0.5">
          {/* 포모도로 virtual entry — 항상 최상단 (데이터 0 도 표시 X) */}
          {pomodoroDays.size > 0 && (
            <button
              type="button"
              onClick={() => setSelectedId('__pomodoro__')}
              className={cn(
                'w-full flex items-center gap-2 h-8 px-2 rounded-md text-left transition-colors',
                isPomodoroSelected ? 'bg-accent' : 'hover:bg-accent/60',
              )}
            >
              <span className="text-[14px] leading-none shrink-0" aria-hidden>🍅</span>
              <span className="flex-1 text-[12.5px] truncate">포모도로 집중</span>
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground shrink-0">
                {pomodoroDays.size}일
              </span>
            </button>
          )}
          {recurring.map((t) => {
            const active = t.id === selectedId;
            const tStats = computeStreakStats(t);
            const c = t.listId ? listColorMap.get(t.listId) : undefined;
            const stripe = c ? TASK_LIST_COLORS[c].stripe : 'hsl(var(--muted-foreground))';
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={cn(
                  'w-full flex items-center gap-2 h-8 px-2 rounded-md text-left transition-colors',
                  active ? 'bg-accent' : 'hover:bg-accent/60',
                )}
              >
                <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: stripe }} aria-hidden />
                <span className="flex-1 text-[12.5px] truncate">{t.title}</span>
                {tStats.current > 0 && (
                  <span className="text-[10px] font-mono tabular-nums text-amber-600 shrink-0">
                    🔥{tStats.current}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 우측 — 히트맵 + 통계 */}
      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {isPomodoroSelected && (
          <div className="shrink-0 flex items-baseline gap-3 flex-wrap">
            <h3 className="text-[16px] font-semibold tracking-tight">🍅 포모도로 집중</h3>
            <div className="flex items-center gap-3 text-[11.5px] font-mono tabular-nums text-muted-foreground">
              <span>활성 {pomodoroDays.size}일</span>
              <span>총 {[...pomodoroDays.values()].reduce((a, b) => a + b, 0)}회</span>
            </div>
          </div>
        )}
        {selectedTask && stats && (
          <div className="shrink-0 flex items-baseline gap-3 flex-wrap">
            <h3 className="text-[16px] font-semibold tracking-tight">{selectedTask.title}</h3>
            <div className="flex items-center gap-3 text-[11.5px] font-mono tabular-nums text-muted-foreground">
              {stats.current > 0 && (
                <span className="text-amber-600 font-semibold">🔥 {stats.current}회 연속</span>
              )}
              {stats.best >= 3 && (
                <span>역대 {stats.best}회</span>
              )}
              {stats.total > 0 && (
                <span>
                  {stats.total - stats.missed}/{stats.total} · {Math.round(stats.rate * 100)}%
                </span>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-x-auto overflow-y-hidden">
          <div className="inline-block">
            {/* 월 라벨 row */}
            <MonthLabels weeks={weeks} />
            {/* 7행 (일요일 ~ 토요일) × N주 */}
            {Array.from({ length: 7 }, (_, dow) => (
              <div key={dow} className="flex gap-0.5 mb-0.5 last:mb-0">
                {/* 요일 라벨 (월·수·금만) */}
                <span className="w-6 text-[8.5px] font-mono uppercase text-muted-foreground/70 text-right pr-1 leading-[12px]">
                  {dow === 1 ? '월' : dow === 3 ? '수' : dow === 5 ? '금' : ''}
                </span>
                {weeks.map((week, wi) => {
                  const cell = week[dow];
                  if (!cell) return <span key={wi} className="w-3 h-3 rounded-sm" aria-hidden />;
                  const cellEl = (
                    <button
                      key={wi}
                      type="button"
                      onClick={() => onDayClick?.(cell.iso)}
                      className={cn(
                        'w-3 h-3 rounded-sm transition-all hover:ring-1 hover:ring-foreground',
                        cell.done && !cell.isFuture && 'opacity-100',
                        !cell.done && cell.planned && !cell.isFuture && 'bg-rose-200/60',
                        !cell.planned && !cell.isFuture && 'bg-accent/40',
                        cell.isFuture && cell.planned && 'bg-accent/20 ring-1 ring-foreground/10',
                        cell.isFuture && !cell.planned && 'bg-transparent',
                        cell.isToday && 'ring-1 ring-foreground',
                      )}
                      style={cell.done && !cell.isFuture ? { backgroundColor: accentColor } : undefined}
                      aria-label={`${cell.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}${cell.done ? ' 완료' : cell.planned ? ' 미완' : ''}`}
                      title={`${cell.date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}${cell.done ? ' · ✓ 완료' : cell.planned ? ' · 빠뜨림' : ''}`}
                    />
                  );
                  return cellEl;
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div className="shrink-0 flex items-center gap-3 text-[10px] font-mono text-muted-foreground tabular-nums">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: accentColor }} aria-hidden />
            <span>완료</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-rose-200/60" aria-hidden />
            <span>빠뜨림</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-accent/40" aria-hidden />
            <span>해당 없음</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-accent/20 ring-1 ring-foreground/10" aria-hidden />
            <span>예정</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/** 주 격자 위에 월 라벨 표시 — 각 월의 첫째 주 시작 위치에. */
const MonthLabels = ({ weeks }: { weeks: Array<Array<{ date: Date } | null>> }) => {
  const labels: Array<{ index: number; text: string }> = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstCell = week.find((c) => c !== null);
    if (firstCell) {
      const m = firstCell.date.getMonth();
      if (m !== lastMonth) {
        labels.push({ index: wi, text: `${m + 1}월` });
        lastMonth = m;
      }
    }
  });
  return (
    <div className="flex gap-0.5 mb-1 ml-7">
      {weeks.map((_, wi) => {
        const label = labels.find((l) => l.index === wi);
        return (
          <span
            key={wi}
            className="w-3 text-[9px] font-mono text-muted-foreground/80"
          >
            {label ? label.text : ''}
          </span>
        );
      })}
    </div>
  );
};
