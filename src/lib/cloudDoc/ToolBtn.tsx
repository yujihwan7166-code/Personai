/** 문서 도구바 공용 — 작은 아이콘 버튼 + 구분선. */

import React from 'react';
import type { Editor } from '@tiptap/react';
import { cn } from '@/lib/utils';

export interface ToolBtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
  /** 있으면 명령 직후 editor.view.focus() 강제 호출 — dom selection 시각 복원용. */
  editor?: Editor;
}

export function ToolBtn({ onClick, active, disabled, title, children, editor }: ToolBtnProps) {
  return (
    <button
      type="button"
      // mousedown 의 기본 동작(button focus 이동)을 막아 contenteditable 의 dom selection 유지.
      // 명령은 mousedown 시점에 즉시 실행 — mouseup ~ click 사이 selection 풀림 회피.
      // 명령 직후 editor.view.focus() 를 호출해서, 일부 브라우저가 dom selection 을
      // 흐리게 보여주는 경우(=editor 가 잠시 focus 잃은 경우) 다시 진하게 복원.
      onMouseDown={(e) => {
        e.preventDefault();
        if (disabled) return;
        onClick();
        if (editor) {
          // 마이크로태스크로 미뤄서 명령 dispatch 후 dom 상태가 안정되면 강제 focus
          queueMicrotask(() => editor.view.focus());
        }
      }}
      onClick={(e) => { e.preventDefault(); }}
      tabIndex={-1}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'p-1.5 rounded transition-colors',
        disabled
          ? 'opacity-30 cursor-not-allowed'
          : 'hover:bg-muted',
        active && !disabled && 'bg-muted text-foreground',
      )}
    >
      {children}
    </button>
  );
}

export function Sep() {
  return <div className="w-px h-5 bg-border mx-1 shrink-0" />;
}
