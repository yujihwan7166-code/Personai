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
import { fmtDateWithWeekday } from '@/lib/dateFormat';

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
  /** 팝오버용 large 모드 — TickTick 식 풀블록. */
  large?: boolean;
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
  return fmtDateWithWeekday(d);
};

const agendaItemKindLabel = (kind: AgendaItem['kind']) => kind === 'event' ? '일정' : '할 일';

const formatAgendaItemLabel = (it: AgendaItem, date: Date): string => {
  const status = it.canceled ? ', 취소됨' : it.done ? ', 완료됨' : '';
  return `${agendaItemKindLabel(it.kind)} ${it.title}, ${formatDayLabel(date)} ${formatHm(it.startAt)}${status}`;
};

export const PlannerAgendaMini = ({ onItemClick, large = false }: PlannerAgendaMiniProps) => {
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

  if (large) {
    return (
      <div>
        {groups.length === 0 ? (
          <p role="status" className="py-8 text-center text-[14px] text-muted-foreground">예정된 일정이 없어요</p>
        ) : (
          <ol className="flex flex-col gap-7" aria-label="다가오는 일정 목록">
            {groups.map(({ dayKey, date, items }) => {
              const dow = date.getDay();
              const isToday = localDayKey(date) === localDayKey(new Date());
              const dayLabel = formatDayLabel(date);
              return (
                <li key={dayKey} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4">
                  <div className="pt-1">
                    <div className={cn(
                      'text-[26px] font-bold tabular-nums leading-none',
                      isToday ? 'text-foreground' : dow === 0 ? 'text-rose-500/80' : dow === 6 ? 'text-blue-500/80' : 'text-foreground/85',
                    )}>
                      {date.getDate()}
                    </div>
                    <div className={cn(
                      'mt-1 text-[11.5px] font-mono uppercase tracking-wide',
                      isToday ? 'text-foreground/70' : 'text-foreground/50',
                    )}>
                      {date.toLocaleDateString('ko-KR', { weekday: 'short' })}
                    </div>
                    <div className="mt-1 text-[10.5px] text-foreground/45 truncate">
                      {dayLabel}
                    </div>
                  </div>
                  <ul className="flex flex-col gap-1.5 min-w-0" aria-label={`${dayLabel} 일정`}>
                    {items.map((it) => {
                      const accent = it.color ?? (it.kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(262 70% 60%)');
                      const dim = it.done || it.canceled;
                      return (
                        <li key={`${it.kind}-${it.id}`}>
                          <button
                            type="button"
                            onClick={() => onItemClick?.({ id: it.id, title: it.title })}
                            aria-label={formatAgendaItemLabel(it, date)}
                            style={{
                              backgroundColor: `color-mix(in oklab, ${accent} 18%, hsl(var(--background)))`,
                              borderColor: `color-mix(in oklab, ${accent} 35%, hsl(var(--background)))`,
                              borderLeftColor: accent,
                              borderLeftWidth: 3,
                            }}
                            className={cn(
                              'group w-full text-left rounded-md border px-3 py-2',
                              'hover:brightness-[1.03] transition-all',
                              dim && 'opacity-55',
                            )}
                          >
                            <div className="text-[11.5px] font-mono tabular-nums text-foreground/65">
                              {formatHm(it.startAt)}
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
        )}
      </div>
    );
  }

  return (
    <div className="px-1">
      <div className="px-1.5 mb-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
        다가오는 일정
      </div>
      {groups.length === 0 ? (
        <p role="status" className="px-1.5 py-2 text-[11.5px] text-foreground/45 leading-snug">
          예정된 일정 없음
        </p>
      ) : (
        <ol className="flex flex-col gap-2" aria-label="다가오는 일정 목록">
          {groups.map(({ dayKey, date, items }) => {
            const dayLabel = formatDayLabel(date);
            return (
              <li key={dayKey}>
                <div className="px-1.5 mb-0.5 text-[10.5px] font-semibold text-foreground/70">
                  {dayLabel}
                </div>
                <ul className="flex flex-col gap-0.5" aria-label={`${dayLabel} 일정`}>
                  {items.slice(0, 4).map((it) => {
                    const accent = it.color ?? (it.kind === 'event' ? 'hsl(220 70% 55%)' : 'hsl(262 70% 60%)');
                    const dim = it.done || it.canceled;
                    return (
                      <li key={`${it.kind}-${it.id}`}>
                        <button
                          type="button"
                          onClick={() => onItemClick?.({ id: it.id, title: it.title })}
                          title={it.title}
                          aria-label={formatAgendaItemLabel(it, date)}
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
            );
          })}
        </ol>
      )}
    </div>
  );
};
