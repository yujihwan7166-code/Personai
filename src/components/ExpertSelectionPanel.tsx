import { useState } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { ChevronDown, Search } from 'lucide-react';

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
}

export function ExpertSelectionPanel({ experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing }: Props) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({ ai: true });
  const [search, setSearch] = useState('');

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const grouped = EXPERT_CATEGORY_ORDER.map(cat => ({
    cat,
    label: EXPERT_CATEGORY_LABELS[cat],
    items: experts.filter(e => {
      if (e.category !== cat) return false;
      if (search) {
        const q = search.toLowerCase();
        return e.nameKo.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
      }
      return true;
    }),
  })).filter(g => g.items.length > 0);

  const selectedCount = selectedIds.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-display text-lg sm:text-xl font-bold text-foreground tracking-tight">
          토론 전문가 선택
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          토론에 참여할 전문가를 <span className="text-primary font-medium">2명 이상</span> 선택하세요
        </p>
      </div>

      {/* Top bar: mode + search + count */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Mode selector */}
        <div className="flex gap-1.5">
          {(['standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
            const { label, icon } = DISCUSSION_MODE_LABELS[mode];
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-medium transition-all',
                  discussionMode === mode
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            className="w-36 sm:w-44 bg-secondary/50 border border-border rounded-full pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
        </div>

        <div className="h-4 w-px bg-border hidden sm:block" />

        {/* Count */}
        <span className={cn(
          'text-[11px] font-display font-medium px-2.5 py-1 rounded-full',
          selectedCount >= 2 ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'
        )}>
          {selectedCount}명 선택 {selectedCount < 2 && '(최소 2명)'}
        </span>
      </div>

      {/* Expert Categories */}
      <div className="space-y-1.5">
        {grouped.map(({ cat, label, items }) => {
          const isOpen = expandedCategories[cat] ?? false;
          const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
          return (
            <div key={cat} className="border border-border/40 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'flex items-center justify-center gap-2 w-full px-4 py-2 transition-colors',
                  isOpen ? 'bg-secondary/50' : 'hover:bg-secondary/30'
                )}
              >
                <span className="text-xs font-display font-medium text-foreground">{label}</span>
                {catSelectedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                    {catSelectedCount}
                  </span>
                )}
                <ChevronDown className={cn(
                  'w-3.5 h-3.5 text-muted-foreground transition-transform',
                  isOpen && 'rotate-180'
                )} />
              </button>
              {isOpen && (
                <div className="flex flex-wrap gap-1.5 justify-center px-3 py-2.5 bg-background/50">
                  {items.map(expert => {
                    const isSelected = selectedIds.includes(expert.id);
                    return (
                      <button
                        key={expert.id}
                        type="button"
                        onClick={() => onToggle(expert.id)}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[56px]',
                          isSelected
                            ? 'bg-primary/10 ring-1 ring-primary/30 shadow-sm'
                            : 'opacity-45 hover:opacity-75 hover:bg-secondary/50'
                        )}
                      >
                        <ExpertAvatar expert={expert} size="sm" />
                        <span className="text-[9px] font-display text-foreground whitespace-nowrap truncate max-w-[56px] text-center">
                          {expert.nameKo}
                        </span>
                        {isSelected && (
                          <div className="w-1 h-1 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}