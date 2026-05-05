/**
 * 뷰 전환 — Day / Week / Month / Year 4 버튼 segmented control.
 *
 * 단축키 D/W/M/Y 는 Planner.tsx 에서 처리.
 */
import { cn } from '@/lib/utils';

export type PlannerView = 'day' | 'week' | 'month' | 'year' | 'goals' | 'habits';

const OPTIONS: Array<{ id: PlannerView; label: string; key: string }> = [
  { id: 'day',    label: '일',     key: 'D' },
  { id: 'week',   label: '주',     key: 'W' },
  { id: 'month',  label: '월',     key: 'M' },
  { id: 'year',   label: '년',     key: 'Y' },
  { id: 'habits', label: '습관',   key: 'H' },
];

interface ViewToggleProps {
  value: PlannerView;
  onChange: (view: PlannerView) => void;
}

export const ViewToggle = ({ value, onChange }: ViewToggleProps) => (
  <div
    role="tablist"
    aria-label="뷰 전환"
    className="inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-accent/40 border border-foreground/20"
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
            'px-3.5 h-8 rounded-md text-[14px] font-semibold tabular-nums transition-colors',
            active
              ? 'bg-card text-foreground shadow-sm ring-1 ring-foreground/30'
              : 'text-foreground/70 hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      );
    })}
  </div>
);
