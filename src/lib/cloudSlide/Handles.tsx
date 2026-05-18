/**
 * 슬라이드 요소 (TextEl/ShapeEl/ImageEl) 공용 — 리사이즈 핸들 8개 + 회전 핸들.
 * 선택된 요소 위에 absolute 로 표시.
 */

import React from 'react';
import type { ResizeDir } from './types';

const HANDLES: Array<{ dir: ResizeDir; style: React.CSSProperties; cursor: string }> = [
  { dir: 'nw', style: { left: -5, top: -5 },                                              cursor: 'nwse-resize' },
  { dir: 'n',  style: { left: '50%', top: -5, transform: 'translateX(-50%)' },           cursor: 'ns-resize'   },
  { dir: 'ne', style: { right: -5, top: -5 },                                             cursor: 'nesw-resize' },
  { dir: 'e',  style: { right: -5, top: '50%', transform: 'translateY(-50%)' },          cursor: 'ew-resize'   },
  { dir: 'se', style: { right: -5, bottom: -5 },                                          cursor: 'nwse-resize' },
  { dir: 's',  style: { left: '50%', bottom: -5, transform: 'translateX(-50%)' },        cursor: 'ns-resize'   },
  { dir: 'sw', style: { left: -5, bottom: -5 },                                           cursor: 'nesw-resize' },
  { dir: 'w',  style: { left: -5, top: '50%', transform: 'translateY(-50%)' },           cursor: 'ew-resize'   },
];

export function ResizeHandles({ onStart }: { onStart: (e: React.PointerEvent, dir: ResizeDir) => void }) {
  return (
    <>
      {HANDLES.map(({ dir, style, cursor }) => (
        <div
          key={dir}
          onPointerDown={(e) => onStart(e, dir)}
          onClick={(e) => e.stopPropagation()}
          className="absolute w-2.5 h-2.5 bg-white border border-foreground/80 rounded-sm hover:bg-foreground/10"
          style={{ ...style, cursor }}
          aria-label={`리사이즈 ${dir}`}
        />
      ))}
    </>
  );
}

export function RotateHandle({ onStart }: { onStart: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onStart}
      onClick={(e) => e.stopPropagation()}
      className="absolute left-1/2 -top-6 -translate-x-1/2 w-3 h-3 rounded-full bg-white border border-foreground/80 hover:bg-foreground/10 cursor-grab"
      style={{ touchAction: 'none' }}
      aria-label="회전"
      title="드래그해서 회전 (Shift = 15도 snap)"
    >
      <span
        aria-hidden
        className="block absolute left-1/2 top-3 -translate-x-1/2 w-px h-3 bg-foreground/40"
      />
    </div>
  );
}
