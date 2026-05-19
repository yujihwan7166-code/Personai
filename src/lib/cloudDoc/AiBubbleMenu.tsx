/** 선택 영역 위 floating ✨ 버튼 (BubbleMenu) + 클릭 시 AiInlineMenu.
 *  Q1 D — 텍스트 선택 시 떠오르는 ✨.
 *
 *  메뉴는 본문을 가리지 않도록 화면 우측 고정 패널로 표시.
 *  AI 사이드바가 열려 있으면 그 안쪽(왼쪽)으로 자동 시프트.
 */

import { useEffect, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AiInlineMenu } from './AiInlineMenu';
import type { useDocAi } from './useDocAi';

interface AiBubbleMenuProps {
  editor: Editor;
  ai: ReturnType<typeof useDocAi>;
  /** AI 사이드바 열림 여부 — 패널 우측 위치 자동 시프트용. */
  aiSidebarOpen?: boolean;
}

// AI 사이드바 width (lg:w-80 = 320px) + gap 16px.
const SIDEBAR_OFFSET_PX = 336;
const DEFAULT_RIGHT_PX = 16;
const PANEL_TOP_PX = 80;

export function AiBubbleMenu({ editor, ai, aiSidebarOpen }: AiBubbleMenuProps) {
  const [open, setOpen] = useState(false);

  // 선택이 사라지면 패널도 자동 닫기 (BubbleMenu 의 ✨ 버튼은 사라지지만 패널은 fixed 라 잔존)
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

      {/* 우측 고정 패널 — 본문을 가리지 않음. AiInlineMenu 내부 outer div 가 absolute 라
          wrapper(fixed) 좌상단을 기준으로 자기 width 만큼만 차지. */}
      {open && (
        <div
          className="fixed z-[55]"
          style={{
            top: `${PANEL_TOP_PX}px`,
            right: `${aiSidebarOpen ? SIDEBAR_OFFSET_PX : DEFAULT_RIGHT_PX}px`,
          }}
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
