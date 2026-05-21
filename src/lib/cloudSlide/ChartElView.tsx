import React from 'react';
import { cn } from '@/lib/utils';
import type { ResizeDir, SlideChartEl } from './types';
import { ChartRender } from './ChartRender';
import { ResizeHandles, RotateHandle } from './Handles';

interface ChartElViewProps {
  el: SlideChartEl;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
  onStartRotate?: (e: React.PointerEvent) => void;
}

export function ChartElView({
  el, selected, onPointerDown, onClick, onContextMenu, onStartResize, onStartRotate,
}: ChartElViewProps) {
  return (
    <div
      onPointerDown={onPointerDown}
      onClick={onClick}
      onContextMenu={onContextMenu}
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
      <ChartRender el={el} />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
