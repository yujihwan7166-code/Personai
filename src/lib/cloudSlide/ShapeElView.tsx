/** 슬라이드 도형 요소 — ShapeRender 감싸는 카드 + 리사이즈/회전 핸들. */

import React from 'react';
import { cn } from '@/lib/utils';
import type { SlideShapeEl, ResizeDir } from './types';
import { ShapeRender } from './ShapeRender';
import { ResizeHandles, RotateHandle } from './Handles';

interface ShapeElViewProps {
  el: SlideShapeEl;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
  onStartRotate?: (e: React.PointerEvent) => void;
}

export function ShapeElView({
  el, selected, onPointerDown, onClick, onContextMenu, onStartResize, onStartRotate,
}: ShapeElViewProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={cn(
        'absolute cursor-move',
        selected && 'outline outline-2 -outline-offset-1 outline-foreground/70',
        !selected && 'hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-foreground/30',
      )}
      style={{
        left: `${el.xPct}%`,
        top: `${el.yPct}%`,
        width: `${el.wPct}%`,
        height: `${el.hPct}%`,
        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
        transformOrigin: 'center center',
      }}
      title={el.hyperlink}
    >
      <ShapeRender el={el} />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
