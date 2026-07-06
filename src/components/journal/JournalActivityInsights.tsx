/**
 * 활동 인사이트 카드 — 자주 한 활동 + 좋았던 활동 (Daylio 핵심 패턴).
 *
 * SummaryPanel 안 작은 chip 으로 묻혀있던 정보를 prominent 카드로 분리.
 * - 자주 한 활동 = top count 4-6개, 라벨 + 이모지 + 카운트
 * - 좋았던 활동 = 평균 mood top 3, 활동별 평균 mood emoji + 점수
 *
 * 이번 주 / 이번 달 토글 — SummaryPanel 과 통일된 기간 선택.
 */
import { useMemo, useState } from 'react';
import { computeStats, type StatsPeriod } from '@/lib/journalStats';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { ACTIVITY_META, MOOD_EMOJI } from '@/types/journal';

interface JournalActivityInsightsProps {
  entries: JournalEntry[];
}

export const JournalActivityInsights = ({ entries }: JournalActivityInsightsProps) => {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const stats = useMemo(() => computeStats(entries, period), [entries, period]);

  const hasContent = stats.topActivities.length > 0 || stats.activityMood.length > 0;

  // 양 기간 모두 비어 있으면 카드 자체를 숨김 (사이드바 빈 자리 차지 방지).
  // 단 entries 가 있을 때만 — entries 가 0개면 일기 자체가 비어 있어 카드 의미 없음.
  const otherPeriod = period === 'week' ? 'month' : 'week';
  const otherStats = useMemo(() => computeStats(entries, otherPeriod), [entries, otherPeriod]);
  const otherHasContent = otherStats.topActivities.length > 0 || otherStats.activityMood.length > 0;
  if (!hasContent && !otherHasContent) return null;

  return (
    <aside className="rounded-2xl border border-[hsl(var(--hairline))] bg-card p-4 flex flex-col gap-3 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
      {/* 헤더 — 라벨 + 기간 토글 */}
      <header className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold tracking-[-0.012em] text-foreground/85">
          활동 인사이트
        </h3>
        <div
          role="tablist"
          className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-accent/40 border border-[hsl(var(--hairline))]"
        >
          {(['week', 'month'] as StatsPeriod[]).map((p) => {
            const active = period === p;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPeriod(p)}
                className={cn(
                  'px-2 h-5 rounded text-[10.5px] font-semibold transition-colors',
                  active
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-[hsl(var(--hairline))]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {p === 'week' ? '이번 주' : '이번 달'}
              </button>
            );
          })}
        </div>
      </header>

      {!hasContent ? (
        <p className="text-[11.5px] text-muted-foreground text-center py-4">
          {period === 'week' ? '이번 주' : '이번 달'} 활동이 아직 없어요
        </p>
      ) : (
        <>
          {/* 자주 한 활동 — prominent grid (chip 보다 큰 박스) */}
          {stats.topActivities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-[-0.005em] text-muted-foreground">
                자주 한 활동
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {stats.topActivities.slice(0, 4).map((a) => {
                  const meta = ACTIVITY_META[a.key];
                  return (
                    <div
                      key={a.key}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-accent/40 border border-[hsl(var(--hairline))]"
                      title={meta?.label ?? a.key}
                    >
                      <span className="text-[15px] leading-none shrink-0" aria-hidden>
                        {meta?.emoji ?? '·'}
                      </span>
                      <span className="text-[11.5px] font-medium text-foreground/85 truncate flex-1 min-w-0">
                        {meta?.label ?? a.key}
                      </span>
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground shrink-0">
                        {a.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 좋았던 활동 — 평균 mood 순 (Daylio 핵심) */}
          {stats.activityMood.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium tracking-[-0.005em] text-muted-foreground">
                좋았던 활동
              </span>
              <ul className="flex flex-col gap-0.5">
                {stats.activityMood.slice(0, 3).map((a, i) => {
                  const meta = ACTIVITY_META[a.key];
                  const moodEmoji = MOOD_EMOJI[Math.round(a.avgMood) as Mood] ?? '😐';
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-2 px-2 py-1.5 rounded text-[11.5px]"
                    >
                      {/* rank 숫자 (1~3) */}
                      <span className="text-[10px] font-bold tabular-nums text-muted-foreground/70 w-3 shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-[14px] leading-none shrink-0" aria-hidden>
                        {meta?.emoji ?? '·'}
                      </span>
                      <span className="flex-1 text-foreground/85 truncate font-medium">
                        {meta?.label ?? a.key}
                      </span>
                      <span className="text-[13px] leading-none">{moodEmoji}</span>
                      <span className="text-[10.5px] tabular-nums text-muted-foreground/70 shrink-0">
                        {a.avgMood.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  );
};
