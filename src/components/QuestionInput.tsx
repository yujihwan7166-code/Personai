import { useState, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { DiscussionMode } from '@/types/expert';
import { cn } from '@/lib/utils';

interface Props {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  discussionMode?: DiscussionMode;
}

export function QuestionInput({ onSubmit, disabled, discussionMode }: Props) {
  const [question, setQuestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
    setQuestion('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const placeholder = discussionMode === 'general'
    ? '무엇이든 물어보세요...'
    : '전문가에게 질문하세요...';

  const canSubmit = !!question.trim() && !disabled;

  return (
    <form onSubmit={handleSubmit}>
      <div className={cn(
        'group relative rounded-2xl border bg-white transition-all duration-200',
        disabled
          ? 'border-border/50 opacity-60'
          : 'border-border card-shadow hover:border-foreground/15 focus-within:border-primary/30 focus-within:shadow-[0_0_0_4px_hsl(221_83%_50%/0.06)]'
      )}>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-transparent resize-none text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none leading-6 px-5 pt-4 pb-12 min-h-[56px] max-h-[200px] block"
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

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-4 py-2.5">
          <span className="text-[11px] text-muted-foreground/40 select-none">
            Enter 전송 · Shift+Enter 줄바꿈
          </span>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150',
              canSubmit
                ? 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md scale-100'
                : 'bg-muted/60 text-muted-foreground/40 scale-95'
            )}
          >
            <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </form>
  );
}
