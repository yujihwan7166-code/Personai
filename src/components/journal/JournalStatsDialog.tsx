/**
 * 일기 리포트 모달.
 *
 * 숫자 위주의 통계창이 아니라, 기분과 기록 리듬을 먼저 보여주는
 * "오늘의 일기"용 개인 리포트 화면이다.
 */
import { useMemo } from 'react';
import {
  BarChart3,
  CalendarDays,
  Flame,
  HeartPulse,
  PenLine,
  Sparkles,
  Tags,
  X,
} from 'lucide-react';
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
import { ACTIVITY_META, MOOD_EMOJI, MOOD_LABELS, MOOD_TINT, WEATHER_META } from '@/types/journal';

interface JournalStatsDialogProps {
  open: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  streak: number;
}

type TrendKind = 'soft' | 'steady' | 'bright';

const MOODS: Mood[] = [5, 4, 3, 2, 1];
const CURRENT_YEAR = new Date().getFullYear();

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

const moodTone = (avgMood: number | null): { label: string; copy: string; kind: TrendKind } => {
  if (avgMood === null) {
    return {
      label: '기분 기록 대기 중',
      copy: '기분을 같이 남기면 이 공간이 훨씬 살아나요.',
      kind: 'steady',
    };
  }
  if (avgMood >= 4.2) {
    return { label: '밝은 흐름', copy: '좋았던 날의 밀도가 꽤 높아요.', kind: 'bright' };
  }
  if (avgMood >= 3.2) {
    return { label: '잔잔한 흐름', copy: '크게 흔들리기보다 안정적으로 쌓이고 있어요.', kind: 'steady' };
  }
  return { label: '천천히 회복 중', copy: '낮은 날도 기록했다는 것 자체가 꽤 중요해요.', kind: 'soft' };
};

export const JournalStatsDialog = ({ open, onClose, entries, streak }: JournalStatsDialogProps) => {
  const stats = useMemo(() => {
    if (entries.length === 0) {
      return null;
    }

    const sorted = [...entries].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const firstDate = sorted[0].date;
    const today = new Date().toISOString().slice(0, 10);
    const uniqueDays = new Set(sorted.map((e) => e.date)).size;
    const totalDaysSinceFirst = daysBetween(firstDate, today) + 1;
    const writeRate = totalDaysSinceFirst > 0
      ? Math.round((uniqueDays / totalDaysSinceFirst) * 100)
      : 0;

    const totalChars = entries.reduce((acc, e) => {
      const t = e.bodyFormat === 'markdown' ? stripMarkdown(e.body) : e.body;
      return acc + t.replace(/\s/g, '').length;
    }, 0);
    const avgChars = entries.length > 0 ? Math.round(totalChars / entries.length) : 0;

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
    const dominantMood = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const tone = moodTone(avgMood);

    const activityCount = new Map<string, { count: number; moodSum: number; moodTotal: number }>();
    entries.forEach((e) => {
      (e.activities ?? []).forEach((key) => {
        const cur = activityCount.get(key) ?? { count: 0, moodSum: 0, moodTotal: 0 };
        cur.count += 1;
        if (e.mood !== undefined) {
          cur.moodSum += e.mood;
          cur.moodTotal += 1;
        }
        activityCount.set(key, cur);
      });
    });
    const topActivities = [...activityCount.entries()]
      .map(([key, value]) => ({
        key,
        count: value.count,
        avgMood: value.moodTotal > 0 ? value.moodSum / value.moodTotal : null,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const weatherCount = new Map<string, number>();
    let energySum = 0;
    let energyTotal = 0;
    let sleepSum = 0;
    let sleepTotal = 0;
    entries.forEach((e) => {
      if (e.weather) weatherCount.set(e.weather, (weatherCount.get(e.weather) ?? 0) + 1);
      if (e.energy) {
        energySum += e.energy;
        energyTotal += 1;
      }
      if (typeof e.sleepHours === 'number') {
        sleepSum += e.sleepHours;
        sleepTotal += 1;
      }
    });

    const topWeather = [...weatherCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const topTags = getTopTags(entries, 6);

    return {
      total: entries.length,
      firstDate,
      uniqueDays,
      totalDaysSinceFirst,
      writeRate,
      avgChars,
      avgMood,
      dominantMood,
      moodCount,
      moodMax,
      moodTotal,
      tone,
      topActivities,
      topTags,
      topWeather,
      avgEnergy: energyTotal > 0 ? energySum / energyTotal : null,
      avgSleep: sleepTotal > 0 ? sleepSum / sleepTotal : null,
    };
  }, [entries]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        hideClose
        className="journal-warm-theme max-w-[780px] p-0 overflow-hidden gap-0 rounded-lg border border-[hsl(var(--hairline))] bg-card text-foreground shadow-2xl"
      >
        <DialogHeader className="relative overflow-hidden border-b border-[hsl(var(--hairline))] px-5 py-4 space-y-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,hsl(36_90%_72%/0.20),transparent_34%),radial-gradient(circle_at_92%_18%,hsl(168_55%_63%/0.18),transparent_30%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                <Sparkles className="h-3.5 w-3.5" />
                Journal report
              </p>
              <DialogTitle className="font-serif text-[23px] font-bold tracking-tight text-foreground">
                오늘의 기록 리포트
              </DialogTitle>
              <p className="mt-1 text-[12px] text-muted-foreground">
                기분, 리듬, 자주 나온 단서를 한 번에 모았어요.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background/70 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="max-h-[76vh] overflow-y-auto px-5 py-5">
          {!stats ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PenLine className="h-5 w-5" />
              </div>
              <p className="text-[15px] font-semibold text-foreground">아직 볼 기록이 없어요.</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                첫 일기를 쓰면 기분 흐름과 기록 리듬이 여기에 생겨요.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <section className="grid grid-cols-1 gap-3 md:grid-cols-[1.15fr_0.85fr]">
                <div
                  className={cn(
                    'rounded-lg border px-4 py-4',
                    stats.tone.kind === 'bright' && 'border-amber-200 bg-amber-50/70 text-amber-950',
                    stats.tone.kind === 'steady' && 'border-emerald-200 bg-emerald-50/65 text-emerald-950',
                    stats.tone.kind === 'soft' && 'border-sky-200 bg-sky-50/70 text-sky-950',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] opacity-65">
                        요즘 기분
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-[40px] leading-none" aria-hidden>
                          {stats.dominantMood ? MOOD_EMOJI[stats.dominantMood] : '✦'}
                        </span>
                        <div className="min-w-0">
                          <p className="font-serif text-[21px] font-bold leading-tight tracking-tight">
                            {stats.tone.label}
                          </p>
                          <p className="mt-1 text-[12px] leading-relaxed opacity-75">
                            {stats.tone.copy}
                          </p>
                        </div>
                      </div>
                    </div>
                    {stats.avgMood !== null && (
                      <div className="rounded-md bg-white/60 px-2.5 py-2 text-right shadow-sm">
                        <p className="text-[11px] font-semibold opacity-65">평균</p>
                        <p className="font-mono text-[20px] font-bold leading-none tabular-nums">
                          {stats.avgMood.toFixed(1)}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-1.5">
                    {MOODS.slice().reverse().map((m) => {
                      const count = stats.moodCount.get(m) ?? 0;
                      const height = stats.moodMax > 0 ? Math.max(12, (count / stats.moodMax) * 52) : 12;
                      return (
                        <div key={m} className="flex flex-col items-center gap-1.5">
                          <div className="flex h-14 w-full items-end justify-center rounded-md bg-white/45 px-1">
                            <span
                              className={cn('w-full max-w-5 rounded-t-md', MOOD_TINT[m])}
                              style={{ height }}
                            />
                          </div>
                          <span className="text-[15px] leading-none" title={MOOD_LABELS[m]}>
                            {MOOD_EMOJI[m]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <MetricTile icon={PenLine} label="총 일기" value={stats.total} unit="편" />
                  <MetricTile icon={CalendarDays} label="작성한 날" value={stats.uniqueDays} unit="일" />
                  <MetricTile icon={Flame} label="연속 기록" value={streak} unit="일" active={streak >= 3} />
                  <MetricTile icon={BarChart3} label="작성률" value={stats.writeRate} unit="%" />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <SmallInsight
                  label="첫 기록"
                  value={fmtDate(stats.firstDate)}
                  hint={`${stats.totalDaysSinceFirst}일 동안 ${stats.uniqueDays}일 기록`}
                />
                <SmallInsight
                  label="평균 글자수"
                  value={`${stats.avgChars}자`}
                  hint={stats.avgChars >= 120 ? '생각을 꽤 길게 남기는 편이에요.' : '짧게 남기는 리듬이에요.'}
                />
                <SmallInsight
                  label="부가 기록"
                  value={[
                    stats.avgEnergy !== null ? `에너지 ${stats.avgEnergy.toFixed(1)}` : null,
                    stats.avgSleep !== null ? `수면 ${stats.avgSleep.toFixed(1)}h` : null,
                    stats.topWeather ? WEATHER_META[stats.topWeather as keyof typeof WEATHER_META]?.emoji : null,
                  ].filter(Boolean).join(' · ') || '아직 없음'}
                  hint="생활 단서가 쌓이면 이 칸이 더 선명해져요."
                />
              </section>

              <Section title="올해 기록 지도">
                <JournalYearPixels entries={entries} year={CURRENT_YEAR} />
              </Section>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Section title="기분 분포">
                  <div className="space-y-2">
                    {MOODS.map((m) => {
                      const count = stats.moodCount.get(m) ?? 0;
                      const pct = stats.moodTotal > 0 ? Math.round((count / stats.moodTotal) * 100) : 0;
                      return (
                        <MoodRow key={m} mood={m} count={count} pct={pct} />
                      );
                    })}
                  </div>
                </Section>

                <Section title="기록을 만든 요소">
                  <div className="space-y-2">
                    {stats.topActivities.length > 0 ? (
                      stats.topActivities.map((activity) => {
                        const meta = ACTIVITY_META[activity.key];
                        const avgMood = activity.avgMood ? Math.round(activity.avgMood) as Mood : null;
                        return (
                          <div
                            key={activity.key}
                            className="flex h-9 items-center gap-2 rounded-md border border-[hsl(var(--hairline))] bg-background/55 px-2.5 text-[12px]"
                          >
                            <span aria-hidden>{meta?.emoji ?? '•'}</span>
                            <span className="min-w-0 flex-1 truncate font-medium text-foreground/85">
                              {meta?.label ?? activity.key}
                            </span>
                            {avgMood && <span className="text-[13px] leading-none">{MOOD_EMOJI[avgMood]}</span>}
                            <span className="tabular-nums text-muted-foreground">{activity.count}</span>
                          </div>
                        );
                      })
                    ) : (
                      <EmptyMini icon={HeartPulse} text="활동을 같이 고르면 어떤 일이 기분을 바꾸는지 보여줄 수 있어요." />
                    )}
                  </div>
                </Section>
              </div>

              {stats.topTags.length > 0 && (
                <Section title="자주 나온 말">
                  <div className="flex flex-wrap gap-2">
                    {stats.topTags.map((tag) => (
                      <span
                        key={tag.tag}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[hsl(var(--hairline))] bg-background/65 px-2.5 text-[12px] font-medium text-foreground/80"
                      >
                        <Tags className="h-3.5 w-3.5 text-primary/70" />
                        {tag.tag}
                        <span className="tabular-nums text-muted-foreground">{tag.count}</span>
                      </span>
                    ))}
                  </div>
                </Section>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  active,
}: {
  icon: typeof PenLine;
  label: string;
  value: number;
  unit: string;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-lg border border-[hsl(var(--hairline))] bg-background/60 px-3 py-3',
        active && 'border-amber-300/70 bg-amber-50/70',
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <Icon className={cn('h-3.5 w-3.5 text-muted-foreground/70', active && 'text-amber-600')} />
      </div>
      <p className="flex items-baseline gap-1">
        <span className="font-mono text-[23px] font-semibold leading-none tabular-nums text-foreground">
          {value}
        </span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}

function SmallInsight({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-[hsl(var(--hairline))] bg-background/55 px-3 py-3">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-[15px] font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}

function MoodRow({ mood, count, pct }: { mood: Mood; count: number; pct: number }) {
  return (
    <div className="grid grid-cols-[58px_1fr_44px] items-center gap-2 text-[12px]">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="text-[15px] leading-none">{MOOD_EMOJI[mood]}</span>
        {MOOD_LABELS[mood]}
      </span>
      <div className="h-2 overflow-hidden rounded-full bg-muted/65">
        <div
          className={cn('h-full rounded-full transition-all', MOOD_TINT[mood])}
          style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
        />
      </div>
      <span className="text-right tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

function EmptyMini({ icon: Icon, text }: { icon: typeof HeartPulse; text: string }) {
  return (
    <div className="flex min-h-[96px] items-center gap-2 rounded-lg border border-dashed border-[hsl(var(--hairline))] bg-background/35 px-3 text-[12px] leading-relaxed text-muted-foreground">
      <Icon className="h-4 w-4 shrink-0 text-primary/60" />
      {text}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[hsl(var(--hairline))] bg-background/45 p-3">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80 mb-3 select-none">
        {title}
      </h3>
      {children}
    </section>
  );
}
