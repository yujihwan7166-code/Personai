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

const nameColors: Record<ExpertColor, string> = {
  blue: 'text-expert-blue', emerald: 'text-expert-emerald', red: 'text-expert-red', amber: 'text-expert-amber',
  purple: 'text-expert-purple', orange: 'text-expert-orange', teal: 'text-expert-teal', pink: 'text-expert-pink',
};

const borderColors: Record<ExpertColor, string> = {
  blue: 'border-l-expert-blue', emerald: 'border-l-expert-emerald', red: 'border-l-expert-red', amber: 'border-l-expert-amber',
  purple: 'border-l-expert-purple', orange: 'border-l-expert-orange', teal: 'border-l-expert-teal', pink: 'border-l-expert-pink',
};

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

  const preview = message.content.slice(0, 60).replace(/\n/g, ' ');

  return (
    <div className={cn(
      'group animate-in fade-in slide-in-from-bottom-2 duration-500',
      isSummary && 'mt-8'
    )}>
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl p-3 border-l-2 transition-all text-left',
          isSummary
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-l-primary ring-1 ring-primary/20 cursor-pointer'
            : cn('bg-card hover:bg-card/80 cursor-pointer', borderColors[expert.color]),
          isOpen && !isSummary && 'rounded-b-none'
        )}
      >
        <ExpertAvatar expert={expert} active={message.isStreaming} />
        <div className="flex-1 min-w-0">
          <div className={cn(
            'font-display font-semibold text-sm flex items-center gap-1.5',
            isSummary ? 'text-primary' : nameColors[expert.color]
          )}>
            {expert.icon} {expert.nameKo}
            {isSummary && (
              <span className="text-[10px] font-normal bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-1">
                최종 정리
              </span>
            )}
            {message.round && !isSummary && (
              <span className="text-[10px] font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-1">
                {ROUND_LABELS[message.round]}
              </span>
            )}
            {message.isStreaming && (
              <span className="text-[10px] font-normal text-muted-foreground ml-1 animate-pulse">답변 중...</span>
            )}
          </div>
          {!isOpen && !message.isStreaming && message.content && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{preview}…</p>
          )}
          {!isOpen && message.isStreaming && (
            <p className="text-xs text-muted-foreground mt-0.5 animate-pulse">토론 진행 중...</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Like/Dislike counts shown in header */}
          {!message.isStreaming && message.content && !isSummary && (message.likes || message.dislikes) && (
            <div className="flex items-center gap-1.5 mr-1 text-[10px] text-muted-foreground">
              {(message.likes ?? 0) > 0 && <span className="flex items-center gap-0.5"><ThumbsUp className="w-3 h-3 text-expert-emerald" />{message.likes}</span>}
              {(message.dislikes ?? 0) > 0 && <span className="flex items-center gap-0.5"><ThumbsDown className="w-3 h-3 text-expert-red" />{message.dislikes}</span>}
            </div>
          )}
          {!message.isStreaming && message.content && !isSummary && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-expert-emerald" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {isOpen
            ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          }
        </div>
      </button>

      {/* Expandable Content */}
      {isOpen && (
        <div className={cn(
          'border-l-2 rounded-b-xl p-4 pt-2',
          isSummary
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-l-primary'
            : cn('bg-card', borderColors[expert.color])
        )}>
          {isSummary && !message.isStreaming && message.content && (
            <div className="flex justify-end mb-1">
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-expert-emerald" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="text-sm leading-relaxed text-foreground/85 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>

          {/* Interactive buttons */}
          {!message.isStreaming && message.content && !isSummary && (
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
              <button
                onClick={(e) => { e.stopPropagation(); onLike?.(message.id); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-expert-emerald transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
                <span>좋아요{(message.likes ?? 0) > 0 && ` ${message.likes}`}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDislike?.(message.id); }}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-expert-red transition-colors px-2 py-1 rounded-md hover:bg-secondary/50"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
                <span>별로에요{(message.dislikes ?? 0) > 0 && ` ${message.dislikes}`}</span>
              </button>
              {onRebuttal && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRebuttal(!showRebuttal); }}
                  className={cn(
                    "flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded-md",
                    showRebuttal ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-secondary/50"
                  )}
                >
                  <MessageSquareReply className="w-3.5 h-3.5" />
                  <span>반박하기</span>
                </button>
              )}
            </div>
          )}

          {/* Rebuttal input */}
          {showRebuttal && (
            <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                value={rebuttalText}
                onChange={(e) => setRebuttalText(e.target.value)}
                placeholder={`${expert.nameKo}에게 반박...`}
                className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rebuttalText.trim()) {
                    handleRebuttalSubmit(e as unknown as React.MouseEvent);
                  }
                }}
              />
              <button
                onClick={handleRebuttalSubmit}
                disabled={!rebuttalText.trim()}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-primary/80 transition-colors"
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
