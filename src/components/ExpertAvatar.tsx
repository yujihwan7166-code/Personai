import { useState } from 'react';
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

const avatarSizeClasses = {
  sm: 'w-7 h-7',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-14 h-14',
};

const emojiSizeClasses = {
  sm: 'w-7 h-7 text-[15px]',
  md: 'w-10 h-10 text-[20px]',
  lg: 'w-12 h-12 text-[24px]',
  xl: 'w-14 h-14 text-[28px]',
};

const gradientBg: Record<ExpertColor, string> = {
  blue:    'bg-gradient-to-br from-blue-400 to-blue-600',
  emerald: 'bg-gradient-to-br from-emerald-400 to-emerald-600',
  red:     'bg-gradient-to-br from-red-400 to-red-600',
  amber:   'bg-gradient-to-br from-amber-400 to-amber-600',
  purple:  'bg-gradient-to-br from-purple-400 to-purple-600',
  orange:  'bg-gradient-to-br from-orange-400 to-orange-600',
  teal:    'bg-gradient-to-br from-teal-400 to-teal-600',
  pink:    'bg-gradient-to-br from-pink-400 to-pink-600',
};

const activeGradientBg: Record<ExpertColor, string> = {
  blue:    'bg-gradient-to-br from-blue-500 to-blue-700 ring-2 ring-blue-200',
  emerald: 'bg-gradient-to-br from-emerald-500 to-emerald-700 ring-2 ring-emerald-200',
  red:     'bg-gradient-to-br from-red-500 to-red-700 ring-2 ring-red-200',
  amber:   'bg-gradient-to-br from-amber-500 to-amber-700 ring-2 ring-amber-200',
  purple:  'bg-gradient-to-br from-purple-500 to-purple-700 ring-2 ring-purple-200',
  orange:  'bg-gradient-to-br from-orange-500 to-orange-700 ring-2 ring-orange-200',
  teal:    'bg-gradient-to-br from-teal-500 to-teal-700 ring-2 ring-teal-200',
  pink:    'bg-gradient-to-br from-pink-500 to-pink-700 ring-2 ring-pink-200',
};

const bgHexMap: Record<ExpertColor, string> = {
  blue: '3b82f6', emerald: '10b981', red: 'ef4444', amber: 'f59e0b',
  purple: 'a855f7', orange: 'f97316', teal: '14b8a6', pink: 'ec4899',
};

function getDiceBearUrl(seed: string, bg: string) {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}&backgroundColor=${bg}&radius=50`;
}

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // AI models: use their local SVG logos
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

  // Non-AI experts: DiceBear avatar illustration
  if (expert.category !== 'ai' && !imgError) {
    const diceBearUrl = getDiceBearUrl(expert.id, bgHexMap[expert.color]);
    return (
      <div className={cn(
        'rounded-full overflow-hidden shrink-0 transition-all duration-200 shadow-sm',
        avatarSizeClasses[size],
        active && 'scale-105 ring-2 ring-offset-1',
        active && `ring-${expert.color}-300`
      )}>
        <img
          src={diceBearUrl}
          alt={expert.nameKo}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  // Fallback: emoji icon on gradient circle
  if (expert.icon) {
    const colorClass = active ? activeGradientBg[expert.color] : gradientBg[expert.color];
    return (
      <div className={cn(
        'rounded-full flex items-center justify-center shrink-0 transition-all duration-200 select-none shadow-sm',
        emojiSizeClasses[size],
        colorClass,
        active && 'scale-105'
      )}>
        <span className="drop-shadow-sm">{expert.icon}</span>
      </div>
    );
  }

  // Last fallback: initials
  const words = expert.nameKo.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : expert.nameKo.slice(0, 2).toUpperCase();
  const colorClass = active ? activeGradientBg[expert.color] : gradientBg[expert.color];

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center shrink-0 transition-all duration-200 font-bold select-none text-white shadow-sm',
      avatarSizeClasses[size],
      colorClass,
      active && 'scale-105'
    )}>
      {initials}
    </div>
  );
}
