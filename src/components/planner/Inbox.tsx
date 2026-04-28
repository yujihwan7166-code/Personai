/**
 * 인박스 — 좌측 컬럼. 시간 미배정 할일 리스트 + 빠른 추가.
 *
 * Phase 1: 빠른 추가 + 리스트 + 체크 토글 + 클릭 시 시간 배정 (popover 는 Phase 4).
 * 클릭 핸들러는 v1 에서 일단 콘솔 로그.
 */
import { useRef } from 'react';
import { Inbox as InboxIcon } from 'lucide-react';
import { useInbox } from '@/hooks/planner/useInbox';
import { taskStore } from '@/services/planner/taskStore';
import { PlannerSection } from './PlannerSection';
import { PlannerInput } from './PlannerInput';
import { PlannerCard } from './PlannerCard';
import { PlannerEmpty } from './PlannerEmpty';

interface InboxProps {
  /** 단축키 'n' 으로 포커스. */
  inputRef?: React.RefObject<HTMLInputElement>;
  onTaskClick?: (taskId: string) => void;
}

export const Inbox = ({ inputRef, onTaskClick }: InboxProps) => {
  const tasks = useInbox();
  const fallbackRef = useRef<HTMLInputElement>(null);

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
          onSubmit={(title) => taskStore.add({ title })}
        />
        {tasks.length === 0 ? (
          <PlannerEmpty
            icon={<InboxIcon className="h-6 w-6" />}
            title="인박스가 비어 있어요"
            hint="떠오르는 할 일을 빠르게 적어두세요"
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
                onClick={() => onTaskClick?.(t.id)}
              />
            ))}
          </div>
        )}
      </div>
    </PlannerSection>
  );
};
