/** 셀 테두리 스타일 타입 + React.CSSProperties 생성. */

import type React from 'react';

export type BorderStyle = 'all' | 'outer' | 'top' | 'bottom' | 'left' | 'right';

export function borderStyleFor(b: BorderStyle | undefined): React.CSSProperties {
  if (!b) return {};
  const line = '1.5px solid hsl(var(--foreground))';
  switch (b) {
    case 'all':    return { boxShadow: `inset 0 0 0 1.5px hsl(var(--foreground))` };
    case 'outer':  return { boxShadow: `inset 0 0 0 1.5px hsl(var(--foreground))` };
    case 'top':    return { borderTop: line };
    case 'bottom': return { borderBottom: line };
    case 'left':   return { borderLeft: line };
    case 'right':  return { borderRight: line };
    default:       return {};
  }
}
