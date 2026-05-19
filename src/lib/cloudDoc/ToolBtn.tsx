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
      onClick={onClick}
      // mousedown 의 기본 동작(blur)을 막아 ProseMirror 의 selection 시각 표시를 유지.
      // 이게 없으면 버튼 클릭 시 editor 가 blur → 선택 영역 시각이 사라지고
      // 명령 실행 후 scrollIntoView 가 발동해 화면이 점프함.
      onMouseDown={(e) => e.preventDefault()}
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
