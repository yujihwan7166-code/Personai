import { Expert } from '@/types/expert';
import { cn } from '@/lib/utils';

interface ExpertAvatarProps {
  expert: Expert;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}

const logoSizeClasses = {
  xs: 'w-4 h-4',
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-9 h-9',
  xl: 'w-11 h-11',
};

const containerClasses = {
  xs: 'w-6 h-6 text-[14px]',
  sm: 'w-7 h-7 text-[16px]',
  md: 'w-10 h-10 text-[22px]',
  lg: 'w-14 h-14 text-[32px]',
  xl: 'w-16 h-16 text-[36px]',
};

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  const isCompact = size === 'xs' || size === 'sm';
  const roundedClass = isCompact ? 'rounded-lg' : 'rounded-xl';

  // AI models: local SVG/PNG logos — same container as emoji for consistent sizing
  if (expert.avatarUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center shrink-0 transition-all duration-200',
        roundedClass,
        containerClasses[size],
        active ? 'bg-white shadow-sm ring-1 ring-slate-200 scale-105' : 'bg-slate-50/80'
      )}>
        <img
          src={expert.avatarUrl}
          alt={expert.nameKo}
          className={cn('object-contain', logoSizeClasses[size])}
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  // Emoji icon
  if (expert.icon) {
    return (
      <div className={cn(
        'flex items-center justify-center shrink-0 transition-all duration-200 select-none',
        roundedClass,
        containerClasses[size],
        active
          ? 'bg-white shadow-md scale-105'
          : 'bg-slate-100'
      )}>
        {expert.icon}
      </div>
    );
  }

  // Fallback: initials
  const words = expert.nameKo.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : expert.nameKo.slice(0, 2).toUpperCase();

  return (
    <div className={cn(
      'flex items-center justify-center shrink-0 transition-all duration-200 font-semibold select-none text-slate-500',
      roundedClass,
      containerClasses[size],
      active
        ? 'bg-white shadow-sm ring-1 ring-slate-200 scale-105'
        : 'bg-slate-100'
    )}>
      {initials}
    </div>
  );
}
