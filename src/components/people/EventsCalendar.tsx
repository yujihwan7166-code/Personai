/**
 * 경조사 캘린더 — 생일·기념일이 칩으로 찍히는 월 그리드 (목업 그대로).
 */
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayKey } from '@/types/travel';
import type { Person } from '@/types/people';

type EventType = 'birthday' | 'anniversary' | 'etc';
const TYPE_META: Record<EventType, { label: string; bg: string }> = {
  birthday: { label: '생일', bg: 'hsl(var(--people-accent))' },
  anniversary: { label: '기념일', bg: 'hsl(38 75% 42%)' },
  etc: { label: '기타', bg: 'hsl(150 38% 40%)' },
};

export function EventsCalendar({ persons, onOpenPerson }: { persons: Person[]; onOpenPerson: (id: string) => void }) {
  const today = todayKey();
  const [anchor, setAnchor] = useState(() => new Date());
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const daysIn = new Date(y, m + 1, 0).getDate();

  /** MM-DD → 이벤트들. */
  const byMonthDay = useMemo(() => {
    const map = new Map<string, Array<{ personId: string; name: string; label: string; type: EventType }>>();
    const push = (monthDay: string, ev: { personId: string; name: string; label: string; type: EventType }) => {
      const arr = map.get(monthDay);
      if (arr) arr.push(ev);
      else map.set(monthDay, [ev]);
    };
    for (const p of persons) {
      if (p.birthday) push(p.birthday, { personId: p.id, name: p.name, label: '생일', type: 'birthday' });
      for (const a of p.annivs) push(a.monthDay, { personId: p.id, name: p.name, label: a.label, type: a.type === 'etc' ? 'etc' : 'anniversary' });
    }
    return map;
  }, [persons]);

  return (
    <div className="pb-8">
      <div className="rounded-2xl border border-[hsl(var(--foreground)/0.09)] bg-[hsl(var(--surface-1))] p-4 shadow-[0_2px_10px_-4px_hsl(var(--foreground)/0.12)] sm:p-5">
        <div className="mb-4 flex items-center justify-center gap-4">
          <button type="button" onClick={() => setAnchor(new Date(y, m - 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--surface-3))]" aria-label="이전 달"><ChevronLeft className="h-4 w-4" /></button>
          <span className="text-[17px] font-bold tabular-nums">{y}년 {m + 1}월</span>
          <button type="button" onClick={() => setAnchor(new Date(y, m + 1, 1))} className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-[hsl(var(--surface-3))]" aria-label="다음 달"><ChevronRight className="h-4 w-4" /></button>
        </div>

        <div className="mb-1.5 grid grid-cols-7 text-center text-[11px] text-muted-foreground">
          {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
            <span key={w} className={cn(i === 0 && 'text-[hsl(var(--people-accent))]/80')}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {Array(lead).fill(null).map((_, i) => <div key={`x${i}`} />)}
          {Array.from({ length: daysIn }, (_, i) => {
            const day = i + 1;
            const monthDay = `${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const iso = `${y}-${monthDay}`;
            const isToday = iso === today;
            // 2/29 경조사는 평년엔 2/28 칸에 — 평년에 통째로 사라지는 것 방지
            const isLeap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
            const events =
              m === 1 && day === 28 && !isLeap
                ? [...(byMonthDay.get(monthDay) ?? []), ...(byMonthDay.get('02-29') ?? [])]
                : byMonthDay.get(monthDay) ?? [];
            return (
              <div
                key={day}
                className={cn(
                  'min-h-[74px] rounded-xl border p-1.5',
                  isToday ? 'border-[hsl(var(--people-accent))] bg-[hsl(var(--people-accent))]/[0.06] ring-1 ring-[hsl(var(--people-accent))]/25' : 'border-[hsl(var(--hairline))]/70 bg-[hsl(var(--surface-2))]/50',
                )}
              >
                <span className={cn('text-[11px] tabular-nums', isToday ? 'font-bold text-[hsl(var(--people-accent))]' : 'text-muted-foreground')}>{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {events.slice(0, 2).map((ev) => (
                    <button
                      key={`${ev.personId}-${ev.label}`}
                      type="button"
                      onClick={() => onOpenPerson(ev.personId)}
                      className="block w-full truncate rounded-[5px] px-1 py-0.5 text-left text-[9.5px] font-bold text-white transition-[filter] hover:brightness-110"
                      style={{ backgroundColor: TYPE_META[ev.type].bg }}
                      title={`${ev.name} ${ev.label}`}
                    >
                      {ev.name} {ev.label}
                    </button>
                  ))}
                  {events.length > 2 && <span className="block px-1 text-[9px] text-muted-foreground">외 {events.length - 2}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 범례 */}
      <div className="mt-2.5 flex items-center gap-4 px-1 text-[11px] text-muted-foreground">
        {(Object.keys(TYPE_META) as EventType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[3px]" style={{ backgroundColor: TYPE_META[t].bg }} />
            {TYPE_META[t].label}
          </span>
        ))}
      </div>
    </div>
  );
}
