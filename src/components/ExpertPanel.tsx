import { Expert, ExpertColor, ExpertCategory, EXPERT_CATEGORY_LABELS } from '@/types/expert';
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

function ExpertItem({ expert, isSelected, isActive, hasActive, selectable, onToggle }: {
  expert: Expert; isSelected: boolean; isActive: boolean; hasActive: boolean; selectable: boolean; onToggle?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={() => onToggle?.(expert.id)}
      className={cn(
        'flex flex-col items-center gap-1 transition-all duration-300 min-w-[52px]',
        selectable ? 'cursor-pointer' : 'cursor-default',
        isActive ? 'scale-110' : hasActive ? 'opacity-40' : '',
        selectable && !isSelected && 'opacity-30 grayscale',
      )}
    >
      <ExpertAvatar expert={expert} size="lg" active={isActive} />
      <span className="text-[10px] font-display text-muted-foreground whitespace-nowrap">{expert.nameKo}</span>
      {isActive && (
        <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', dotColors[expert.color])} />
      )}
      {selectable && isSelected && !hasActive && (
        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
      )}
    </button>
  );
}

export function ExpertPanel({ experts, activeExpertId, selectedIds, onToggle, selectable }: Props) {
  // During discussion (activeExpertId set or not selectable with messages), show flat list
  if (!selectable) {
    return (
      <div className="flex gap-3 justify-center py-4 px-4 overflow-x-auto scrollbar-thin">
        {experts.map((expert, i) => {
          const isSelected = selectedIds?.includes(expert.id) ?? true;
          return (
            <div key={expert.id} className="flex items-center gap-3">
              <ExpertItem expert={expert} isSelected={isSelected} isActive={activeExpertId === expert.id} hasActive={!!activeExpertId} selectable={false} />
              {i < experts.length - 1 && <div className="w-4 h-px bg-border shrink-0" />}
            </div>
          );
        })}
      </div>
    );
  }

  // Selectable mode: group by category
  const categories: ExpertCategory[] = ['ai', 'specialist', 'celebrity'];
  const grouped = categories.map(cat => ({
    cat,
    label: EXPERT_CATEGORY_LABELS[cat],
    items: experts.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="py-3 px-4 space-y-3">
      {grouped.map(({ cat, label, items }) => (
        <div key={cat}>
          <p className="text-[10px] font-display text-muted-foreground mb-2 pl-1">{label}</p>
          <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-1">
            {items.map(expert => {
              const isSelected = selectedIds?.includes(expert.id) ?? true;
              return (
                <ExpertItem
                  key={expert.id}
                  expert={expert}
                  isSelected={isSelected}
                  isActive={activeExpertId === expert.id}
                  hasActive={!!activeExpertId}
                  selectable={true}
                  onToggle={onToggle}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
