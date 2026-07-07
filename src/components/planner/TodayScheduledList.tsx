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
import { Clock, Flag, ListChecks, Palette, Pencil, Plus, Trash2 } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { usePlannerToday } from '@/hooks/planner/usePlannerToday';
import { isInstanceId, parseInstanceId } from '@/lib/planner/recurrence';
import { editThisOnly } from '@/lib/planner/seriesEdit';
import { intervalOverlapsRange, localDayBounds } from '@/lib/planner/timeRange';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { DraggableWeekItem } from './dnd/DraggableWeekItem';
import { weekDragDataForEvent, weekDragDataForTask } from '@/lib/planner/weekDragData';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { PRIORITY_COLORS, TASK_LIST_COLORS, type PlannerEvent, type PlannerTask, type PlannerTimelineItem, type TaskListColor } from '@/types/planner';

const COLOR_OPTIONS: ReadonlyArray<{ value: TaskListColor; label: string }> = [
  { value: 'blue',   label: '파랑' },
  { value: 'teal',   label: '청록' },
  { value: 'green',  label: '초록' },
  { value: 'amber',  label: '노랑' },
  { value: 'orange', label: '주황' },
  { value: 'rose',   label: '빨강' },
  { value: 'violet', label: '보라' },
  { value: 'cyan',   label: '하늘' },
];

interface TodayScheduledListProps {
  anchorIso: string;
  onTaskClick?: (task: { id: string; title: string }) => void;
  /** + 버튼 클릭 — 부모가 TaskScheduleDialog (모달) 를 연다. */
  onAdd?: () => void;
  emptyHint?: string;
  embedded?: boolean;
}

type RowStatus = 'past' | 'now' | 'upcoming';
type Kind = 'task' | 'event';

const formatTime = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : '';

/** 시작 ~ 끝 형식. 끝이 같은 분이면 시작만. */
const formatTimeRange = (startIso?: string, endIso?: string): string => {
  if (!startIso) return '';
  const start = formatTime(startIso);
  if (!endIso || startIso === endIso) return start;
  return `${start}~${formatTime(endIso)}`;
};

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

const rowActionStripClass =
  'ml-auto flex h-7 shrink-0 items-center gap-0.5 rounded-lg p-0.5 transition-all translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 group-focus-within:translate-x-0 group-focus-within:opacity-100';

const rowActionButtonClass =
  'inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground';

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

/** 삭제 — 시리즈 인스턴스는 exdate 만 추가 (createNew=false).
 * 단발 항목은 5초 내 되돌리기 제공 (TodayTimeline 과 일관). 시리즈는 exdate 추가라 되돌리기 어려움. */
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
    notify.success('이 항목만 삭제했어요', { duration: 1500 });
    return;
  }
  // 단발 — 전체 캡처 후 5초 undo.
  if (kind === 'task') {
    const t = item as PlannerTask;
    taskStore.remove(t.id);
    notify.success('휴지통으로 이동했어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => taskStore.restore(t.id) },
    });
  } else {
    const e = item as PlannerEvent;
    eventStore.remove(e.id);
    notify.success('휴지통으로 이동했어요', {
      duration: 5000,
      action: { label: '되돌리기', onClick: () => eventStore.restore(e.id) },
    });
  }
};

export const TodayScheduledList = ({ anchorIso, onTaskClick, onAdd, emptyHint, embedded }: TodayScheduledListProps) => {
  // 시간 배정된 task + event 둘 다 보여줌. usePlannerToday 가 PLANNER_TASK/EVENT_CHANGED 양쪽 listen.
  const items = usePlannerToday(anchorIso);
  const dayBounds = useMemo(() => localDayBounds(anchorIso), [anchorIso]);

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
            return !t.done && !t.canceled && !t.someday && intervalOverlapsRange(t.startAt, t.endAt, dayBounds.start, dayBounds.end);
          }
          return intervalOverlapsRange(item.data.startAt, item.data.endAt, dayBounds.start, dayBounds.end);
        })
        .sort((a, b) => {
          const aStart = a.kind === 'event' ? a.data.startAt : a.data.startAt ?? '';
          const bStart = b.kind === 'event' ? b.data.startAt : b.data.startAt ?? '';
          return aStart.localeCompare(bStart);
        }),
    [items, dayBounds],
  );

  return (
    <section
      data-planner-readable="scheduled"
      className={cn(
        'w-full h-fit min-h-[104px] max-h-[264px] flex flex-col',
        embedded
          ? 'border-b border-foreground/[0.14] bg-card px-3 py-2.5'
          : 'rounded-2xl border border-foreground/[0.14] bg-card/80 px-3 py-2.5 shadow-[0_1px_2px_hsl(30_15%_8%/0.025)]',
      )}
    >
      <div className="shrink-0 flex items-center gap-2 px-0.5 pb-1.5 mb-1.5 border-b border-foreground/[0.14]">
        <ListChecks className="h-4 w-4 text-foreground/70" strokeWidth={2} />
        <span className="text-[13.5px] font-semibold tracking-tight text-foreground leading-none">
          일정
        </span>
        {scheduled.length > 0 && (
          <span className="text-[12px] tabular-nums text-muted-foreground font-semibold">{scheduled.length}</span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              aria-label="일정 추가"
              title="일정 추가"
              className="h-5 w-5 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <div className={cn(
        'pr-1 -mr-1',
        scheduled.length === 0
          ? 'shrink-0'
          : scheduled.length <= 5
            ? 'shrink-0 overflow-visible'
            : 'flex-1 min-h-0 overflow-y-auto',
      )}>
        {scheduled.length === 0 ? (
          onAdd ? (
            <button
              type="button"
              onClick={onAdd}
              className={cn(
                'group w-full text-left transition-colors hover:text-foreground',
                embedded
                  ? 'rounded-md px-2 py-2 hover:bg-accent/55'
                  : 'rounded-lg border border-dashed border-foreground/12 bg-background/35 px-3 py-2.5 hover:border-foreground/25 hover:bg-accent/70',
              )}
            >
              <span className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/65 text-muted-foreground group-hover:text-foreground">
                  <Clock className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-semibold text-foreground">
                    시간 잡힌 일정이 없어요.
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                    {emptyHint ?? '타임라인을 클릭하거나 +로 추가'}
                  </span>
                </span>
              </span>
            </button>
          ) : (
            <p className="px-2 py-2 text-[13px] font-medium text-foreground/70 leading-snug">
              시간 잡힌 일정이 없어요.
            </p>
          )
        ) : (
          <div className="space-y-0.5 pb-1">
            {scheduled.map((item) => {
              const status = computeStatus(item.data.startAt, item.data.endAt, now);
              return item.kind === 'task' ? (
                <DraggableWeekItem
                  key={item.data.id}
                  id={`scheduled-list-task-${item.data.id}`}
                  data={weekDragDataForTask(item.data)}
                >
                  <ScheduledTaskRow
                    task={item.data}
                    status={status}
                    onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                  />
                </DraggableWeekItem>
              ) : (
                <DraggableWeekItem
                  key={item.data.id}
                  id={`scheduled-list-event-${item.data.id}`}
                  data={weekDragDataForEvent(item.data)}
                >
                  <ScheduledEventRow
                    event={item.data}
                    status={status}
                    onClick={() => onTaskClick?.({ id: item.data.id, title: item.data.title })}
                  />
                </DraggableWeekItem>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

/** task 색 변경 — DropdownMenu 안 swatch grid. event 는 색 옵션 미지원 (legacy). */
const ColorPickerMenu = ({ task }: { task: PlannerTask }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        aria-label="색 변경"
        title="색 변경"
        className={rowActionButtonClass}
      >
        <Palette className="h-3.5 w-3.5" />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="min-w-[160px] p-1.5">
      <div className="grid grid-cols-4 gap-1">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            taskStore.update(task.id, { color: undefined });
          }}
          aria-label="기본"
          title="기본"
          className={cn(
            'h-7 w-7 rounded-md border flex items-center justify-center transition-colors',
            !task.color ? 'border-foreground/50 bg-accent' : 'border-foreground/15 hover:border-foreground/35',
          )}
        >
          <span className="h-3 w-3 rounded-full bg-muted-foreground/30" aria-hidden />
        </button>
        {COLOR_OPTIONS.map((opt) => {
          const active = task.color === opt.value;
          const stripe = TASK_LIST_COLORS[opt.value].stripe;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                taskStore.update(task.id, { color: opt.value });
              }}
              aria-label={opt.label}
              title={opt.label}
              className={cn(
                'h-7 w-7 rounded-md border flex items-center justify-center transition-colors',
                active ? 'border-foreground/50 bg-accent' : 'border-foreground/15 hover:border-foreground/35',
              )}
            >
              <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: stripe }} aria-hidden />
            </button>
          );
        })}
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
);

/** Hover 시 우측에 뜨는 공통 액션 스트립 — 할 일 카드 액션과 밀도/높이를 맞춘다. */
const RowActions = ({
  kind,
  item,
  onEdit,
}: {
  kind: Kind;
  item: PlannerTask | PlannerEvent;
  onEdit: () => void;
}) => (
  <div className={rowActionStripClass} onClick={(e) => e.stopPropagation()}>
    <button
      type="button"
      onClick={onEdit}
      aria-label="편집"
      title="편집"
      className={rowActionButtonClass}
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
    {kind === 'task' && <ColorPickerMenu task={item as PlannerTask} />}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="미루기"
          title="미루기"
          className={rowActionButtonClass}
        >
          <Clock className="h-3.5 w-3.5" />
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
      onClick={() => removeItem(kind, item)}
      aria-label="삭제"
      title="삭제"
      className={cn(rowActionButtonClass, 'hover:bg-destructive/10 hover:text-destructive')}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  </div>
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
      data-scheduled-list-item={`task-${task.id}`}
      className={cn(
        'group flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1 transition-colors active:cursor-grabbing',
        status === 'past' && 'opacity-65 hover:opacity-95',
        status === 'now' && 'bg-amber-200/45 hover:bg-amber-200/60',
        status === 'upcoming' && 'hover:bg-accent',
      )}
      aria-label={status === 'now' ? '진행 중' : undefined}
    >
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); taskStore.toggleDone(task.id); }}
        aria-label={task.done ? '완료 취소' : '완료'}
        title={task.done ? '완료 취소 (점 클릭)' : '완료 (점 클릭)'}
        className="flex h-[18px] w-4 shrink-0 items-center justify-center"
      >
        <span
          className={cn(
            'h-2 w-2 rounded-full transition-all',
            task.done && 'opacity-30 ring-1 ring-foreground/40',
          )}
          style={{ backgroundColor: dotColor }}
        />
      </button>
      <span className="text-[12.5px] tabular-nums text-foreground/70 shrink-0 whitespace-nowrap leading-snug font-semibold" aria-label="시간">
        {formatTimeRange(task.startAt, task.endAt)}
      </span>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'min-w-0 flex-1 text-left text-[14px] font-semibold leading-[1.28] line-clamp-2 break-keep break-words',
          task.done ? 'text-foreground/45 line-through' : 'text-foreground',
        )}
        title={task.title}
      >
        {task.title}
      </button>
      {/* 일정 도메인엔 priority 개념이 없음 — startAt 있는 task 는 깃발 표시 X.
          taskStore sanitize 가 보통 막아주지만, 가상 인스턴스/레거시 데이터 대비 가드. */}
      {!task.startAt && (task.priority ?? 0) > 0 && (
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
      data-scheduled-list-item={`event-${event.id}`}
      className={cn(
        'group flex cursor-grab items-center gap-2 rounded-md px-1.5 py-1 transition-colors active:cursor-grabbing',
        status === 'past' && 'opacity-65 hover:opacity-95',
        status === 'now' && 'bg-amber-200/45 hover:bg-amber-200/60',
        status === 'upcoming' && 'hover:bg-accent',
      )}
      aria-label={status === 'now' ? '진행 중' : undefined}
    >
      <span
        className="flex h-[18px] w-4 shrink-0 items-center justify-center"
        aria-label="일정"
      >
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: event.color ?? 'hsl(var(--primary))' }}
        />
      </span>
      <span className="text-[12.5px] tabular-nums text-foreground/70 shrink-0 whitespace-nowrap leading-snug font-semibold" aria-label="시간">
        {formatTimeRange(event.startAt, event.endAt)}
      </span>
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 flex-1 text-left text-[14px] font-semibold leading-[1.28] line-clamp-2 break-keep break-words text-foreground"
        title={event.title}
      >
        {event.title}
      </button>
      <RowActions kind="event" item={event} onEdit={onClick} />
    </div>
  );
};
