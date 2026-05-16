/**
 * AI 사이드바 토글 버튼 — 4개 화면 헤더 우측에 동일하게 배치.
 */

import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiSidebarToggleProps {
  open: boolean;
  onClick: () => void;
}

export function AiSidebarToggle({ open, onClick }: AiSidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-2 rounded transition-colors flex items-center gap-1.5',
        open
          ? 'bg-violet-500 text-white hover:bg-violet-600'
          : 'hover:bg-muted text-violet-500',
      )}
      aria-pressed={open}
      aria-label="AI 어시스턴트"
      title="AI 어시스턴트"
    >
      <Sparkles className="w-4 h-4" />
      <span className="text-xs font-medium hidden sm:inline">AI</span>
    </button>
  );
}
