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
    className="relative flex w-full max-w-full items-center gap-0.5 overflow-x-auto rounded-[14px] border border-foreground/18 bg-[#f7f5ef] p-0.5 shadow-[inset_0_1px_2px_rgba(25,22,18,0.07),0_1px_2px_rgba(25,22,18,0.04)] sm:inline-flex sm:w-auto sm:overflow-visible sm:p-1"
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
            'relative h-7 select-none rounded-[10px] px-3.5 text-[13px] tabular-nums outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-4',
            active
              ? 'font-bold text-foreground'
              : 'font-semibold text-foreground/62 hover:bg-white/45 hover:text-foreground/86',
          )}
        >
          {active && (
            <motion.span
              layoutId="active-view-capsule"
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 30,
              }}
              className="absolute inset-0 rounded-[10px] border border-primary/25 bg-white shadow-[0_1px_4px_rgba(15,23,42,0.10)]"
              style={{ originY: '0px' }}
            />
          )}
          <span className="relative z-10">{opt.label}</span>
          {active && (
            <span
              aria-hidden
              className="absolute inset-x-3 bottom-0.5 z-10 h-0.5 rounded-full bg-primary/70"
            />
          )}
        </button>
      );
    })}
  </div>
);

