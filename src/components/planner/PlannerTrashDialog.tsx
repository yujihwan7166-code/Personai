import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArchiveRestore, CalendarClock, CheckSquare, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { eventStore } from '@/services/planner/eventStore';
import { taskStore } from '@/services/planner/taskStore';
import { PLANNER_EVENT_CHANGED, PLANNER_TASK_CHANGED, type PlannerEvent, type PlannerTask } from '@/types/planner';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';

type TrashKind = 'task' | 'event';

type TrashRow =
  | { kind: 'task'; item: PlannerTask }
  | { kind: 'event'; item: PlannerEvent };

interface PlannerTrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatDeletedAt = (iso?: string): string => {
  if (!iso) return '';
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSchedule = (startAt?: string, endAt?: string): string => {
  if (!startAt) return '시간 미배정';
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : null;
  const date = start.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const startTime = start.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const endTime = end?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return endTime ? `${date} ${startTime}~${endTime}` : `${date} ${startTime}`;
};

const loadTrashRows = (): TrashRow[] => {
  const tasks = taskStore.listDeleted().map((item) => ({ kind: 'task' as const, item }));
  const events = eventStore.listDeleted().map((item) => ({ kind: 'event' as const, item }));
  return [...tasks, ...events].sort((a, b) =>
    (b.item.deletedAt ?? '').localeCompare(a.item.deletedAt ?? ''),
  );
};

const trashItemTitle = (item: PlannerTask | PlannerEvent): string => item.title || '제목 없음';

export const PlannerTrashDialog = ({ open, onOpenChange }: PlannerTrashDialogProps) => {
  const [rows, setRows] = useState<TrashRow[]>(() => loadTrashRows());
  const [filter, setFilter] = useState<'all' | TrashKind>('all');

  const refresh = useCallback(() => setRows(loadTrashRows()), []);

  useEffect(() => {
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
    };
  }, [refresh]);

  const visibleRows = useMemo(
    () => rows.filter((row) => filter === 'all' || row.kind === filter),
    [filter, rows],
  );
  const taskCount = rows.filter((row) => row.kind === 'task').length;
  const eventCount = rows.filter((row) => row.kind === 'event').length;

  const restore = (row: TrashRow) => {
    if (row.kind === 'task') taskStore.restore(row.item.id);
    else eventStore.restore(row.item.id);
    notify.success('복원했어요', { duration: 1200 });
  };

  const purge = (row: TrashRow) => {
    const title = trashItemTitle(row.item);
    if (typeof window !== 'undefined' && !window.confirm(`"${title}"을(를) 영구 삭제할까요? 복구할 수 없어요.`)) return;
    if (row.kind === 'task') taskStore.purge(row.item.id);
    else eventStore.purge(row.item.id);
    notify.info('영구 삭제했어요', { duration: 1200 });
  };

  const emptyTrash = () => {
    if (rows.length === 0) return;
    if (typeof window !== 'undefined' && !window.confirm(`휴지통의 ${rows.length}개 항목을 모두 영구 삭제할까요?`)) return;
    const removed = taskStore.emptyTrash() + eventStore.emptyTrash();
    notify.info(`${removed}개 항목을 비웠어요`, { duration: 1500 });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[760px] overflow-hidden rounded-2xl border-foreground/15 bg-card p-0 shadow-[0_22px_70px_hsl(var(--foreground)/0.20)]" hideClose>
        <DialogHeader className="border-b border-foreground/10 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 text-[18px] font-bold">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-foreground/5 text-foreground">
                  <Trash2 className="h-4 w-4" strokeWidth={2.1} />
                </span>
                휴지통
              </DialogTitle>
              <DialogDescription className="sr-only">
                삭제된 일정과 할 일을 복원하거나 영구 삭제할 수 있습니다.
              </DialogDescription>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="휴지통 닫기"
              title="휴지통 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between gap-2 border-b border-foreground/10 px-5 py-2.5">
          <div
            className="inline-flex rounded-xl border border-foreground/15 bg-background p-0.5"
            role="tablist"
            aria-label="휴지통 항목 필터"
          >
            {[
              ['all', `전체 ${rows.length}`],
              ['task', `할 일 ${taskCount}`],
              ['event', `일정 ${eventCount}`],
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key as typeof filter)}
                className={cn(
                  'h-8 rounded-[10px] px-3 text-[12px] font-semibold transition-colors',
                  filter === key
                    ? 'bg-card text-foreground shadow-[0_1px_5px_hsl(var(--foreground)/0.10)]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={emptyTrash}
            disabled={rows.length === 0}
            className="inline-flex h-8 items-center rounded-lg border border-destructive/20 px-3 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10 disabled:pointer-events-none disabled:opacity-35"
            aria-label={`휴지통 ${rows.length}개 항목 모두 영구 삭제`}
          >
            휴지통 비우기
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto px-3 py-3">
          {visibleRows.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center" role="status">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/5 text-muted-foreground">
                <Trash2 className="h-5 w-5" />
              </div>
              <p className="mt-3 text-[14px] font-semibold text-foreground">휴지통이 비어 있어요.</p>
            </div>
          ) : (
            <div className="space-y-1" role="list" aria-label="삭제된 플래너 항목">
              {visibleRows.map((row) => {
                const item = row.item;
                const title = trashItemTitle(item);
                const scheduled = row.kind === 'event' || Boolean((item as PlannerTask).startAt);
                return (
                  <div
                    key={`${row.kind}-${item.id}`}
                    role="listitem"
                    className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent/65"
                  >
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 items-center justify-center rounded-xl',
                        row.kind === 'event' || scheduled
                          ? 'bg-primary/10 text-primary'
                          : 'bg-amber-500/10 text-amber-600',
                      )}
                    >
                      {row.kind === 'event' || scheduled ? (
                        <CalendarClock className="h-4 w-4" />
                      ) : (
                        <CheckSquare className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-[14px] font-semibold text-foreground">{title}</p>
                        <span className="shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {row.kind === 'event' ? '일정' : scheduled ? '배정됨' : '할 일'}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground">
                        {formatSchedule(item.startAt, item.endAt)}
                        {item.deletedAt && ` · ${formatDeletedAt(item.deletedAt)} 삭제`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => restore(row)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-foreground/15 bg-card px-2.5 text-[12px] font-semibold text-foreground transition-colors hover:border-primary/30 hover:bg-primary/8 hover:text-primary"
                        aria-label={`${title} 복원`}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        복원
                      </button>
                      <button
                        type="button"
                        onClick={() => purge(row)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`${title} 영구 삭제`}
                        title="영구 삭제"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
