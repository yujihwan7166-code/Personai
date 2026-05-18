/** 좌측 썸네일 버튼 (미니 프리뷰) — 현재 슬라이드 강조 + 클릭 시 이동. */

import React from 'react';
import { cn } from '@/lib/utils';
import type { Slide } from './types';

interface ThumbButtonProps {
  idx: number;
  slide: Slide;
  active: boolean;
  onClick: () => void;
}

export const ThumbButton = React.memo(function ThumbButton({
  idx, slide, active, onClick,
}: ThumbButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full flex items-stretch gap-2 group',
        'rounded-sm overflow-hidden',
      )}
      aria-label={`슬라이드 ${idx + 1}`}
      aria-pressed={active}
    >
      <span className="w-6 text-xs text-muted-foreground self-center">{idx + 1}</span>
      <span
        className={cn(
          'flex-1 aspect-video bg-white border rounded-sm relative overflow-hidden',
          active ? 'border-foreground/70 ring-2 ring-foreground/30' : 'border-border group-hover:border-foreground/40',
        )}
        style={{ background: slide.background ?? '#fff' }}
      >
        {slide.elements.map((el) => (
          <span
            key={el.id}
            className="absolute text-[5px] leading-tight overflow-hidden text-black/70"
            style={{
              left: `${el.xPct}%`,
              top: `${el.yPct}%`,
              width: `${el.wPct}%`,
              height: `${el.hPct}%`,
              fontWeight: el.bold ? 600 : 400,
            }}
          >
            {el.content || ' '}
          </span>
        ))}
      </span>
    </button>
  );
});
