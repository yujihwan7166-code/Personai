/**
 * 아젠다 뷰 — TickTick "일정 보기" 패턴.
 *
 * 날짜 그룹 안에 task + event 시간순 나열. 빈 날은 그룹 자체 생략 (9일 비면 → 10일이 다음).
 * anchor 부터 90일치 future window 기본. 풀스크린 컨테이너 (month/year 뷰와 동일 슬롯).
 *
 * 구조:
 *   2026-05-06 (수)
 *     08:00 - 09:00  조깅
 *     09:00 - 12:00  마케팅 전략 개발하기
 *   2026-05-07 (목)
 *     08:00 - 09:00  커피 한잔 마시기
 */
import { useEffect, useMemo, useState } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import {
  PLANNER_TASK_CHANGED, PLANNER_EVENT_CHANGED, TASK_LIST_COLORS,
  type PlannerTask, type PlannerEvent,
} from '@/types/planner';
import { cn } from '@/lib/utils';

const WINDOW_DAYS = 90;

interface AgendaItem {
  kind: 'task' | 'event';
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  done?: boolean;
  canceled?: boolean;
  color?: string;
  priority?: number;
}

interface AgendaViewProps {
  anchorIso: string;
  onItemClick?: (item: { kind: 'event' | 'task'; id: string; title: string; startAt: string; endAt: string }) => void;
}

const localDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatHm = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: true });

const formatDayHeader = (d: Date) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (localDayKey(d) === localDayKey(today)) return '오늘';
  if (localDayKey(d) === localDayKey(tomorrow)) return '내일';
  return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
};

const colorFromTask = (t: PlannerTask): string | undefined => {
  if (t.color) return TASK_LIST_COLORS[t.color]?.stripe;
  return undefined;
};

export const AgendaView = ({ anchorIso, onItemClick }: AgendaViewProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);

  useEffect(() => {
    const refresh = () => {
      const start = new Date(anchorIso);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + WINDOW_DAYS);
      setTasks(taskStore.listScheduledRange(start, end));
      setEvents(eventStore.listByRange(start, end));
    };
    refresh();
    if (typeof window === 'undefined') return;
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
    };
  }, [anchorIso]);

  const groups = useMemo<Array<{ dayKey: string; date: Date; items: AgendaItem[] }>>(() => {
    const map = new Map<string, AgendaItem[]>();
    const push = (item: AgendaItem) => {
      const k = localDayKey(new Date(item.startAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(item);
    };
    for (const t of tasks) {
      if (!t.startAt || !t.endAt) continue;
      push({
        kind: 'task',
        id: t.id,
        title: t.title,
        startAt: t.startAt,
        endAt: t.endAt,
        done: t.done,
        canceled: t.canceled,
        color: colorFromTask(t),
        priority: t.priority,
      });
    }
    for (const e of events) {
      push({
        kind: 'event',
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        endAt: e.endAt,
        color: e.color,
      });
    }
    const sortedKeys = [...map.keys()].sort();
    return sortedKeys.map((k) => {
      const items = map.get(k)!.sort((a, b) => a.startAt.localeCompare(b.startAt));
      const [y, m, d] = k.split('-').map(Number);
      return { dayKey: k, date: new Date(y, m - 1, d), items };
    });
  }, [tasks, events]);

  if (groups.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-foreground/55">
        <div className="text-center">
          <div className="text-[15px] font-medium mb-1">앞으로 {WINDOW_DAYS}일에 일정이 없어요</div>
          <div className="text-[12.5px]">날짜·시간 있는 일정/할 일이 여기에 묶여서 나옵니다</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pr-1 -mr-1">
      <ol className="flex flex-col gap-7 py-1">
        {groups.map(({ dayKey, date, items }) => {
          const dow = date.getDay();
          const isToday = localDayKey(date) === localDayKey(new Date());
          return (
            <li key={dayKey} className="grid grid-cols-[88px_minmax(0,1fr)] gap-4">
              {/* 날짜 라벨 컬럼 */}
              <div className="pt-1.5 sticky top-0">
                <div className={cn(
                  'text-[22px] font-semibold tabular-nums leading-none',
                  isToday ? 'text-foreground' : dow === 0 ? 'text-rose-500/80' : dow === 6 ? 'text-blue-500/80' : 'text-foreground/85',
                )}>
                  {date.getDate()}
                </div>
                <div className={cn(
                  'mt-1 text-[11px] font-mono uppercase tracking-wide',
                  isToday ? 'text-foreground/70' : 'text-foreground/50',
                )}>
                  {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                </div>
                {isToday && (
                  <div className="mt-1 text-[10px] text-foreground/55">오늘</div>
                )}
                {!isToday && (
                  <div className="mt-1 text-[10px] text-foreground/45 truncate">
                    {formatDayHeader(date)}
                  </div>
                )}
              </div>

              {/* 항목 리스트 */}
              <ul className="flex flex-col gap-1.5 min-w-0">
                {items.map((it) => {
                  const accent = it.color ?? (it.kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(262 70% 60%)');
                  const dim = it.done || it.canceled;
                  return (
                    <li key={`${it.kind}-${it.id}`}>
                      <button
                        type="button"
                        onClick={() => onItemClick?.({
                          kind: it.kind, id: it.id, title: it.title,
                          startAt: it.startAt, endAt: it.endAt,
                        })}
                        style={{
                          backgroundColor: `color-mix(in oklab, ${accent} 18%, hsl(var(--background)))`,
                          borderColor: `color-mix(in oklab, ${accent} 35%, hsl(var(--background)))`,
                          borderLeftColor: accent,
                          borderLeftWidth: 3,
                        }}
                        className={cn(
                          'group w-full text-left rounded-md border px-3 py-2',
                          'hover:brightness-[1.03] hover:shadow-[0_2px_8px_-4px_hsl(var(--foreground)/0.15)]',
                          'transition-all',
                          dim && 'opacity-55',
                        )}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[11px] font-mono tabular-nums text-foreground/65 shrink-0">
                            {formatHm(it.startAt)} - {formatHm(it.endAt)}
                          </span>
                        </div>
                        <div className={cn(
                          'mt-0.5 text-[14px] font-medium text-foreground truncate',
                          dim && 'line-through',
                        )}>
                          {it.title}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
