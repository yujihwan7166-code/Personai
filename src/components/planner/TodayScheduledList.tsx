/**
 * 좌상 "일정" 박스 — 오늘 시간 잡힌 항목들의 리스트 표현.
 * (우측 "타임라인" 이 시간 그리드 표현이라면 여기는 같은 데이터의 리스트 버전)
 *
 * 새 항목 추가는 day 뷰 공통 입력 또는 타임라인 슬롯 클릭으로 — 여기는 read-only.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Flag, ListChecks } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { cn } from '@/lib/utils';
import { PLANNER_TASK_CHANGED, PRIORITY_COLORS, TASK_LIST_COLORS, type PlannerTask } from '@/types/planner';

interface TodayScheduledListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

const isSameLocalDay = (iso: string | undefined, day: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

export const TodayScheduledList = ({ anchorIso, onTaskClick }: TodayScheduledListProps) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  const day = useMemo(() => new Date(anchorIso), [anchorIso]);

  const scheduled = useMemo(
    () =>
      taskStore
        .listScheduled(anchorIso)
        .filter((task) => !task.done && !task.canceled && !task.someday && isSameLocalDay(task.startAt, day))
        .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? '')),
    [anchorIso, day, tick],
  );

  return (
    <section className="h-full min-h-0 flex flex-col rounded-lg border border-[hsl(var(--hairline))] bg-card p-3">
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2 mb-2 border-b border-[hsl(var(--hairline))]">
        <ListChecks className="h-4 w-4 text-foreground" />
        <span className="text-[14px] font-semibold tracking-tight text-foreground leading-none">
          일정
        </span>
        {scheduled.length > 0 && (
          <span className="text-[11.5px] tabular-nums text-foreground/60 font-medium">{scheduled.length}</span>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {scheduled.length === 0 ? (
          <p className="px-2 py-2 text-[12.5px] text-foreground/65 leading-snug">
            오늘 시간 잡힌 항목이 없어요. 우측 타임라인 슬롯을 클릭해 시간 정해 추가할 수 있어요.
          </p>
        ) : (
          <div className="space-y-0.5 pb-1">
            {scheduled.map((task) => (
              <ScheduledRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

/** 시간 잡힌 task 단일 행 — 체크박스 + 시간 prefix + 색 stripe + 제목 + 우선순위. */
const ScheduledRow = ({ task, onClick }: { task: PlannerTask; onClick: () => void }) => {
  const stripe = task.color ? TASK_LIST_COLORS[task.color].stripe : undefined;
  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); taskStore.toggleDone(task.id); }}
        aria-label={task.done ? '완료 취소' : '완료'}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
          task.done
            ? 'bg-foreground border-foreground text-background'
            : 'border-foreground/30 hover:border-foreground/60',
        )}
      >
        {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <span className="text-[11px] font-mono tabular-nums text-foreground/80 shrink-0 w-10" aria-label="시작 시각">
        {formatTime(task.startAt)}
      </span>
      {stripe && (
        <span
          className="h-3.5 w-0.5 rounded-full shrink-0"
          style={{ backgroundColor: stripe }}
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-[13px] leading-tight',
          task.done ? 'text-foreground/40 line-through' : 'text-foreground',
        )}
      >
        {task.title}
      </button>
      {(task.priority ?? 0) > 0 && (
        <Flag
          className="h-3 w-3 shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority!], fill: PRIORITY_COLORS[task.priority!] }}
          aria-label={`우선순위 P${task.priority}`}
        />
      )}
    </div>
  );
};
