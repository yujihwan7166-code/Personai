/**
 * 위젯 공통 프레임 — 제목, 삭제 버튼, 호버 시 액션 표시.
 */
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetFrameProps {
  children: React.ReactNode;
  onRemove?: () => void;
  className?: string;
  /** 제목 영역 right slot (선택적 설정 버튼 등) */
  rightSlot?: React.ReactNode;
  title?: string;
}

export function WidgetFrame({ children, onRemove, className, rightSlot, title }: WidgetFrameProps) {
  return (
    <div className={cn(
      'group relative rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--card))]',
      'transition-colors hover:border-[hsl(var(--border))]',
      'overflow-hidden',
      className,
    )}>
      {title && (
        <div className="flex items-center justify-between px-2 pt-1.5 pb-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground truncate">
            {title}
          </span>
          {rightSlot}
        </div>
      )}
      <div className={cn(title ? 'px-2 pb-2' : 'p-2')}>{children}</div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="위젯 삭제"
          className={cn(
            'absolute top-1 right-1 h-4 w-4 rounded-full',
            'bg-[hsl(var(--muted))] text-muted-foreground',
            'opacity-0 group-hover:opacity-100 transition-opacity',
            'flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground',
          )}
        >
          <X className="h-2.5 w-2.5" />
        </button>
      )}
    </div>
  );
}
