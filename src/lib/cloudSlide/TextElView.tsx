/** 슬라이드 텍스트 요소 — contentEditable 박스 + 리사이즈/회전 핸들. */

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { SlideTextEl, ResizeDir } from './types';
import { ResizeHandles, RotateHandle } from './Handles';

interface TextElViewProps {
  el: SlideTextEl;
  selected: boolean;
  editing: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  onChange: (content: string) => void;
  onFinishEdit: () => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
  onStartRotate?: (e: React.PointerEvent) => void;
}

export function TextElView({
  el, selected, editing, onPointerDown, onClick, onDoubleClick, onChange, onFinishEdit, onStartResize, onStartRotate,
}: TextElViewProps) {
  const editableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && editableRef.current) {
      editableRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editableRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [editing]);

  // 외부에서 content 가 바뀌었는데 contentEditable 안 갱신되는 문제 해결 (undo/redo/AI 응답 등).
  // 편집 중이면 사용자 입력 보호 — 갱신 안 함.
  useEffect(() => {
    if (editing) return;
    const node = editableRef.current;
    if (!node) return;
    if (node.innerText !== el.content) {
      node.innerText = el.content;
    }
  }, [el.content, editing]);

  return (
    <div
      onPointerDown={editing ? undefined : onPointerDown}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'absolute group',
        editing ? 'cursor-text' : 'cursor-move',
        'rounded-sm',
        selected && !editing && 'outline outline-2 -outline-offset-1 outline-foreground/70',
        !selected && 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-foreground/30',
      )}
      style={{
        left: `${el.xPct}%`,
        top: `${el.yPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        padding: '4px 8px',
        backgroundColor: el.bgColor,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
    >
      <div
        ref={editableRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerText ?? '')}
        onBlur={onFinishEdit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onFinishEdit();
          }
        }}
        onPaste={(e) => {
          // 스타일 포함 HTML 붙여넣기 방지 — 항상 plain text 로
          e.preventDefault();
          const text = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
        }}
        className={cn(
          'w-full h-full outline-none break-words overflow-hidden',
          el.bold && 'font-semibold',
          el.italic && 'italic',
          el.underline && 'underline underline-offset-2',
        )}
        style={{
          fontSize: `${el.fontSizeRem}rem`,
          lineHeight: el.lineHeight ?? 1.25,
          color: el.textColor ?? 'rgba(0,0,0,0.8)',
          textAlign: el.align ?? 'left',
          whiteSpace: 'pre-wrap',
        }}
      >
        {el.content}
      </div>
      {selected && !editing && <ResizeHandles onStart={onStartResize} />}
      {selected && !editing && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
