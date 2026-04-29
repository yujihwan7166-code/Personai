/**
 * 오버듀 섹션 — 인박스 상단. 시간 배정됐는데 지난 미완료 task.
 *
 * Sunsama 패턴: '지난 일 정리할까요?' — 사용자가 잊지 않도록 알림.
 * 빈 상태 = 컴포넌트 자체 hide (자리 차지 X).
 *
 * 액션 2종:
 * - 오늘로: 같은 시간(시:분 유지) 으로 오늘 reschedule
 * - 삭제 (X 아이콘 hover): 삭제 + Undo 토스트
 */
import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, X, RotateCcw } from 'lucide-react';
import { useOverdue } from '@/hooks/planner/useOverdue';
import { taskStore } from '@/services/planner/taskStore';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import type { PlannerTask } from '@/types/planner';

const formatPastTime = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}분 전`;
  const diffHours = Math.round(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

interface OverdueProps {
  onTaskClick?: (task: { id: string; title: string; startAt?: string; endAt?: string }) => void;
}

export const Overdue = ({ onTaskClick }: OverdueProps) => {
  const items = useOverdue();
  const [expanded, setExpanded] = useState(true);

  const visibleItems = useMemo(() => items.slice(0, 8), [items]);

  if (items.length === 0) return null;

  const handleMoveToToday = (task: PlannerTask) => {
    if (!task.startAt || !task.endAt) return;
    const original = new Date(task.startAt);
    const originalEnd = new Date(task.endAt);
    const today = new Date();
    today.setHours(original.getHours(), original.getMinutes(), 0, 0);
    const newStart = today.toISOString();
    const durationMs = originalEnd.getTime() - new Date(task.startAt).getTime();
    const newEnd = new Date(today.getTime() + durationMs).toISOString();
    taskStore.schedule(task.id, newStart, newEnd);
    notify.success(
      `오늘 ${today.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })} 으로 옮겼어요`,
      { duration: 1800 },
    );
  };

  const handleDelete = (task: PlannerTask) => {
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
      action: { label: '되돌리기', onClick: () => taskStore.add(snapshot) },
    });
  };

  return (
    <div className="mb-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className={cn(
          'w-full flex items-center gap-1.5 px-1 py-1 rounded',
          'hover:bg-accent/50 transition-colors',
          'text-left',
        )}
        aria-expanded={expanded}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
        )}
        <span className="text-[10.5px] font-mono uppercase tracking-[0.16em] text-rose-500/90 font-semibold">
          지난 미완료
        </span>
        <span className="text-[10.5px] font-mono tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </button>
      {expanded && (
        <div className="space-y-px mt-1">
          {visibleItems.map((task) => (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              onClick={() => onTaskClick?.({
                id: task.id, title: task.title, startAt: task.startAt, endAt: task.endAt,
              })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onTaskClick?.({
                    id: task.id, title: task.title, startAt: task.startAt, endAt: task.endAt,
                  });
                }
              }}
              className={cn(
                'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer',
                'hover:bg-accent transition-colors',
                'focus:outline-none focus:bg-accent',
              )}
            >
              <span className="text-[9.5px] font-mono tabular-nums text-rose-500/80 shrink-0 font-semibold">
                {task.startAt ? formatPastTime(task.startAt) : ''}
              </span>
              <span className="text-[12.5px] leading-tight truncate flex-1 text-foreground/90">
                {task.title}
              </span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleMoveToToday(task); }}
                aria-label="오늘로 옮기기"
                title="오늘 같은 시각으로 옮기기"
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded shrink-0',
                  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                  'text-muted-foreground hover:text-foreground hover:bg-accent transition-all',
                )}
              >
                <RotateCcw className="h-3 w-3" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                aria-label="삭제"
                title="삭제"
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded shrink-0',
                  'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                  'text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-all',
                )}
              >
                <X className="h-3 w-3" strokeWidth={2.5} />
              </button>
            </div>
          ))}
          {items.length > visibleItems.length && (
            <p className="text-[10px] text-muted-foreground/70 text-center py-1">
              + {items.length - visibleItems.length} 개 더
            </p>
          )}
        </div>
      )}
    </div>
  );
};
