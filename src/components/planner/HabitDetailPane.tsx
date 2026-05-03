/**
 * 우측 detail pane — 선택된 습관의 통계 + 월 캘린더 + 메모.
 */
import { useMemo, useState } from 'react';
import { Edit3, Flame, MoreHorizontal, Pin, Target, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TASK_LIST_COLORS } from '@/types/planner';
import type { Habit } from '@/types/habit';
import { habitStore } from '@/services/planner/habitStore';
import { habitCheckinStore } from '@/services/planner/habitCheckinStore';
import { useHabitCheckins } from '@/hooks/planner/useHabitCheckins';
import {
  currentStreak, maxStreak, monthCheckinCount, monthCompletionRate,
  totalCheckins, toDateKey,
} from '@/lib/planner/habitStats';
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
      monthRate: monthCompletionRate(habit, viewYear, viewMonth, allCheckins),
      total: totalCheckins(habit, allCheckins),
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
      {/* 헤더 */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-12 border-b border-[hsl(var(--hairline))]">
        <span
          className="h-7 w-7 inline-flex items-center justify-center rounded-full text-[14px] shrink-0"
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

      {/* 본문 — 스크롤 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* Stats 4 카드 */}
        <div className="grid grid-cols-2 gap-2">
          <StatCard Icon={Target} label="월간 출석" value={`${stats.monthCount}일`} tone="text-emerald-500" />
          <StatCard Icon={Zap} label="총 체크인" value={`${stats.total}일`} tone="text-amber-500" />
          <StatCard Icon={TrendingUp} label="월별 비율" value={`${Math.round(stats.monthRate * 100)}%`} tone="text-blue-500" />
          <StatCard Icon={Flame} label="연속" value={`${stats.streak}일`} tone={stats.streak >= 3 ? 'text-rose-500' : 'text-foreground/55'} sub={stats.max > 0 ? `최장 ${stats.max}일` : undefined} />
        </div>

        {/* 월 캘린더 */}
        <div className="rounded-lg border border-[hsl(var(--hairline))] p-3">
          <HabitMonthGrid
            habit={habit}
            year={viewYear}
            month1Indexed={viewMonth}
            onChangeMonth={(y, m) => { setViewYear(y); setViewMonth(m); }}
          />
        </div>

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

const StatCard = ({
  Icon, label, value, tone, sub,
}: {
  Icon: typeof Target;
  label: string;
  value: string;
  tone: string;
  sub?: string;
}) => (
  <div className="rounded-lg border border-[hsl(var(--hairline))] bg-card/40 px-3 py-2.5">
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className={cn('h-3.5 w-3.5', tone)} />
      <span className="text-[11px] font-mono uppercase tracking-wide text-foreground/55 font-semibold">
        {label}
      </span>
    </div>
    <div className="text-[20px] font-bold tabular-nums leading-none">{value}</div>
    {sub && <div className="mt-0.5 text-[10.5px] text-foreground/55">{sub}</div>}
  </div>
);
