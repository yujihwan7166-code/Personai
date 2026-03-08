import { useState } from 'react';
import { DiscussionMode, DISCUSSION_MODE_LABELS } from '@/types/expert';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface Props {
  mode: DiscussionMode;
  onChange: (mode: DiscussionMode) => void;
  disabled?: boolean;
}

const modes: DiscussionMode[] = ['conclusion', 'standard', 'procon', 'freeform', 'endless'];

export function DiscussionModeSelector({ mode, onChange, disabled }: Props) {
  const [expandedMode, setExpandedMode] = useState<DiscussionMode | null>(null);

  const handleClick = (m: DiscussionMode) => {
    if (disabled) return;
    if (mode === m) {
      // Toggle detail if already selected
      setExpandedMode(prev => (prev === m ? null : m));
    } else {
      onChange(m);
      setExpandedMode(m);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 justify-center">
        {modes.map(m => {
          const { label, icon, description } = DISCUSSION_MODE_LABELS[m];
          const isActive = mode === m;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(m)}
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
              {isActive && (
                <ChevronDown className={cn(
                  'w-3 h-3 transition-transform ml-1',
                  expandedMode === m && 'rotate-180'
                )} />
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded detail */}
      {expandedMode && (
        <div className="mx-auto max-w-lg rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-foreground/80 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base">{DISCUSSION_MODE_LABELS[expandedMode].icon}</span>
            <span className="font-display font-semibold text-sm text-foreground">{DISCUSSION_MODE_LABELS[expandedMode].label}</span>
          </div>
          <p className="leading-relaxed">{DISCUSSION_MODE_LABELS[expandedMode].detail}</p>
        </div>
      )}
    </div>
  );
}
