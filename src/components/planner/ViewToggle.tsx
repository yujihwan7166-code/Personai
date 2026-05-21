/**
 * 뷰 전환 — Day / Week / Month / Year 4 버튼 segmented control.
 *
 * 단축키 D/W/M/Y 는 Planner.tsx 에서 처리.
 */
import { cn } from '@/lib/utils';

export type PlannerView = 'day' | 'week' | 'month' | 'year' | 'goals' | 'habits';

const OPTIONS: Array<{ id: PlannerView; label: string; key: string }> = [
  { id: 'day',    label: '일',   key: 'D' },
  { id: 'week',   label: '주',   key: 'W' },
  { id: 'month',  label: '월',   key: 'M' },
  { id: 'year',   label: '년',   key: 'Y' },
  { id: 'goals',  label: '목표', key: 'G' },
  { id: 'habits', label: '습관', key: 'H' },
];

interface ViewToggleProps {
  value: PlannerView;
  onChange: (view: PlannerView) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <div
    role="tablist"
    aria-label="뷰 전환"
    className="flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-full border hairline bg-secondary/60 p-0.5 sm:inline-flex sm:w-auto sm:overflow-visible"
  >
    {OPTIONS.map((opt) => {
      const active = value === opt.id;
      return (
        <button
          key={opt.id}
          role="tab"
          aria-selected={active}
          type="button"
          onClick={() => onChange(opt.id)}
          title={`${opt.label} (${opt.key})`}
          className={cn(
            'px-3.5 h-7 rounded-full text-[13px] font-semibold tabular-nums transition-all',
            active
              ? 'bg-card text-foreground shadow-[0_1px_2px_hsl(30_15%_8%/0.06)]'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
