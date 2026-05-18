/**
 * Tag — 입력 가능 라벨 (X 버튼 옵션).
 *
 * Multi-select / 키워드 입력. 클릭/제거 콜백.
 */

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
}

export function Tag({ label, onRemove, onClick, className }: Props) {
  const interactive = Boolean(onClick);
  return (
    <span
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } } : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium',
        interactive && 'cursor-pointer hover:bg-muted',
        className,
      )}
    >
      <span>{label}</span>
      {onRemove && (
        <button
          type="button"
          aria-label={`${label} 제거`}
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="rounded-sm p-[1px] hover:bg-border"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
