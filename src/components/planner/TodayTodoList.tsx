/**
 * 좌하 "할 일" 박스 — 시간 안 정한 오늘 체크리스트.
 *
 * plannedFor=anchor 일 + startAt 없는 항목들. 추가 path:
 * - 헤더 + 버튼 → 인라인 input row
 * - 또는 day 뷰 공통 input (시간 NL 없으면 자동 여기)
 */
import { useEffect, useMemo, useState } from 'react';
import { ListTodo, Plus, Clock, Check, Ban, Pin, ArrowUp, Hourglass, Flag, Trash2 } from 'lucide-react';
import { useDndContext, useDroppable } from '@dnd-kit/core';
import { taskStore } from '@/services/planner/taskStore';
import { cn } from '@/lib/utils';
import { PlannerCard } from './PlannerCard';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import type { PlannerDragData } from './dnd/plannerDndTypes';
import { PLANNER_TASK_CHANGED, PRIORITY_COLORS, PRIORITY_LABELS, type PlannerTask, type Priority } from '@/types/planner';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { notify } from '@/lib/notify';

interface TodayTodoListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** + 버튼 / 빈 상태 클릭 시 — 할 일 모드로 모달을 연다. */
  onAdd?: () => void;
  embedded?: boolean;
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

export const TodayTodoList = ({ anchorIso, onTaskClick, onAdd, embedded }: TodayTodoListProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const { active } = useDndContext();
  const activeDrag = active?.data.current as PlannerDragData | undefined;

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
  const dropHint = activeDrag?.kind === 'scheduled-task'
    ? '시간만 빼고 오늘 할 일로'
    : activeDrag?.kind === 'scheduled-event'
      ? '일정은 할 일로 바꿀 수 없어요'
      : '오늘 할 일에 놓기';

  return (
    <section
      ref={setDropRef}
      data-planner-readable="todo"
      className={cn(
        'relative w-full h-full min-h-0 flex flex-col transition-colors',
        embedded
          ? 'bg-card px-3 py-2.5'
          : 'rounded-2xl border bg-card/80 px-3 py-2.5 shadow-[0_1px_2px_hsl(30_15%_8%/0.025)]',
        isOver
          ? embedded
            ? 'bg-primary/5 ring-1 ring-inset ring-primary/45'
            : 'border-primary/50 bg-primary/5'
          : !embedded && 'border-foreground/10',
      )}
    >
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-1.5 mb-1.5 border-b border-foreground/10">
        <ListTodo className="h-4 w-4 text-foreground/70" strokeWidth={2.15} />
        <span className="text-[12px] font-bold tracking-[0.04em] uppercase text-foreground/80 leading-none">
          할 일
        </span>
        {planned.length > 0 && (
          <span className="text-[12px] tabular-nums text-foreground/60 font-semibold">{planned.length}</span>
        )}
        <button
          type="button"
          onClick={onAdd}
          aria-label="할 일 추가"
          title="할 일 추가"
          className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
        </button>
      </div>
      {isOver && (
        <div className="pointer-events-none absolute left-3 right-3 top-[46px] z-10 rounded-lg border border-primary/35 bg-primary/10 px-3 py-2 text-[12.5px] font-semibold text-primary shadow-[0_8px_22px_-18px_hsl(var(--primary)/0.7)]">
          {dropHint}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {planned.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              'group w-full text-left transition-colors hover:text-foreground',
              embedded
                ? 'rounded-md px-2 py-2 hover:bg-accent/55'
                : 'rounded-lg border border-dashed border-foreground/12 bg-background/35 px-3 py-2.5 hover:border-foreground/25 hover:bg-accent/70',
            )}
          >
            <span className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground group-hover:text-foreground">
                <ListTodo className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-foreground">
                    오늘 할 일이 비어있어요.
                  </span>
                <span className="mt-0.5 block text-[12.5px] text-foreground/65">
                  바로 할 일을 하나 추가
                </span>
              </span>
            </span>
          </button>
        ) : (
          <div className="space-y-0.5 pb-1">
            {planned.map((task) => (
              <ContextMenu key={task.id}>
                <ContextMenuTrigger asChild>
                  <div>
                    <DraggableInboxCard task={task}>
                      <PlannerCard
                        variant="inbox"
                        title={task.title}
                        done={task.done}
                        onToggle={() => taskStore.toggleDone(task.id)}
                        onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
                        onEdit={() => onTaskClick?.({ id: task.id, title: task.title })}
                        color={task.color}
                        onColorChange={(color) => taskStore.update(task.id, { color })}
                        onDelete={() => taskStore.remove(task.id)}
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
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onSelect={() => onTaskClick?.({ id: task.id, title: task.title })}>
                    <Clock className="mr-2 h-3.5 w-3.5" />시간 배정
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => taskStore.toggleDone(task.id)}>
                    <Check className="mr-2 h-3.5 w-3.5" />{task.done ? '완료 취소' : '완료'}
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => taskStore.update(task.id, { canceled: !task.canceled })}>
                    <Ban className="mr-2 h-3.5 w-3.5" />{task.canceled ? '취소 되돌림' : '취소'}
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onSelect={() => taskStore.togglePinned(task.id)}>
                    <Pin className={`mr-2 h-3.5 w-3.5 ${task.pinned ? 'fill-current' : ''}`} />
                    {task.pinned ? '고정 해제' : '고정'}
                  </ContextMenuItem>
                  <ContextMenuItem onSelect={() => taskStore.update(task.id, { someday: !task.someday })}>
                    {task.someday ? <ArrowUp className="mr-2 h-3.5 w-3.5" /> : <Hourglass className="mr-2 h-3.5 w-3.5" />}
                    {task.someday ? '대기함으로' : '보류함으로'}
                  </ContextMenuItem>
                  <ContextMenuSub>
                    <ContextMenuSubTrigger>
                      <Flag
                        className="mr-2 h-3.5 w-3.5"
                        style={(task.priority ?? 0) > 0
                          ? { color: PRIORITY_COLORS[task.priority as Priority], fill: PRIORITY_COLORS[task.priority as Priority] }
                          : undefined}
                      />
                      우선순위
                    </ContextMenuSubTrigger>
                    <ContextMenuSubContent className="w-32">
                      {([3, 2, 1, 0] as Priority[]).map((p) => (
                        <ContextMenuItem
                          key={p}
                          onSelect={() => taskStore.update(task.id, { priority: p === 0 ? undefined : p })}
                          className={task.priority === p || (p === 0 && !task.priority) ? 'bg-accent' : ''}
                        >
                          {p > 0 && (
                            <Flag className="mr-2 h-3.5 w-3.5" style={{ color: PRIORITY_COLORS[p], fill: PRIORITY_COLORS[p] }} />
                          )}
                          {p === 0 && <span className="mr-2 inline-block w-3.5" aria-hidden />}
                          {PRIORITY_LABELS[p]}
                        </ContextMenuItem>
                      ))}
                    </ContextMenuSubContent>
                  </ContextMenuSub>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onSelect={() => {
                      const { id: _id, createdAt: _ca, ...rest } = task;
                      void _id; void _ca;
                      const snap = { ...rest } as Omit<PlannerTask, 'id' | 'createdAt'>;
                      taskStore.remove(task.id);
                      notify.success('삭제됐어요', {
                        duration: 5000,
                        action: { label: '되돌리기', onClick: () => taskStore.add(snap) },
                      });
                    }}
                    className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />삭제
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
