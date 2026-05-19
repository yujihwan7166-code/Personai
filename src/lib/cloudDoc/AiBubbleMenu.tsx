/** 선택 영역 위 floating ✨ 버튼 (BubbleMenu) + 클릭 시 그 아래로 AiInlineMenu.
 *  Q1 D — 텍스트 선택 시 떠오르는 ✨.
 *
 *  BubbleMenu 안에는 ✨AI 버튼만 — 메뉴 크기 영향 없이 selection 위 작은 칩으로만.
 *  클릭하면 메뉴는 그 버튼의 화면 좌표 기준 fixed 로 바로 아래에 펼침.
 */

import { useEffect, useRef, useState } from 'react';
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

const MENU_GAP_PX = 4;

export function AiBubbleMenu({ editor, ai }: AiBubbleMenuProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  // 메뉴 열림 시 ✨AI 버튼 좌표 계산 → fixed 위치 결정
  useEffect(() => {
    if (!open) { setMenuPos(null); return; }
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + MENU_GAP_PX, left: rect.left });
  }, [open]);

  // 선택이 사라지면 패널도 자동 닫기 (BubbleMenu 의 ✨ 는 사라지지만 fixed 메뉴는 잔존하지 않게)
  useEffect(() => {
    if (!open) return;
    const onUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) setOpen(false);
    };
    editor.on('selectionUpdate', onUpdate);
    return () => { editor.off('selectionUpdate', onUpdate); };
  }, [open, editor]);

  const selectedLen = editor.state.doc.textBetween(
    editor.state.selection.from,
    editor.state.selection.to,
    '\n',
  ).length;

  return (
    <>
      <BubbleMenu
        editor={editor}
        shouldShow={({ state }) => {
          // 선택이 있을 때만 표시 (빈 선택 X)
          const { from, to } = state.selection;
          return from !== to;
        }}
      >
        <button
          ref={buttonRef}
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
      </BubbleMenu>

      {/* 메뉴는 BubbleMenu 밖에서 fixed 로 — BubbleMenu 의 floating 알고리즘이 메뉴 크기를
          고려해 selection 위로 띄우는 동작을 피하기 위함. */}
      {open && menuPos && (
        <div
          className="fixed z-[55]"
          style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
        >
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
            selectionSummary={`선택 ${selectedLen}자`}
            className="top-0 left-0"
          />
        </div>
      )}
    </>
  );
}
