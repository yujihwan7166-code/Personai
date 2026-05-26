import type { ReactNode } from 'react';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PAGE_AI_TONE_ICON, type PageAiTone } from '@/components/PageAiTokens';

interface PageAiPanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconTone?: PageAiTone;
  iconClassName?: string;
  onClose: () => void;
  actions?: ReactNode;
  className?: string;
}

export function PageAiPanelHeader({
  title,
  subtitle,
  icon,
  iconTone,
  iconClassName,
  onClose,
  actions,
  className,
}: PageAiPanelHeaderProps) {
  return (
    <header
      data-page-ai-header
      className={cn(
        'shrink-0 border-b border-[hsl(var(--hairline))] bg-card/70 px-3.5 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur',
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          data-page-ai-header-icon
          className={cn(
            'mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            iconTone ? PAGE_AI_TONE_ICON[iconTone] : 'bg-primary/10 text-primary',
            iconClassName,
          )}
        >
          {icon ?? <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[13.5px] font-semibold leading-5 text-foreground">
            {title}
          </h2>
          {subtitle && (
            <p className="truncate text-[11.5px] leading-4 text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          <button
            type="button"
            onClick={onClose}
            aria-label="AI 패널 닫기"
            title="닫기"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
