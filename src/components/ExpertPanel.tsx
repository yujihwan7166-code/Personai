import { useState } from 'react';
import { Expert, ExpertColor, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

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

function CategorySection({ cat, label, items, selectedIds, activeExpertId, selectable, onToggle, defaultOpen }: {
  cat: string; label: string; items: Expert[];
  selectedIds?: string[]; activeExpertId?: string;
  selectable: boolean; onToggle?: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const selectedCount = items.filter(e => selectedIds?.includes(e.id)).length;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center gap-2.5 w-full px-4 py-2.5 transition-colors',
          open ? 'bg-secondary/60' : 'hover:bg-secondary/30'
        )}
      >
        <span className="text-sm font-display font-medium text-foreground">{label}</span>
        {selectable && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            selectedCount > 0 ? 'bg-primary/15 text-primary font-medium' : 'bg-muted text-muted-foreground'
          )}>
            {selectedCount}명 선택
          </span>
        )}
        <ChevronDown className={cn(
          'w-4 h-4 text-muted-foreground transition-transform ml-auto',
          open && 'rotate-180'
        )} />
      </button>
      {open && (
        <div className="flex flex-wrap gap-3 justify-center px-4 py-3 bg-background/50">
          {items.map(expert => {
            const isSelected = selectedIds?.includes(expert.id) ?? true;
            return (
              <ExpertItem
                key={expert.id}
                expert={expert}
                isSelected={isSelected}
                isActive={activeExpertId === expert.id}
                hasActive={!!activeExpertId}
                selectable={selectable}
                onToggle={onToggle}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ExpertPanel({ experts, activeExpertId, selectedIds, onToggle, selectable }: Props) {
  // During discussion: flat list
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

  // Selectable mode: group by category, collapsible
  const grouped = EXPERT_CATEGORY_ORDER.map(cat => ({
    cat,
    label: EXPERT_CATEGORY_LABELS[cat],
    items: experts.filter(e => e.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="py-3 px-4 space-y-2 max-w-2xl mx-auto">
      {grouped.map(({ cat, label, items }) => (
        <CategorySection
          key={cat}
          cat={cat}
          label={label}
          items={items}
          selectedIds={selectedIds}
          activeExpertId={activeExpertId}
          selectable={true}
          onToggle={onToggle}
          defaultOpen={cat === 'ai'}
        />
      ))}
    </div>
  );
}
