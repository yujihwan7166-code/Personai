/** 슬라이드 이미지 요소 — 선택/리사이즈/회전 핸들. */

import React from 'react';
import { cn } from '@/lib/utils';
import type { SlideImageEl, ResizeDir } from './types';
import { ResizeHandles, RotateHandle } from './Handles';

interface ImageElViewProps {
  el: SlideImageEl;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
  onStartRotate?: (e: React.PointerEvent) => void;
}

export function ImageElView({
  el, selected, onPointerDown, onClick, onStartResize, onStartRotate,
}: ImageElViewProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      className={cn(
        'absolute cursor-move overflow-hidden',
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
    >
      <img
        src={el.src}
        alt={el.alt ?? ''}
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
