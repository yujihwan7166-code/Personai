/**
 * Rail "매트릭스" 클릭 → 플로팅 팝오버로 미니 매트릭스 표시.
 *
 * shadcn Dialog max-w 충돌 회피 위해 createPortal 직접 구성.
 * ESC/외부클릭으로 닫힘. 폭 480px 고정.
 */
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { PlannerMatrixMini } from './PlannerMatrixMini';

interface PlannerMatrixPopoverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskClick?: (task: { id: string; title: string }) => void;
}

export const PlannerMatrixPopover = ({ open, onOpenChange, onTaskClick }: PlannerMatrixPopoverProps) => {
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
      role="dialog"
      aria-modal="true"
      aria-label="아이젠하워 매트릭스"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="bg-card border border-foreground/20 rounded-xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 'min(94vw, 880px)', maxHeight: '85vh' }}
      >
        <div className="shrink-0 flex items-center justify-between gap-3 px-5 h-12 border-b border-foreground/20">
          <div className="min-w-0 flex items-baseline gap-2">
            <span className="text-[16px] font-bold tracking-tight text-foreground">
              아이젠하워 매트릭스
            </span>
            <span className="text-[12px] text-foreground/55">
              긴급도 × 중요도
            </span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="닫기"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto p-5">
          <PlannerMatrixMini
            large
            onTaskClick={(t) => {
              onTaskClick?.(t);
              onOpenChange(false);
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
