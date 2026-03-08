import { useState } from 'react';
import { DiscussionMessage as DiscussionMessageType, Expert, ExpertColor, ROUND_LABELS } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
}

const nameColors: Record<ExpertColor, string> = {
  blue: 'text-expert-blue', emerald: 'text-expert-emerald', red: 'text-expert-red', amber: 'text-expert-amber',
  purple: 'text-expert-purple', orange: 'text-expert-orange', teal: 'text-expert-teal', pink: 'text-expert-pink',
};

const borderColors: Record<ExpertColor, string> = {
  blue: 'border-l-expert-blue', emerald: 'border-l-expert-emerald', red: 'border-l-expert-red', amber: 'border-l-expert-amber',
  purple: 'border-l-expert-purple', orange: 'border-l-expert-orange', teal: 'border-l-expert-teal', pink: 'border-l-expert-pink',
};

export function DiscussionMessageCard({ message, expert }: Props) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isSummary = message.isSummary;

  // Summary is always expanded, others collapsed by default
  const isOpen = isSummary || expanded;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Brief preview: first 40 chars
  const preview = message.content.slice(0, 60).replace(/\n/g, ' ');

  return (
    <div className={cn(
      'group animate-in fade-in slide-in-from-bottom-2 duration-500',
      isSummary && 'mt-8'
    )}>
      {/* Clickable Header */}
      <button
        type="button"
        onClick={() => !isSummary && setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl p-3 border-l-2 transition-all text-left',
          isSummary
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-l-primary ring-1 ring-primary/20 cursor-default'
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
          {!message.isStreaming && message.content && !isSummary && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {!isSummary && (
            isOpen
              ? <ChevronDown className="w-4 h-4 text-muted-foreground" />
              : <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
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
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
          <div className="text-sm leading-relaxed text-foreground/85 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {message.isStreaming && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
