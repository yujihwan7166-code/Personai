import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';

interface Props {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  discussionMode?: DiscussionMode;
}

export function QuestionInput({ onSubmit, disabled, discussionMode }: Props) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
    setQuestion('');
  };

  const modeInfo = discussionMode ? DISCUSSION_MODE_LABELS[discussionMode] : null;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 bg-card border border-border rounded-2xl p-2 pr-2 transition-all focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30" style={{ boxShadow: 'var(--shadow-card)' }}>
        {modeInfo && (
          <span className="hidden sm:inline-flex items-center text-[9px] text-muted-foreground bg-muted px-2 py-1 rounded-full mb-0.5 shrink-0">
            {modeInfo.icon} {modeInfo.label}
          </span>
        )}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={discussionMode === 'document' ? '문서로 만들 주제를 입력하세요...' : '질문을 입력하세요...'}
          disabled={disabled}
          className="flex-1 bg-transparent border-none p-1 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none min-h-[36px] max-h-[120px]"
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = Math.min(target.scrollHeight, 120) + 'px';
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!question.trim() || disabled}
          className="rounded-xl w-8 h-8 bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm transition-all shrink-0"
          style={!question.trim() || disabled ? {} : { background: 'var(--gradient-primary)' }}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </form>
  );
}
