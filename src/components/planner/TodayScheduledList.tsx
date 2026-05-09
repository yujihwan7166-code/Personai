/**
 * 좌상 "일정" 박스 — 오늘 시간 잡힌 항목들의 리스트 표현.
 * (우측 "타임라인" 이 시간 그리드 표현이라면 여기는 같은 데이터의 리스트 버전)
 *
 * 행 시각 상태:
 * - 진행 중 (now ∈ [startAt, endAt)): "지금" 라벨 + 점 ring 강조
 * - 지난 (now >= endAt): opacity 50% (시선 정리)
 * - 예정: 기본
 *
 * Hover 액션: 편집 / 미루기 / 삭제 (반복 시리즈 인스턴스는 detach 처리).
 */
import { useEffect, useMemo, useState } from 'react';
import { Clock, Flag, ListChecks, Pencil, Plus, Trash2 } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import { editThisOnly } from '@/lib/planner/seriesEdit';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { PRIORITY_COLORS, TASK_LIST_COLORS, type PlannerEvent, type PlannerTask, type PlannerTimelineItem } from '@/types/planner';

interface TodayScheduledListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** + 버튼 클릭 — 시간 정해 추가하는 상세 모달 띄우기. */
  onAdd?: () => void;
}

type RowStatus = 'past' | 'now' | 'upcoming';
type Kind = 'task' | 'event';

const isSameLocalDay = (iso: string | undefined, day: Date) => {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
};

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

const computeStatus = (startIso: string | undefined, endIso: string | undefined, now: Date): RowStatus => {
  if (!startIso || !endIso) return 'upcoming';
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const t = now.getTime();
  if (t >= start && t < end) return 'now';
  if (t >= end) return 'past';
  return 'upcoming';
};

const SNOOZE_OPTIONS: ReadonlyArray<{ label: string; deltaMs: number }> = [
  { label: '30분 후로', deltaMs: 30 * 60_000 },
  { label: '1시간 후로', deltaMs: 60 * 60_000 },
  { label: '내일로',   deltaMs: 24 * 60 * 60_000 },
];

/** 미루기 — 시리즈 인스턴스는 editThisOnly 로 detach + 신규 단발 생성. */
const snoozeItem = (kind: Kind, item: PlannerTask | PlannerEvent, deltaMs: number) => {
  if (!item.startAt || !item.endAt) return;
  const newStart = new Date(new Date(item.startAt).getTime() + deltaMs).toISOString();
  const dur = new Date(item.endAt).getTime() - new Date(item.startAt).getTime();
  const newEnd = new Date(new Date(newStart).getTime() + dur).toISOString();
  if (isInstanceId(item.id)) {
    const parsed = parseInstanceId(item.id);
    if (!parsed) return;
    if (kind === 'task') {
      const master = taskStore.findMaster(parsed.masterId);
      if (master) editThisOnly(taskStore, master, parsed.occurrenceIso, { startAt: newStart, endAt: newEnd });
    } else {
      const master = eventStore.findMaster(parsed.masterId);
      if (master) editThisOnly(eventStore, master, parsed.occurrenceIso, { startAt: newStart, endAt: newEnd });
    }
  } else if (kind === 'task') {
    taskStore.update(item.id, { startAt: newStart, endAt: newEnd });
  } else {
    eventStore.update(item.id, { startAt: newStart, endAt: newEnd });
  }
  notify.success('미뤘어요', { duration: 1200 });
};

/** 삭제 — 시리즈 인스턴스는 exdate 만 추가 (createNew=false). */
const removeItem = (kind: Kind, item: PlannerTask | PlannerEvent) => {
  if (isInstanceId(item.id)) {
    const parsed = parseInstanceId(item.id);
    if (!parsed) return;
    if (kind === 'task') {
      const master = taskStore.findMaster(parsed.masterId);
      if (master) editThisOnly(taskStore, master, parsed.occurrenceIso, {}, { createNew: false });
    } else {
      const master = eventStore.findMaster(parsed.masterId);
      if (master) editThisOnly(eventStore, master, parsed.occurrenceIso, {}, { createNew: false });
    }
  } else if (kind === 'task') {
    taskStore.remove(item.id);
  } else {
    eventStore.remove(item.id);
  }
  notify.success('삭제됐어요', { duration: 1200 });
};

export const TodayScheduledList = ({ anchorIso, onTaskClick, onAdd }: TodayScheduledListProps) => {
  // 시간 배정된 task + event 둘 다 보여줌. usePlannerToday 가 PLANNER_TASK/EVENT_CHANGED 양쪽 listen.
  const items = usePlannerToday(anchorIso);
  const day = useMemo(() => new Date(anchorIso), [anchorIso]);

  // 진행 중 / 지난 판정용 — 1분 tick.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const scheduled = useMemo<PlannerTimelineItem[]>(
    () =>
      items
        .filter((item) => {
          if (item.kind === 'task') {
            const t = item.data;
            return !t.done && !t.canceled && !t.someday && isSameLocalDay(t.startAt, day);
          }
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
    <section className="h-full min-h-0 flex flex-col rounded-2xl border hairline bg-card px-3 py-2.5 shadow-[0_1px_2px_hsl(30_15%_8%/0.04)]">
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-1.5 mb-1.5 border-b hairline">
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
            className="ml-auto h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
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
            {scheduled.map((item) => {
              const status = computeStatus(item.data.startAt, item.data.endAt, now);
              return item.kind === 'task' ? (
                <ScheduledTaskRow
                  key={item.data.id}
                  task={item.data}
                  status={status}
                  onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                />
              ) : (
                <ScheduledEventRow
                  key={item.data.id}
                  event={item.data}
                  status={status}
                  onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                />
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/** Hover 시 우측에 슬라이드 — 편집 / 미루기 / 삭제. 점·우선순위와 한 행에 배치. */
const RowActions = ({
  kind,
  item,
  onEdit,
}: {
  kind: Kind;
  item: PlannerTask | PlannerEvent;
  onEdit: () => void;
}) => (
  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onEdit(); }}
      aria-label="편집"
      title="편집"
      className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Pencil className="h-3 w-3" />
    </button>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="미루기"
          title="미루기"
          className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Clock className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {SNOOZE_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.label}
            onClick={(e) => { e.preventDefault(); snoozeItem(kind, item, opt.deltaMs); }}
            className="text-[12.5px] cursor-pointer"
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); removeItem(kind, item); }}
      aria-label="삭제"
      title="삭제"
      className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
    >
      <Trash2 className="h-3 w-3" />
    </button>
  </div>
);

/** "지금" 라벨 — 진행 중 행 옆에 작은 pill. */
const NowBadge = () => (
  <span
    aria-label="진행 중"
    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-500 bg-rose-500/10 border border-rose-500/25 px-1.5 py-0.5 rounded-full leading-none tabular-nums"
  >
    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" aria-hidden />
    지금
  </span>
);

/** 시간 잡힌 task 단일 행 — event 와 시각적으로 통일. 점 + 시간 prefix + 제목 + 우선순위 + done line-through. */
const ScheduledTaskRow = ({
  task,
  status,
  onClick,
}: {
  task: PlannerTask;
  status: RowStatus;
  onClick: () => void;
}) => {
  const dotColor = task.color ? TASK_LIST_COLORS[task.color].stripe : 'hsl(var(--primary))';
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors',
        status === 'past' ? 'opacity-50 hover:opacity-90' : 'hover:bg-accent',
      )}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); taskStore.toggleDone(task.id); }}
        aria-label={task.done ? '완료 취소' : '완료'}
        title={task.done ? '완료 취소 (점 클릭)' : '완료 (점 클릭)'}
        className="flex h-4 w-4 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            task.done && 'opacity-30 ring-1 ring-foreground/40',
            status === 'now' && !task.done && 'ring-2 ring-rose-500/40',
          )}
          style={{ backgroundColor: dotColor }}
        />
      </button>
      <span className="text-[11px] font-mono tabular-nums text-foreground/80 shrink-0 w-10" aria-label="시작 시각">
        {formatTime(task.startAt)}
      </span>
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
      {status === 'now' && !task.done && <NowBadge />}
      {(task.priority ?? 0) > 0 && (
        <Flag
          className="h-3 w-3 shrink-0"
          style={{ color: PRIORITY_COLORS[task.priority!], fill: PRIORITY_COLORS[task.priority!] }}
          aria-label={`우선순위 P${task.priority}`}
        />
      )}
      <RowActions kind="task" item={task} onEdit={onClick} />
    </div>
  );
};

/** 시간 잡힌 event 단일 행 — 점 + 시간 prefix + 제목. 체크박스/완료/우선순위 개념 없음. */
const ScheduledEventRow = ({
  event,
  status,
  onClick,
}: {
  event: PlannerEvent;
  status: RowStatus;
  onClick: () => void;
}) => {
  return (
    <div
      className={cn(
        'group flex items-center gap-2 rounded-md px-1.5 py-1.5 transition-colors',
        status === 'past' ? 'opacity-50 hover:opacity-90' : 'hover:bg-accent',
      )}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        aria-label="일정"
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            status === 'now' && 'ring-2 ring-rose-500/40',
          )}
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
      {status === 'now' && <NowBadge />}
      <RowActions kind="event" item={event} onEdit={onClick} />
    </div>
  );
};
