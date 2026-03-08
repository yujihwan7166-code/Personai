import { Expert, ExpertColor } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';

interface Props {
  experts: Expert[];
  activeExpertId?: string;
}

const dotColors: Record<ExpertColor, string> = {
  blue: 'bg-expert-blue',
  emerald: 'bg-expert-emerald',
  red: 'bg-expert-red',
  amber: 'bg-expert-amber',
  purple: 'bg-expert-purple',
  orange: 'bg-expert-orange',
  teal: 'bg-expert-teal',
  pink: 'bg-expert-pink',
};

export function ExpertPanel({ experts, activeExpertId }: Props) {
  return (
    <div className="flex gap-4 justify-center py-4 px-4 overflow-x-auto scrollbar-thin">
      {experts.map((expert, i) => (
        <div key={expert.id} className="flex items-center gap-4">
          <div
            className={cn(
              'flex flex-col items-center gap-1.5 transition-all duration-300 min-w-[56px]',
              activeExpertId === expert.id ? 'scale-110' : activeExpertId ? 'opacity-40' : 'opacity-70'
            )}
          >
            <ExpertAvatar expert={expert} size="lg" active={activeExpertId === expert.id} />
            <span className="text-[10px] font-display text-muted-foreground whitespace-nowrap">{expert.nameKo}</span>
            {activeExpertId === expert.id && (
              <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[expert.color])} />
            )}
          </div>
          {i < experts.length - 1 && (
            <div className="w-6 h-px bg-border shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}
