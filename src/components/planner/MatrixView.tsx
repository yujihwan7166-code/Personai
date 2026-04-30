/**
 * Eisenhower Matrix 뷰 — 4사분면.
 *
 * 축:
 * - 가로: 긴급함 ↔ 안 긴급
 * - 세로: 중요함 ↑ 안 중요 ↓
 *
 * Q1 (긴급+중요)   = 지금 처리       — 빨강 톤
 * Q2 (안긴급+중요)  = 계획·집중       — 파랑 톤 (Covey 가 강조한 분면)
 * Q3 (긴급+안중요)  = 위임·빠르게     — 주황 톤
 * Q4 (안긴급+안중요) = 제거 검토      — 회색 톤
 *
 * UX:
 * - 카드를 분면에 드롭 → 두 boolean 자동 토글
 * - 미분류(둘 다 false) 카드는 좌상단에 작은 "정리 안 됨" 영역에 모음
 * - 우선순위 (priority) 와 별개 — 둘 다 표시 가능
 */
import { useMemo } from 'react';
import { Zap, Star, AlertTriangle, Trash2 } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { taskStore } from '@/services/planner/taskStore';
import { PLANNER_TASK_CHANGED, type PlannerTask } from '@/types/planner';
import { useEffect, useState } from 'react';
import { DraggableInboxCard } from './dnd/DraggableInboxCard';
import { PlannerCard } from './PlannerCard';

interface Quadrant {
  id: 'q1' | 'q2' | 'q3' | 'q4' | 'unsorted';
  label: string;
  hint: string;
  icon: React.ReactNode;
  /** 분면 색 톤. */
  tone: string;
  match: (t: PlannerTask) => boolean;
  /** 드롭 시 적용할 patch. */
  patch: Partial<Pick<PlannerTask, 'urgent' | 'important'>>;
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'q1',
    label: '지금 처리',
    hint: '긴급 + 중요',
    icon: <Zap className="h-3.5 w-3.5" />,
    tone: 'border-rose-300 bg-rose-50/40',
    match: (t) => Boolean(t.urgent && t.important),
    patch: { urgent: true, important: true },
  },
  {
    id: 'q2',
    label: '계획·집중',
    hint: '중요 + 안 긴급',
    icon: <Star className="h-3.5 w-3.5" />,
    tone: 'border-blue-300 bg-blue-50/40',
    match: (t) => Boolean(!t.urgent && t.important),
    patch: { urgent: false, important: true },
  },
  {
    id: 'q3',
    label: '빠르게·위임',
    hint: '긴급 + 안 중요',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    tone: 'border-amber-300 bg-amber-50/40',
    match: (t) => Boolean(t.urgent && !t.important),
    patch: { urgent: true, important: false },
  },
  {
    id: 'q4',
    label: '제거 검토',
    hint: '둘 다 X',
    icon: <Trash2 className="h-3.5 w-3.5" />,
    tone: 'border-slate-300 bg-slate-50/40',
    match: (t) => t.urgent === false && t.important === false,
    patch: { urgent: false, important: false },
  },
];

interface MatrixViewProps {
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const MatrixView = ({ onTaskClick }: MatrixViewProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);

  useEffect(() => {
    const refresh = () => {
      // 마스터만 (가상 인스턴스 제외) — matrix 는 정의상 시리즈 마스터에 한 번만 적용.
      setTasks(
        taskStore.list().filter(
          (t) => !t.done && !t.canceled && !t.someday,
        ),
      );
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    return () => window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
  }, []);

  // 분면 별 task 그룹.
  const grouped = useMemo(() => {
    const map = new Map<string, PlannerTask[]>();
    QUADRANTS.forEach((q) => map.set(q.id, []));
    const unsorted: PlannerTask[] = [];
    for (const t of tasks) {
      const q = QUADRANTS.find((qq) => qq.match(t));
      if (q) map.get(q.id)!.push(t);
      else unsorted.push(t);
    }
    return { map, unsorted };
  }, [tasks]);

  return (
    <div className="grid grid-cols-2 grid-rows-[auto_1fr_1fr] gap-3 h-full min-h-0">
      {/* 미분류 — 상단 가로 전체 */}
      <div className="col-span-2">
        <UnsortedRow tasks={grouped.unsorted} onTaskClick={onTaskClick} />
      </div>
      {/* Q1·Q2 — 위 줄 */}
      <QuadrantCell q={QUADRANTS[0]} tasks={grouped.map.get('q1')!} onTaskClick={onTaskClick} />
      <QuadrantCell q={QUADRANTS[1]} tasks={grouped.map.get('q2')!} onTaskClick={onTaskClick} />
      {/* Q3·Q4 — 아래 줄 */}
      <QuadrantCell q={QUADRANTS[2]} tasks={grouped.map.get('q3')!} onTaskClick={onTaskClick} />
      <QuadrantCell q={QUADRANTS[3]} tasks={grouped.map.get('q4')!} onTaskClick={onTaskClick} />
    </div>
  );
};

interface QuadrantCellProps {
  q: Quadrant;
  tasks: PlannerTask[];
  onTaskClick?: (task: { id: string; title: string }) => void;
}

const QuadrantCell = ({ q, tasks, onTaskClick }: QuadrantCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `matrix-${q.id}`,
    data: { kind: 'matrix-quadrant', patch: q.patch },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-xl border-2 p-3 sm:p-4 min-h-0 flex flex-col transition-colors',
        q.tone,
        isOver && 'ring-2 ring-primary/40 ring-inset',
      )}
    >
      <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
        {q.icon}
        <h3 className="text-[13px] font-semibold tracking-tight">{q.label}</h3>
        <span className="text-[10.5px] text-muted-foreground tabular-nums ml-auto">
          {tasks.length}
        </span>
      </div>
      <p className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground/80 mb-3 shrink-0">
        {q.hint}
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1 -mx-1 px-1">
        {tasks.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 italic px-1">비어있음</p>
        ) : (
          tasks.map((t) => (
            <DraggableInboxCard key={t.id} task={t}>
              <PlannerCard
                variant="inbox"
                title={t.title}
                done={t.done}
                onToggle={() => taskStore.toggleDone(t.id)}
                onClick={() => onTaskClick?.({ id: t.id, title: t.title })}
                priority={t.priority}
                pinned={t.pinned}
                hasNote={Boolean(t.note && t.note.length > 0)}
                note={t.note}
                canceled={t.canceled}
                recurring={Boolean(t.recurrence)}
                subtasks={t.subtasks}
                tags={t.tags}
              />
            </DraggableInboxCard>
          ))
        )}
      </div>
    </div>
  );
};

/** 미분류 — urgent/important 둘 다 미설정. 상단 가로 영역. */
const UnsortedRow = ({
  tasks, onTaskClick,
}: { tasks: PlannerTask[]; onTaskClick?: (t: { id: string; title: string }) => void }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: 'matrix-unsorted',
    data: { kind: 'matrix-quadrant', patch: { urgent: undefined, important: undefined } },
  });
  if (tasks.length === 0 && !isOver) return null;
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'rounded-lg border border-dashed border-[hsl(var(--hairline))] p-2 sm:p-3 transition-colors',
        isOver && 'border-primary/40 bg-primary/5',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold">
          정리 안 됨
        </span>
        <span className="text-[10.5px] text-muted-foreground/80 tabular-nums">
          {tasks.length}
        </span>
        <span className="text-[10.5px] text-muted-foreground/60 ml-auto hidden sm:inline">
          카드를 사분면에 드래그하면 자동 분류됩니다
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {tasks.slice(0, 12).map((t) => (
          <DraggableInboxCard key={t.id} task={t}>
            <button
              type="button"
              onClick={() => onTaskClick?.({ id: t.id, title: t.title })}
              className="inline-flex items-center px-2.5 py-1 text-[12px] rounded-md bg-card border border-[hsl(var(--hairline))] hover:border-foreground/30 transition-colors max-w-[200px]"
            >
              <span className="truncate">{t.title}</span>
            </button>
          </DraggableInboxCard>
        ))}
        {tasks.length > 12 && (
          <span className="self-center text-[11px] text-muted-foreground tabular-nums">
            +{tasks.length - 12}
          </span>
        )}
      </div>
    </div>
  );
};
