/**
 * 좌측 "계획" 컬럼 — 오늘 할 일 체크리스트.
 *
 * 우측 "일정"이 시간 그리드라면 여기는 같은 정보의 리스트 표현 +
 * plannedFor 마킹된 시간 미정 항목까지. 시간 잡힌 게 위, 미정이 아래.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, Flag, ListTodo } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { cn } from '@/lib/utils';
import { PLANNER_TASK_CHANGED, PRIORITY_COLORS, TASK_LIST_COLORS, type PlannerTask } from '@/types/planner';

interface TodayExecutionBoardProps {
  anchorIso: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

const localDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isSameLocalDay = (iso: string | undefined, day: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

const sortPlanned = (items: PlannerTask[]) =>
  [...items].sort((a, b) => {
    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

export const TodayExecutionBoard = ({
  anchorIso,
  inputRef,
  onTaskClick,
}: TodayExecutionBoardProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const refresh = () => setTasks(taskStore.list().filter((task) => !task.done && !task.canceled && !task.someday));
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  const day = useMemo(() => new Date(anchorIso), [anchorIso]);
  const dayKey = useMemo(() => localDateKey(day), [day]);

  // 시간 잡힌 항목 — 반복 시리즈 인스턴스 포함, 시간 오름차순.
  const scheduled = useMemo(
    () =>
      taskStore
        .listScheduled(anchorIso)
        .filter((task) => !task.done && !task.canceled && !task.someday && isSameLocalDay(task.startAt, day))
        .sort((a, b) => (a.startAt ?? '').localeCompare(b.startAt ?? '')),
    // tasks 변화 시 재계산.
    [anchorIso, day, tasks],
  );

  // 시간 미정 + plannedFor 인 오늘 항목.
  const planned = useMemo(
    () => sortPlanned(tasks.filter((task) => !task.startAt && task.plannedFor === dayKey)),
    [dayKey, tasks],
  );

  const total = scheduled.length + planned.length;

  const handleAdd = (
    title: string,
    parsed?: {
      startAt?: string;
      endAt?: string;
      recurrence?: PlannerTask['recurrence'];
      tags?: string[];
      priority?: PlannerTask['priority'];
    },
  ) => {
    taskStore.add({
      title,
      startAt: parsed?.startAt,
      endAt: parsed?.endAt,
      recurrence: parsed?.recurrence,
      tags: parsed?.tags,
      priority: parsed?.priority,
      plannedFor: parsed?.startAt ? undefined : dayKey,
    });
    notify.success(parsed?.startAt ? '일정에 추가했어요' : '계획에 추가했어요', { duration: 1200 });
  };

  return (
    <section className="h-full min-h-0 flex flex-col">
      {/* 컬럼 라벨 */}
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2 mb-2 border-b border-[hsl(var(--hairline))]">
        <ListTodo className="h-4 w-4 text-foreground" />
        <span className="text-[14px] font-semibold tracking-tight text-foreground leading-none">
          계획
        </span>
        {total > 0 && (
          <span className="text-[11.5px] tabular-nums text-foreground/60 font-medium">{total}</span>
        )}
      </div>

      <div className="shrink-0 pb-2.5">
        <PlannerInput inputRef={inputRef} placeholder="+ 오늘 할 일 추가" onSubmit={handleAdd} hidePreview />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {total === 0 ? (
          <button
            type="button"
            onClick={() => inputRef?.current?.focus()}
            className="w-full rounded-md px-2 py-3 text-left text-[12.5px] text-foreground/70 hover:bg-accent hover:text-foreground transition-colors leading-snug"
          >
            오늘 하기로 정한 항목이 없어요.<br />
            위 입력창에 적거나, 대기함 카드를 끌어와도 돼요.
          </button>
        ) : (
          <div className="pb-2">
            {/* 시간 잡힌 항목 — 시간 prefix 가 있는 컴팩트 행. */}
            {scheduled.length > 0 && (
              <div className="space-y-0.5">
                {scheduled.map((task) => (
                  <ScheduledRow
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                  />
                ))}
              </div>
            )}

            {/* 시간 정한 것 ↔ 안 정한 것 사이 시각적 구분선. */}
            {scheduled.length > 0 && planned.length > 0 && (
              <div className="my-2 border-t border-dashed border-[hsl(var(--hairline))]" aria-hidden />
            )}

            {/* 시간 미정 — 풀 카드 (서브태스크 inline 편집 등). */}
            {planned.length > 0 && (
              <div className="space-y-0.5">
                {planned.map((task) => (
                  <DraggableInboxCard key={task.id} task={task}>
                    <PlannerCard
                      variant="inbox"
                      title={task.title}
                      done={task.done}
                      onToggle={() => taskStore.toggleDone(task.id)}
                      onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                      onDelete={() => taskStore.remove(task.id)}
                      onTogglePin={() => taskStore.togglePinned(task.id)}
                      priority={task.priority}
                      pinned={task.pinned}
                      hasNote={Boolean(task.note)}
                      note={task.note}
                      canceled={task.canceled}
                      recurring={Boolean(task.recurrence)}
                      subtasks={task.subtasks}
                      onToggleSubtask={(sid) => taskStore.toggleSubtask(task.id, sid)}
                      onAddSubtask={(text) => taskStore.addSubtask(task.id, text)}
                      onRemoveSubtask={(sid) => taskStore.removeSubtask(task.id, sid)}
                      onUpdateSubtask={(sid, text) => taskStore.updateSubtaskText(task.id, sid, text)}
                      tags={task.tags}
                    />
                  </DraggableInboxCard>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

/** 시간 잡힌 task — 시간 prefix + 제목 + 우선순위 dot. 클릭=편집, 체크박스=완료 토글. */
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
      <span
        className="text-[11px] font-mono tabular-nums text-foreground/80 shrink-0 w-10"
        aria-label="시작 시각"
      >
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
