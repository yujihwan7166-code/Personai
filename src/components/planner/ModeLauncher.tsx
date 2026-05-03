/**
 * 모드 런처 — 좌측 rail 의 2×2 버튼 클릭 시 뜨는 플로팅 홈 화면.
 *
 * shadcn Dialog 의 max-w 충돌 회피 위해 직접 overlay 구성.
 * 홈 페이지(Index) 자체가 거대 stateful 이라 iframe 으로 "/" 임베드.
 * (동일 출처 — auth/cookie 그대로 넘어감.)
 */
import { useEffect } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { PlannerView } from './ViewToggle';

interface ModeLauncherProps {
  open: boolean;
  /** 외부 호환용 — 현재 미사용. */
  view?: PlannerView;
  onOpenChange: (open: boolean) => void;
  /** 외부 호환용 — 현재 미사용. */
  onViewChange?: (view: PlannerView) => void;
}

export const ModeLauncher = ({ open, onOpenChange }: ModeLauncherProps) => {
  // ESC 로 닫기 + body 스크롤 잠금.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="홈 — 도구 런처"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="bg-background border border-[hsl(var(--hairline))] rounded-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ width: 'min(96vw, 1280px)', height: '90vh' }}
      >
        {/* 헤더 — 새 탭 열기 + 닫기 */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-3 h-10 border-b border-[hsl(var(--hairline))] bg-card/60">
          <span className="text-[12px] font-mono uppercase tracking-[0.14em] text-foreground/55 font-semibold">
            홈 · 도구 런처
          </span>
          <div className="flex items-center gap-1">
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              aria-label="새 탭에서 열기"
              title="새 탭에서 열기"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="닫기"
              title="닫기 (ESC)"
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-foreground/65 hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 홈 화면 임베드 */}
        <div className="flex-1 min-h-0 bg-background">
          <iframe
            src="/"
            title="홈"
            className="w-full h-full border-0 block"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
};
