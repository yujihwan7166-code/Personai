import { useState, useRef } from 'react';
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
}

export function QuestionInput({ onSubmit, disabled, discussionMode, selectedExperts, onRemoveExpert, onToggleSettings, showSettings }: Props) {
  const [question, setQuestion] = useState('');
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
    setQuestion('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const placeholder = discussionMode === 'general'
    ? '무엇이든 물어보고 만들어보세요'
    : discussionMode === 'multi'
    ? '최대 3개 AI에게 동시에 질문해보세요'
    : '전문가들에게 토론 주제를 던져보세요';

  const canSubmit = !!question.trim() && !disabled;

  return (
    <form onSubmit={handleSubmit}>
      {/* Gradient border wrapper */}
      <div className={cn(
        disabled ? 'input-gradient-border-disabled opacity-60' : 'input-gradient-border',
        focused ? 'shadow-[0_4px_24px_rgba(196,181,253,0.35)]' : 'shadow-[0_2px_12px_rgba(0,0,0,0.07)]'
      )}>
      <div className="rounded-[calc(1rem-1.5px)] bg-white transition-all duration-200">
        {/* Selected AI chips / participant label */}
        {selectedExperts && selectedExperts.length > 0 && (
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
          className="w-full bg-transparent resize-none text-[14px] text-foreground placeholder:text-muted-foreground/40 focus:outline-none leading-6 px-5 pt-3 pb-1 min-h-[40px] max-h-[160px] block"
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
              className="w-8 h-8 rounded-full border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled={disabled}
              onClick={onToggleSettings}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center transition-all',
                showSettings
                  ? 'text-foreground bg-slate-100'
                  : 'text-muted-foreground/60 hover:text-foreground'
              )}
            >
              <Wrench className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          </div>

          {/* Right tools */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={disabled}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-all"
            >
              <Mic className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-150',
                canSubmit
                  ? 'bg-foreground text-white hover:bg-foreground/85 shadow-sm'
                  : 'bg-muted/60 text-muted-foreground/30'
              )}
            >
              <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
      </div>
    </form>
  );
}
