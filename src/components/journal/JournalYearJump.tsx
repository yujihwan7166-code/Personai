/**
 * 연·월 점프 — 작성된 월만 칩으로 노출. 클릭 시 해당 월 섹션으로 부드러운 스크롤.
 *
 * Apple Photos / Day One 시간 axis 패턴 —
 * 1) 연도 탭 (작성된 연도만)
 * 2) 그 연도에 작성된 월 칩 (1~12월 회색 placeholder + 작성된 월 강조)
 * 3) 칩 클릭 → 해당 월 섹션으로 smooth scroll.
 *
 * 시간 흐름 한눈 + 1-tap 점프. 마우스 휠 스크롤 부담 제거.
 */
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

interface JournalYearJumpProps {
  /** "YYYY-MM" 키 배열 (작성된 월, 정렬 무관). */
  monthKeys: string[];
  /** 칩 클릭 시 해당 월 키 전달 ("YYYY-MM"). */
  onJump: (monthKey: string) => void;
  /** 현재 활성(스크롤 위치) 월 — 시각 강조. */
  activeMonthKey?: string | null;
}

const MONTHS_KO = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'] as const;

export const JournalYearJump = ({ monthKeys, onJump, activeMonthKey }: JournalYearJumpProps) => {
  // 연도별 → 월 Set 매핑
  const byYear = useMemo(() => {
    const m = new Map<string, Set<number>>();
    monthKeys.forEach((k) => {
      const y = k.slice(0, 4);
      const mo = parseInt(k.slice(5, 7), 10);
      if (!Number.isFinite(mo)) return;
      const set = m.get(y) ?? new Set<number>();
      set.add(mo);
      m.set(y, set);
    });
    return Array.from(m.entries())
      .sort((a, b) => b[0].localeCompare(a[0])); // 최신 연도 먼저
  }, [monthKeys]);

  const initialYear = activeMonthKey?.slice(0, 4) ?? byYear[0]?.[0];
  const [activeYear, setActiveYear] = useState<string>(initialYear ?? String(new Date().getFullYear()));

  if (byYear.length === 0) return null;

  const yearMonths = byYear.find(([y]) => y === activeYear)?.[1] ?? new Set<number>();
  const totalForYear = yearMonths.size;

  return (
    <section className="flex flex-col gap-2.5">
      <header className="flex items-baseline gap-2 px-1">
        <h3 className="text-[10.5px] font-mono uppercase tracking-[0.22em] text-foreground/85 font-semibold">
          이동
        </h3>
        <span className="flex-1 h-px bg-[hsl(var(--hairline))]" aria-hidden />
        <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
          연·월
        </span>
      </header>

      {/* 연도 탭 */}
      <div className="flex items-center gap-1 flex-wrap">
        {byYear.map(([year, set]) => {
          const active = year === activeYear;
          return (
            <button
              key={year}
              type="button"
              onClick={() => setActiveYear(year)}
              className={cn(
                'inline-flex items-center gap-1 px-2 h-6 rounded text-[11px] font-mono tabular-nums transition-colors',
                active
                  ? 'bg-foreground text-background'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent',
              )}
              aria-pressed={active}
            >
              {year}
              <span className={cn('text-[9.5px]', active ? 'opacity-70' : 'opacity-50')}>
                {set.size}
              </span>
            </button>
          );
        })}
      </div>

      {/* 12개월 그리드 — 작성된 월만 활성, 나머지는 회색 placeholder */}
      <div className="grid grid-cols-6 gap-1">
        {MONTHS_KO.map((label, idx) => {
          const month = idx + 1;
          const has = yearMonths.has(month);
          const mk = `${activeYear}-${month < 10 ? `0${month}` : month}`;
          const isActive = activeMonthKey === mk;
          return (
            <button
              key={month}
              type="button"
              disabled={!has}
              onClick={() => has && onJump(mk)}
              title={has ? `${activeYear}년 ${label}로 이동` : `${activeYear}년 ${label} (작성 안 함)`}
              className={cn(
                'h-7 rounded text-[10.5px] font-mono tabular-nums transition-all border',
                has && !isActive && 'border-[hsl(var(--hairline))] bg-card text-foreground/85 hover:border-foreground/30 hover:bg-accent cursor-pointer',
                has && isActive && 'border-primary/50 bg-primary/10 text-primary font-semibold',
                !has && 'border-transparent bg-transparent text-muted-foreground/30 cursor-default',
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {totalForYear === 0 && (
        <p className="text-[10.5px] text-muted-foreground text-center py-1">
          {activeYear}년 작성한 일기가 없어요
        </p>
      )}
    </section>
  );
};
