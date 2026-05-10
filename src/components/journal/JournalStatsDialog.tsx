/**
 * 일기 전체 통계 모달.
 *
 * 표시 정보:
 * - 헤드라인 4숫자 (총 편수, 시작일 D+, 활동 일수, 평균 글자수)
 * - 연속 작성일 streak
 * - 연간 mood 픽셀 (JournalYearPixels 재사용)
 * - 기분 분포 (5 emoji 막대)
 * - Top 활동 / Top 태그 (각 8개)
 */
import { useMemo } from 'react';
import { BarChart3, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JournalYearPixels } from './JournalYearPixels';
import { stripMarkdown } from '@/lib/journalMarkdown';
import { getTopTags } from '@/lib/journalTags';
import { cn } from '@/lib/utils';
import type { JournalEntry, Mood } from '@/types/journal';
import { MOOD_EMOJI, MOOD_LABELS, MOOD_TINT, ACTIVITY_META } from '@/types/journal';

interface JournalStatsDialogProps {
  open: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  streak: number;
}

const MOODS: Mood[] = [1, 2, 3, 4, 5];

const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

const daysBetween = (from: string, to: string): number => {
  const a = new Date(from);
  const b = new Date(to);
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

export const JournalStatsDialog = ({ open, onClose, entries, streak }: JournalStatsDialogProps) => {
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }
    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const firstDate = sorted[0].date;
    const today = new Date().toISOString().slice(0, 10);
    const totalDaysSinceFirst = daysBetween(firstDate, today) + 1;
    const uniqueDays = new Set(sorted.map((e) => e.date)).size;
    const totalChars = entries.reduce((acc, e) => {
      const t = e.bodyFormat === 'markdown' ? stripMarkdown(e.body) : e.body;
      return acc + t.replace(/\s/g, '').length;
    }, 0);
    const avgChars = entries.length > 0 ? Math.round(totalChars / entries.length) : 0;

    // mood 분포
    const moodCount = new Map<Mood, number>();
    let moodSum = 0;
    let moodTotal = 0;
    entries.forEach((e) => {
      if (e.mood !== undefined) {
        moodCount.set(e.mood, (moodCount.get(e.mood) ?? 0) + 1);
        moodSum += e.mood;
        moodTotal += 1;
      }
    });
    const avgMood = moodTotal > 0 ? moodSum / moodTotal : null;
    const moodMax = Math.max(0, ...[...moodCount.values()]);

    // top 활동
    const actCount = new Map<string, number>();
    entries.forEach((e) => {
      (e.activities ?? []).forEach((a) => {
        actCount.set(a, (actCount.get(a) ?? 0) + 1);
      });
    });
    const topActivities = [...actCount.entries()]
      .map(([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // top 태그 (extraction 포함)
    const topTags = getTopTags(entries, 8);

    return {
      total: entries.length,
      firstDate,
      uniqueDays,
      totalDaysSinceFirst,
      avgChars,
      avgMood,
      moodCount,
      moodMax,
      topActivities,
      topTags,
    };
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="journal-warm-theme max-w-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 py-3 border-b border-[hsl(var(--hairline))] bg-primary/[0.04] flex-row items-center justify-between space-y-0">
          <DialogTitle className="flex items-center gap-2 text-[14px] font-bold tracking-[-0.005em] text-foreground/85">
            <BarChart3 className="h-4 w-4 text-primary/80" />
            전체 통계
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </DialogHeader>

        <div className="px-5 py-4 max-h-[75vh] overflow-y-auto flex flex-col gap-5">
          {!stats ? (
            <p className="text-[12.5px] text-muted-foreground text-center py-10">
              아직 일기가 없어요. 첫 일기를 적어 보세요.
            </p>
          ) : (
            <>
              {/* 헤드라인 4개 — 카드 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatTile label="총 일기" value={stats.total} unit="편" />
                <StatTile label="작성한 날" value={stats.uniqueDays} unit="일" hint={`${stats.totalDaysSinceFirst}일 중`} />
                <StatTile label="연속 작성" value={streak} unit="일" emphasized={streak >= 7} />
                <StatTile label="평균 글자수" value={stats.avgChars} unit="자" />
              </div>

              {/* 시작일 + 평균 mood 한 줄 */}
              <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-accent/30 text-[11.5px]">
                <span className="text-muted-foreground">
                  첫 일기: <span className="text-foreground/80 font-medium tabular-nums">{fmtDate(stats.firstDate)}</span>
                </span>
                {stats.avgMood !== null && (
                  <span className="text-muted-foreground inline-flex items-center gap-1.5">
                    평균 기분
                    <span className="text-[14px] leading-none">{MOOD_EMOJI[Math.round(stats.avgMood) as Mood]}</span>
                    <span className="font-mono tabular-nums text-foreground/80">
                      {stats.avgMood.toFixed(1)}
                    </span>
                  </span>
                )}
              </div>

              {/* 연간 픽셀 */}
              <Section title="이번 해">
                <JournalYearPixels entries={entries} />
              </Section>

              {/* 기분 분포 */}
              {stats.moodMax > 0 && (
                <Section title="기분 분포">
                  <div className="flex flex-col gap-1.5">
                    {MOODS.map((m) => {
                      const c = stats.moodCount.get(m) ?? 0;
                      const pct = stats.moodMax > 0 ? (c / stats.moodMax) * 100 : 0;
                      return (
                        <div key={m} className="flex items-center gap-2 text-[11.5px]">
                          <span className="w-5 text-[14px] leading-none shrink-0">{MOOD_EMOJI[m]}</span>
                          <span className="w-12 text-muted-foreground tracking-[-0.005em] shrink-0">
                            {MOOD_LABELS[m]}
                          </span>
                          <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', MOOD_TINT[m] ?? 'bg-primary/60')}
                              style={{ width: `${Math.max(pct, c > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                          <span className="w-10 text-right tabular-nums text-muted-foreground/80 shrink-0">
                            {c}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              )}

              {/* Top 활동 + Top 태그 — 2 컬럼 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {stats.topActivities.length > 0 && (
                  <Section title="자주 한 활동">
                    <div className="flex flex-col gap-1">
                      {stats.topActivities.map((a, i) => {
                        const meta = ACTIVITY_META[a.key];
                        return (
                          <div
                            key={a.key}
                            className="flex items-center gap-2 px-2 h-7 rounded text-[11.5px] hover:bg-accent/40 transition-colors"
                          >
                            <span className="w-4 text-[10px] tabular-nums text-muted-foreground/65">
                              {i + 1}
                            </span>
                            <span aria-hidden>{meta?.emoji ?? '·'}</span>
                            <span className="flex-1 text-foreground/85 truncate">
                              {meta?.label ?? a.key}
                            </span>
                            <span className="tabular-nums text-muted-foreground/75">
                              {a.count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </Section>
                )}
                {stats.topTags.length > 0 && (
                  <Section title="자주 쓴 태그">
                    <div className="flex flex-col gap-1">
                      {stats.topTags.map((t, i) => (
                        <div
                          key={t.tag}
                          className="flex items-center gap-2 px-2 h-7 rounded text-[11.5px] hover:bg-accent/40 transition-colors"
                        >
                          <span className="w-4 text-[10px] tabular-nums text-muted-foreground/65">
                            {i + 1}
                          </span>
                          <span className="text-muted-foreground/70">#</span>
                          <span className="flex-1 text-foreground/85 truncate">{t.tag}</span>
                          <span className="tabular-nums text-muted-foreground/75">
                            {t.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function StatTile({
  label,
  value,
  unit,
  hint,
  emphasized,
}: {
  label: string;
  value: number;
  unit: string;
  hint?: string;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 px-3 py-2.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/60',
        emphasized && 'border-primary/30 bg-primary/[0.04]',
      )}
    >
      <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70 font-semibold">
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-display tabular-nums text-[22px] leading-none tracking-tight',
            emphasized ? 'text-primary font-semibold' : 'text-foreground/90 font-semibold',
          )}
        >
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </span>
      {hint && (
        <span className="text-[10px] tabular-nums text-muted-foreground/65">{hint}</span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[10.5px] uppercase tracking-[0.14em] font-semibold text-muted-foreground/75">
        {title}
      </h3>
      {children}
    </section>
  );
}
