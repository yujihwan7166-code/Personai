import { Expert } from '@/types/expert';
import { ExpertAvatar } from './ExpertAvatar';
import { cn } from '@/lib/utils';

interface Props {
  experts: Expert[];
  activeExpertId?: string;
}

const dotColors = {
  gpt: 'bg-expert-gpt',
  gemini: 'bg-expert-gemini',
  medical: 'bg-expert-medical',
  investment: 'bg-expert-investment',
};

export function ExpertPanel({ experts, activeExpertId }: Props) {
  return (
    <div className="flex gap-6 justify-center py-4">
      {experts.map((expert) => (
        <div
          key={expert.id}
          className={cn(
            'flex flex-col items-center gap-2 transition-all duration-300',
            activeExpertId === expert.id ? 'scale-110' : 'opacity-60'
          )}
        >
          <ExpertAvatar expert={expert} size="lg" active={activeExpertId === expert.id} />
          <span className="text-xs font-display text-muted-foreground">{expert.nameKo}</span>
          {activeExpertId === expert.id && (
            <div className={cn('w-2 h-2 rounded-full animate-pulse', dotColors[expert.color])} />
          )}
        </div>
      ))}
    </div>
  );
}
