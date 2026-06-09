/**
 * 포모도로 통계 위젯 — Planner 헤더에 작은 칩.
 *
 * 표시:
 * - 0 세션: 숨김 (UI 노이즈 방지)
 * - 1+ 세션: "🍅 4 · 1시간 40분" + 🔥 streak (3+ 일)
 * - 클릭 시 PomodoroStatsModal 펼침 — 통계 풀세트
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePomodoroStats } from '@/hooks/planner/usePomodoroStats';
import { pomodoroSessionLog } from '@/services/planner/pomodoroSessionLog';

const formatMin = (min: number): string => {
  if (min < 60) return `${min}분`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
};

export const PomodoroStatsWidget = ({ className }: { className?: string }) => {
  const stats = usePomodoroStats();
  const [open, setOpen] = useState(false);

  // 첫 진입 — 데이터 0 이면 숨김.
  if (stats.todayCount === 0 && stats.todayMinutes === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[11.5px] font-medium',
          'border border-foreground/20 hover:bg-accent transition-colors text-foreground',
          className,
        )}
        title="포모도로 통계"
      >
        <span aria-hidden>🍅</span>
        <span className="font-mono tabular-nums">{stats.todayCount}</span>
        <span className="text-muted-foreground/80">·</span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {formatMin(stats.todayMinutes)}
        </span>
        {stats.streak >= 3 && (
          <span className="ml-1 text-amber-600 font-semibold">🔥{stats.streak}</span>
        )}
      </button>
      <PomodoroStatsModal open={open} onClose={() => setOpen(false)} stats={stats} />
    </>
  );
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  stats: ReturnType<typeof usePomodoroStats>;
}

const PomodoroStatsModal = ({ open, onClose, stats }: ModalProps) => {
  // 최근 14일 차트 — 막대 그래프.
  const max = Math.max(1, ...stats.last14DaysMinutes);

  // task 별 분포 (최근 30일).
  const topTasks = (() => {
    const range = new Date();
    range.setDate(range.getDate() - 30);
    const records = pomodoroSessionLog.listByRange(range, new Date());
    const map = new Map<string, { title: string; min: number; count: number }>();
    for (const r of records) {
      const key = r.taskId ?? '__free__';
      const existing = map.get(key) ?? { title: r.taskTitle ?? '자유 집중', min: 0, count: 0 };
      existing.min += r.actualMin;
      existing.count += 1;
      map.set(key, existing);
    }
    return [...map.values()].sort((a, b) => b.min - a.min).slice(0, 5);
  })();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold">🍅 포모도로 통계</DialogTitle>
        </DialogHeader>

        {/* 핵심 숫자 */}
        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat label="오늘" main={stats.todayCount} sub={formatMin(stats.todayMinutes)} />
          <Stat label="이번주" main={stats.weekCount} sub={formatMin(stats.weekMinutes)} />
          <Stat
            label="연속"
            main={stats.streak}
            sub={stats.bestStreak > stats.streak ? `최장 ${stats.bestStreak}일` : '일'}
            accent={stats.streak >= 3}
          />
        </div>

        {/* 최근 14일 막대 */}
        <div className="mt-4">
          <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
            최근 14일
          </div>
          <div className="flex items-end gap-1 h-16">
            {[...stats.last14DaysMinutes].reverse().map((min, i) => {
              const isToday = i === stats.last14DaysMinutes.length - 1;
              const height = max > 0 ? (min / max) * 100 : 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end relative group"
                >
                  <div
                    className={cn(
                      'w-full rounded-sm transition-all',
                      min > 0
                        ? isToday
                          ? 'bg-rose-500'
                          : 'bg-emerald-500/70 group-hover:bg-emerald-500'
                        : 'bg-accent/40',
                    )}
                    style={{ height: `${Math.max(min > 0 ? 8 : 2, height)}%` }}
                    title={`${i === stats.last14DaysMinutes.length - 1 ? '오늘' : `${stats.last14DaysMinutes.length - 1 - i}일 전`}: ${min}분`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 task */}
        {topTasks.length > 0 && (
          <div className="mt-4">
            <div className="text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1.5">
              많이 집중한 항목 (30일)
            </div>
            <ul className="flex flex-col gap-1">
              {topTasks.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-[12px]"
                >
                  <span className="truncate flex-1 text-foreground">{t.title}</span>
                  <span className="text-[10.5px] tabular-nums text-muted-foreground shrink-0">
                    {t.count}회 · {formatMin(t.min)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Stat = ({
  label, main, sub, accent,
}: { label: string; main: number; sub: string; accent?: boolean }) => (
  <div className="flex flex-col items-center justify-center gap-0.5 py-2 rounded-md border border-foreground/20 bg-card">
    <span className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
      {label}
    </span>
    <span
      className={cn(
        'text-[20px] font-bold tabular-nums leading-none',
        accent ? 'text-amber-600' : 'text-foreground',
      )}
    >
      {main}
    </span>
    <span className="text-[10px] text-muted-foreground tabular-nums">{sub}</span>
  </div>
);
