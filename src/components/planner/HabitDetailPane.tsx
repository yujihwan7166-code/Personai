/**
 * 우측 detail pane — 선택된 습관의 통계 + 월 캘린더 + 메모.
 */
import { useMemo, useState } from 'react';
import { Calendar, Edit3, Flame, MoreHorizontal, Pin, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit } from '@/types/habit';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
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

  // 메모 — 월 시작 row 의 note 사용 (단순화). 더 정교한 모델은 이후.
  const monthFirstKey = `${viewYear}-${String(viewMonth).padStart(2, '0')}-01`;
  const noteRow = allCheckins.find((c) => c.date === monthFirstKey);
  const [noteDraft, setNoteDraft] = useState(noteRow?.note ?? '');
  // habit/month 변경 시 동기화.
  useMemo(() => {
    setNoteDraft(noteRow?.note ?? '');
  }, [noteRow?.note, monthFirstKey]);

  const saveNote = () => {
    habitCheckinStore.setNote(habit.id, monthFirstKey, noteDraft);
  };

  return (
    <div className="h-full min-h-0 flex flex-col">
      {/* 헤더 — 좌측 리스트 헤더(h-16)와 border-b 라인 정렬, 콘텐츠는 상단 정렬로 ㅎㅇㅎㅇ 위 여백 최소화 */}
      <div className="shrink-0 flex items-start gap-2.5 px-3 pt-2.5 h-16 border-b border-[hsl(var(--hairline))]">
        <span
          className="h-6 w-6 inline-flex items-center justify-center rounded-full text-[12px] shrink-0"
          style={{ backgroundColor: `color-mix(in oklab, ${stripe} 18%, hsl(var(--background)))` }}
        >
          {habit.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[15px] font-semibold tracking-tight text-foreground truncate">
              {habit.title}
            </span>
            {habit.pinned && <Pin className="h-3 w-3 text-foreground/55" />}
          </div>
          {habit.notes && (
            <div className="text-[11.5px] text-foreground/55 truncate">{habit.notes}</div>
          )}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label="편집"
          className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="메뉴"
              className="h-7 w-7 inline-flex items-center justify-center rounded text-foreground/65 hover:text-foreground hover:bg-accent"
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

      {/* 본문 — 스크롤. 상단 여백 컴팩트 (pt-2). */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2 pb-3 space-y-3">
        {/* Stats — 단일 카드 3분할 (연속·이번 달·베스트) — 동기 위계 */}
        <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card grid grid-cols-3 divide-x divide-[hsl(var(--hairline))]">
          {[
            { Icon: Flame, label: '연속', value: stats.streak, unit: '일', accent: stats.streak >= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground/60' },
            { Icon: Calendar, label: '이번 달', value: stats.monthCount, unit: '일', accent: 'text-blue-600 dark:text-blue-400' },
            { Icon: Trophy, label: '베스트', value: stats.max, unit: '일', accent: 'text-amber-600 dark:text-amber-400' },
          ].map(({ Icon, label, value, unit, accent }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-0.5 px-2 py-2 text-center">
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

        {/* 월 캘린더 — 섹션 패턴 (border-t 위, 라벨 + 내용, 카드 wrapper 없음) */}
        <section className="pt-3 border-t border-[hsl(var(--hairline))]">
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
        <section className="pt-3 border-t border-[hsl(var(--hairline))]">
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-2 px-0.5">
            연간 패턴
          </div>
          <HabitYearHeatmap habit={habit} checkins={allCheckins} />
        </section>

        {/* 메모 */}
        <div>
          <div className="text-[10.5px] font-mono uppercase tracking-wide text-foreground/55 font-semibold mb-1.5">
            이번 달 메모
          </div>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onBlur={saveNote}
            placeholder="이번 달 기록 — 잘 된 점, 어려웠던 점, 다음 달 다짐"
            rows={3}
            className="w-full px-3 py-2 text-[13px] rounded-md border border-[hsl(var(--hairline))] bg-card focus:border-foreground/40 focus:outline-none resize-none placeholder:text-foreground/45"
          />
          <div className="mt-1 text-[10.5px] text-foreground/45">자동 저장됨 · 포커스 해제 시</div>
        </div>
      </div>
    </div>
  );
};

