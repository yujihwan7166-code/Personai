import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Plus, Wrench, Mic } from 'lucide-react';
import { DiscussionMode, Expert } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  discussionMode?: DiscussionMode;
  selectedExperts?: Expert[];
  onRemoveExpert?: (id: string) => void;
  onToggleSettings?: () => void;
  showSettings?: boolean;
  isFollowUp?: boolean;
  onConclusion?: () => void;
}

export function QuestionInput({ onSubmit, disabled, discussionMode, selectedExperts, onRemoveExpert, onToggleSettings, showSettings, isFollowUp, onConclusion }: Props) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto focus on mount
  useEffect(() => { setTimeout(() => textareaRef.current?.focus(), 100); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
    setQuestion('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const placeholder = isFollowUp
    ? (discussionMode === 'brainstorm'
      ? '추가 방향을 제시하세요 (예: "교육 분야에서는?", "비용 절감 관점으로")'
      : discussionMode === 'procon' || discussionMode === 'standard' || discussionMode === 'hearing'
      ? '토론자들에게 추가 질문을 해보세요'
      : '이어서 질문해보세요')
    : discussionMode === 'general'
    ? '궁금한 것을 물어보세요'
    : discussionMode === 'multi'
    ? '여러 AI에게 동시에 질문해보세요'
    : discussionMode === 'expert'
    ? '전문가에게 상담할 내용을 입력하세요'
    : '토론하고 싶은 주제를 입력하세요';

  const canSubmit = !!question.trim() && !disabled;

  return (
    <form onSubmit={handleSubmit}>
      <div className={cn(
        'rounded-2xl border-2 transition-all duration-200',
        disabled
          ? 'border-slate-200 opacity-75'
          : focused
            ? 'border-violet-300 shadow-[0_2px_20px_rgba(139,92,246,0.10)] bg-white'
            : 'border-slate-200 bg-slate-50 shadow-sm hover:border-violet-300'
      )}>
      <div className="rounded-[calc(1rem-2px)] bg-white transition-all duration-200">
        {/* Selected AI chips / participant label (hidden in follow-up mode) */}
        {!isFollowUp && selectedExperts && selectedExperts.length > 0 && (
          (discussionMode === 'standard' || discussionMode === 'brainstorm') ? (
            <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-700 text-white text-[10px] font-bold tracking-wide">
                {discussionMode === 'standard' ? '토론자' : '참여자'}
              </span>
              <div className="flex items-center gap-1.5">
                {selectedExperts.map((e, i) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5">
                    <span className="text-[13px] font-semibold text-slate-800">{e.nameKo}</span>
                    {i < selectedExperts.length - 1 && <span className="text-slate-300">·</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-4 pt-3 pb-1 flex-wrap">
              {selectedExperts.map(e => (
                onRemoveExpert ? (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onRemoveExpert(e.id)}
                    className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium hover:bg-red-50 hover:border-red-100 hover:text-red-400 transition-colors"
                  >
                    {e.avatarUrl
                      ? <img src={e.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain pointer-events-none" />
                      : e.icon && <span className="text-[12px] pointer-events-none">{e.icon}</span>}
                    {e.nameKo}
                    <span className="text-[9px] opacity-60">✕</span>
                  </button>
                ) : (
                  <span key={e.id} className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] text-indigo-600 font-medium">
                    {e.avatarUrl
                      ? <img src={e.avatarUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                      : e.icon && <span className="text-[12px]">{e.icon}</span>}
                    {e.nameKo}
                  </span>
                )
              ))}
            </div>
          )
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent resize-none text-[14px] text-foreground placeholder:text-slate-400 focus:outline-none leading-relaxed px-5 pt-4 pb-2 min-h-[44px] max-h-[140px] block"
          rows={1}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
          }}
          onInput={e => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 200) + 'px';
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 py-1.5">
          {/* Left tools */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleSettings}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium transition-all',
                showSettings
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              )}
            >
              <Wrench className="w-3 h-3" strokeWidth={1.8} />
              {!showSettings && '설정'}
              {showSettings && '닫기'}
            </button>
            {onConclusion && (
              <button type="button" onClick={onConclusion}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium text-amber-600 hover:bg-amber-50 transition-all">
                🎯 종합 결론
              </button>
            )}
          </div>

          {/* Right tools */}
          <div className="flex items-center gap-1.5">
            {!disabled && <span className="text-[9px] text-slate-300 mr-1 hidden sm:inline">Enter 전송 · Shift+Enter 줄바꿈</span>}
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
                canSubmit
                  ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md'
                  : 'bg-slate-100 text-slate-300'
              )}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </form>
  );
}
