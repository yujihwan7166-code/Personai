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

const initialSizeClasses = {
  sm: 'w-7 h-7 text-[10px]',
  md: 'w-10 h-10 text-[13px]',
  lg: 'w-12 h-12 text-[16px]',
  xl: 'w-14 h-14 text-[20px]',
};

const solidBg: Record<ExpertColor, string> = {
  blue:    'bg-blue-500 text-white',
  emerald: 'bg-emerald-500 text-white',
  red:     'bg-red-500 text-white',
  amber:   'bg-amber-500 text-white',
  purple:  'bg-purple-500 text-white',
  orange:  'bg-orange-500 text-white',
  teal:    'bg-teal-500 text-white',
  pink:    'bg-pink-500 text-white',
};

const activeSolidBg: Record<ExpertColor, string> = {
  blue:    'bg-blue-600 text-white ring-2 ring-blue-200',
  emerald: 'bg-emerald-600 text-white ring-2 ring-emerald-200',
  red:     'bg-red-600 text-white ring-2 ring-red-200',
  amber:   'bg-amber-600 text-white ring-2 ring-amber-200',
  purple:  'bg-purple-600 text-white ring-2 ring-purple-200',
  orange:  'bg-orange-600 text-white ring-2 ring-orange-200',
  teal:    'bg-teal-600 text-white ring-2 ring-teal-200',
  pink:    'bg-pink-600 text-white ring-2 ring-pink-200',
};

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  if (expert.avatarUrl) {
    // Logo-only mode: no background, just the brand icon
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

  // Fallback: colored circle with initials
  const words = expert.nameKo.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[1][0]).toUpperCase()
    : expert.nameKo.slice(0, 2).toUpperCase();

  const colorClass = active ? activeSolidBg[expert.color] : solidBg[expert.color];

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center shrink-0 transition-all duration-200 font-bold select-none',
      initialSizeClasses[size],
      colorClass,
      active && 'scale-105'
    )}>
      {initials}
    </div>
  );
}
