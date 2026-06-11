/**
 * Rail "다가오는 일정" 클릭 → 플로팅 팝오버로 TickTick 식 아젠다 표시.
 */
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PlannerAgendaMini } from './PlannerAgendaMini';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { useBackdropDismiss } from '@/hooks/useBackdropDismiss';

interface PlannerAgendaPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemClick?: (item: { id: string; title: string }) => void;
}

export const PlannerAgendaPopover = ({ open, onOpenChange, onItemClick }: PlannerAgendaPopoverProps) => {
  useScrollLock(open);
  const titleId = useId();
  const descId = useId();
  const trapRef = useFocusTrap<HTMLDivElement>(open);
  const backdropHandlers = useBackdropDismiss<HTMLDivElement>(() => onOpenChange(false));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={trapRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      {...backdropHandlers}
    >
      <div
        className="bg-card border border-foreground/20 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 'min(94vw, 760px)', maxHeight: '85vh' }}
      >
        <p id={descId} className="sr-only">
          다가오는 일정과 할 일을 날짜별로 확인하고 선택할 수 있습니다.
        </p>
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-12 border-b border-foreground/20">
          <div className="min-w-0 flex items-baseline gap-2">
            <span id={titleId} className="text-[16px] font-bold tracking-tight text-foreground">
              다가오는 일정
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="다가오는 일정 닫기"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <PlannerAgendaMini
            large
            onItemClick={(it) => {
              onItemClick?.(it);
              onOpenChange(false);
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
