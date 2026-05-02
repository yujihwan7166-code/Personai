/**
 * 좌측 사이드바 — 2박스 구조.
 *
 * 1) 대기함 — 어디에도 안 묶인 항목 보관소.
 *    빠른 추가 입력창 + 항목 리스트 (드래그 소스).
 * 2) 리스트 — 사용자 카테고리 폴더.
 *    행 클릭 = 펼침/접힘. 안의 항목 드래그 가능.
 *
 * 시간 필터(오늘/내일/이번주/이번달)는 헤더의 날짜 조절+뷰 토글로 충분 — 사이드바엔 없음.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Trash2, Eye, EyeOff, ChevronRight, FolderPlus,
} from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { taskListStore } from '@/services/planner/taskListStore';
import { notify } from '@/lib/notify';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { PlannerInput } from './PlannerInput';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { isWaiting } from '@/lib/planner/smartLists';
import {
  type PlannerTask, type TaskList, type TaskListColor,
  TASK_LIST_COLORS, PLANNER_LIST_CHANGED, PLANNER_TASK_CHANGED,
} from '@/types/planner';

interface PlannerSidebarProps {
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const PlannerSidebar = ({
  inputRef,
  onTaskClick,
}: PlannerSidebarProps) => {
  const [lists, setLists] = useState<TaskList[]>(() => taskListStore.list());
  const [allActive, setAllActive] = useState<PlannerTask[]>([]);
  const fallbackRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setLists(taskListStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_LIST_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_LIST_CHANGED, refresh);
  }, []);

  useEffect(() => {
    const refresh = () => setAllActive(
      taskStore.list().filter((t) => !t.done && !t.canceled),
    );
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  const waitingTasks = useMemo(
    () =>
      allActive.filter(isWaiting).sort((a, b) => {
        const priorityDelta = (b.priority ?? 0) - (a.priority ?? 0);
        if (priorityDelta !== 0) return priorityDelta;
        return b.createdAt.localeCompare(a.createdAt);
      }),
    [allActive],
  );

  const tasksByList = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    for (const t of allActive) {
      if (!t.listId) continue;
      const arr = map.get(t.listId) ?? [];
      arr.push(t);
      map.set(t.listId, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => {
        if (a.startAt && b.startAt) return a.startAt.localeCompare(b.startAt);
        if (a.startAt && !b.startAt) return -1;
        if (!a.startAt && b.startAt) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    }
    return map;
  }, [allActive]);

  const handleAdd = useCallback((title: string, parsed?: {
    startAt?: string; endAt?: string; recurrence?: PlannerTask['recurrence'];
    tags?: string[]; priority?: PlannerTask['priority'];
  }) => {
    taskStore.add({
      title,
      startAt: parsed?.startAt,
      endAt: parsed?.endAt,
      recurrence: parsed?.recurrence,
      tags: parsed?.tags,
      priority: parsed?.priority,
    });
    notify.success(parsed?.startAt ? '시간 배정해서 추가됐어요' : '대기함에 추가됐어요', { duration: 1200 });
  }, []);

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 1. 대기함 — 빠른 추가 + 보류 항목 리스트 */}
      <section className="shrink-0 flex flex-col min-h-0">
        <SidebarHeader label="대기함" count={waitingTasks.length} />
        <div className="px-1 mb-2">
          <PlannerInput
            inputRef={inputRef ?? fallbackRef}
            placeholder="+ 빠른 추가  (Enter)"
            onSubmit={handleAdd}
          />
        </div>
        {waitingTasks.length === 0 ? (
          <p className="px-2 py-1 text-[12px] text-foreground/65 leading-snug">
            추가한 항목 중 어디에도 안 묶인 게 여기 모여요.
          </p>
        ) : (
          <div className="space-y-px overflow-y-auto -mx-1 px-1 pb-0.5 max-h-[40vh]">
            {waitingTasks.map((task) => (
              <SidebarTaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.({ id: task.id, title: task.title })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 2. 리스트 — 카테고리 폴더 (펼치면 드래그 소스) */}
      <section className="shrink-0 flex flex-col min-h-0 flex-1">
        <SidebarHeader
          label="리스트"
          action={<NewListButton />}
        />
        {lists.length === 0 ? (
          <p className="px-2 py-1 text-[12px] text-foreground/65 leading-snug">
            반복하는 항목을 카테고리로 모아두는 곳이에요.
          </p>
        ) : (
          <div className="space-y-px overflow-y-auto -mx-1 px-1">
            {lists.map((list) => (
              <ListGroup
                key={list.id}
                list={list}
                tasks={tasksByList.get(list.id) ?? []}
                onTaskClick={(t) => onTaskClick?.({ id: t.id, title: t.title })}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// ────────────────────────────────────────────────
// SidebarHeader — 박스 라벨 (mono uppercase) + 옵션 카운트/액션.

const SidebarHeader = ({
  label, count, action,
}: { label: string; count?: number; action?: React.ReactNode }) => (
  <div className="flex items-center gap-2 px-2 mb-2 shrink-0">
    <span className="text-[13px] font-semibold tracking-tight text-foreground leading-none">
      {label}
    </span>
    {typeof count === 'number' && count > 0 && (
      <span className="text-[11px] tabular-nums text-foreground/60 font-medium">{count}</span>
    )}
    {action && <span className="ml-auto">{action}</span>}
  </div>
);

// ────────────────────────────────────────────────
// SidebarTaskRow — 사이드바 안 단순 행. 클릭=편집, 드래그=시간 배정/리스트로 이동.

const SidebarTaskRow = ({
  task, onClick,
}: { task: PlannerTask; onClick: () => void }) => (
  <DraggableInboxCard task={task}>
    <button
      type="button"
      onClick={onClick}
      className="group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] text-foreground hover:bg-accent transition-colors"
    >
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{
          backgroundColor: (task.priority ?? 0) > 0
            ? 'currentColor'
            : 'hsl(var(--muted-foreground) / 0.55)',
        }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{task.title}</span>
      {task.startAt && (
        <span className="text-[11px] tabular-nums text-foreground/60 shrink-0">
          {new Date(task.startAt).toLocaleTimeString('ko-KR', {
            hour: '2-digit', minute: '2-digit', hour12: false,
          })}
        </span>
      )}
    </button>
  </DraggableInboxCard>
);

// ────────────────────────────────────────────────
// ListGroup — 리스트 1개의 행 + 펼침/접힘 컨트롤.

const ListGroup = ({
  list, tasks, onTaskClick,
}: {
  list: TaskList;
  tasks: PlannerTask[];
  onTaskClick: (task: PlannerTask) => void;
}) => {
  const colorTokens = TASK_LIST_COLORS[list.color];
  const [expanded, setExpanded] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(list.name);

  const { setNodeRef, isOver } = useDroppable({
    id: `assign-list-${list.id}`,
    data: { kind: 'assign-list', listId: list.id },
  });

  const finishRename = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== list.name) {
      taskListStore.update(list.id, { name: trimmed });
    } else {
      setDraftName(list.name);
    }
    setRenaming(false);
  };

  if (renaming) {
    return (
      <div className="flex items-center gap-2 h-7 px-1.5 rounded-md bg-accent/60">
        <span className="text-[13px] leading-none shrink-0">{list.emoji ?? '📋'}</span>
        <input
          autoFocus
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') finishRename();
            else if (e.key === 'Escape') {
              setDraftName(list.name);
              setRenaming(false);
            }
          }}
          onBlur={finishRename}
          className="flex-1 bg-transparent text-[12.5px] outline-none text-foreground"
        />
      </div>
    );
  }

  return (
    <div>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            ref={setNodeRef}
            onClick={() => setExpanded((v) => !v)}
            onDoubleClick={() => {
              setDraftName(list.name);
              setRenaming(true);
            }}
            className={cn(
              'group flex items-center gap-1.5 h-8 px-2 rounded-md cursor-pointer transition-colors',
              'hover:bg-accent/60',
              isOver && 'bg-primary/10 ring-1 ring-primary/40',
              list.hidden && 'opacity-50',
            )}
          >
            <ChevronRight
              className={cn(
                'h-3 w-3 shrink-0 text-muted-foreground transition-transform',
                expanded && 'rotate-90',
              )}
            />
            {list.emoji ? (
              <span className="text-[13px] leading-none shrink-0">{list.emoji}</span>
            ) : (
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: colorTokens.stripe }}
                aria-hidden
              />
            )}
            <span className="flex-1 text-[13px] font-medium leading-tight truncate text-foreground">
              {list.name}
            </span>
            <span className="text-[11px] tabular-nums text-foreground/60 group-hover:hidden">
              {tasks.length || ''}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                taskListStore.toggleHidden(list.id);
              }}
              aria-label={list.hidden ? '숨김 해제' : '숨김'}
              title={list.hidden ? '숨김 해제' : '숨김'}
              className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-all shrink-0"
            >
              {list.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-44">
          <ContextMenuItem onSelect={() => { setDraftName(list.name); setRenaming(true); }}>
            이름 바꾸기
          </ContextMenuItem>
          <ContextMenuSub>
            <ContextMenuSubTrigger>색 변경</ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {(Object.keys(TASK_LIST_COLORS) as TaskListColor[]).map((c) => (
                <ContextMenuItem
                  key={c}
                  onSelect={() => taskListStore.update(list.id, { color: c })}
                  className={list.color === c ? 'bg-accent' : ''}
                >
                  <span
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: TASK_LIST_COLORS[c].stripe }}
                    aria-hidden
                  />
                  {c}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem
            onSelect={() => {
              if (window.confirm(`"${list.name}" 리스트를 지울까요? 안에 있는 항목은 대기함으로 옮겨집니다.`)) {
                taskStore.list()
                  .filter((t) => t.listId === list.id)
                  .forEach((t) => taskStore.update(t.id, { listId: undefined }));
                taskListStore.remove(list.id);
              }
            }}
            className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            삭제
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {expanded && (
        <div className="mt-0.5 space-y-px pl-5">
          {tasks.length === 0 ? (
            <p className="px-2 py-1 text-[11px] text-muted-foreground/80">비어 있음</p>
          ) : (
            tasks.map((task) => (
              <SidebarTaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────────────
// 새 리스트 추가 트리거 + 인라인 생성기.

const NewListButton = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="새 리스트"
        title="새 리스트"
        className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <FolderPlus className="h-3 w-3" />
      </button>
      {open && <NewListInlineDialog onDone={() => setOpen(false)} />}
    </>
  );
};

const NewListInlineDialog = ({ onDone }: { onDone: () => void }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<TaskListColor>('blue');
  const [emoji, setEmoji] = useState('📋');

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) taskListStore.add({ name: trimmed, emoji, color });
    onDone();
  };

  return (
    <div className="flex items-center gap-2 h-7 px-1.5 rounded-md bg-accent/60 mt-1">
      <button
        type="button"
        onClick={() => {
          const choices = ['📋', '💼', '🏃', '📚', '🍽️', '🏠', '🎯', '✨'];
          const i = choices.indexOf(emoji);
          setEmoji(choices[(i + 1) % choices.length]);
        }}
        className="text-[13px] leading-none shrink-0 hover:scale-110 transition-transform"
        title="이모지 변경"
      >
        {emoji}
      </button>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
          else if (e.key === 'Escape') onDone();
        }}
        onBlur={submit}
        placeholder="새 리스트 이름"
        className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60 text-foreground"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="w-3 h-3 rounded-full shrink-0 ring-1 ring-foreground/20"
            style={{ backgroundColor: TASK_LIST_COLORS[color].stripe }}
            aria-label="색 선택"
            onMouseDown={(e) => e.preventDefault()}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="grid grid-cols-4 p-2 gap-1 min-w-0">
          {(Object.keys(TASK_LIST_COLORS) as TaskListColor[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={cn(
                'w-5 h-5 rounded-full ring-1 transition-all',
                color === c ? 'ring-foreground scale-110' : 'ring-foreground/20',
              )}
              style={{ backgroundColor: TASK_LIST_COLORS[c].stripe }}
              aria-label={c}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
