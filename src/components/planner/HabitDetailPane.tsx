/**
 * 우측 detail pane — 선택된 습관의 통계 + 월 캘린더 + 메모.
 */
import { useMemo, useState } from 'react';
import { Calendar, Edit3, Flame, MoreHorizontal, Pin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit } from '@/types/habit';
import { habitStore } from '@/services/planner/habitStore';
import { useHabitCheckins } from '@/hooks/planner/useHabitCheckins';
import {
  currentStreak, maxStreak, monthCheckinCount, toDateKey,
} from '@/lib/planner/habitStats';
import { HabitYearHeatmap } from './HabitYearHeatmap';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HabitMonthGrid } from './HabitMonthGrid';

interface HabitDetailPaneProps {
  habit: Habit;
  onEdit: () => void;
  onArchive: () => void;
}

export const HabitDetailPane = ({ habit, onEdit, onArchive }: HabitDetailPaneProps) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const allCheckins = useHabitCheckins(habit.id);
  const stripe = (TASK_LIST_COLORS[habit.color] ?? TASK_LIST_COLORS.blue).stripe;

  const stats = useMemo(() => {
    return {
      streak: currentStreak(habit, allCheckins),
      max: maxStreak(habit, allCheckins),
      monthCount: monthCheckinCount(habit, viewYear, viewMonth, allCheckins),
    };
  }, [habit, allCheckins, viewYear, viewMonth]);

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 본문 — 스크롤. 헤더와 통계가 한 카드로 묶여 시각적 분리 제거. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
        {/* 헤더 + 통계 통합 카드 — 제목 바로 아래 통계가 자연스럽게 이어짐. */}
        <div className="rounded-lg border border-foreground/20 bg-card overflow-hidden">
          {/* 헤더 — 컴팩트 한 줄: 이모지 + 제목 + 편집·메뉴 */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-foreground/15">
            <span
              className="h-6 w-6 inline-flex items-center justify-center rounded-full text-[12px] shrink-0"
              style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }}
            >
              {habit.emoji}
            </span>
            <div className="min-w-0 flex-1 flex items-center gap-1.5">
              <span className="text-[14px] font-semibold tracking-tight text-foreground truncate">
                {habit.title}
              </span>
              {habit.pinned && <Pin className="h-3 w-3 text-foreground/55 shrink-0" />}
            </div>
            <button
              type="button"
              onClick={onEdit}
              aria-label="편집"
              className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
            >
              <Edit3 className="h-3.5 w-3.5" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="메뉴"
                  className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/55 hover:text-foreground hover:bg-accent transition-colors"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onSelect={() => habitStore.togglePinned(habit.id)}>
                  {habit.pinned ? '핀 해제' : '핀 고정'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onArchive}>보관함으로</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* notes — 있을 때만 헤더 아래 가는 행 */}
          {habit.notes && (
            <div className="px-3 py-1.5 text-[11.5px] text-foreground/60 leading-snug border-b border-foreground/15">
              {habit.notes}
            </div>
          )}

          {/* Stats — 3분할 (연속·이번 달·베스트). 헤더와 한 카드 안에서 divider 로 구분. */}
          <div className="grid grid-cols-3 divide-x divide-foreground/15">
            {[
              { Icon: Flame, label: '연속', value: stats.streak, unit: '일', accent: stats.streak >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground/60' },
              { Icon: Calendar, label: '이번 달', value: stats.monthCount, unit: '일', accent: 'text-blue-600 dark:text-blue-400' },
              { Icon: Trophy, label: '베스트', value: stats.max, unit: '일', accent: 'text-amber-600 dark:text-amber-400' },
            ].map(({ Icon, label, value, unit, accent }) => (
              <div key={label} className="flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-center">
                <div className={cn('flex items-center gap-1', accent)}>
                  <Icon className="h-3 w-3" />
                  <span className="text-[10.5px] font-semibold tracking-wide text-foreground/65">{label}</span>
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className={cn('text-[17px] font-bold tabular-nums leading-none', accent)}>{value}</span>
                  <span className="text-[10.5px] text-foreground/50">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 월 캘린더 — 섹션 패턴 (border-t 위, 라벨 + 내용, 카드 wrapper 없음) */}
        <section className="pt-3 border-t border-foreground/20">
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-2 px-0.5">
            이번 달
          </div>
          <HabitMonthGrid
            habit={habit}
            year={viewYear}
            month1Indexed={viewMonth}
            onChangeMonth={(y, m) => { setViewYear(y); setViewMonth(m); }}
          />
        </section>

        {/* 365일 히트맵 — 섹션 패턴 */}
        <section className="pt-3 border-t border-foreground/20">
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-2 px-0.5">
            연간 패턴
          </div>
          <HabitYearHeatmap habit={habit} checkins={allCheckins} />
        </section>

      </div>
    </div>
  );
};

