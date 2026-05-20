/** 시트 열/행 크기 조정 드래그 핸들 (헤더 가장자리). */

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ColResizeHandleProps {
  colIdx: number;
  currentWidth: number;
  defaultWidth: number;
  onResize: (colIdx: number, w: number) => void;
  /** 더블클릭 시 호출 — 콘텐츠 폭 자동. 미제공이면 기본 폭으로 리셋. */
  onAutoFit?: (colIdx: number) => void;
}

export function ColResizeHandle({ colIdx, currentWidth, defaultWidth, onResize, onAutoFit }: ColResizeHandleProps) {
  const startXRef = useRef(0);
  const startWRef = useRef(0);
  const draggingRef = useRef(false);
  /** 드래그 중 floating 툴팁 — null 이면 안 보임. */
  const [tip, setTip] = useState<{ x: number; y: number; w: number } | null>(null);

  // 드래그 중 다른 페이지로 빠질 때를 대비한 정리
  useEffect(() => () => setTip(null), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startXRef.current = e.clientX;
    startWRef.current = currentWidth;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setTip({ x: e.clientX, y: e.clientY, w: currentWidth });

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = ev.clientX - startXRef.current;
      const next = Math.max(0, Math.round(startWRef.current + dx));
      onResize(colIdx, next);
      setTip({ x: ev.clientX, y: ev.clientY, w: next });
    };
    const onUp = () => {
      draggingRef.current = false;
      setTip(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [colIdx, currentWidth, onResize]);

  return (
    <>
      <span
        className="absolute top-0 right-0 h-full w-1.5 cursor-col-resize select-none group-hover:bg-foreground/10"
        onPointerDown={onPointerDown}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // autoFit 가 있으면 콘텐츠 폭에 맞춤, 없으면 기본 폭으로 리셋
          if (onAutoFit) onAutoFit(colIdx);
          else onResize(colIdx, defaultWidth);
        }}
        aria-label="열 너비 조정"
        title="드래그로 조정 · 더블클릭 시 자동 맞춤"
        role="separator"
      />
      {tip && (
        <span
          className="fixed z-[60] pointer-events-none rounded bg-foreground text-background text-[10px] font-mono px-1.5 py-0.5 shadow-md"
          style={{ left: tip.x + 8, top: tip.y + 12 }}
          aria-hidden
        >
          {tip.w}px
        </span>
      )}
    </>
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
  const [tip, setTip] = useState<{ x: number; y: number; h: number } | null>(null);
  useEffect(() => () => setTip(null), []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startYRef.current = e.clientY;
    startHRef.current = currentHeight;
    draggingRef.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setTip({ x: e.clientX, y: e.clientY, h: currentHeight });

    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const dy = ev.clientY - startYRef.current;
      const next = Math.max(0, Math.round(startHRef.current + dy));
      onResize(rowIdx, next);
      setTip({ x: ev.clientX, y: ev.clientY, h: next });
    };
    const onUp = () => {
      draggingRef.current = false;
      setTip(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [rowIdx, currentHeight, onResize]);

  return (
    <>
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
      {tip && (
        <span
          className="fixed z-[60] pointer-events-none rounded bg-foreground text-background text-[10px] font-mono px-1.5 py-0.5 shadow-md"
          style={{ left: tip.x + 8, top: tip.y + 12 }}
          aria-hidden
        >
          {tip.h}px
        </span>
      )}
    </>
  );
}
