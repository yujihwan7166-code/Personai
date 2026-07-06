import type { DiaryEntry } from '@/types/diary';
import { GROUPS, GROUP_LABEL, GROUP_COLOR } from '@/lib/diary/feelings';
import { groupDistribution, monthEntries } from '@/lib/diary/diaryStats';

export function DiaryStats({ entries, year, month1, streak }: { entries: DiaryEntry[]; year: number; month1: number; streak: number }) {
  const month = monthEntries(entries, year, month1);
  const dist = groupDistribution(month);
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const days = new Set(month.map((e) => e.date)).size;
  return (
    <div className="space-y-3 rounded-xl border border-[hsl(var(--hairline))] bg-card p-4">
      <div className="flex gap-4 text-[12.5px]">
        <div><span className="font-bold text-foreground">{days}</span><span className="text-muted-foreground">일 기록</span></div>
        <div><span className="font-bold text-amber-600">{streak}</span><span className="text-muted-foreground">일 연속</span></div>
      </div>
      <div>
        <div className="mb-1 text-[11px] font-semibold text-muted-foreground">이달의 감정</div>
        <div className="flex h-3 overflow-hidden rounded-full bg-accent">
          {GROUPS.map((g) => dist[g] > 0 ? (
            <div key={g} style={{ width: `${(dist[g] / total) * 100}%`, backgroundColor: GROUP_COLOR[g] }} title={`${GROUP_LABEL[g]} ${dist[g]}`} />
          ) : null)}
        </div>
      </div>
    </div>
  );
}
