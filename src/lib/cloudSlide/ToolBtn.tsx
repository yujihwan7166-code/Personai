/** 슬라이드 에디터 도구 버튼 (active/disabled/destructive) + 구분선. */

import React from 'react';
import { cn } from '@/lib/utils';

interface ToolBtnProps {
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
}

export function ToolBtn({ onClick, disabled, destructive, active, title, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'px-2 py-1 rounded flex items-center transition-colors',
        disabled ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted',
        destructive && !disabled && 'text-destructive hover:bg-destructive/10',
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
