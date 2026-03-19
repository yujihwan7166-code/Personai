import { useState } from 'react';
import { DiscussionMessage as DiscussionMessageType, Expert, ROUND_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ThumbsUp, ThumbsDown, MessageSquareReply } from 'lucide-react';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
  onRebuttal?: (expertId: string, content: string, userRebuttal: string) => void;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
}

export function DiscussionMessageCard({ message, expert, onRebuttal, onLike, onDislike }: Props) {
  const [copied, setCopied] = useState(false);
  const [showRebuttal, setShowRebuttal] = useState(false);
  const [rebuttalText, setRebuttalText] = useState('');
  const isSummary = message.isSummary;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRebuttalSubmit = () => {
    if (rebuttalText.trim() && onRebuttal) {
      onRebuttal(expert.id, message.content, rebuttalText.trim());
      setRebuttalText('');
      setShowRebuttal(false);
    }
  };

  return (
    <div className={cn(
      'group animate-in fade-in slide-in-from-bottom-2 duration-300',
      isSummary ? 'mt-2' : ''
    )}>
      <div className={cn(
        'rounded-xl border bg-white card-shadow transition-shadow hover:card-shadow-md overflow-hidden',
        isSummary ? 'border-primary/15 bg-gradient-to-b from-blue-50/20 to-white' : 'border-border'
      )}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3.5 pb-3">
          <ExpertAvatar expert={expert} active={message.isStreaming} />
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[13px] text-foreground">
              {expert.nameKo}
            </span>
            {isSummary && (
              <span className="text-[10px] font-medium bg-primary/8 text-primary px-2 py-0.5 rounded-md">
                종합 정리
              </span>
            )}
            {message.round && !isSummary && (
              <span className="text-[10px] font-medium bg-muted text-muted-foreground/70 px-2 py-0.5 rounded-md">
                {ROUND_LABELS[message.round]}
              </span>
            )}
            {message.isStreaming && (
              <span className="flex items-center gap-1">
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="typing-dot w-1.5 h-1.5 rounded-full bg-primary/50" />
              </span>
            )}
          </div>
          {!message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-border/40" />

        {/* Content */}
        <div className="px-4 py-4">
          <div className="text-sm leading-7 text-foreground/85 prose prose-sm max-w-none
            prose-p:my-2 prose-p:leading-7
            prose-headings:text-foreground prose-headings:font-semibold prose-headings:tracking-tight
            prose-headings:mt-4 prose-headings:mb-2
            prose-strong:text-foreground prose-strong:font-semibold
            prose-ul:my-2 prose-li:my-0.5
            prose-ol:my-2
            prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:text-muted-foreground
            prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-table:text-xs prose-th:bg-muted
          ">
            {message.content ? (
              <ReactMarkdown>{message.content}</ReactMarkdown>
            ) : message.isStreaming ? (
              <span className="text-muted-foreground italic text-xs">답변 생성 중...</span>
            ) : null}
            {message.isStreaming && message.content && (
              <span className="inline-block w-0.5 h-4 bg-primary/50 ml-0.5 cursor-blink rounded-full" />
            )}
          </div>
        </div>

        {/* Actions */}
        {!message.isStreaming && message.content && !isSummary && (
          <div className="flex items-center gap-1 px-4 pb-3">
            <button
              onClick={() => onLike?.(message.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              {(message.likes ?? 0) > 0 && <span className="font-medium">{message.likes}</span>}
            </button>
            <button
              onClick={() => onDislike?.(message.id)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-lg hover:bg-muted"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              {(message.dislikes ?? 0) > 0 && <span className="font-medium">{message.dislikes}</span>}
            </button>
            {onRebuttal && (
              <button
                onClick={() => setShowRebuttal(!showRebuttal)}
                className={cn(
                  'flex items-center gap-1.5 text-xs transition-colors px-2.5 py-1.5 rounded-lg',
                  showRebuttal
                    ? 'text-primary bg-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <MessageSquareReply className="w-3.5 h-3.5" />
                <span>반박하기</span>
              </button>
            )}
          </div>
        )}

        {/* Rebuttal Input */}
        {showRebuttal && (
          <div className="mx-4 mb-4 flex gap-2">
            <input
              type="text"
              value={rebuttalText}
              onChange={e => setRebuttalText(e.target.value)}
              placeholder={`${expert.nameKo}에게 반박...`}
              autoFocus
              className="flex-1 bg-muted/60 border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              onKeyDown={e => {
                if (e.key === 'Enter' && rebuttalText.trim()) handleRebuttalSubmit();
              }}
            />
            <button
              onClick={handleRebuttalSubmit}
              disabled={!rebuttalText.trim()}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-primary/90 transition-colors"
            >
              전송
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
