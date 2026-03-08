import { DiscussionMode, MainMode, DebateSubMode, MAIN_MODE_LABELS, DEBATE_SUB_MODE_LABELS, getMainMode } from '@/types/expert';
import { cn } from '@/lib/utils';

interface Props {
  mode: DiscussionMode;
  onChange: (mode: DiscussionMode) => void;
  disabled?: boolean;
}

const mainModes: MainMode[] = ['general', 'multi', 'debate'];
const debateSubModes: DebateSubMode[] = ['standard', 'procon', 'creative', 'endless'];

export function DiscussionModeSelector({ mode, onChange, disabled }: Props) {
  const mainMode = getMainMode(mode);

  const handleMainChange = (m: MainMode) => {
    if (m === 'general') onChange('general');
    else if (m === 'multi') onChange('multi');
    else onChange('standard');
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {mainModes.map(m => {
          const info = MAIN_MODE_LABELS[m];
          const isActive = mainMode === m;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => handleMainChange(m)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                isActive
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                  : 'border-border bg-card hover:bg-secondary/50 text-muted-foreground hover:text-foreground',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span className="text-base">{info.icon}</span>
              <div className="text-left">
                <div className="font-display font-semibold text-xs">{info.label}</div>
                <div className="text-[10px] opacity-70">{info.description}</div>
              </div>
            </button>
          );
        })}
      </div>
      {mainMode === 'debate' && (
        <div className="flex flex-wrap gap-1.5 justify-center">
          {debateSubModes.map(sub => {
            const info = DEBATE_SUB_MODE_LABELS[sub];
            const isActive = mode === sub;
            return (
              <button
                key={sub}
                type="button"
                disabled={disabled}
                onClick={() => onChange(sub)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all border',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : 'bg-muted/50 text-muted-foreground border-transparent hover:text-foreground',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span>{info.icon}</span>
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
