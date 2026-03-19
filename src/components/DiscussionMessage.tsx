import { useState } from 'react';
import { DiscussionMessage as DiscussionMessageType, Expert, ExpertColor, ROUND_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown, MessageSquareReply } from 'lucide-react';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
  onRebuttal?: (expertId: string, content: string, userRebuttal: string) => void;
  onLike?: (messageId: string) => void;
  onDislike?: (messageId: string) => void;
}

export function DiscussionMessageCard({ message, expert, onRebuttal, onLike, onDislike }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showRebuttal, setShowRebuttal] = useState(false);
  const [rebuttalText, setRebuttalText] = useState('');
  const isSummary = message.isSummary;
  const isOpen = expanded;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRebuttalSubmit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rebuttalText.trim() && onRebuttal) {
      onRebuttal(expert.id, message.content, rebuttalText.trim());
      setRebuttalText('');
      setShowRebuttal(false);
    }
  };

  const preview = message.content.slice(0, 80).replace(/\n/g, ' ');

  return (
    <div className={cn(
      'group animate-in fade-in slide-in-from-bottom-1 duration-300',
      isSummary && 'mt-6'
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl p-3 border transition-all duration-150 text-left',
          isSummary
            ? 'bg-muted/50 border-border cursor-pointer'
            : 'bg-background border-border hover:border-foreground/15 cursor-pointer',
          isOpen && 'rounded-b-none border-b-0'
        )}
      >
        <ExpertAvatar expert={expert} active={message.isStreaming} />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm flex items-center gap-1.5 text-foreground">
            {expert.nameKo}
            {isSummary && (
              <span className="text-[10px] font-normal bg-foreground/10 text-foreground/70 px-2 py-0.5 rounded-full ml-1">
                최종 정리
              </span>
            )}
            {message.round && !isSummary && (
              <span className="text-[10px] font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-1">
                {ROUND_LABELS[message.round]}
              </span>
            )}
            {message.isStreaming && (
              <span className="flex items-center gap-1 ml-1.5">
                <span className="typing-dot w-1 h-1 rounded-full bg-foreground/50" />
                <span className="typing-dot w-1 h-1 rounded-full bg-foreground/50" />
                <span className="typing-dot w-1 h-1 rounded-full bg-foreground/50" />
              </span>
            )}
          </div>
          {!isOpen && !message.isStreaming && message.content && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}…</p>
          )}
          {!isOpen && message.isStreaming && (
            <p className="text-xs text-muted-foreground mt-0.5">답변 생성 중...</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!message.isStreaming && message.content && !isSummary && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {isOpen
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Content */}
      {isOpen && (
        <div className={cn(
          'border border-t-0 rounded-b-xl p-4 pt-2',
          isSummary ? 'bg-muted/30 border-border' : 'bg-background border-border'
        )}>
          {isSummary && !message.isStreaming && message.content && (
            <div className="flex justify-end mb-1">
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="text-sm leading-relaxed text-foreground/80 prose prose-sm max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-headings:font-semibold prose-strong:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-foreground/30 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>

          {/* Actions */}
          {!message.isStreaming && message.content && !isSummary && (
            <div className="flex items-center gap-1 mt-3 pt-2 border-t border-border">
              <button
                onClick={(e) => { e.stopPropagation(); onLike?.(message.id); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                {(message.likes ?? 0) > 0 && <span>{message.likes}</span>}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDislike?.(message.id); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                {(message.dislikes ?? 0) > 0 && <span>{message.dislikes}</span>}
              </button>
              {onRebuttal && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRebuttal(!showRebuttal); }}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-md",
                    showRebuttal ? "text-foreground bg-muted" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <MessageSquareReply className="w-3.5 h-3.5" />
                  <span>반박</span>
                </button>
              )}
            </div>
          )}

          {/* Rebuttal */}
          {showRebuttal && (
            <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={rebuttalText}
                onChange={(e) => setRebuttalText(e.target.value)}
                placeholder={`${expert.nameKo}에게 반박...`}
                className="flex-1 bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/10"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rebuttalText.trim()) {
                    handleRebuttalSubmit(e as unknown as React.MouseEvent);
                  }
                }}
              />
              <button
                onClick={handleRebuttalSubmit}
                disabled={!rebuttalText.trim()}
                className="px-3 py-2 bg-foreground text-background rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-foreground/90 transition-colors"
              >
                전송
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
