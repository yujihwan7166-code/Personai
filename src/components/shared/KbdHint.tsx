/**
 * 키보드 단축키 시각 표시 컴포넌트 — 재사용.
 *
 * 메뉴·툴팁·도움말에서 일관된 모양으로 단축키 표시.
 * 자동으로 ⌘ vs Ctrl, ⇧ vs Shift 등 운영체제 친화 기호.
 *
 * 사용:
 *   <KbdHint keys={['Ctrl', 'S']} />            → ⌘+S (mac) / Ctrl+S (other)
 *   <KbdHint keys={['Ctrl', 'Shift', 'P']} />   → ⌘+⇧+P
 *   <KbdHint keys={'?'} />                      → ?
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  /** 단일 키 문자열 또는 키 조합 배열. */
  keys: string | string[];
  /** 시각 톤 — 'subtle' (기본, 흐릿) / 'solid' (또렷). */
  variant?: 'subtle' | 'solid';
  className?: string;
}

/** 운영체제별 modifier 기호. mac 면 ⌘, ⌥ 사용. */
function modifierSymbol(key: string, isMac: boolean): string {
  if (key === 'Cmd' || key === 'cmd' || key === 'Mod' || key === 'mod' || key === 'Ctrl' || key === 'ctrl') {
    return isMac ? '⌘' : 'Ctrl';
  }
  if (key === 'Shift' || key === 'shift') return isMac ? '⇧' : 'Shift';
  if (key === 'Alt' || key === 'alt' || key === 'Option' || key === 'option') return isMac ? '⌥' : 'Alt';
  if (key === 'Enter' || key === 'enter') return '⏎';
  if (key === 'Esc' || key === 'esc' || key === 'Escape' || key === 'escape') return 'Esc';
  return key;
}

export function KbdHint({ keys, variant = 'subtle', className }: Props) {
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  const arr = Array.isArray(keys) ? keys : [keys];
  const labels = arr.map((k) => modifierSymbol(k, isMac));

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono select-none',
        variant === 'subtle'
          ? 'text-[10px] text-muted-foreground/80'
          : 'text-[11px] text-foreground',
        className,
      )}
      aria-label={`단축키 ${arr.join('+')}`}
    >
      {labels.map((label, i) => (
        <span key={i} className="contents">
          {i > 0 && <span className="text-muted-foreground/50 mx-px">+</span>}
          <kbd
            className={cn(
              'inline-flex items-center justify-center min-w-[16px] px-1 py-px rounded border',
              variant === 'subtle'
                ? 'border-border/60 bg-muted/40'
                : 'border-border bg-muted',
            )}
          >
            {label}
          </kbd>
        </span>
      ))}
    </span>
  );
}
