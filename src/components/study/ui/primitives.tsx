import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function StudyCard({
  className,
  children,
  interactive = false,
  onClick,
}: {
  className?: string;
  children: ReactNode;
  interactive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'study-surface rounded-2xl shadow-sm transition-all duration-200',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StudyEmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="mb-4 text-5xl">{icon}</div>
      <h3 className="text-[16px] font-bold text-slate-800">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
      )}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
    </div>
  );
}

export function ProgressStrip({
  sources,
  lensDone,
  lensTotal,
  due,
  wrong,
  accuracy,
}: {
  sources: number;
  lensDone: number;
  lensTotal: number;
  due: number;
  wrong: number;
  accuracy: number | null;
}) {
  const items: { label: string; value: string; tone: string }[] = [
    { label: '원본', value: String(sources), tone: 'text-slate-700' },
    { label: '생성', value: `${lensDone}/${lensTotal}`, tone: 'text-blue-700' },
    { label: '오답', value: String(wrong), tone: 'text-rose-700' },
    {
      label: '정답률',
      value: accuracy == null ? '—' : `${Math.round(accuracy * 100)}%`,
      tone: 'text-emerald-700',
    },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-1">
          <span className="text-slate-400">{it.label}</span>
          <span className={cn('font-bold', it.tone)}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ModeSegmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string; icon?: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg bg-slate-100 p-0.5"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-[11.5px] font-semibold transition-all',
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {opt.icon && <span className="mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function StudyBtn({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled,
  className,
  type = 'button',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'accent-soft';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
  title?: string;
}) {
  /**
   * Phase A (리모델링) — 토큰 기반으로 정리.
   * 라이트 모드 외형은 거의 동일하게 유지하되
   * 다크 모드에서 자연스럽도록 CSS 변수(hairline / accent / primary) 사용.
   */
  const base =
    'inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl ' +
    'transition-[background-color,color,border-color,transform] duration-150 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed select-none';
  const sizes = {
    sm: 'px-3 py-1.5 text-[11.5px]',
    md: 'px-4 py-2 text-[12.5px]',
    lg: 'px-5 py-2.5 text-[13px]',
  };
  const variants = {
    // 라이트: 현재와 동일한 느낌(중성 다크 CTA). 다크: 반대로 밝게.
    primary:
      'bg-slate-900 text-white hover:bg-slate-800 active:translate-y-[0.5px] shadow-sm ' +
      'dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white',
    ghost:
      'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
    outline:
      'border bg-[hsl(var(--card))] text-[hsl(var(--foreground))] ' +
      'border-[hsl(var(--hairline))] hover:border-[hsl(var(--primary)_/_0.5)] ' +
      'hover:text-[hsl(var(--primary))]',
    danger:
      'bg-red-600 text-white hover:bg-red-500 shadow-sm ' +
      'dark:bg-red-500 dark:hover:bg-red-400',
    'accent-soft':
      'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 ' +
      'dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-950/60',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}

export function StatusDot({ status }: { status: 'ready' | 'processing' | 'error' }) {
  const tone =
    status === 'ready'
      ? 'bg-emerald-500'
      : status === 'processing'
      ? 'bg-amber-500'
      : 'bg-red-500';
  return <span className={cn('inline-block h-2 w-2 rounded-full', tone)} aria-hidden />;
}
