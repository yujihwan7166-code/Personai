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
