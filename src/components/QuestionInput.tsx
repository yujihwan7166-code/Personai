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
    <div className="space-y-1.5">
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="전문가들에게 질문하세요..."
          disabled={disabled}
          className="w-full bg-card border border-border rounded-2xl p-4 pr-14 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/30 transition-all min-h-[60px] max-h-[150px]"
          style={{ boxShadow: 'var(--shadow-card)' }}
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!question.trim() || disabled}
          className="absolute right-3 bottom-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/80 shadow-md transition-all"
          style={!question.trim() || disabled ? {} : { background: 'var(--gradient-primary)' }}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
      {modeInfo && (
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {modeInfo.icon} {modeInfo.label}
          </span>
        </div>
      )}
    </div>
  );
}
