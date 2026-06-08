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
  leading?: ReactNode;
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
  leading,
  actions,
  className,
}: PageAiPanelHeaderProps) {
  return (
    <header
      data-page-ai-header
      className={cn(
        'shrink-0 border-b border-[hsl(var(--hairline))] bg-background px-3 py-2 pt-[calc(0.5rem+env(safe-area-inset-top))]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {leading ? (
          <div className="min-w-0 flex-1">{leading}</div>
        ) : (
          <>
            <span
              data-page-ai-header-icon
              className={cn(
                'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
                iconTone ? PAGE_AI_TONE_ICON[iconTone] : 'bg-primary/10 text-primary',
                iconClassName,
              )}
            >
              {icon ?? <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[13px] font-semibold leading-[18px] text-foreground">
                <span>{title}</span>
                {subtitle && (
                  <span className="font-medium text-muted-foreground">
                    {' · '}
                    {subtitle}
                  </span>
                )}
              </h2>
            </div>
          </>
        )}
        <div className="flex shrink-0 items-center gap-0.5">
          {actions}
          <button
            type="button"
            onClick={onClose}
            aria-label="보조 도구 닫기"
            title="닫기"
            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
