import { Expert, ExpertColor } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';

interface Props {
  experts: Expert[];
  activeExpertId?: string;
  selectedIds?: string[];
  onToggle?: (id: string) => void;
  selectable?: boolean;
}

const dotColors: Record<ExpertColor, string> = {
  blue: 'bg-expert-blue', emerald: 'bg-expert-emerald', red: 'bg-expert-red', amber: 'bg-expert-amber',
  purple: 'bg-expert-purple', orange: 'bg-expert-orange', teal: 'bg-expert-teal', pink: 'bg-expert-pink',
};

export function ExpertPanel({ experts, activeExpertId, selectedIds, onToggle, selectable }: Props) {
  return (
    <div className="flex gap-4 justify-center py-4 px-4 overflow-x-auto scrollbar-thin">
      {experts.map((expert, i) => {
        const isSelected = selectedIds?.includes(expert.id) ?? true;
        const isActive = activeExpertId === expert.id;

        return (
          <div key={expert.id} className="flex items-center gap-4">
            <button
              type="button"
              disabled={!selectable}
              onClick={() => onToggle?.(expert.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 transition-all duration-300 min-w-[56px]',
                selectable && 'cursor-pointer',
                !selectable && 'cursor-default',
                isActive ? 'scale-110' : activeExpertId ? 'opacity-40' : '',
                selectable && !isSelected && 'opacity-30 grayscale',
              )}
            >
              <ExpertAvatar expert={expert} size="lg" active={isActive} />
              <span className="text-[10px] font-display text-muted-foreground whitespace-nowrap">{expert.nameKo}</span>
              <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">{expert.description}</span>
              {isActive && (
                <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[expert.color])} />
              )}
              {selectable && isSelected && !activeExpertId && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </button>
            {i < experts.length - 1 && (
              <div className="w-6 h-px bg-border shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
