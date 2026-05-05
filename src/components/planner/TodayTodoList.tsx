/**
 * 좌하 "할 일" 박스 — 시간 안 정한 오늘 체크리스트.
 *
 * plannedFor=anchor 일 + startAt 없는 항목들. 추가 path:
 * - 헤더 + 버튼 → 인라인 input row
 * - 또는 day 뷰 공통 input (시간 NL 없으면 자동 여기)
 */
import { useEffect, useMemo, useState } from 'react';
import { ListTodo, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { taskStore } from '@/services/planner/taskStore';
import { cn } from '@/lib/utils';
import { PlannerCard } from './PlannerCard';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { PLANNER_TASK_CHANGED, type PlannerTask } from '@/types/planner';

interface TodayTodoListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** + 버튼 / 빈 상태 클릭 시 — 할 일 모드로 모달을 연다. */
  onAdd?: () => void;
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

export const TodayTodoList = ({ anchorIso, onTaskClick, onAdd }: TodayTodoListProps) => {
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

  // 시간 블록을 여기 드래그하면 일정→할 일 변환 (시간 빼고 plannedFor=오늘).
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `todo-list-${dayKey}`,
    data: { kind: 'todo-list', dayKey },
  });

  return (
    <section
      ref={setDropRef}
      className={cn(
        'h-full min-h-0 flex flex-col rounded-lg border bg-card p-3 transition-colors',
        isOver ? 'border-primary/50 bg-primary/5' : 'border-foreground/20',
      )}
    >
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2 mb-2 border-b border-foreground/20">
        <ListTodo className="h-4 w-4 text-foreground" />
        <span className="text-[14px] font-semibold tracking-tight text-foreground leading-none">
          할 일
        </span>
        {planned.length > 0 && (
          <span className="text-[11.5px] tabular-nums text-foreground/60 font-medium">{planned.length}</span>
        )}
        <button
          type="button"
          onClick={onAdd}
          aria-label="할 일 추가"
          title="할 일 추가"
          className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded text-foreground/60 hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {planned.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="w-full rounded-md px-2 py-3 text-left text-[12.5px] text-foreground/70 hover:bg-accent hover:text-foreground transition-colors leading-snug"
          >
            오늘 하기로 정한 항목이 없어요.<br />
            <span className="text-foreground/55">+ 로 새 할 일 추가</span>
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

