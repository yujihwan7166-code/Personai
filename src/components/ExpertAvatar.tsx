import { Expert } from '@/types/expert';
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

const colorClasses = {
  gpt: 'border-expert-gpt expert-glow-gpt',
  gemini: 'border-expert-gemini expert-glow-gemini',
  medical: 'border-expert-medical expert-glow-medical',
  investment: 'border-expert-investment expert-glow-investment',
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
