import { DiscussionMessage as DiscussionMessageType, Expert, ExpertColor } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
}

const nameColors: Record<ExpertColor, string> = {
  blue: 'text-expert-blue',
  emerald: 'text-expert-emerald',
  red: 'text-expert-red',
  amber: 'text-expert-amber',
  purple: 'text-expert-purple',
  orange: 'text-expert-orange',
  teal: 'text-expert-teal',
  pink: 'text-expert-pink',
};

const borderColors: Record<ExpertColor, string> = {
  blue: 'border-l-expert-blue',
  emerald: 'border-l-expert-emerald',
  red: 'border-l-expert-red',
  amber: 'border-l-expert-amber',
  purple: 'border-l-expert-purple',
  orange: 'border-l-expert-orange',
  teal: 'border-l-expert-teal',
  pink: 'border-l-expert-pink',
};

export function DiscussionMessageCard({ message, expert }: Props) {
  const [copied, setCopied] = useState(false);
  const isSummary = message.isSummary;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn(
      'group flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500',
      isSummary && 'mt-8'
    )}>
      <div className="flex flex-col items-center gap-1 pt-1">
        <ExpertAvatar expert={expert} active={message.isStreaming} />
      </div>
      <div className={cn(
        'flex-1 rounded-xl p-4 border-l-2 relative',
        isSummary
          ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-l-primary ring-1 ring-primary/20'
          : cn('bg-card', borderColors[expert.color])
      )}>
        <div className="flex items-center justify-between mb-2">
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
          </div>
          {!message.isStreaming && message.content && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
        <div className="text-sm leading-relaxed text-foreground/85 prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-headings:text-foreground prose-headings:font-display prose-strong:text-foreground">
          <ReactMarkdown>{message.content}</ReactMarkdown>
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>
      </div>
    </div>
  );
}
