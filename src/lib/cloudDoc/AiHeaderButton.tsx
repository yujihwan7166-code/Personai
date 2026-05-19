/** 헤더 ✨ 버튼 — 클릭 시 AiInlineMenu popover.
 *  기존 AiActionsButton 대체 (드롭다운 → 메뉴 popover).
 *  busy 상태 표시 + 메뉴 토글.
 */

import { Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiInlineMenu } from './AiInlineMenu';
import type { useDocAi } from './useDocAi';

interface AiHeaderButtonProps {
  ai: ReturnType<typeof useDocAi>;
}

export function AiHeaderButton({ ai }: AiHeaderButtonProps) {
  const isOpen = ai.menuOpen === 'header';
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (isOpen ? ai.closeMenu() : ai.openMenu('header'))}
        disabled={ai.busy}
        className={cn(
          'flex items-center gap-1 px-2 py-1.5 rounded transition-colors',
          ai.busy ? 'opacity-60 cursor-not-allowed' : 'hover:bg-muted',
          isOpen && 'bg-muted',
        )}
        title="✨ AI"
        aria-pressed={isOpen}
      >
        {ai.busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-violet-500" />
        )}
        <span className="text-xs">{ai.busy ? '생성 중…' : 'AI'}</span>
      </button>

      <AiInlineMenu
        open={isOpen}
        onClose={ai.closeMenu}
        onSubmitPrompt={ai.submitPrompt}
        onRunAction={ai.runAction}
        busy={ai.busy}
        className="top-full right-0 mt-1"
      />
    </div>
  );
}
