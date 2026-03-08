import { DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { cn } from '@/lib/utils';

interface Props {
  mode: DiscussionMode;
  onChange: (mode: DiscussionMode) => void;
  disabled?: boolean;
}

const modes: DiscussionMode[] = ['conclusion', 'standard', 'procon', 'freeform', 'endless'];

export function DiscussionModeSelector({ mode, onChange, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {modes.map(m => {
        const { label, icon, description } = DISCUSSION_MODE_LABELS[m];
        const isActive = mode === m;
        return (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => onChange(m)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
              isActive
                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'border-border bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="text-base">{icon}</span>
            <div className="text-left">
              <div className="font-display font-semibold text-xs">{label}</div>
              <div className="text-[10px] opacity-70">{description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
