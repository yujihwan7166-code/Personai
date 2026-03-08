import { Expert, ExpertColor } from '@/types/expert';
import { cn } from '@/lib/utils';

interface ExpertAvatarProps {
  expert: Expert;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-14 h-14 text-2xl',
};

const colorClasses: Record<ExpertColor, string> = {
  blue: 'border-expert-blue expert-glow-blue',
  emerald: 'border-expert-emerald expert-glow-emerald',
  red: 'border-expert-red expert-glow-red',
  amber: 'border-expert-amber expert-glow-amber',
  purple: 'border-expert-purple expert-glow-purple',
  orange: 'border-expert-orange expert-glow-orange',
  teal: 'border-expert-teal expert-glow-teal',
  pink: 'border-expert-pink expert-glow-pink',
};

const activeColorClasses: Record<ExpertColor, string> = {
  blue: 'border-expert-blue expert-glow-active-blue',
  emerald: 'border-expert-emerald expert-glow-active-emerald',
  red: 'border-expert-red expert-glow-active-red',
  amber: 'border-expert-amber expert-glow-active-amber',
  purple: 'border-expert-purple expert-glow-active-purple',
  orange: 'border-expert-orange expert-glow-active-orange',
  teal: 'border-expert-teal expert-glow-active-teal',
  pink: 'border-expert-pink expert-glow-active-pink',
};

export function ExpertAvatar({ expert, size = 'md', active }: ExpertAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full border-2 flex items-center justify-center bg-secondary shrink-0 transition-all duration-300',
        sizeClasses[size],
        colorClasses[expert.color],
        active && 'scale-110 animate-pulse'
      )}
    >
      {expert.icon}
    </div>
  );
}
