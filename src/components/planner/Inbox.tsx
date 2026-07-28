/**
 * 인박스 — 좌측 컬럼. 시간 미배정 할일 리스트 + 빠른 추가.
 *
 * Things3 패턴:
 * - Anytime / Someday 토글 (헤더 우측, 카운트 표시)
 * - Cancel 상태 (done 와 분리)
 *
 * UX:
 * - 빠른 추가 (Enter)
 * - 카드 클릭 = 시간 배정 모달
 * - 카드 우클릭 = ContextMenu (배정/완료/취소/고정/우선순위/Someday/삭제)
 * - hover 핀/삭제
 * - 빈 상태 CTA
 * - 상단 오버듀 섹션 (Anytime 모드만)
 */
import { useRef, useState } from 'react';
import { Inbox as InboxIcon, Clock, Check, Trash2, Pin, Flag, Ban, Hourglass, ArrowUp } from 'lucide-react';
import { useInbox, useInboxCounts, useDoneArchive, type InboxMode } from '@/hooks/planner/useInbox';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import { PlannerSection } from './PlannerSection';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';
import { Overdue } from './Overdue';
import { PlannerDoneDialog } from './PlannerDoneDialog';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { DroppableInbox } from './dnd/DroppableInbox';
import type { PlannerTask, Priority } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/planner';

interface InboxProps {
  /** 단축키 'n' 으로 포커스. */
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string; startAt?: string; endAt?: string }) => void;
}

export const Inbox = ({ inputRef, onTaskClick }: InboxProps) => {
  const [mode, setMode] = useState<InboxMode>('anytime');
  const tasks = useInbox(mode);
  const counts = useInboxCounts();
  const archive = useDoneArchive();
  const [doneOpen, setDoneOpen] = useState(false);
  /* 목록을 둘로 가른다 — 남은 일이 위, 오늘 끝낸 일이 아래.
     끝낸 것을 섞어 두면 '무엇을 해야 하나'를 매번 눈으로 걸러야 한다. */
  const open = tasks.filter((t) => !t.done);
  const doneToday = tasks.filter((t) => t.done);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const focusInput = () => (inputRef ?? fallbackRef).current?.focus();

  const handleAdd = (title: string, parsed?: { startAt?: string; endAt?: string; recurrence?: PlannerTask['recurrence']; tags?: string[]; priority?: PlannerTask['priority'] }) => {
    taskStore.add({
      title,
      someday: mode === 'someday',
      startAt: parsed?.startAt,
      endAt: parsed?.endAt,
      recurrence: parsed?.recurrence,
      tags: parsed?.tags,
      priority: parsed?.priority,
    });
    const isScheduled = Boolean(parsed?.startAt);
    notify.success(
      isScheduled
        ? '시간 배정해서 추가됐어요'
        : mode === 'someday'
          ? '보류함에 추가됐어요'
          : '할 일 추가됐어요',
      { duration: 1500 },
    );
  };

  const handleDelete = (task: PlannerTask) => {
    taskStore.remove(task.id);
    notify.success('휴지통으로 이동했어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => taskStore.restore(task.id) },
    });
  };

  const handleTogglePin = (task: PlannerTask) => {
    taskStore.togglePinned(task.id);
    notify.success(task.pinned ? '고정 해제' : '고정됐어요', { duration: 1200 });
  };

  const handleToggleCanceled = (task: PlannerTask) => {
    taskStore.toggleCanceled(task.id);
    notify.success(task.canceled ? '취소 되돌림' : '취소됐어요', { duration: 1200 });
  };

  const handleToggleSomeday = (task: PlannerTask) => {
    taskStore.toggleSomeday(task.id);
    notify.success(task.someday ? '대기함으로 옮겼어요' : '보류함으로 옮겼어요', { duration: 1500 });
  };

  const handleSetPriority = (task: PlannerTask, p: Priority) => {
    taskStore.update(task.id, { priority: p === 0 ? undefined : p });
  };

  const ModeToggle = (
    <div
      role="tablist"
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-accent/40 border border-foreground/20"
    >
      {(['anytime', 'someday'] as InboxMode[]).map((m) => {
        const active = mode === m;
        const label = m === 'anytime' ? 'Anytime' : 'Someday';
        const count = m === 'anytime' ? counts.anytime : counts.someday;
        return (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setMode(m)}
            className={cn(
              'inline-flex items-center gap-1 px-2 h-5 rounded text-[10.5px] font-semibold transition-colors',
              active
                ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span>{label}</span>
            <span className="tabular-nums opacity-70">{count}</span>
          </button>
        );
      })}
    </div>
  );


  /** 할 일 한 줄 — 남은 것과 오늘 끝낸 것이 같은 모양이라 한 곳에서 만든다. */
  const renderRow = (t: PlannerTask) => (
          <ContextMenu key={t.id}>
            <ContextMenuTrigger asChild>
              <div>
                <DraggableInboxCard task={t}>
                  <PlannerCard
                    variant="inbox"
                    title={t.title}
                    done={t.done}
                    onToggle={() => taskStore.toggleDone(t.id)}
                    onClick={() => onTaskClick?.({ id: t.id, title: t.title })}
                    onDelete={() => handleDelete(t)}
                    onTogglePin={() => handleTogglePin(t)}
                    priority={t.priority}
                    pinned={t.pinned}
                    hasNote={Boolean(t.note && t.note.length > 0)}
                    note={t.note}
                    canceled={t.canceled}
                    recurring={Boolean(t.recurrence)}
                    subtasks={t.subtasks}
                    onToggleSubtask={(sid) => taskStore.toggleSubtask(t.id, sid)}
                    onAddSubtask={(text) => taskStore.addSubtask(t.id, text)}
                    onRemoveSubtask={(sid) => taskStore.removeSubtask(t.id, sid)}
                    onUpdateSubtask={(sid, text) => taskStore.updateSubtaskText(t.id, sid, text)}
                    tags={t.tags}
                  />
                </DraggableInboxCard>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onSelect={() => onTaskClick?.({ id: t.id, title: t.title })}>
                <Clock className="mr-2 h-3.5 w-3.5" />
                시간 배정
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => taskStore.toggleDone(t.id)}>
                <Check className="mr-2 h-3.5 w-3.5" />
                {t.done ? '완료 취소' : '완료'}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => handleToggleCanceled(t)}>
                <Ban className="mr-2 h-3.5 w-3.5" />
                {t.canceled ? '취소 되돌림' : '취소'}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={() => handleTogglePin(t)}>
                <Pin className={`mr-2 h-3.5 w-3.5 ${t.pinned ? 'fill-current' : ''}`} />
                {t.pinned ? '고정 해제' : '고정'}
              </ContextMenuItem>
              <ContextMenuItem onSelect={() => handleToggleSomeday(t)}>
                {t.someday ? <ArrowUp className="mr-2 h-3.5 w-3.5" /> : <Hourglass className="mr-2 h-3.5 w-3.5" />}
                {t.someday ? '대기함으로' : '보류함으로'}
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <Flag
                    className="mr-2 h-3.5 w-3.5"
                    style={
                      (t.priority ?? 0) > 0
                        ? { color: PRIORITY_COLORS[t.priority as Priority], fill: PRIORITY_COLORS[t.priority as Priority] }
                        : undefined
                    }
                  />
                  우선순위
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-32">
                  {([3, 2, 1, 0] as Priority[]).map((p) => (
                    <ContextMenuItem
                      key={p}
                      onSelect={() => handleSetPriority(t, p)}
                      className={t.priority === p || (p === 0 && !t.priority) ? 'bg-accent' : ''}
                    >
                      {p > 0 && (
                        <Flag
                          className="mr-2 h-3.5 w-3.5"
                          style={{ color: PRIORITY_COLORS[p], fill: PRIORITY_COLORS[p] }}
                        />
                      )}
                      {p === 0 && <span className="mr-2 inline-block w-3.5" aria-hidden />}
                      {PRIORITY_LABELS[p]}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuItem
                onSelect={() => handleDelete(t)}
                className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                삭제
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
  );

  return (
    <PlannerSection
      label="대기함"
      action={ModeToggle}
      className="h-full"
    >
      <DroppableInbox>
      <div className="flex flex-col gap-2">
        {mode === 'anytime' && <Overdue onTaskClick={onTaskClick} />}
        <PlannerInput
          inputRef={inputRef ?? fallbackRef}
          placeholder={mode === 'someday' ? '+ 보류 항목 (Enter)' : '+ 할 일 추가  (Enter)'}
          onSubmit={handleAdd}
        />
        {tasks.length === 0 ? (
          <PlannerEmpty
            icon={mode === 'someday' ? <Hourglass className="h-6 w-6" /> : <InboxIcon className="h-6 w-6" />}
            title={mode === 'someday' ? '보류함이 비어 있어요' : '대기함이 비어 있어요'}
            hint={mode === 'someday' ? '나중에 할지도 모르는 것들을 모아두세요' : '떠오르는 할 일을 빠르게 적어두세요'}
            action={{ label: mode === 'someday' ? '+ 보류 항목' : '+ 첫 할 일', onClick: focusInput }}
          />
        ) : (
          <div className="space-y-px">
            {open.map(renderRow)}
            {/* 오늘 끝낸 것 — 지우지 않고 아래로 내려 둔다. 오늘 무엇을 했는지가
                남고, 잘못 체크했으면 그대로 되돌릴 수 있다. 날이 바뀌면 서랍으로. */}
            {doneToday.length > 0 && (
              <div className="flex items-center gap-2 pb-0.5 pt-2.5">
                <span className="text-[10.5px] font-semibold text-muted-foreground">오늘 끝낸 것</span>
                <span className="text-[10.5px] tabular-nums text-muted-foreground/70">{doneToday.length}</span>
                <span className="h-px flex-1 bg-foreground/10" />
              </div>
            )}
            {doneToday.map(renderRow)}
          </div>
        )}
        {/* 끝낸 일 서랍 — 어제까지 끝낸 것들. 목록에서 사라졌지 없어진 게 아니다. */}
        {archive.length > 0 && (
          <button
            type="button"
            onClick={() => setDoneOpen(true)}
            className="mt-1 inline-flex items-center gap-1.5 self-start rounded-md px-1.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Check className="h-3 w-3" />
            끝낸 일 <span className="tabular-nums">{archive.length}</span>
          </button>
        )}
      </div>
      </DroppableInbox>
      {doneOpen && <PlannerDoneDialog onClose={() => setDoneOpen(false)} />}
    </PlannerSection>
  );
};

