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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-3 pt-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-2" style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}>
          <Sparkles className="w-7 h-7 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
          {isGeneral ? '무엇이든 물어보세요' : '전문가와 토론하기'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          {isGeneral
            ? 'AI를 선택하고 질문하면 바로 답변을 받을 수 있습니다'
            : '다양한 관점의 전문가들이 깊이 있는 토론을 펼칩니다'
          }
        </p>
      </div>

      {/* Suggested Questions */}
      {onSuggestedQuestion && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto">
          {SUGGESTED_QUESTIONS.map((q, i) => {
            const participants = q.expertIds
              .map(id => experts.find(e => e.id === id))
              .filter(Boolean) as Expert[];
            return (
              <button
                key={i}
                onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                className="flex flex-col gap-2 p-3.5 rounded-xl border border-border bg-card text-left text-sm text-foreground/80 hover:text-foreground hover:border-primary/30 hover:shadow-md transition-all duration-200 group"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn('mt-0.5 shrink-0 transition-colors', q.color, 'group-hover:scale-110 transition-transform')}>{q.icon}</span>
                  <span className="leading-snug">{q.text}</span>
                </div>
                {participants.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap pl-6">
                    <div className="flex -space-x-1.5">
                      {participants.slice(0, 5).map(e => (
                        <ExpertAvatar key={e.id} expert={e} size="sm" />
                      ))}
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-1.5 truncate">
                      {participants.map(e => e.nameKo).join(', ')}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Mode selector */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-2 justify-center">
          {(['general', 'conclusion', 'standard', 'procon', 'freeform', 'endless'] as DiscussionMode[]).map(mode => {
            const { label, icon } = DISCUSSION_MODE_LABELS[mode];
            return (
              <button
                key={mode}
                onClick={() => onModeChange(mode)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all border',
                  discussionMode === mode
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/20 hover:shadow-sm'
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

      {/* Selection count + Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
        <span className={cn(
          'inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors shrink-0',
          selectedCount >= 1
            ? 'bg-primary/10 text-primary'
            : 'bg-destructive/10 text-destructive'
        )}>
          <Users className="w-3.5 h-3.5" />
          {selectedCount}명 선택{selectedCount < 1 && ' (최소 1명)'}
        </span>
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="전문가 검색..."
            className="w-full bg-card border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
          />
        </div>
      </div>

      {/* Expert Categories - Single card with tabs */}
      <div className="border border-border rounded-2xl overflow-hidden bg-card" style={{ boxShadow: 'var(--shadow-card)' }}>
        {/* Category tabs */}
        <div className="flex border-b border-border">
          {grouped.map(({ cat, label, items }) => {
            const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-sm font-display font-semibold transition-colors relative',
                  activeCategory === cat
                    ? 'text-primary bg-muted/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                )}
              >
                <span>{label}</span>
                {catSelectedCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
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
        {/* Active category content */}
        {grouped
          .filter(({ cat }) => cat === activeCategory)
          .map(({ cat, items }) => (
            <div key={cat} className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 px-3 py-3">
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
          ))}
      </div>
    </div>
  );
}
