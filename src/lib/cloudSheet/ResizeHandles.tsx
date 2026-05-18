/** 시트 열/행 크기 조정 드래그 핸들 (헤더 가장자리). */

import React, { useCallback, useRef } from 'react';

interface ColResizeHandleProps {
  colIdx: number;
  currentWidth: number;
  defaultWidth: number;
  onResize: (colIdx: number, w: number) => void;
}

export function ColResizeHandle({ colIdx, currentWidth, defaultWidth, onResize }: ColResizeHandleProps) {
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWRef.current = currentWidth;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startXRef.current;
      onResize(colIdx, startWRef.current + dx);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [colIdx, currentWidth, onResize]);

  return (
    <span
      className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none group-hover:bg-foreground/10"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => { e.stopPropagation(); onResize(colIdx, defaultWidth); }}
      aria-label="열 너비 조정"
      role="separator"
    />
  );
}

interface RowResizeHandleProps {
  rowIdx: number;
  currentHeight: number;
  defaultHeight: number;
  onResize: (rowIdx: number, h: number) => void;
  onAutoFit?: (rowIdx: number) => void;
}

export function RowResizeHandle({ rowIdx, currentHeight, defaultHeight, onResize, onAutoFit }: RowResizeHandleProps) {
  const startYRef = useRef(0);
  const startHRef = useRef(0);
  const draggingRef = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startYRef.current = e.clientY;
    startHRef.current = currentHeight;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dy = ev.clientY - startYRef.current;
      onResize(rowIdx, startHRef.current + dy);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [rowIdx, currentHeight, onResize]);

  return (
    <span
      className="absolute left-0 bottom-0 w-full h-1.5 cursor-row-resize select-none group-hover:bg-foreground/10"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        // autoFit 가 있으면 콘텐츠 줄수에 맞춤, 없으면 기본 높이로 리셋
        if (onAutoFit) onAutoFit(rowIdx);
        else onResize(rowIdx, defaultHeight);
      }}
      aria-label="행 높이 조정"
      title="드래그로 조정 · 더블클릭 시 자동 맞춤"
      role="separator"
    />
  );
}
