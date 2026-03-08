import { useState } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { Search, Users, Sparkles, Brain, TrendingUp, HelpCircle } from 'lucide-react';

export interface SuggestedQuestion {
  icon: React.ReactNode;
  text: string;
  color: string;
  expertIds: string[];
  mode: DiscussionMode;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { icon: <Brain className="w-4 h-4" />, text: 'AI가 인간의 일자리를 대체할까요?', color: 'text-primary', expertIds: ['gpt', 'claude', 'engineer', 'programmer', 'buffett'], mode: 'standard' },
  { icon: <TrendingUp className="w-4 h-4" />, text: '2026년 투자 전략은 어떻게 세워야 할까요?', color: 'text-accent', expertIds: ['buffett', 'dalio', 'finance', 'accountant'], mode: 'standard' },
  { icon: <Sparkles className="w-4 h-4" />, text: '창의력을 키우는 가장 효과적인 방법은?', color: 'text-expert-emerald', expertIds: ['gemini', 'psychology', 'teacher', 'artist', 'jobs'], mode: 'standard' },
  { icon: <HelpCircle className="w-4 h-4" />, text: '건강한 식단의 핵심 원칙은 무엇인가요?', color: 'text-expert-amber', expertIds: ['medical', 'doctor', 'nurse', 'chef'], mode: 'standard' },
];

interface Props {
  experts: Expert[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  discussionMode: DiscussionMode;
  onModeChange: (mode: DiscussionMode) => void;
  isDiscussing: boolean;
  onSuggestedQuestion?: (question: string, expertIds: string[], mode: DiscussionMode) => void;
}

export function ExpertSelectionPanel({ experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing, onSuggestedQuestion }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [search, setSearch] = useState('');

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
    <div className="space-y-5">
      {/* Welcome - compact */}
      <div className="text-center space-y-1.5 pt-2">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {isGeneral ? '무엇이든 물어보세요' : '전문가와 토론하기'}
        </h2>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          {isGeneral
            ? 'AI를 선택하고 질문하면 바로 답변을 받을 수 있습니다'
            : '토론 모드를 선택하고, 전문가를 골라 질문하세요'
          }
        </p>
      </div>

      {/* Suggested Questions - horizontal scroll on mobile */}
      {onSuggestedQuestion && (
        <div className="flex gap-2 overflow-x-auto pb-1 px-1 snap-x snap-mandatory scrollbar-thin sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 sm:px-0 max-w-lg mx-auto">
          {SUGGESTED_QUESTIONS.map((q, i) => {
            const participants = q.expertIds
              .map(id => experts.find(e => e.id === id))
              .filter(Boolean) as Expert[];
            return (
              <button
                key={i}
                onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                className="flex flex-col gap-1.5 p-3 rounded-xl border border-border bg-card text-left text-xs text-foreground/80 hover:text-foreground hover:border-primary/30 hover:shadow-md transition-all duration-200 group snap-start min-w-[200px] sm:min-w-0"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-start gap-2">
                  <span className={cn('mt-0.5 shrink-0', q.color)}>{q.icon}</span>
                  <span className="leading-snug line-clamp-2">{q.text}</span>
                </div>
                {participants.length > 0 && (
                  <div className="flex items-center gap-1 pl-6">
                    <div className="flex -space-x-1">
                      {participants.slice(0, 4).map(e => (
                        <ExpertAvatar key={e.id} expert={e} size="sm" />
                      ))}
                    </div>
                    <span className="text-[9px] text-muted-foreground ml-1 truncate">
                      {participants.slice(0, 3).map(e => e.nameKo).join(', ')}{participants.length > 3 ? ` 외 ${participants.length - 3}명` : ''}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode selector - compact */}
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5 justify-center">
          {(['general', 'conclusion', 'standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
            const { label, icon } = DISCUSSION_MODE_LABELS[mode];
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-medium transition-all border',
                  discussionMode === mode
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
                )}
              >
                <span className="text-xs">{icon}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground text-center px-4">
          {DISCUSSION_MODE_LABELS[discussionMode].detail}
        </p>
      </div>

      {/* Expert Selection Card */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Top bar: tabs + search + count */}
        <div className="flex items-center border-b border-border">
          {/* Category tabs */}
          <div className="flex flex-1 min-w-0">
            {grouped.map(({ cat, label, items }) => {
              const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-display font-semibold transition-colors relative',
                    activeCategory === cat
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <span className="truncate">{label}</span>
                  {catSelectedCount > 0 && (
                    <span className="text-[9px] w-4 h-4 flex items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0">
                      {catSelectedCount}
                    </span>
                  )}
                  {activeCategory === cat && (
                    <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          {/* Search + count */}
          <div className="flex items-center gap-2 px-3 border-l border-border">
            <span className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0',
              selectedCount >= 1 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
            )}>
              <Users className="w-3 h-3 inline mr-0.5" />{selectedCount}
            </span>
          </div>
        </div>

        {/* Search bar inside card */}
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="이름으로 검색..."
              className="w-full bg-muted/50 border-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all"
            />
          </div>
        </div>

        {/* Expert grid */}
        {grouped
          .filter(({ cat }) => cat === activeCategory)
          .map(({ cat, items }) => (
            <div key={cat} className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-1 px-2 py-2">
              {items.map(expert => {
                const isSelected = selectedIds.includes(expert.id);
                return (
                  <button
                    key={expert.id}
                    type="button"
                    onClick={() => onToggle(expert.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200',
                      isSelected
                        ? 'bg-primary/8 ring-1 ring-primary/25 shadow-sm'
                        : 'opacity-45 hover:opacity-80 hover:bg-muted/50'
                    )}
                  >
                    <ExpertAvatar expert={expert} size="md" />
                    <span className="text-[9px] font-display font-medium text-foreground whitespace-nowrap truncate max-w-full leading-tight">
                      {expert.nameKo}
                    </span>
                    {isSelected && (
                      <div className="w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}
