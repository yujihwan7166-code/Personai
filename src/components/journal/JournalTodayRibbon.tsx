/**
 * 오늘 한 줄 요약 ribbon — 메인 영역 상단.
 *
 * Day One Today summary 패턴 — 오늘 작성 여부에 따라:
 *   - 작성됨: "오늘 N개 · X자 · 😊 4 · 활동 · 활동" 한 줄 metadata
 *   - 안 작성: "오늘 한 줄 적어볼까요" + 작은 적기 버튼
 *
 * 진입 빈도 ↑, 오늘에 시선 한 번 잠시 — week board 와 별개의 즉시 액션.
 */
import { useMemo } from 'react';
import { Pencil, FileText } from 'lucide-react';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, ACTIVITY_META } from '@/types/journal';

interface JournalTodayRibbonProps {
  entries: JournalEntry[];
  onAdd: () => void;
  /** entry 클릭 시 편집 (있을 때). */
  onClickToday?: (entry: JournalEntry) => void;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export const JournalTodayRibbon = ({
  entries,
  onAdd,
  onClickToday,
}: JournalTodayRibbonProps) => {
  const today = ymd(new Date());

  const todayEntries = useMemo(
    () => entries.filter((e) => e.date === today),
    [entries, today],
  );

  const summary = useMemo(() => {
    if (todayEntries.length === 0) return null;
    // 글자수 합계 (markdown stripping 없이 본문 단순 길이)
    const totalChars = todayEntries.reduce((sum, e) => sum + e.body.length, 0);
    // mood — 첫 entry 의 mood 또는 평균 (있는 것만)
    const moodEntries = todayEntries.filter((e) => e.mood !== undefined);
    const avgMood =
      moodEntries.length > 0
        ? Math.round(moodEntries.reduce((s, e) => s + (e.mood ?? 0), 0) / moodEntries.length)
        : null;
    // 활동 — 모든 entry 의 활동 합치고 unique
    const activitySet = new Set<string>();
    todayEntries.forEach((e) => (e.activities ?? []).forEach((a) => activitySet.add(a)));
    const activities = Array.from(activitySet).slice(0, 3);
    return {
      count: todayEntries.length,
      totalChars,
      avgMood: avgMood as Mood | null,
      activities,
    };
  }, [todayEntries]);

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--hairline))] bg-card px-4 sm:px-5 py-3 shadow-[0_1px_2px_hsl(30_30%_8%/0.03)]">
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-foreground/5 text-foreground/55 shrink-0">
        <FileText className="h-3.5 w-3.5" strokeWidth={1.8} />
      </span>

      {summary ? (
        <button
          type="button"
          onClick={() => {
            if (todayEntries.length > 0 && onClickToday) onClickToday(todayEntries[0]);
          }}
          className="flex items-center gap-2.5 flex-1 min-w-0 text-left hover:opacity-90 transition-opacity"
        >
          <span className="text-[13px] font-semibold tracking-[-0.005em] text-foreground shrink-0">
            오늘
          </span>
          <span className="text-[12px] font-medium tabular-nums text-muted-foreground shrink-0">
            {summary.count}개
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-foreground/25 shrink-0" aria-hidden />
          <span className="text-[12px] font-medium tabular-nums text-muted-foreground shrink-0">
            {summary.totalChars.toLocaleString()}자
          </span>
          {summary.avgMood !== null && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-foreground/25 shrink-0" aria-hidden />
              <span className="text-[14px] leading-none shrink-0" title={`평균 mood ${summary.avgMood}`}>
                {MOOD_EMOJI[summary.avgMood]}
              </span>
            </>
          )}
          {summary.activities.length > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-foreground/25 shrink-0" aria-hidden />
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                {summary.activities.map((key) => {
                  const meta = ACTIVITY_META[key];
                  return (
                    <span
                      key={key}
                      className="inline-flex items-center gap-1 text-[12px] text-muted-foreground"
                      title={meta?.label ?? key}
                    >
                      <span aria-hidden>{meta?.emoji ?? '·'}</span>
                      <span className="truncate">{meta?.label ?? key}</span>
                    </span>
                  );
                })}
              </span>
            </>
          )}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-1 min-w-0">
          <span className="text-[13px] text-muted-foreground tracking-[-0.005em] truncate">
            오늘 한 줄 적어볼까요
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-[11.5px] font-semibold text-foreground hover:bg-accent/60 transition-colors shrink-0"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
            적기
          </button>
        </div>
      )}
    </div>
  );
};
