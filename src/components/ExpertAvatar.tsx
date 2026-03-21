import { Expert } from '@/types/expert';
import { cn } from '@/lib/utils';

interface ExpertAvatarProps {
  expert: Expert;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  active?: boolean;
}

const logoSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-13 h-13',
};

const containerClasses = {
  sm: 'w-8 h-8 text-[18px]',
  md: 'w-11 h-11 text-[26px]',
  lg: 'w-14 h-14 text-[32px]',
  xl: 'w-16 h-16 text-[36px]',
};

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  // AI models: local SVG/PNG logos
  if (expert.avatarUrl) {
    return (
      <div className={cn(
        'flex items-center justify-center shrink-0 transition-all duration-200',
        logoSizeClasses[size],
        active && 'scale-105'
      )}>
        <img
          src={expert.avatarUrl}
          alt={expert.nameKo}
          className="w-full h-full object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      </div>
    );
  }

  // Emoji icon: clean white card with subtle border
  if (expert.icon) {
    return (
      <div className={cn(
        'rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 select-none',
        containerClasses[size],
        active
          ? 'bg-white shadow-md ring-1 ring-slate-200 scale-105'
          : 'bg-slate-50/80'
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
      'rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 font-semibold select-none text-slate-500',
      containerClasses[size],
      active
        ? 'bg-white shadow-md ring-1 ring-slate-200 scale-105'
        : 'bg-slate-100'
    )}>
      {initials}
    </div>
  );
}
