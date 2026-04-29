/**
 * 인박스 — 좌측 컬럼. 시간 미배정 할일 리스트 + 빠른 추가.
 *
 * UX:
 * - 빠른 추가 (Enter)
 * - 카드 클릭 = 시간 배정 모달
 * - 카드 우클릭 = ContextMenu (배정/완료/고정/우선순위/삭제)
 * - hover 핀/삭제
 * - 빈 상태 CTA
 * - 상단 오버듀 섹션
 */
import { useRef } from 'react';
import { Inbox as InboxIcon, Clock, Check, Trash2, Pin, Flag } from 'lucide-react';
import { useInbox } from '@/hooks/planner/useInbox';
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
import { PlannerSection } from './PlannerSection';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';
import { Overdue } from './Overdue';
import type { PlannerTask, Priority } from '@/types/planner';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/types/planner';

interface InboxProps {
  /** 단축키 'n' 으로 포커스. */
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string; startAt?: string; endAt?: string }) => void;
}

export const Inbox = ({ inputRef, onTaskClick }: InboxProps) => {
  const tasks = useInbox();
  const fallbackRef = useRef<HTMLInputElement>(null);
  const focusInput = () => (inputRef ?? fallbackRef).current?.focus();

  const handleAdd = (title: string) => {
    taskStore.add({ title });
    notify.success('할 일 추가됐어요', { duration: 1500 });
  };

  const handleDelete = (task: PlannerTask) => {
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'goalId' | 'priority' | 'note' | 'pinned'> = {
      title: task.title,
      done: task.done,
      startAt: task.startAt,
      endAt: task.endAt,
      goalId: task.goalId,
      priority: task.priority,
      note: task.note,
      pinned: task.pinned,
    };
    taskStore.remove(task.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => taskStore.add(snapshot) },
    });
  };

  const handleTogglePin = (task: PlannerTask) => {
    taskStore.togglePinned(task.id);
    notify.success(task.pinned ? '고정 해제' : '고정됐어요', { duration: 1200 });
  };

  const handleSetPriority = (task: PlannerTask, p: Priority) => {
    taskStore.update(task.id, { priority: p === 0 ? undefined : p });
  };

  return (
    <PlannerSection
      label="인박스"
      count={tasks.length > 0 ? tasks.length : undefined}
      className="h-full"
    >
      <div className="flex flex-col gap-2">
        <Overdue onTaskClick={onTaskClick} />
        <PlannerInput
          inputRef={inputRef ?? fallbackRef}
          placeholder="+ 할 일 추가  (Enter)"
          onSubmit={handleAdd}
        />
        {tasks.length === 0 ? (
          <PlannerEmpty
            icon={<InboxIcon className="h-6 w-6" />}
            title="인박스가 비어 있어요"
            hint="떠오르는 할 일을 빠르게 적어두세요"
            action={{ label: '+ 첫 할 일', onClick: focusInput }}
          />
        ) : (
          <div className="space-y-px">
            {tasks.map((t) => (
              <ContextMenu key={t.id}>
                <ContextMenuTrigger asChild>
                  <div>
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
                    />
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
                  <ContextMenuItem onSelect={() => handleTogglePin(t)}>
                    <Pin className={`mr-2 h-3.5 w-3.5 ${t.pinned ? 'fill-current' : ''}`} />
                    {t.pinned ? '고정 해제' : '고정'}
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
            ))}
          </div>
        )}
      </div>
    </PlannerSection>
  );
};
