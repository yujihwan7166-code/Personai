import type { Expert } from '@/types/expert';
import { cn } from '@/lib/utils';

const TONE_CLASS: Record<string, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  red: 'border-rose-200 bg-rose-50 text-rose-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  purple: 'border-violet-200 bg-violet-50 text-violet-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  teal: 'border-teal-200 bg-teal-50 text-teal-700',
  pink: 'border-pink-200 bg-pink-50 text-pink-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  sky: 'border-sky-200 bg-sky-50 text-sky-700',
};

export function StudyExpertAvatar({
  expert,
  className,
  size = 'md',
}: {
  expert: Expert;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full border font-bold tabular-nums',
        TONE_CLASS[expert.color] ?? TONE_CLASS.slate,
        size === 'sm' && 'h-6 w-6 text-[10px]',
        size === 'md' && 'h-8 w-8 text-[11px]',
        size === 'lg' && 'h-10 w-10 text-[12px]',
        className,
      )}
      aria-hidden
    >
      {getInitials(expert.nameKo || expert.name)}
    </span>
  );
}

function getInitials(name: string): string {
  const cleaned = name.trim();
  if (!cleaned) return 'AI';
  if (/^[A-Za-z]/.test(cleaned)) {
    return cleaned
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AI';
  }
  return cleaned.slice(0, 2);
}
