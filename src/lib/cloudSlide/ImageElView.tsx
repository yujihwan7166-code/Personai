/** 슬라이드 이미지 요소 — 선택/리사이즈/회전 핸들. */

import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
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
  // src 로드 실패 시 fallback — 영원히 broken 아이콘 보여주는 대신 회색 박스 + 안내
  const [errored, setErrored] = useState(false);
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
      {errored ? (
        <div
          className="w-full h-full flex flex-col items-center justify-center gap-1 bg-muted/40 border border-dashed border-muted-foreground/30 text-muted-foreground"
          aria-label="이미지 로드 실패"
          title="이미지를 표시할 수 없습니다"
        >
          <ImageOff className="w-6 h-6 opacity-60" />
          <span className="text-[10px]">이미지 로드 실패</span>
        </div>
      ) : (
        <img
          src={el.src}
          alt={el.alt ?? ''}
          className="w-full h-full object-contain select-none pointer-events-none"
          draggable={false}
          onError={() => setErrored(true)}
        />
      )}
      {selected && <ResizeHandles onStart={onStartResize} />}
      {selected && onStartRotate && <RotateHandle onStart={onStartRotate} />}
    </div>
  );
}
