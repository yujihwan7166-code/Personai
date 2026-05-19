/** 문서 도구바 공용 — 작은 아이콘 버튼 + 구분선. */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ToolBtnProps {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}

export function ToolBtn({ onClick, active, disabled, title, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      // mousedown 의 기본 동작(blur 시키기)을 막아 ProseMirror selection 유지.
      // 일부 브라우저는 mousedown preventDefault 만으로는 mouseup 사이 button focus 가
      // 잠시 들어가 dom selection 이 풀리므로 명령을 mousedown 안에서 즉시 실행.
      onMouseDown={(e) => {
        e.preventDefault();
        if (!disabled) onClick();
      }}
      // 키보드 접근성 — Enter/Space 로도 동작.
      onClick={(e) => { e.preventDefault(); }}
      // button 이 focusable 이 되지 않도록 — Tab 으로도, 클릭으로도.
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
