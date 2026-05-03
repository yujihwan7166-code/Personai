/**
 * 사이드바 컴팩트 아젠다 — TickTick "일정 보기" 의 미니 버전.
 *
 * 시간 배정된 task + event 를 날짜별 그룹으로 쭉 나열. 빈 날 자동 스킵.
 * 220px 사이드바 폭에 맞게 단일 컬럼 (날짜 헤더 + 시간/제목 한 줄).
 */
import { useEffect, useMemo, useState } from 'react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import {
  PLANNER_TASK_CHANGED, PLANNER_EVENT_CHANGED, TASK_LIST_COLORS,
  type PlannerTask, type PlannerEvent,
} from '@/types/planner';
import { cn } from '@/lib/utils';

const WINDOW_DAYS = 60;
const MAX_GROUPS = 8;

interface AgendaItem {
  kind: 'task' | 'event';
  id: string;
  title: string;
  startAt: string;
  done?: boolean;
  canceled?: boolean;
  color?: string;
}

interface PlannerAgendaMiniProps {
  onItemClick?: (it: { id: string; title: string }) => void;
}

const localDayKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatHm = (iso: string) =>
  new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

const formatDayLabel = (d: Date): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (localDayKey(d) === localDayKey(today)) return '오늘';
  if (localDayKey(d) === localDayKey(tomorrow)) return '내일';
  const diffDays = Math.round((d.getTime() - new Date(today.toDateString()).getTime()) / 86_400_000);
  if (diffDays > 0 && diffDays <= 6) {
    return `${diffDays}일 후 · ${d.toLocaleDateString('ko-KR', { weekday: 'short' })}`;
  }
  return d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' });
};

export const PlannerAgendaMini = ({ onItemClick }: PlannerAgendaMiniProps) => {
  const [tasks, setTasks] = useState<PlannerTask[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);

  useEffect(() => {
    const refresh = () => {
      const start = new Date();
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
  }, []);

  const groups = useMemo<Array<{ dayKey: string; date: Date; items: AgendaItem[] }>>(() => {
    const map = new Map<string, AgendaItem[]>();
    const push = (it: AgendaItem) => {
      const k = localDayKey(new Date(it.startAt));
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    };
    for (const t of tasks) {
      if (!t.startAt) continue;
      push({
        kind: 'task', id: t.id, title: t.title, startAt: t.startAt,
        done: t.done, canceled: t.canceled,
        color: t.color ? TASK_LIST_COLORS[t.color]?.stripe : undefined,
      });
    }
    for (const e of events) {
      push({ kind: 'event', id: e.id, title: e.title, startAt: e.startAt, color: e.color });
    }
    const sortedKeys = [...map.keys()].sort();
    return sortedKeys.slice(0, MAX_GROUPS).map((k) => {
      const arr = map.get(k)!.sort((a, b) => a.startAt.localeCompare(b.startAt));
      const [y, m, d] = k.split('-').map(Number);
      return { dayKey: k, date: new Date(y, m - 1, d), items: arr };
    });
  }, [tasks, events]);

  return (
    <div className="px-1">
      <div className="px-1.5 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
        다가오는 일정
      </div>
      {groups.length === 0 ? (
        <p className="px-1.5 py-2 text-[11.5px] text-foreground/45 leading-snug">
          예정된 일정 없음
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {groups.map(({ dayKey, date, items }) => (
            <li key={dayKey}>
              <div className="px-1.5 mb-0.5 text-[10.5px] font-semibold text-foreground/70">
                {formatDayLabel(date)}
              </div>
              <ul className="flex flex-col gap-0.5">
                {items.slice(0, 4).map((it) => {
                  const accent = it.color ?? (it.kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(262 70% 60%)');
                  const dim = it.done || it.canceled;
                  return (
                    <li key={`${it.kind}-${it.id}`}>
                      <button
                        type="button"
                        onClick={() => onItemClick?.({ id: it.id, title: it.title })}
                        title={it.title}
                        style={{ borderLeftColor: accent }}
                        className={cn(
                          'w-full flex items-baseline gap-1.5 pl-2 pr-1 py-0.5 rounded-sm border-l-[3px]',
                          'text-left hover:bg-accent transition-colors',
                          dim && 'opacity-55',
                        )}
                      >
                        <span className="text-[10px] font-mono tabular-nums text-foreground/60 shrink-0">
                          {formatHm(it.startAt)}
                        </span>
                        <span className={cn(
                          'min-w-0 flex-1 truncate text-[11.5px] text-foreground/85',
                          dim && 'line-through',
                        )}>
                          {it.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
                {items.length > 4 && (
                  <li className="px-2 text-[10px] text-foreground/45 tabular-nums">
                    +{items.length - 4}
                  </li>
                )}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
};
