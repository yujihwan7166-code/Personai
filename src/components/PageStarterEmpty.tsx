import { useId, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageStarterAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
}

interface PageStarterItem {
  label: string;
  description?: string;
  onClick: () => void;
  icon?: ReactNode;
}

interface PageStarterEmptyProps {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction: PageStarterAction;
  secondaryActions?: PageStarterAction[];
  starterLabel?: string;
  starters?: PageStarterItem[];
  actionNote?: ReactNode;
  footer?: ReactNode;
  pattern?: 'none' | 'dots' | 'lines';
  className?: string;
  contentClassName?: string;
}

export function PageStarterEmpty({
  icon,
  title,
  description,
  primaryAction,
  secondaryActions = [],
  starterLabel = '빠른 시작',
  starters = [],
  actionNote,
  footer,
  pattern = 'none',
  className,
  contentClassName,
}: PageStarterEmptyProps) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className={cn('relative min-h-full w-full flex-1 overflow-y-auto', className)}
    >
      {pattern !== 'none' && (
        <div
          className="absolute inset-0 opacity-70"
          aria-hidden
          style={pattern === 'dots'
            ? {
                backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.10) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }
            : {
                backgroundImage: `repeating-linear-gradient(
                  to bottom,
                  transparent 0,
                  transparent calc(2rem - 1px),
                  hsl(var(--foreground) / 0.06) calc(2rem - 1px),
                  hsl(var(--foreground) / 0.06) 2rem
                )`,
              }}
        />
      )}

      <div className="relative z-10 flex min-h-full items-start justify-center px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5 sm:items-center sm:px-6 sm:py-10">
        <div className={cn('w-full max-w-[560px] text-center', contentClassName)}>
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mb-4 sm:h-14 sm:w-14 sm:rounded-2xl">
            {icon}
          </div>
          <h2 id={headingId} className="mb-2 text-[17px] font-semibold leading-tight text-foreground">
            {title}
          </h2>
          <p className="mx-auto mb-4 max-w-[430px] text-[13px] leading-relaxed text-muted-foreground sm:mb-5">
            {description}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <StarterActionButton action={primaryAction} variant="primary" />
            {secondaryActions.map((action) => (
              <StarterActionButton key={action.label} action={action} variant={action.variant ?? 'secondary'} />
            ))}
          </div>
          {actionNote && (
            <div className="mt-2 text-[12px] text-muted-foreground">
              {actionNote}
            </div>
          )}

          {starters.length > 0 && (
            <div className="mt-5 sm:mt-7">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                {starterLabel}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-2">
                {starters.map((starter) => (
                  <button
                    key={starter.label}
                    type="button"
                    onClick={starter.onClick}
                    title={starter.description ? `${starter.label} - ${starter.description}` : starter.label}
                    className="group flex h-14 items-center gap-2.5 rounded-lg border border-[hsl(var(--hairline))] bg-card/75 px-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.035] sm:h-[76px] sm:gap-3 sm:px-3.5"
                  >
                    {starter.icon && (
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/60 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary sm:h-9 sm:w-9">
                        {starter.icon}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-foreground">
                        {starter.label}
                      </span>
                      {starter.description && (
                        <span className="mt-0.5 block truncate text-[11.5px] leading-4 text-muted-foreground">
                          {starter.description}
                        </span>
                      )}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/35 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground/60" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {footer && (
            <div className="mx-auto mt-4 max-w-[430px] sm:mt-6">
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function StarterActionButton({
  action,
  variant,
}: {
  action: PageStarterAction;
  variant: 'primary' | 'secondary';
}) {
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] font-semibold transition-colors sm:h-9 sm:px-4',
        variant === 'primary'
          ? 'bg-primary text-primary-foreground shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.3)] hover:bg-primary/90'
          : 'border border-[hsl(var(--hairline))] bg-card/80 text-foreground hover:border-primary/30 hover:bg-primary/[0.035]',
      )}
    >
      {action.icon}
      {action.label}
    </button>
  );
}
