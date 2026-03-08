import { DiscussionMessage as DiscussionMessageType, Expert } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';

interface Props {
  message: DiscussionMessageType;
  expert: Expert;
}

const nameBorderColors = {
  gpt: 'text-expert-gpt',
  gemini: 'text-expert-gemini',
  medical: 'text-expert-medical',
  investment: 'text-expert-investment',
};

const borderLeftColors = {
  gpt: 'border-l-expert-gpt',
  gemini: 'border-l-expert-gemini',
  medical: 'border-l-expert-medical',
  investment: 'border-l-expert-investment',
};

export function DiscussionMessageCard({ message, expert }: Props) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ExpertAvatar expert={expert} active={message.isStreaming} />
      <div
        className={cn(
          'flex-1 bg-card rounded-lg p-4 border-l-2',
          borderLeftColors[expert.color]
        )}
      >
        <div className={cn('font-display font-semibold text-sm mb-1', nameBorderColors[expert.color])}>
          {expert.icon} {expert.nameKo}
        </div>
        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-primary ml-0.5 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  );
}
