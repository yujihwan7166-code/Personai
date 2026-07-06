import { useMemo } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { feelingColor, getFeeling } from '@/lib/diary/feelings';

interface Props { entries: DiaryEntry[]; year: number; month1: number; onPickDate: (date: string) => void; }

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function DiaryMoodCalendar({ entries, year, month1, onPickDate }: Props) {
  const byDate = useMemo(() => {
    const map = new Map<string, DiaryEntry>();
    for (const e of entries) if (!map.has(e.date)) map.set(e.date, e);
    return map;
  }, [entries]);

  const days = new Date(year, month1, 0).getDate();
  const lead = new Date(year, month1 - 1, 1).getDay();
  const cells: (string | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: days }, (_, i) => `${year}-${String(month1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];

  return (
    <div>
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground/70">
        {WEEK.map((w) => <span key={w}>{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d === null ? <div key={i} /> : (() => {
          const e = byDate.get(d);
          const has = !!e;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPickDate(d)}
              className="flex aspect-square flex-col items-center justify-center rounded-md text-[11px] text-foreground/70 transition hover:ring-1 hover:ring-primary/40"
              style={{ backgroundColor: has ? feelingColor(e!.primaryFeeling) : 'hsl(var(--accent))' }}
              title={has ? getFeeling(e!.primaryFeeling)?.label : undefined}
            >
              <span className={has ? 'font-semibold text-white' : ''}>{Number(d.slice(8))}</span>
            </button>
          );
        })())}
      </div>
    </div>
  );
}
