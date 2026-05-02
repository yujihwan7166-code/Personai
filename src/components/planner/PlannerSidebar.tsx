/**
 * 좌측 사이드바 — Smart Lists + 사용자 Lists + 선택된 list 의 task 목록.
 *
 * 구조:
 * 1. 상단 Smart Lists 행 — Today/Tomorrow/Next7/Inbox/All
 * 2. 사용자 Lists 트리 — 색·이모지·visibility 토글
 * 3. 하단 task 목록 — 선택된 (smart 또는 사용자) list 의 항목들 + 빠른 추가
 *
 * 기본 진입: Today.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Inbox as InboxIcon, Trash2, Eye, EyeOff,
  Check, Clock, FolderPlus, Clock4, CheckSquare, X, Folder,
} from 'lucide-react';
import { useInboxCounts } from '@/hooks/planner/useInbox';
import { taskStore } from '@/services/planner/taskStore';
import { taskListStore } from '@/services/planner/taskListStore';
import { notify } from '@/lib/notify';
import {
  ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
  ContextMenuSub, ContextMenuSubContent, ContextMenuSubTrigger, ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';
import { Overdue } from './Overdue';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { DroppableInbox } from './dnd/DroppableInbox';
import { SMART_LISTS, SMART_LIST_ORDER, type SmartListId } from '@/lib/planner/smartLists';
import { computeStreakStats } from '@/lib/planner/streak';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import {
  type PlannerTask, type TaskList, type TaskListColor,
  TASK_LIST_COLORS, PLANNER_LIST_CHANGED, PLANNER_TASK_CHANGED,
} from '@/types/planner';

interface PlannerSidebarProps {
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

/** 활성 선택 — Smart List id 또는 사용자 list id (`list:${id}`). */
type Selection =
  | { kind: 'smart'; id: SmartListId }
  | { kind: 'list'; id: string };

const RECOMMENDED_LISTS: Array<{ name: string; emoji: string; color: TaskListColor }> = [
  { name: '일',   emoji: '💼', color: 'blue'   },
  { name: '운동', emoji: '🏃', color: 'green'  },
  { name: '공부', emoji: '📚', color: 'violet' },
];

export const PlannerSidebar = ({ inputRef, onTaskClick }: PlannerSidebarProps) => {
  // 활성 선택 — Today 가 디폴트.
  const [selection, setSelection] = useState<Selection>({ kind: 'smart', id: 'today' });
  // ── 다중 선택 (Bulk) 모드 ──
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const exitBulkMode = useCallback(() => {
    setBulkMode(false);
    setBulkSelected(new Set());
  }, []);
  const toggleBulkPick = useCallback((id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      // 가상 인스턴스는 master id 기반으로 동기화 — 하나의 master 한 번 선택.
      const targetId = isInstanceId(id) ? (parseInstanceId(id)?.masterId ?? id) : id;
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }, []);
  // ESC 로 종료.
  useEffect(() => {
    if (!bulkMode) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        exitBulkMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [bulkMode, exitBulkMode]);
  // 사용자 lists 구독 — broadcast 이벤트 listen.
  const [lists, setLists] = useState<TaskList[]>(() => taskListStore.list());
  // 모든 active task — Smart List filter 적용 위해.
  const counts = useInboxCounts();
  const [allActive, setAllActive] = useState<PlannerTask[]>([]);
  const fallbackRef = useRef<HTMLInputElement>(null);

  // listStore 변경 listen.
  useEffect(() => {
    const refresh = () => setLists(taskListStore.list());
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_LIST_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_LIST_CHANGED, refresh);
  }, []);

  // 모든 active task (smart list filter 용).
  useEffect(() => {
    const refresh = () => setAllActive(
      taskStore.list().filter((t) => !t.done && !t.canceled),
    );
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  // 선택된 list 의 task 목록 계산.
  const selectedTasks = useMemo<PlannerTask[]>(() => {
    if (selection.kind === 'smart') {
      const def = SMART_LISTS[selection.id];
      const now = new Date();
      return allActive.filter((t) => def.match(t, now)).sort((a, b) => {
        // 시간배정 우선 (시간 오름차순), 인박스는 최신순.
        if (a.startAt && b.startAt) return a.startAt.localeCompare(b.startAt);
        if (a.startAt && !b.startAt) return -1;
        if (!a.startAt && b.startAt) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
    }
    // 사용자 list — 그 list 에 속한 active task.
    return allActive
      .filter((t) => t.listId === selection.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [selection, allActive]);

  // Smart List 카운트 (Today/Tomorrow/Next7/Inbox/All).
  const smartCounts = useMemo<Record<SmartListId, number>>(() => {
    const now = new Date();
    return {
      today: allActive.filter((t) => SMART_LISTS.today.match(t, now)).length,
      tomorrow: allActive.filter((t) => SMART_LISTS.tomorrow.match(t, now)).length,
      next7: allActive.filter((t) => SMART_LISTS.next7.match(t, now)).length,
      inbox: allActive.filter((t) => SMART_LISTS.inbox.match(t, now)).length,
      all: allActive.length,
    };
  }, [allActive]);

  // 사용자 list 별 카운트.
  const listCounts = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const t of allActive) {
      if (t.listId) map[t.listId] = (map[t.listId] ?? 0) + 1;
    }
    return map;
  }, [allActive]);

  // 빠른 추가 — 선택된 list 컨텍스트 반영.
  const handleAdd = (title: string, parsed?: { startAt?: string; endAt?: string; recurrence?: PlannerTask['recurrence']; tags?: string[]; priority?: PlannerTask['priority'] }) => {
    const targetListId = selection.kind === 'list' ? selection.id : undefined;
    taskStore.add({
      title,
      startAt: parsed?.startAt,
      endAt: parsed?.endAt,
      recurrence: parsed?.recurrence,
      tags: parsed?.tags,
      priority: parsed?.priority,
      listId: targetListId,
    });
    notify.success(parsed?.startAt ? '시간 배정해서 추가됐어요' : '추가됐어요', { duration: 1200 });
  };

  const handleDelete = useCallback((task: PlannerTask) => {
    taskStore.remove(task.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => taskStore.add(task) },
    });
  }, []);

  const focusInput = () => (inputRef ?? fallbackRef).current?.focus();

  const hiddenCount = lists.filter((l) => l.hidden).length;
  const showAllChip = hiddenCount > 0;

  // 선택된 헤더 라벨.
  const selectionLabel =
    selection.kind === 'smart'
      ? `${SMART_LISTS[selection.id].emoji} ${SMART_LISTS[selection.id].label}`
      : (() => {
          const list = lists.find((l) => l.id === selection.id);
          return list ? `${list.emoji ?? '📋'} ${list.name}` : '분류';
        })();

  // ── Bulk 일괄 액션 핸들러 ──
  const handleBulkDelete = () => {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    if (!window.confirm(`${ids.length}개 항목을 삭제할까요?`)) return;
    ids.forEach((id) => taskStore.remove(id));
    notify.success(`${ids.length}개 삭제됨`, { duration: 1500 });
    exitBulkMode();
  };

  const handleBulkComplete = () => {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    ids.forEach((id) => {
      const t = taskStore.findMaster(id);
      if (t && !t.done) taskStore.toggleDone(id);
    });
    notify.success(`${ids.length}개 완료`, { duration: 1500 });
    exitBulkMode();
  };

  const handleBulkAssignList = (listId: string | undefined) => {
    const ids = Array.from(bulkSelected);
    if (ids.length === 0) return;
    ids.forEach((id) => taskStore.update(id, { listId }));
    notify.success(
      listId
        ? `${ids.length}개 분류 변경`
        : `${ids.length}개 인박스로 이동`,
      { duration: 1500 },
    );
    exitBulkMode();
  };

  const handleBulkSelectAll = () => {
    const allIds = selectedTasks.map((t) =>
      isInstanceId(t.id) ? (parseInstanceId(t.id)?.masterId ?? t.id) : t.id,
    );
    setBulkSelected(new Set(allIds));
  };

  return (
    <DroppableInbox className="h-full flex flex-col">
      {/* ── Smart Lists 행 ── */}
      <div className="shrink-0 px-1 pb-2 border-b border-[hsl(var(--hairline))] mb-2">
        <div className="flex items-center gap-0.5 overflow-x-auto -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SMART_LIST_ORDER.map((id) => {
            const def = SMART_LISTS[id];
            const active = selection.kind === 'smart' && selection.id === id;
            const count = smartCounts[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelection({ kind: 'smart', id })}
                className={cn(
                  'inline-flex items-center gap-1 px-1.5 h-6 rounded text-[11px] font-medium transition-colors shrink-0',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
                title={def.hint ?? def.label}
              >
                <span aria-hidden>{def.emoji}</span>
                <span>{def.label}</span>
                {count > 0 && (
                  <span className={cn('text-[10px] tabular-nums opacity-80')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 사용자 Lists 트리 ── */}
      <UserListsTree
        lists={lists}
        listCounts={listCounts}
        selection={selection}
        onSelect={(id) => setSelection({ kind: 'list', id })}
      />

      {/* visibility 안전망 칩 */}
      {showAllChip && (
        <button
          type="button"
          onClick={() => {
            taskListStore.showAll();
            notify.info('숨김 해제됨', { duration: 1200 });
          }}
          className="self-start mx-2 my-1 inline-flex items-center gap-1 px-2 h-5 rounded text-[10.5px] font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
        >
          <EyeOff className="h-3 w-3" />
          {hiddenCount}개 숨김 — 모두 보기
        </button>
      )}

      {/* ── 선택된 list 의 task 목록 ── */}
      <div className="flex-1 min-h-0 flex flex-col mt-2 px-1">
        <div className="flex items-center gap-2 px-1 mb-2 shrink-0">
          <span className="text-[12.5px] font-semibold tracking-tight text-foreground truncate">
            {selectionLabel}
          </span>
          <span className="text-[10.5px] text-muted-foreground tabular-nums">
            {selectedTasks.length}
          </span>
          <button
            type="button"
            onClick={() => {
              if (bulkMode) exitBulkMode();
              else setBulkMode(true);
            }}
            className={cn(
              'ml-auto inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10px] font-mono uppercase tracking-wide transition-colors',
              bulkMode
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
            title={bulkMode ? '선택 모드 끄기 (Esc)' : '다중 선택 모드'}
          >
            <CheckSquare className="h-3 w-3" />
            {bulkMode ? '끄기' : '선택'}
          </button>
        </div>

        <PlannerInput
          inputRef={inputRef ?? fallbackRef}
          placeholder="+ 빠른 추가  (Enter)"
          onSubmit={handleAdd}
        />

        {selection.kind === 'smart' && selection.id === 'today' && (
          <Overdue onTaskClick={onTaskClick} />
        )}

        <div className="flex-1 min-h-0 overflow-y-auto mt-2 -mx-1 px-1 space-y-px">
          {selectedTasks.length === 0 ? (
            selection.kind === 'list' ? (
              <PlannerEmpty
                icon={<InboxIcon className="h-6 w-6" />}
                title="이 분류는 비어 있어요"
                hint="좌측에서 다른 분류를 보거나 위에서 새 항목을 추가하세요"
                action={{ label: '+ 항목', onClick: focusInput }}
              />
            ) : counts.anytime === 0 && counts.someday === 0 ? (
              <FirstTimeOnboarding lists={lists} />
            ) : (
              <PlannerEmpty
                icon={<InboxIcon className="h-6 w-6" />}
                title={
                  selection.kind === 'smart' && selection.id === 'today' ? '오늘 할 일 없음' :
                  selection.kind === 'smart' && selection.id === 'tomorrow' ? '내일 할 일 없음' :
                  '비어 있음'
                }
                hint="떠오르는 일을 빠르게 적어두세요"
                action={{ label: '+ 추가', onClick: focusInput }}
              />
            )
          ) : (
            selectedTasks.map((t) => {
              const masterIdForBulk = isInstanceId(t.id) ? (parseInstanceId(t.id)?.masterId ?? t.id) : t.id;
              const isPicked = bulkSelected.has(masterIdForBulk);
              return (
                <TaskRow
                  key={t.id}
                  task={t}
                  onClick={() => {
                    if (bulkMode) toggleBulkPick(t.id);
                    else onTaskClick?.({ id: t.id, title: t.title });
                  }}
                  onDelete={() => handleDelete(t)}
                  bulkMode={bulkMode}
                  bulkPicked={isPicked}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Bulk action 툴바 — 활성 시에만 sticky 하단 노출 */}
      {bulkMode && (
        <div className="shrink-0 border-t border-[hsl(var(--hairline))] mt-2 -mx-1 -mb-1 px-2 py-1.5 bg-card flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-mono tabular-nums font-semibold text-foreground">
            {bulkSelected.size}개 선택
          </span>
          <button
            type="button"
            onClick={handleBulkSelectAll}
            disabled={selectedTasks.length === 0}
            className="text-[10.5px] text-muted-foreground hover:text-foreground disabled:opacity-40 ml-1"
          >
            전체
          </button>
          <div className="ml-auto flex items-center gap-0.5">
            {/* 분류 — dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={bulkSelected.size === 0}
                  aria-label="분류 변경"
                  title="분류 변경"
                  className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 transition-colors"
                >
                  <Folder className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => handleBulkAssignList(undefined)}>
                  📥 인박스 (미분류)
                </DropdownMenuItem>
                {lists.length > 0 && <DropdownMenuSeparator />}
                {lists.map((l) => (
                  <DropdownMenuItem key={l.id} onClick={() => handleBulkAssignList(l.id)}>
                    {l.emoji ?? '📋'} {l.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              onClick={handleBulkComplete}
              disabled={bulkSelected.size === 0}
              aria-label="완료 처리"
              title="완료 처리"
              className="w-7 h-7 inline-flex items-center justify-center rounded text-emerald-600 hover:bg-emerald-500/10 disabled:opacity-40 transition-colors"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkSelected.size === 0}
              aria-label="삭제"
              title="삭제"
              className="w-7 h-7 inline-flex items-center justify-center rounded text-rose-500 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={exitBulkMode}
              aria-label="선택 모드 끄기"
              title="선택 모드 끄기 (Esc)"
              className="w-7 h-7 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </DroppableInbox>
  );
};

// ────────────────────────────────────────────────
// 사용자 Lists 트리

const UserListsTree = ({
  lists, listCounts, selection, onSelect,
}: {
  lists: TaskList[];
  listCounts: Record<string, number>;
  selection: Selection;
  onSelect: (id: string) => void;
}) => {
  const [creating, setCreating] = useState(false);

  return (
    <div className="shrink-0 px-1">
      <div className="flex items-center justify-between px-1 mb-1">
        <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          분류
        </span>
        <button
          type="button"
          onClick={() => setCreating(true)}
          aria-label="새 분류"
          title="새 분류"
          className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <FolderPlus className="h-3 w-3" />
        </button>
      </div>

      <div className="space-y-px">
        {lists.map((list) => (
          <ListRow
            key={list.id}
            list={list}
            count={listCounts[list.id] ?? 0}
            active={selection.kind === 'list' && selection.id === list.id}
            onClick={() => onSelect(list.id)}
          />
        ))}
        {creating && (
          <NewListInput onDone={() => setCreating(false)} />
        )}
      </div>
    </div>
  );
};

const ListRow = ({
  list, count, active, onClick,
}: { list: TaskList; count: number; active: boolean; onClick: () => void }) => {
  const colorTokens = TASK_LIST_COLORS[list.color];
  const [renaming, setRenaming] = useState(false);
  const [draftName, setDraftName] = useState(list.name);

  // 좌측 list 트리 자체도 droppable — task 끌어 옮기면 listId 변경.
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
        {list.emoji ? (
          <span className="text-[13px] leading-none shrink-0">{list.emoji}</span>
        ) : (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: colorTokens.stripe }}
            aria-hidden
          />
        )}
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
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          className={cn(
            'group flex items-center gap-2 h-7 px-1.5 rounded-md cursor-pointer transition-colors',
            active ? 'bg-accent' : 'hover:bg-accent/60',
            isOver && 'bg-primary/10 ring-1 ring-primary/40',
            list.hidden && 'opacity-50',
          )}
          onClick={onClick}
          onDoubleClick={() => {
            setDraftName(list.name);
            setRenaming(true);
          }}
        >
          {list.emoji ? (
            <span className="text-[13px] leading-none shrink-0">{list.emoji}</span>
          ) : (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: colorTokens.stripe }}
              aria-hidden
            />
          )}
          <span className="flex-1 text-[12.5px] leading-tight truncate text-foreground">
            {list.name}
          </span>
          <span className="text-[10.5px] tabular-nums text-muted-foreground/80 group-hover:hidden">
            {count}
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
        <ContextMenuItem
          onSelect={() => {
            setDraftName(list.name);
            setRenaming(true);
          }}
        >
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
            if (window.confirm(`"${list.name}" 분류를 지울까요? 안에 있는 항목은 인박스로 옮겨집니다.`)) {
              // task.listId 정리.
              const tasks = taskStore.list().filter((t) => t.listId === list.id);
              tasks.forEach((t) => taskStore.update(t.id, { listId: undefined }));
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
  );
};

const NewListInput = ({ onDone }: { onDone: () => void }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState<TaskListColor>('blue');
  const [emoji, setEmoji] = useState('📋');

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      taskListStore.add({ name: trimmed, emoji, color });
    }
    onDone();
  };

  return (
    <div className="flex items-center gap-2 h-7 px-1.5 rounded-md bg-accent/60">
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
        placeholder="새 분류 이름"
        className="flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground/60 text-foreground"
      />
      {/* 색 picker — 작은 dropdown */}
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

// ────────────────────────────────────────────────
// Task row — 사이드바 안 작은 카드

const TaskRow = ({
  task, onClick, onDelete, bulkMode, bulkPicked,
}: {
  task: PlannerTask;
  onClick: () => void;
  onDelete: () => void;
  bulkMode?: boolean;
  bulkPicked?: boolean;
}) => {
  // streak — 가상 인스턴스면 master 기준, 마스터면 자기 기준.
  const streakCurrent = (() => {
    if (!task.recurrence && !isInstanceId(task.id)) return undefined;
    const masterId = isInstanceId(task.id) ? parseInstanceId(task.id)?.masterId : task.id;
    if (!masterId) return undefined;
    const master = taskStore.findMaster(masterId);
    if (!master?.recurrence) return undefined;
    return computeStreakStats(master).current;
  })();
  // Bulk 모드면 카드를 picked 시각으로 감싸고 드래그 비활성화 (선택 액션 우선).
  const innerCard = (
    <PlannerCard
      variant="inbox"
      title={task.title}
      done={task.done}
      onToggle={() => taskStore.toggleDone(task.id)}
      onClick={onClick}
      onDelete={bulkMode ? undefined : onDelete}
      onTogglePin={bulkMode ? undefined : () => taskStore.togglePinned(task.id)}
      priority={task.priority}
      pinned={task.pinned}
      hasNote={Boolean(task.note && task.note.length > 0)}
      note={task.note}
      canceled={task.canceled}
      recurring={Boolean(task.recurrence)}
      subtasks={task.subtasks}
      onToggleSubtask={(sid) => taskStore.toggleSubtask(task.id, sid)}
      onAddSubtask={(text) => taskStore.addSubtask(task.id, text)}
      onRemoveSubtask={(sid) => taskStore.removeSubtask(task.id, sid)}
      onUpdateSubtask={(sid, text) => taskStore.updateSubtaskText(task.id, sid, text)}
      tags={task.tags}
      streakCurrent={streakCurrent}
    />
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className={cn(
          'rounded-md transition-all',
          bulkMode && bulkPicked && 'bg-primary/10 ring-1 ring-primary/40',
          bulkMode && !bulkPicked && 'opacity-90',
        )}>
          {bulkMode ? (
            <div className="flex items-center gap-1.5 pl-1">
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border shrink-0 transition-all',
                  bulkPicked
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-[hsl(var(--hairline))]',
                )}
                aria-hidden
              >
                {bulkPicked && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
              </span>
              <div className="flex-1 min-w-0">{innerCard}</div>
            </div>
          ) : (
            <DraggableInboxCard task={task}>{innerCard}</DraggableInboxCard>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem onSelect={onClick}>
          <Clock className="mr-2 h-3.5 w-3.5" />
          시간 배정
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => taskStore.toggleDone(task.id)}>
          <Check className="mr-2 h-3.5 w-3.5" />
          {task.done ? '완료 취소' : '완료'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <Clock4 className="mr-2 h-3.5 w-3.5" />
            미루기
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-36">
            <ContextMenuItem onSelect={() => {
              const masterId = isInstanceId(task.id) ? parseInstanceId(task.id)?.masterId : task.id;
              if (masterId) {
                taskStore.snoozeDays(masterId, 1);
                notify.success('내일로 미뤘어요', { duration: 1500 });
              }
            }}>내일로 (+1일)</ContextMenuItem>
            <ContextMenuItem onSelect={() => {
              const masterId = isInstanceId(task.id) ? parseInstanceId(task.id)?.masterId : task.id;
              if (masterId) {
                taskStore.snoozeDays(masterId, 3);
                notify.success('3일 후로 미뤘어요', { duration: 1500 });
              }
            }}>3일 후</ContextMenuItem>
            <ContextMenuItem onSelect={() => {
              const masterId = isInstanceId(task.id) ? parseInstanceId(task.id)?.masterId : task.id;
              if (masterId) {
                taskStore.snoozeDays(masterId, 7);
                notify.success('다음주로 미뤘어요', { duration: 1500 });
              }
            }}>다음주 (+7일)</ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem
          onSelect={onDelete}
          className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          삭제
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};

// ────────────────────────────────────────────────
// 첫 사용자 onboarding — 빈 인박스 + list 0개 시 노출

const FirstTimeOnboarding = ({ lists }: { lists: TaskList[] }) => {
  if (lists.length > 0) return null;
  return (
    <div className="flex flex-col items-center text-center py-6 px-3">
      <span className="text-2xl mb-2" aria-hidden>📋</span>
      <p className="text-[13px] font-semibold text-foreground mb-1">자주 쓰는 분류 만들기</p>
      <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
        일·운동·공부처럼 자주 묶이는 항목을<br />분류로 정리하면 한눈에 보여요
      </p>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {RECOMMENDED_LISTS.map((rec) => (
          <button
            key={rec.name}
            type="button"
            onClick={() => taskListStore.add(rec)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11.5px] font-medium border border-[hsl(var(--hairline))] hover:bg-accent transition-colors"
          >
            <span aria-hidden>{rec.emoji}</span>
            <span>+ {rec.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
