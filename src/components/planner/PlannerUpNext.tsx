/**
 * 사이드바 "다가오는 일정" 위젯 — 다음 7일 시간 잡힌 task/event 시간순 미니 list.
 *
 * 미니 월 도트 보완 — 도트가 분포만 보여준다면 여기는 제목/시간까지.
 * 비어있으면 "예정된 일정 없음" 안내.
 */
import { useEffect, useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { taskStore } from '@/services/planner/taskStore';
import { eventStore } from '@/services/planner/eventStore';
import { cn } from '@/lib/utils';
import {
  PLANNER_EVENT_CHANGED, PLANNER_TASK_CHANGED, type PlannerEvent, type PlannerTask,
} from '@/types/planner';

interface PlannerUpNextProps {
  /** 기준일(보통 오늘). 이 시점부터 +days 까지 보여줌. */
  fromIso?: string;
  days?: number;
  limit?: number;
  onItemClick?: (item: { id: string; title: string }) => void;
}

type UpNextItem = {
  id: string;
  title: string;
  startAt: string;
  kind: 'task' | 'event';
};

const formatRelative = (iso: string, today: Date): string => {
  const d = new Date(iso);
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  const dayStart = new Date(d);
  dayStart.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dayStart.getTime() - t.getTime()) / 86_400_000);
  const time = d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  if (diffDays === 0) return `오늘 ${time}`;
  if (diffDays === 1) return `내일 ${time}`;
  return `${d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })} ${time}`;
};

export const PlannerUpNext = ({
  fromIso,
  days = 7,
  limit = 5,
  onItemClick,
}: PlannerUpNextProps) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener(PLANNER_TASK_CHANGED, refresh);
    window.addEventListener(PLANNER_EVENT_CHANGED, refresh);
    return () => {
      window.removeEventListener(PLANNER_TASK_CHANGED, refresh);
      window.removeEventListener(PLANNER_EVENT_CHANGED, refresh);
    };
  }, []);

  const today = useMemo(() => (fromIso ? new Date(fromIso) : new Date()), [fromIso]);

  const items = useMemo(() => {
    const start = today.getTime();
    const end = start + days * 86_400_000;

    const taskItems: UpNextItem[] = [];
    for (const t of taskStore.list()) {
      if (t.done || t.canceled || t.someday) continue;
      if (!t.startAt) continue;
      const ts = new Date(t.startAt).getTime();
      if (ts < start || ts > end) continue;
      taskItems.push({ id: t.id, title: t.title, startAt: t.startAt, kind: 'task' });
    }

    const eventItems: UpNextItem[] = [];
    for (const e of eventStore.list() as PlannerEvent[]) {
      if (!e.startAt) continue;
      const ts = new Date(e.startAt).getTime();
      if (ts < start || ts > end) continue;
      eventItems.push({ id: e.id, title: e.title, startAt: e.startAt, kind: 'event' });
    }

    return [...taskItems, ...eventItems]
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, days, limit, tick]);

  return (
    <section className="px-1">
      <div className="flex items-center gap-1.5 px-1.5 mb-1.5">
        <Clock3 className="h-3.5 w-3.5 text-foreground/70" />
        <span className="text-[12px] font-semibold text-foreground/85 tracking-tight">
          다가오는 일정
        </span>
        {items.length > 0 && (
          <span className="text-[10.5px] tabular-nums text-foreground/55">{items.length}</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-1.5 py-1 text-[11.5px] text-foreground/55 leading-snug">
          다음 {days}일에 예정된 일정 없음
        </p>
      ) : (
        <ul className="space-y-0.5">
          {items.map((item) => {
            const clickable = item.kind === 'task' && Boolean(onItemClick);
            const Tag = clickable ? 'button' : 'div';
            return (
              <li key={`${item.kind}-${item.id}`}>
                <Tag
                  type={clickable ? 'button' : undefined}
                  onClick={clickable ? () => onItemClick?.({ id: item.id, title: item.title }) : undefined}
                  className={cn(
                    'w-full flex items-baseline gap-1.5 px-1.5 py-1 rounded text-left',
                    clickable && 'hover:bg-accent transition-colors cursor-pointer',
                  )}
                >
                  <span className="shrink-0 text-[10.5px] font-mono tabular-nums text-foreground/60 w-[68px] truncate">
                    {(() => {
                      const fromDate = fromIso ? new Date(fromIso) : new Date();
                      return formatRelative(item.startAt, fromDate);
                    })()}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90 leading-snug">
                    {item.title}
                  </span>
                </Tag>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
