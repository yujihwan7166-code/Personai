import React from 'react';
import { cn } from '@/lib/utils';
import type { ResizeDir, SlideTableEl } from './types';
import { ResizeHandles, RotateHandle } from './Handles';
import { TableRender } from './TableRender';
import type { TableCellAddress } from './tableOps';

interface TableElViewProps {
  el: SlideTableEl;
  editingCell?: TableCellAddress | null;
  selected: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  onClick: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onStartResize: (e: React.PointerEvent, dir: ResizeDir) => void;
  onStartRotate?: (e: React.PointerEvent) => void;
  onCellDoubleClick?: (row: number, col: number) => void;
  onCellInput?: (row: number, col: number, text: string) => void;
  onCellFinishEdit?: () => void;
}

export function TableElView({
  el,
  editingCell,
  selected,
  onPointerDown,
  onClick,
  onContextMenu,
  onStartResize,
  onStartRotate,
  onCellDoubleClick,
  onCellInput,
  onCellFinishEdit,
}: TableElViewProps) {
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
      <TableRender
        el={el}
        editingCell={editingCell}
        onCellDoubleClick={onCellDoubleClick}
        onCellFinishEdit={onCellFinishEdit}
        onCellInput={onCellInput}
      />
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
