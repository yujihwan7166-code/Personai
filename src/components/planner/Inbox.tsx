/**
 * 인박스 — 좌측 컬럼. 시간 미배정 할일 리스트 + 빠른 추가.
 *
 * Phase 1: 빠른 추가 + 리스트 + 체크 토글 + 클릭 시 시간 배정 (popover 는 Phase 4).
 * UX 패턴 추가: hover 삭제(X), 빈 상태 CTA, 토스트 피드백 + Undo.
 */
import { useRef } from 'react';
import { Inbox as InboxIcon } from 'lucide-react';
import { useInbox } from '@/hooks/planner/useInbox';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { PlannerSection } from './PlannerSection';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';
import type { PlannerTask } from '@/types/planner';

interface InboxProps {
  /** 단축키 'n' 으로 포커스. */
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (task: { id: string; title: string }) => void;
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
    // 삭제 직전 스냅샷 보관 → Undo 시 복원.
    const snapshot: Pick<PlannerTask, 'title' | 'done' | 'startAt' | 'endAt' | 'goalId'> = {
      title: task.title,
      done: task.done,
      startAt: task.startAt,
      endAt: task.endAt,
      goalId: task.goalId,
    };
    taskStore.remove(task.id);
    notify.success('삭제됐어요', {
      duration: 5000,
      action: {
        label: '되돌리기',
        onClick: () => taskStore.add(snapshot),
      },
    });
  };

  return (
    <PlannerSection
      label="인박스"
      count={tasks.length > 0 ? tasks.length : undefined}
      className="h-full"
    >
      <div className="flex flex-col gap-2">
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
              <PlannerCard
                key={t.id}
                variant="inbox"
                title={t.title}
                done={t.done}
                onToggle={() => taskStore.toggleDone(t.id)}
                onClick={() => onTaskClick?.({ id: t.id, title: t.title })}
                onDelete={() => handleDelete(t)}
              />
            ))}
          </div>
        )}
      </div>
    </PlannerSection>
  );
};
