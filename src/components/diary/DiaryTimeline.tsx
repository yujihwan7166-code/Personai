import { useMemo } from 'react';
import type { DiaryEntry } from '@/types/diary';
import { DiaryCard } from './DiaryCard';
import { ThrowbackBanner } from './ThrowbackBanner';
import { throwbackEntries } from '@/lib/diary/throwback';

interface Props {
  entries: DiaryEntry[];          // 필터 적용된 목록(최신순)
  allEntries: DiaryEntry[];       // throwback 계산용 전체
  streak: number;
  onOpen: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function DiaryTimeline({ entries, allEntries, streak, onOpen, onToggleStar }: Props) {
  const throwbacks = useMemo(() => throwbackEntries(allEntries), [allEntries]);
  const byMonth = useMemo(() => {
    const map = new Map<string, DiaryEntry[]>();
    for (const e of entries) {
      const key = e.date.slice(0, 7); // YYYY-MM
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      {streak > 0 && (
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-[12.5px] font-semibold text-amber-600">
          🔥 {streak}일 연속
        </div>
      )}
      <ThrowbackBanner entries={throwbacks} onOpen={onOpen} />
      {byMonth.length === 0 && (
        <p className="py-16 text-center text-[13px] text-muted-foreground">아직 기록이 없어요. 오늘 감정을 남겨보세요.</p>
      )}
      {byMonth.map(([month, list]) => (
        <section key={month} className="mb-5">
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            {month.replace('-', '년 ')}월
          </h2>
          <div className="space-y-2">
            {list.map((e) => (
              <DiaryCard key={e.id} entry={e} onClick={() => onOpen(e.id)} onToggleStar={() => onToggleStar(e.id)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
