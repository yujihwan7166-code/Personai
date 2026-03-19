import { useState } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, MainMode, DebateSubMode, MAIN_MODE_LABELS, DEBATE_SUB_MODE_LABELS, getMainMode } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import { Search, Users, Brain, TrendingUp, Sparkles, HelpCircle } from 'lucide-react';

export interface SuggestedQuestion {
  icon: React.ReactNode;
  text: string;
  color: string;
  expertIds: string[];
  mode: DiscussionMode;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  { icon: <Brain className="w-4 h-4" />, text: 'AI가 인간의 일자리를 대체할까요?', color: 'text-foreground', expertIds: ['gpt', 'claude', 'engineer', 'programmer', 'buffett'], mode: 'standard' },
  { icon: <TrendingUp className="w-4 h-4" />, text: '2026년 투자 전략은 어떻게 세워야 할까요?', color: 'text-foreground', expertIds: ['buffett', 'dalio', 'finance', 'accountant'], mode: 'multi' },
  { icon: <Sparkles className="w-4 h-4" />, text: '창의력을 키우는 가장 효과적인 방법은?', color: 'text-foreground', expertIds: ['gemini', 'psychology', 'teacher', 'artist', 'jobs'], mode: 'creative' },
  { icon: <HelpCircle className="w-4 h-4" />, text: '건강한 식단의 핵심 원칙은 무엇인가요?', color: 'text-foreground', expertIds: ['medical', 'doctor', 'nurse', 'chef'], mode: 'multi' },
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

const mainModes: MainMode[] = ['general', 'multi', 'debate'];
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'creative', 'endless'];

export function ExpertSelectionPanel({ experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing, onSuggestedQuestion }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');
  const [search, setSearch] = useState('');

  const mainMode = getMainMode(discussionMode);
  const isGeneral = mainMode === 'general';

  const visibleCategories = isGeneral ? ['ai'] : EXPERT_CATEGORY_ORDER;

  const grouped = visibleCategories
    .map(cat => ({
      cat: cat as ExpertCategory,
      label: EXPERT_CATEGORY_LABELS[cat as ExpertCategory],
      items: experts.filter(e => {
        if (e.category !== cat) return false;
        if (search) {
          const q = search.toLowerCase();
          return e.nameKo.toLowerCase().includes(q) || e.name.toLowerCase().includes(q) || e.description.toLowerCase().includes(q);
        }
        return true;
      }),
    })).filter(g => g.items.length > 0);

  const validCats = grouped.map(g => g.cat);
  const effectiveCategory = validCats.includes(activeCategory as ExpertCategory) ? activeCategory : validCats[0] || 'ai';

  const selectedCount = selectedIds.length;

  const handleMainModeChange = (m: MainMode) => {
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else onModeChange('standard');
  };

  const handleDebateSubChange = (sub: DebateSubMode) => {
    onModeChange(sub);
  };

  return (
    <div className="space-y-8 py-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl font-semibold text-foreground tracking-tight">
          {mainMode === 'general' ? '무엇이든 물어보세요' : mainMode === 'multi' ? '다중 AI 종합' : '전문가 토론'}
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {mainMode === 'general' && 'AI를 하나 선택하고 자유롭게 대화하세요'}
          {mainMode === 'multi' && '여러 AI·전문가의 답변을 종합해 최종 답변을 만듭니다'}
          {mainMode === 'debate' && '전문가들이 3라운드 토론 후 결론을 도출합니다'}
        </p>
      </div>

      {/* 3 Main Mode Tabs */}
      <div className="flex gap-2 justify-center">
        {mainModes.map(m => {
          const info = MAIN_MODE_LABELS[m];
          const isActive = mainMode === m;
          return (
            <button
              key={m}
              onClick={() => handleMainModeChange(m)}
              disabled={isDiscussing}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all border',
                isActive
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/30'
              )}
            >
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </button>
          );
        })}
      </div>

      {/* Debate Sub-Mode Selector */}
      {mainMode === 'debate' && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {debateSubModes.map(sub => {
            const info = DEBATE_SUB_MODE_LABELS[sub];
            const isActive = discussionMode === sub;
            return (
              <button
                key={sub}
                onClick={() => handleDebateSubChange(sub)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all border',
                  isActive
                    ? 'bg-foreground/10 text-foreground border-foreground/20'
                    : 'bg-background text-muted-foreground border-border hover:text-foreground hover:border-foreground/20'
                )}
              >
                <span>{info.icon}</span>
                <div className="text-left">
                  <div>{info.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Expert Selection Card */}
      <div className="border border-border rounded-2xl overflow-hidden bg-background">
        {isGeneral ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1 p-3">
            {experts.filter(e => e.category === 'ai').map(expert => {
              const isSelected = selectedIds.includes(expert.id);
              return (
                <button
                  key={expert.id}
                  type="button"
                  onClick={() => onToggle(expert.id)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all duration-150',
                    isSelected
                      ? 'bg-foreground/5 ring-1 ring-foreground/15'
                      : 'opacity-50 hover:opacity-80 hover:bg-muted/50'
                  )}
                >
                  <ExpertAvatar expert={expert} size="md" />
                  <span className="text-[11px] font-medium text-foreground whitespace-nowrap truncate max-w-full">
                    {expert.nameKo}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <>
            {/* Category tabs */}
            <div className="flex items-center border-b border-border">
              <div className="flex flex-1 min-w-0">
                {grouped.map(({ cat, label, items }) => {
                  const catSelectedCount = items.filter(e => selectedIds.includes(e.id)).length;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-1 px-2 py-2.5 text-xs font-medium transition-colors relative',
                        effectiveCategory === cat
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <span className="truncate">{label}</span>
                      {catSelectedCount > 0 && (
                        <span className="text-[9px] w-4 h-4 flex items-center justify-center rounded-full bg-foreground/10 text-foreground font-semibold shrink-0">
                          {catSelectedCount}
                        </span>
                      )}
                      {effectiveCategory === cat && (
                        <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-foreground rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 px-3 border-l border-border">
                <span className={cn(
                  'text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0',
                  selectedCount >= 1 ? 'bg-foreground/10 text-foreground' : 'bg-destructive/10 text-destructive'
                )}>
                  <Users className="w-3 h-3 inline mr-0.5" />{selectedCount}
                </span>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 pt-2 pb-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이름으로 검색..."
                  className="w-full bg-muted/50 border-none rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10 transition-all"
                />
              </div>
            </div>

            {/* Expert grid */}
            {grouped
              .filter(({ cat }) => cat === effectiveCategory)
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
                          'flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-150',
                          isSelected
                            ? 'bg-foreground/5 ring-1 ring-foreground/15'
                            : 'opacity-45 hover:opacity-80 hover:bg-muted/50'
                        )}
                      >
                        <ExpertAvatar expert={expert} size="md" />
                        <span className="text-[9px] font-medium text-foreground whitespace-nowrap truncate max-w-full leading-tight">
                          {expert.nameKo}
                        </span>
                        {isSelected && (
                          <div className="w-1 h-1 rounded-full bg-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
          </>
        )}
      </div>

      {/* Suggested Questions */}
      {onSuggestedQuestion && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-full mx-auto">
          {SUGGESTED_QUESTIONS.map((q, i) => {
            const participants = q.expertIds
              .map(id => experts.find(e => e.id === id))
              .filter(Boolean) as Expert[];
            return (
              <button
                key={i}
                onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                className="flex flex-col gap-2 p-3 rounded-xl border border-border bg-background text-left text-[12px] text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-all duration-150 group"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 shrink-0 opacity-40 group-hover:opacity-70">{q.icon}</span>
                  <span className="leading-relaxed">{q.text}</span>
                </div>
                {participants.length > 0 && (
                  <div className="flex items-center gap-1 pl-6">
                    <div className="flex -space-x-1.5">
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
    </div>
  );
}
