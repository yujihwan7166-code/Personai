import { useState, useEffect, useRef } from 'react';
import { Expert, ExpertCategory, EXPERT_CATEGORY_LABELS, EXPERT_CATEGORY_ORDER, DiscussionMode, MainMode, DebateSubMode, MAIN_MODE_LABELS, DEBATE_SUB_MODE_LABELS, getMainMode } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { QuestionInput } from './QuestionInput';
import { cn } from '@/lib/utils';
import { Users, Brain, TrendingUp, Sparkles, HelpCircle, Target, Scale, Lightbulb, Flame } from 'lucide-react';

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
  onSubmit: (question: string) => void;
}

const mainModes: MainMode[] = ['general', 'multi', 'debate'];
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'creative', 'endless'];

const mainModeLabels: Record<MainMode, string> = {
  general: '단일 AI',
  multi: '다중 AI',
  debate: '토론 모드',
};

const debateSubIcons: Record<DebateSubMode, React.ReactNode> = {
  standard: <Target className="w-3 h-3" />,
  procon: <Scale className="w-3 h-3" />,
  creative: <Lightbulb className="w-3 h-3" />,
  endless: <Flame className="w-3 h-3" />,
};

function useTypewriter(text: string, speed = 40) {
  const [displayed, setDisplayed] = useState('');
  const prevText = useRef('');

  useEffect(() => {
    if (text === prevText.current) return;
    prevText.current = text;
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

export function ExpertSelectionPanel({ experts, selectedIds, onToggle, discussionMode, onModeChange, isDiscussing, onSuggestedQuestion, onSubmit }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>('ai');

  const mainMode = getMainMode(discussionMode);

  const subtitleText = mainMode === 'general'
    ? 'GPT, Claude, Gemini 등 원하는 AI를 선택하고 자유롭게 대화하세요'
    : mainMode === 'multi'
    ? '여러 챗봇을 선택하면 각자 답변한 뒤 하나의 종합 결론으로 정리해드립니다'
    : '2명 이상 선택 후 질문하면 토론을 거쳐 최종 결론을 도출합니다';
  const typedSubtitle = useTypewriter(subtitleText, 20);
  const isGeneral = mainMode === 'general';

  const visibleCategories = EXPERT_CATEGORY_ORDER;

  const grouped = visibleCategories
    .map(cat => ({
      cat: cat as ExpertCategory,
      label: EXPERT_CATEGORY_LABELS[cat as ExpertCategory],
      items: experts.filter(e => e.category === cat),
    })).filter(g => g.items.length > 0);

  const validCats = grouped.map(g => g.cat);
  const effectiveCategory = validCats.includes(activeCategory as ExpertCategory) ? activeCategory : validCats[0] || 'ai';
  const selectedCount = selectedIds.length;

  const handleMainModeChange = (m: MainMode) => {
    if (m === 'general') onModeChange('general');
    else if (m === 'multi') onModeChange('multi');
    else onModeChange('standard');
  };

  return (
    <div className="space-y-3 py-4">
      {/* Hero */}
      <div className="text-center space-y-2">
        <h2
          key={mainMode}
          className="text-2xl sm:text-[26px] font-bold text-foreground tracking-tight animate-in fade-in duration-700"
        >
          {mainMode === 'general' ? '모든 AI 챗봇을 한 곳에서 원하는 대로 골라 쓰세요'
            : mainMode === 'multi' ? '하나의 질문을 여러 AI에게 동시에 물어보세요'
            : '전문가 챗봇들의 토론으로 더 넓은 시야를 얻으세요'}
        </h2>
        <div className="relative flex justify-center">
          {/* 전체 텍스트로 공간 고정 */}
          <span className="invisible text-[12px] leading-relaxed">{subtitleText}</span>
          {/* 타이핑 텍스트를 같은 자리에 absolute 오버레이 */}
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground leading-relaxed">
            {typedSubtitle}
            {typedSubtitle.length < subtitleText.length && (
              <span className="animate-pulse text-muted-foreground/40">|</span>
            )}
          </span>
        </div>
      </div>

      {/* Main Mode Tabs */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-0 p-0.5 bg-muted/40 rounded-full border border-border/50">
          {mainModes.map(m => {
            const isActive = mainMode === m;
            return (
              <button
                key={m}
                onClick={() => handleMainModeChange(m)}
                disabled={isDiscussing}
                className={cn(
                  'flex items-center gap-1 px-4 py-1 rounded-full text-[11px] font-medium transition-all duration-200',
                  isActive
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground/70'
                )}
              >
                {mainModeLabels[m]}
                {m === 'debate' && isActive && (
                  <svg className="w-2.5 h-2.5 text-foreground/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        {/* Sub-modes — nested below 토론 모드, connected visually */}
        {mainMode === 'debate' && (
          <div className="flex items-center animate-in slide-in-from-top-1 fade-in duration-200">
            {/* connecting line */}
            <div className="flex items-center gap-1 p-0.5 bg-white border border-border/60 rounded-full shadow-sm">
              {debateSubModes.map((sub, i) => {
                const info = DEBATE_SUB_MODE_LABELS[sub];
                const isActive = discussionMode === sub;
                return (
                  <button
                    key={sub}
                    onClick={() => onModeChange(sub)}
                    disabled={isDiscussing}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={cn(
                      'flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-medium transition-all duration-150 animate-in fade-in',
                      isActive
                        ? 'bg-foreground text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    {debateSubIcons[sub]}
                    <span>{info.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Expert Selection */}
      <div className="border border-border rounded-xl bg-white overflow-hidden card-shadow">
        <>
            {/* Category tabs + debate sub-modes */}
            <div className="flex flex-col border-b border-border/60 bg-muted/10">
              {/* Row 1: category tabs + selected tags */}
              <div className="flex items-center px-2 pt-1.5">
              <div className="flex flex-1 min-w-0 gap-0.5">
                {grouped.map(({ cat, label, items }) => {
                  const catSelected = items.filter(e => selectedIds.includes(e.id)).length;
                  const isActive = effectiveCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium transition-all relative whitespace-nowrap rounded-t-lg',
                        isActive
                          ? 'text-foreground bg-white border border-b-0 border-border/60'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {selectedCount > 0 && !isGeneral && (
                <div className="flex items-center gap-1 px-2 pb-1 overflow-x-auto shrink-0 max-w-[320px] scrollbar-none">
                  {experts
                    .filter(e => selectedIds.includes(e.id))
                    .map(e => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => onToggle(e.id)}
                        className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[10px] text-blue-600 font-medium whitespace-nowrap shrink-0 hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-colors"
                      >
                        {e.nameKo}
                      </button>
                    ))}
                </div>
              )}
              </div>

            </div>

            {/* Expert grid */}
            {grouped
              .filter(({ cat }) => cat === effectiveCategory)
              .map(({ cat, items }) => (
                <div key={cat} className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-1.5 px-3 pt-2 pb-2">
                  {items.map(expert => {
                    const isSelected = selectedIds.includes(expert.id);
                    return (
                      <button
                        key={expert.id}
                        type="button"
                        onClick={() => onToggle(expert.id)}
                        className={cn(
                          'group relative flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-150',
                          isSelected
                            ? 'bg-blue-50 scale-105'
                            : 'opacity-45 hover:opacity-80 hover:bg-muted/30 hover:scale-105'
                        )}
                      >
                        {/* 선택 체크 뱃지 */}
                        {isSelected && (
                          <span className="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                        <ExpertAvatar expert={expert} size="md" />
                        <span className={cn(
                          'text-[10px] font-medium whitespace-nowrap truncate max-w-full leading-tight transition-colors',
                          isSelected ? 'text-blue-600 font-semibold' : 'text-muted-foreground group-hover:text-foreground'
                        )}>
                          {expert.nameKo}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ))}
        </>
      </div>

      {/* Chat Input — above suggested questions */}
      <QuestionInput
        onSubmit={onSubmit}
        disabled={isDiscussing || selectedIds.length < 1}
        discussionMode={discussionMode}
      />

      {/* Suggested Questions */}
      {onSuggestedQuestion && !isGeneral && (
        <div>
          <p className="text-[10px] text-muted-foreground font-medium mb-2 px-0.5 tracking-wide">추천 질문</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {SUGGESTED_QUESTIONS.map((q, i) => {
              const participants = q.expertIds
                .map(id => experts.find(e => e.id === id))
                .filter(Boolean) as Expert[];
              return (
                <button
                  key={i}
                  onClick={() => onSuggestedQuestion(q.text, q.expertIds, q.mode)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-white text-left hover:border-foreground/15 hover:bg-muted/20 transition-all duration-150 group"
                >
                  <span className="shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">{q.icon}</span>
                  <span className="text-[12px] text-foreground/75 leading-snug flex-1">{q.text}</span>
                  {participants.length > 0 && (
                    <div className="flex -space-x-1.5 shrink-0">
                      {participants.slice(0, 3).map(e => (
                        <ExpertAvatar key={e.id} expert={e} size="sm" />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
