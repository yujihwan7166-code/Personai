import { Expert, ExpertColor } from '@/types/expert';
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

const emojiSizeClasses = {
  sm: 'w-7 h-7 text-[16px]',
  md: 'w-10 h-10 text-[22px]',
  lg: 'w-12 h-12 text-[28px]',
  xl: 'w-14 h-14 text-[32px]',
};

const softBg: Record<ExpertColor, string> = {
  blue:    'bg-blue-50',
  emerald: 'bg-emerald-50',
  red:     'bg-red-50',
  amber:   'bg-amber-50',
  purple:  'bg-purple-50',
  orange:  'bg-orange-50',
  teal:    'bg-teal-50',
  pink:    'bg-pink-50',
};

const activeBg: Record<ExpertColor, string> = {
  blue:    'bg-blue-100 ring-2 ring-blue-300',
  emerald: 'bg-emerald-100 ring-2 ring-emerald-300',
  red:     'bg-red-100 ring-2 ring-red-300',
  amber:   'bg-amber-100 ring-2 ring-amber-300',
  purple:  'bg-purple-100 ring-2 ring-purple-300',
  orange:  'bg-orange-100 ring-2 ring-orange-300',
  teal:    'bg-teal-100 ring-2 ring-teal-300',
  pink:    'bg-pink-100 ring-2 ring-pink-300',
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

  // Emoji icon: soft pastel bg + large emoji
  if (expert.icon) {
    const bg = active ? activeBg[expert.color] : softBg[expert.color];
    return (
      <div className={cn(
        'rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 select-none',
        emojiSizeClasses[size],
        bg,
        active && 'scale-105'
      )}>
        {expert.icon}
      </div>
    );
  }

  // Fallback: initials on soft bg
  const words = expert.nameKo.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : expert.nameKo.slice(0, 2).toUpperCase();
  const bg = active ? activeBg[expert.color] : softBg[expert.color];

  return (
    <div className={cn(
      'rounded-2xl flex items-center justify-center shrink-0 transition-all duration-200 font-bold select-none text-slate-600',
      emojiSizeClasses[size],
      bg,
      active && 'scale-105'
    )}>
      {initials}
    </div>
  );
}
