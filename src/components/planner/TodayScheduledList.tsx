/**
 * 좌상 "일정" 박스 — 오늘 시간 잡힌 항목들의 리스트 표현.
 * (우측 "타임라인" 이 시간 그리드 표현이라면 여기는 같은 데이터의 리스트 버전)
 *
 * 새 항목 추가는 day 뷰 공통 입력 또는 타임라인 슬롯 클릭으로 — 여기는 read-only.
 */
import { useMemo } from 'react';
import { Check, Flag, ListChecks, Plus } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { cn } from '@/lib/utils';
import { PRIORITY_COLORS, TASK_LIST_COLORS, type PlannerEvent, type PlannerTask, type PlannerTimelineItem } from '@/types/planner';

interface TodayScheduledListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** + 버튼 클릭 — 시간 정해 추가하는 상세 모달 띄우기. */
  onAdd?: () => void;
}

const isSameLocalDay = (iso: string | undefined, day: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

export const TodayScheduledList = ({ anchorIso, onTaskClick, onAdd }: TodayScheduledListProps) => {
  // 시간 배정된 task + event 둘 다 보여줌. usePlannerToday 가 PLANNER_TASK/EVENT_CHANGED 양쪽 listen.
  const items = usePlannerToday(anchorIso);
  const day = useMemo(() => new Date(anchorIso), [anchorIso]);

  const scheduled = useMemo<PlannerTimelineItem[]>(
    () =>
      items
        .filter((item) => {
          if (item.kind === 'task') {
            const t = item.data;
            return !t.done && !t.canceled && !t.someday && isSameLocalDay(t.startAt, day);
          }
          // event 는 done/canceled 개념 없음 — 같은 날인지만 확인
          return isSameLocalDay(item.data.startAt, day);
        })
        .sort((a, b) => {
          const aStart = a.kind === 'event' ? a.data.startAt : a.data.startAt ?? '';
          const bStart = b.kind === 'event' ? b.data.startAt : b.data.startAt ?? '';
          return aStart.localeCompare(bStart);
        }),
    [items, day],
  );

  return (
    <section className="h-full min-h-0 flex flex-col rounded-2xl border hairline bg-card p-4 shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]">
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-2.5 mb-2 border-b hairline">
        <ListChecks className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2} />
        <span className="text-[11px] font-semibold tracking-[0.08em] uppercase text-muted-foreground leading-none">
          일정
        </span>
        {scheduled.length > 0 && (
          <span className="text-[11px] tabular-nums text-muted-foreground/80 font-medium">{scheduled.length}</span>
        )}
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label="일정 추가"
            title="일정 추가 (시간 정해서)"
            className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
        {scheduled.length === 0 ? (
          <p className="px-2 py-2 text-[12.5px] text-foreground/65 leading-snug">
            오늘 시간 잡힌 항목이 없어요. 우측 타임라인 슬롯을 클릭해 시간 정해 추가할 수 있어요.
          </p>
        ) : (
          <div className="space-y-0.5 pb-1">
            {scheduled.map((item) =>
              item.kind === 'task' ? (
                <ScheduledTaskRow
                  key={item.data.id}
                  task={item.data}
                  onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                />
              ) : (
                <ScheduledEventRow
                  key={item.data.id}
                  event={item.data}
                  onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                />
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
};

/** 시간 잡힌 task 단일 행 — 체크박스 + 시간 prefix + 색 stripe + 제목 + 우선순위. */
const ScheduledTaskRow = ({ task, onClick }: { task: PlannerTask; onClick: () => void }) => {
  const stripe = task.color ? TASK_LIST_COLORS[task.color].stripe : undefined;
  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent transition-colors">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); taskStore.toggleDone(task.id); }}
        aria-label={task.done ? '완료 취소' : '완료'}
        className={cn(
          'flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors',
          task.done
            ? 'bg-foreground border-foreground text-background'
            : 'border-foreground/30 hover:border-foreground/60',
        )}
      >
        {task.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <span className="text-[11px] font-mono tabular-nums text-foreground/80 shrink-0 w-10" aria-label="시작 시각">
        {formatTime(task.startAt)}
      </span>
      {stripe && (
        <span
          className="h-3.5 w-0.5 rounded-full shrink-0"
          style={{ backgroundColor: stripe }}
          aria-hidden
        />
      )}
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'min-w-0 flex-1 truncate text-left text-[13px] leading-tight',
          task.done ? 'text-foreground/40 line-through' : 'text-foreground',
        )}
      >
        {task.title}
      </button>
      {(task.priority ?? 0) > 0 && (
        <Flag
          className="h-3 w-3 shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority!], fill: PRIORITY_COLORS[task.priority!] }}
          aria-label={`우선순위 P${task.priority}`}
        />
      )}
    </div>
  );
};

/** 시간 잡힌 event 단일 행 — task 와 다르게 체크박스/완료/우선순위 없음. 시간 prefix + 색 dot + 제목. */
const ScheduledEventRow = ({ event, onClick }: { event: PlannerEvent; onClick: () => void }) => {
  return (
    <div className="group flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-accent transition-colors">
      {/* event 표시용 dot — task 의 체크박스 자리. 채워진 원으로 "약속/일정"임을 알림. */}
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        aria-label="일정"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: event.color ?? 'hsl(var(--primary))' }}
        />
      </span>
      <span className="text-[11px] font-mono tabular-nums text-foreground/80 shrink-0 w-10" aria-label="시작 시각">
        {formatTime(event.startAt)}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 truncate text-left text-[13px] leading-tight text-foreground"
      >
        {event.title}
      </button>
    </div>
  );
};
