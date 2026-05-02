/**
 * 좌하 "할 일" 박스 — 시간 안 정한 오늘 체크리스트.
 *
 * plannedFor=오늘 + startAt 없는 항목들. 빠른 추가 입력은 여기.
 * 시간 잡으면 → 좌상 "계획" + 우측 "타임라인" 으로 자동 이동 (plannedFor 자동 해제).
 */
import { useEffect, useMemo, useState } from 'react';
import { ListTodo } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { PLANNER_TASK_CHANGED, type PlannerTask } from '@/types/planner';

interface TodayTodoListProps {
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

const sortPlanned = (items: PlannerTask[]) =>
  [...items].sort((a, b) => {
    const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
    if (priorityDelta !== 0) return priorityDelta;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });

export const TodayTodoList = ({ anchorIso, inputRef, onTaskClick }: TodayTodoListProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const refresh = () => setTasks(taskStore.list().filter((task) => !task.done && !task.canceled && !task.someday));
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  const dayKey = useMemo(() => localDateKey(new Date(anchorIso)), [anchorIso]);

  const planned = useMemo(
    () => sortPlanned(tasks.filter((task) => !task.startAt && task.plannedFor === dayKey)),
    [dayKey, tasks],
  );

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
      // 시간 안 정했으면 그 날 할 일에. 시간 NL 입력은 계획/타임라인 쪽으로.
      plannedFor: parsed?.startAt ? undefined : dayKey,
    });
    notify.success(parsed?.startAt ? '계획에 추가했어요' : '할 일에 추가했어요', { duration: 1200 });
  };

  return (
    <section className="h-full min-h-0 flex flex-col rounded-lg border border-[hsl(var(--hairline))] bg-card p-3">
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2 mb-2 border-b border-[hsl(var(--hairline))]">
        <ListTodo className="h-4 w-4 text-foreground" />
        <span className="text-[14px] font-semibold tracking-tight text-foreground leading-none">
          할 일
        </span>
        {planned.length > 0 && (
          <span className="text-[11.5px] tabular-nums text-foreground/60 font-medium">{planned.length}</span>
        )}
      </div>

      <div className="shrink-0 pb-2.5">
        <PlannerInput inputRef={inputRef} placeholder="+ 오늘 할 일 추가" onSubmit={handleAdd} hidePreview />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {planned.length === 0 ? (
          <button
            type="button"
            onClick={() => inputRef?.current?.focus()}
            className="w-full rounded-md px-2 py-3 text-left text-[12.5px] text-foreground/70 hover:bg-accent hover:text-foreground transition-colors leading-snug"
          >
            오늘 하기로 정한 항목이 없어요.<br />
            위 입력창에 적거나, 대기함 카드를 끌어와도 돼요.
          </button>
        ) : (
          <div className="space-y-0.5 pb-1">
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
    </section>
  );
};
