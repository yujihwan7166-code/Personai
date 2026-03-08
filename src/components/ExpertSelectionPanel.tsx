import { useState } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { ChevronDown, Search, Users } from 'lucide-react';

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

  const isGeneral = discussionMode === 'general';

  const grouped = EXPERT_CATEGORY_ORDER
    .filter(cat => !isGeneral || cat === 'ai')
    .map(cat => ({
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
    <div className="space-y-6">
      {/* Header with count badge inline */}
      <div className="text-center space-y-2">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          토론 전문가 선택
        </h2>
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">
            토론에 참여할 전문가를 <span className="text-primary font-medium">2명 이상</span> 선택하세요
          </p>
          <span className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-colors',
            selectedCount >= 2
              ? 'bg-primary/10 text-primary'
              : 'bg-destructive/10 text-destructive'
          )}>
            <Users className="w-3 h-3" />
            {selectedCount}명 {selectedCount < 2 && '(최소 2명)'}
          </span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2 justify-center">
          {(['conclusion', 'standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
            const { label, icon } = DISCUSSION_MODE_LABELS[mode];
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium transition-all border',
                  discussionMode === mode
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
                )}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground text-center px-4 transition-all">
          {DISCUSSION_MODE_LABELS[discussionMode].detail}
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="전문가 검색..."
          className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
        />
      </div>

      {/* Expert Categories */}
      <div className="space-y-3">
        {grouped.map(({ cat, label, items }) => {
          const isOpen = expandedCategories[cat] ?? false;
          const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
          return (
            <div key={cat} className="border border-border rounded-2xl overflow-hidden bg-card shadow-sm">
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className={cn(
                  'flex items-center gap-2.5 w-full px-4 py-3 transition-colors',
                  isOpen ? 'bg-muted/50' : 'hover:bg-muted/30'
                )}
              >
                <span className="text-sm font-display font-semibold text-foreground">{label}</span>
                {catSelectedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {catSelectedCount}
                  </span>
                )}
                <ChevronDown className={cn(
                  'w-4 h-4 text-muted-foreground transition-transform ml-auto',
                  isOpen && 'rotate-180'
                )} />
              </button>
              {isOpen && (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 px-3 py-3">
                  {items.map(expert => {
                    const isSelected = selectedIds.includes(expert.id);
                    return (
                      <button
                        key={expert.id}
                        type="button"
                        onClick={() => onToggle(expert.id)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all duration-200',
                          isSelected
                            ? 'bg-primary/8 ring-1 ring-primary/25 shadow-sm'
                            : 'opacity-50 hover:opacity-80 hover:bg-muted/50'
                        )}
                      >
                        <ExpertAvatar expert={expert} size="md" />
                        <span className="text-[10px] font-display font-medium text-foreground whitespace-nowrap truncate max-w-full">
                          {expert.nameKo}
                        </span>
                        {isSelected && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
