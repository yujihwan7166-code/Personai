/**
 * 주간/월간 통계 + AI 요약 패널 — 우측 사이드 (캘린더 미니 아래).
 *
 * v1: 정적 통계 즉시 표시 (작성수·평균 mood·top 태그·일별 mood 미니 그래프)
 * v2: '🪄 AI 요약 생성' 버튼 — /api/chat 호출 + LocalStorage 캐시 (예정)
 */
import { useMemo, useState } from 'react';
import { Sparkles, Hash, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { computeStats, type StatsPeriod } from '@/lib/journalStats';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, ACTIVITY_META } from '@/types/journal';

interface JournalSummaryPanelProps {
  entries: JournalEntry[];
}

export const JournalSummaryPanel = ({ entries }: JournalSummaryPanelProps) => {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const stats = useMemo(() => computeStats(entries, period), [entries, period]);

  const avgMoodEmoji = stats.avgMood !== null
    ? MOOD_EMOJI[Math.round(stats.avgMood) as Mood] ?? '😐'
    : null;

  const writingRate = stats.totalDays > 0 ? Math.round((stats.uniqueDays / stats.totalDays) * 100) : 0;

  return (
    <aside className="rounded-2xl border border-[hsl(var(--hairline))] bg-card p-4 flex flex-col gap-3 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
      {/* 헤더 + 기간 토글 */}
      <header className="flex items-center justify-between">
        <h3
          className="text-[14px] font-bold tracking-tight text-foreground"
          style={{ fontFamily: '"Newsreader", "Noto Serif KR", Georgia, serif', letterSpacing: '-0.005em' }}
        >
          요약
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

      {stats.count === 0 ? (
        <p className="text-[11.5px] text-muted-foreground text-center py-4">
          {period === 'week' ? '이번 주' : '이번 달'} 일기가 아직 없어요
        </p>
      ) : (
        <>
          {/* 핵심 카운트 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-accent/40 px-2.5 py-2">
              <p className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                작성
              </p>
              <p className="text-[18px] font-semibold tabular-nums text-foreground leading-tight mt-0.5">
                {stats.count}
                <span className="text-[10px] font-normal text-muted-foreground ml-1">개</span>
              </p>
            </div>
            <div className="rounded-md bg-accent/40 px-2.5 py-2">
              <p className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                작성률
              </p>
              <p className="text-[18px] font-semibold tabular-nums text-foreground leading-tight mt-0.5">
                {writingRate}%
                <span className="text-[10px] font-normal text-muted-foreground ml-1">
                  {stats.uniqueDays}/{stats.totalDays}
                </span>
              </p>
            </div>
          </div>

          {/* 평균 mood */}
          {avgMoodEmoji && (
            <div className="flex items-center justify-between rounded-md bg-accent/40 px-2.5 py-2">
              <span className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                평균 기분
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-[18px] leading-none">{avgMoodEmoji}</span>
                <span className="text-[11.5px] font-mono tabular-nums text-foreground/80">
                  {stats.avgMood?.toFixed(1)}
                </span>
              </span>
            </div>
          )}

          {/* 일별 mood 미니 그래프 */}
          {stats.moodTrend.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                일별 기분
              </span>
              <div className="flex items-end gap-0.5 h-12">
                {stats.moodTrend.map((d) => {
                  const h = d.mood !== null ? (d.mood / 5) * 100 : 0;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 bg-foreground/10 rounded-sm relative overflow-hidden"
                      title={d.mood !== null ? `${d.date} · ${MOOD_EMOJI[d.mood]}` : `${d.date} · 미작성`}
                    >
                      {d.mood !== null && (
                        <div
                          className={cn(
                            'absolute bottom-0 left-0 right-0 rounded-sm',
                            d.mood >= 4 ? 'bg-emerald-500/60'
                              : d.mood === 3 ? 'bg-amber-400/60'
                              : 'bg-rose-400/60',
                          )}
                          style={{ height: `${h}%` }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 글쓰기 통계 — 글자수 */}
          <div className="flex items-center justify-between rounded-md bg-accent/40 px-2.5 py-2">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
              <FileText className="h-3 w-3" />
              글자
            </span>
            <span className="flex items-baseline gap-1.5">
              <span className="text-[15px] font-semibold tabular-nums text-foreground">
                {stats.totalChars.toLocaleString()}
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                평균 {stats.avgChars.toLocaleString()}자
              </span>
            </span>
          </div>

          {/* Top 활동 */}
          {stats.topActivities.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                자주 한 활동
              </span>
              <div className="flex flex-wrap gap-1">
                {stats.topActivities.map((a) => {
                  const meta = ACTIVITY_META[a.key];
                  return (
                    <span
                      key={a.key}
                      className="inline-flex items-center gap-1 px-1.5 h-5 rounded text-[10.5px] font-medium bg-accent text-foreground"
                      title={meta?.label ?? a.key}
                    >
                      <span aria-hidden>{meta?.emoji ?? '·'}</span>
                      {meta?.label ?? a.key}
                      <span className="opacity-60 tabular-nums ml-0.5">{a.count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 활동 ↔ 기분 — 인사이트 (Daylio 핵심) */}
          {stats.activityMood.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                좋았던 활동 (평균 기분 순)
              </span>
              <ul className="flex flex-col gap-0.5">
                {stats.activityMood.slice(0, 3).map((a) => {
                  const meta = ACTIVITY_META[a.key];
                  const moodEmoji = MOOD_EMOJI[Math.round(a.avgMood) as Mood] ?? '😐';
                  return (
                    <li
                      key={a.key}
                      className="flex items-center gap-2 px-1.5 py-1 rounded text-[11px]"
                    >
                      <span className="text-[12px]" aria-hidden>{meta?.emoji ?? '·'}</span>
                      <span className="flex-1 text-foreground/85 truncate">{meta?.label ?? a.key}</span>
                      <span className="text-[12px]">{moodEmoji}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground/80">
                        {a.avgMood.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Top 태그 */}
          {stats.topTags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
                자주 쓴 태그
              </span>
              <div className="flex flex-wrap gap-1">
                {stats.topTags.map((t) => (
                  <span
                    key={t.tag}
                    className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded text-[10.5px] font-medium bg-accent text-foreground"
                  >
                    <Hash className="h-2.5 w-2.5 text-muted-foreground" />
                    {t.tag}
                    <span className="opacity-60 tabular-nums ml-0.5">{t.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* AI 요약 버튼 (v3 placeholder) */}
      <button
        type="button"
        disabled
        title="v3 에서 활성화 — AI 한 단락 요약 + 핵심 포인트"
        className="mt-1 inline-flex items-center justify-center gap-1.5 px-2 py-2 text-[11.5px] font-semibold rounded-md border border-dashed border-[hsl(var(--hairline))] text-muted-foreground bg-card cursor-not-allowed"
      >
        <Sparkles className="h-3 w-3" />
        AI 요약 (v3 예정)
      </button>
    </aside>
  );
};
