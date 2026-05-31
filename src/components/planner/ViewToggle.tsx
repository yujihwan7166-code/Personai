/**
 * 뷰 전환 — Day / Week / Month / Year / Habits 5 버튼 segmented control.
 *
 * 단축키 D/W/M/Y/H 는 Planner.tsx 에서 처리.
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export type PlannerView = 'day' | 'week' | 'month' | 'year' | 'habits';

const OPTIONS: Array<{ id: PlannerView; label: string; key: string }> = [
  { id: 'day',    label: '일',   key: 'D' },
  { id: 'week',   label: '주',   key: 'W' },
  { id: 'month',  label: '월',   key: 'M' },
  { id: 'year',   label: '년',   key: 'Y' },
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
    className="relative flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-xl border border-foreground/5 bg-secondary/35 p-1 sm:inline-flex sm:w-auto sm:overflow-visible"
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
            'relative px-4 h-7 rounded-lg text-[13px] font-semibold tabular-nums transition-colors duration-200 outline-none',
            active
              ? 'text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {active && (
            <motion.span
              layoutId="active-view-capsule"
              transition={{
                type: 'spring',
                stiffness: 420,
                damping: 32,
              }}
              className="absolute inset-0 bg-primary rounded-lg shadow-sm"
              style={{ originY: '0px' }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

