import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  PAGE_AI_LAUNCHER_POSITION_CLASS,
  PAGE_AI_LAUNCHER_SIZE_CLASS,
} from '@/components/PageAiTokens';

interface PageAiLauncherProps {
  label: string;
  title?: string;
  hidden?: boolean;
  onClick: () => void;
  className?: string;
}

export function PageAiLauncher({
  label,
  title,
  hidden = false,
  onClick,
  className,
}: PageAiLauncherProps) {
  if (hidden) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      data-page-ai-launcher="true"
      className={cn(
        PAGE_AI_LAUNCHER_POSITION_CLASS,
        PAGE_AI_LAUNCHER_SIZE_CLASS,
        'rounded-lg border border-[hsl(var(--hairline))] bg-card/90 p-0 shadow-sm backdrop-blur',
        'inline-flex items-center justify-center gap-1.5 text-[12px] font-semibold text-muted-foreground transition-colors',
        'hover:border-primary/35 hover:bg-card hover:text-primary',
        className,
      )}
      title={title ?? label}
      aria-label={`${label} 열기`}
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
