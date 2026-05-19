/** 선택 영역 위 floating ✨ 버튼 (BubbleMenu) + 클릭 시 AiInlineMenu.
 *  Q1 D — 텍스트 선택 시 떠오르는 ✨.
 */

import { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiInlineMenu } from './AiInlineMenu';
import type { useDocAi } from './useDocAi';

interface AiBubbleMenuProps {
  editor: Editor;
  ai: ReturnType<typeof useDocAi>;
}

export function AiBubbleMenu({ editor, ai }: AiBubbleMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state }) => {
        // 선택이 있을 때만 표시 (빈 선택 X)
        const { from, to } = state.selection;
        return from !== to;
      }}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          disabled={ai.busy}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded-md shadow-md border border-violet-300 dark:border-violet-700',
            'bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300',
            'hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors',
            ai.busy && 'opacity-60 cursor-not-allowed',
            open && 'bg-violet-100 dark:bg-violet-900',
          )}
          title="AI 에게 부탁 — 요약 / 재작성 / 번역 / 톤 변경 등"
          aria-pressed={open}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-xs font-medium">AI</span>
        </button>
        <AiInlineMenu
          open={open}
          onClose={() => setOpen(false)}
          onSubmitPrompt={(p) => {
            setOpen(false);
            void ai.submitPrompt(p);
          }}
          onRunAction={(action, subId) => {
            setOpen(false);
            void ai.runAction(action, subId);
          }}
          busy={ai.busy}
          selectionSummary={`선택 ${
            editor.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to,
              '\n',
            ).length
          }자`}
          className="top-full left-0 mt-1"
        />
      </div>
    </BubbleMenu>
  );
}
