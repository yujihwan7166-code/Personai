import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Clock3, Hourglass, Plus } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { PLANNER_TASK_CHANGED, TASK_LIST_COLORS, type PlannerTask } from '@/types/planner';

interface TodayExecutionBoardProps {
  anchorIso: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string }) => void;
  onCreateTask?: () => void;
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
  iso
    ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

const sortUnscheduled = (items: PlannerTask[]) =>
  [...items].sort((a, b) => {
    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

const compareScheduled = (a: PlannerTask, b: PlannerTask) => {
  const timeDelta = (a.startAt ?? '').localeCompare(b.startAt ?? '');
  if (timeDelta !== 0) return timeDelta;
  return (b.priority ?? 0) - (a.priority ?? 0);
};

export const TodayExecutionBoard = ({
  anchorIso,
  inputRef,
  onTaskClick,
  onCreateTask,
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

  // 시간표 = 그 날 시간배정 (반복 시리즈 인스턴스 포함).
  const scheduled = useMemo(
    () =>
      taskStore
        .listScheduled(anchorIso)
        .filter((task) => !task.done && !task.canceled && !task.someday && isSameLocalDay(task.startAt, day))
        .sort(compareScheduled),
    // tasks 변화 시 재계산 트리거.
    [anchorIso, day, tasks],
  );

  // 계획(plannedFor) = 그 날 하기로 한 시간 미정 항목.
  const planned = useMemo(
    () => sortUnscheduled(tasks.filter((task) => !task.startAt && task.plannedFor === dayKey)),
    [dayKey, tasks],
  );

  // 헤더 라벨 — 오늘/내일이면 단어, 그 외엔 날짜.
  const selectionTitle = useMemo(() => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (isSameLocalDay(anchorIso, today)) return '오늘';
    if (isSameLocalDay(anchorIso, tomorrow)) return '내일';
    return day.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  }, [anchorIso, day]);

  const total = scheduled.length + planned.length;
  const headline = total > 0 ? `${total}개` : '비어 있음';

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
      // 시간 없으면 현재 보고있는 탭의 plannedFor 키로 (오늘 탭이면 오늘, 이번주 탭이면 이번주 월요일).
      plannedFor: parsed?.startAt ? undefined : dayKey,
    });
    notify.success(parsed?.startAt ? '시간표에 추가했어요' : '계획에 추가했어요', { duration: 1200 });
  };

  return (
    <section className="h-full min-h-0 flex flex-col border-b lg:border-b-0 lg:border-r border-[hsl(var(--hairline))] pb-3 lg:pb-0 lg:pr-3">
      <div className="shrink-0 pb-3 border-b border-[hsl(var(--hairline))]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold">실행 큐</p>
            <h2 className="mt-1 flex items-center gap-2 text-[17px] font-semibold tracking-tight text-foreground">
              <span className="min-w-0 truncate">{selectionTitle}</span>
              <span className="text-[13px] font-medium tabular-nums text-muted-foreground">{headline}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={onCreateTask ?? (() => inputRef?.current?.focus())}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[hsl(var(--hairline))] bg-background hover:bg-accent transition-colors"
            aria-label="할 일 추가"
            title="할 일 추가"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3">
          <PlannerInput inputRef={inputRef} placeholder="+ 할 일 추가" onSubmit={handleAdd} hidePreview />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-3 space-y-3">
        {total === 0 && (
          <button
            type="button"
            onClick={() => inputRef?.current?.focus()}
            className="w-full rounded-md px-2 py-2 text-left text-[12.5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            지금 선택한 곳에 할 일을 추가하세요
          </button>
        )}

        <TaskGroup icon={<Clock3 className="h-3.5 w-3.5" />} title="시간표" count={scheduled.length}>
          {scheduled.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
              className="w-full rounded-md text-left hover:bg-accent transition-colors"
            >
              <PlannerCard
                variant="block"
                kind="task"
                title={task.title}
                startLabel={formatTime(task.startAt)}
                done={task.done}
                priority={task.priority}
                color={task.color ? TASK_LIST_COLORS[task.color].stripe : undefined}
                hasNote={Boolean(task.note)}
                recurring={Boolean(task.recurrence)}
                subtasks={task.subtasks}
                tags={task.tags}
              />
            </button>
          ))}
        </TaskGroup>

        <TaskGroup icon={<Hourglass className="h-3.5 w-3.5" />} title="계획" count={planned.length}>
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
        </TaskGroup>
      </div>
    </section>
  );
};

const TaskGroup = ({
  icon,
  title,
  count,
  children,
}: {
  icon: ReactNode;
  title: string;
  count: number;
  children: ReactNode;
}) => (
  <div className={count === 0 ? 'hidden' : undefined}>
    <div className="mb-1.5 flex items-center gap-1.5 px-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] font-mono uppercase tracking-[0.12em] text-muted-foreground font-semibold">
        {title}
      </span>
      <span className="ml-auto text-[10.5px] tabular-nums text-muted-foreground">{count}</span>
    </div>
    <div className="space-y-0.5 pb-2">{children}</div>
  </div>
);
