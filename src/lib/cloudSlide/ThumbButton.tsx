/** 좌측 썸네일 버튼 (미니 프리뷰) — 현재 슬라이드 강조 + 클릭 시 이동. */

import React from 'react';
import { cn } from '@/lib/utils';
import { isText, isShape, isImage, isLineLike, type Slide } from './types';

interface ThumbButtonProps {
  idx: number;
  slide: Slide;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const ThumbButton = React.memo(function ThumbButton({
  idx, slide, active, onClick, onContextMenu,
}: ThumbButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
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
        {slide.elements.map((el) => {
          const baseStyle: React.CSSProperties = {
            left: `${el.xPct}%`,
            top: `${el.yPct}%`,
            width: `${el.wPct}%`,
            height: `${el.hPct}%`,
          };
          if (isText(el)) {
            return (
              <span
                key={el.id}
                className="absolute text-[5px] leading-tight overflow-hidden"
                style={{
                  ...baseStyle,
                  color: el.textColor ?? 'rgba(0,0,0,0.7)',
                  backgroundColor: el.bgColor,
                  fontWeight: el.bold ? 600 : 400,
                  fontStyle: el.italic ? 'italic' : undefined,
                  textAlign: el.align,
                }}
              >
                {el.content || ' '}
              </span>
            );
          }
          if (isImage(el)) {
            return (
              <span
                key={el.id}
                className="absolute bg-muted-foreground/20"
                style={baseStyle}
              />
            );
          }
          if (isShape(el)) {
            // line/arrow 는 stroke 색만, rect/ellipse 는 fill + 둥근/타원
            const lineLike = isLineLike(el);
            const bg = lineLike ? 'transparent' : el.fillColor;
            const borderColor = el.strokeColor;
            return (
              <span
                key={el.id}
                className="absolute"
                style={{
                  ...baseStyle,
                  backgroundColor: bg,
                  borderRadius:
                    el.type === 'ellipse' ? '50%'
                    : el.type === 'rect' && el.borderRadius ? `${Math.max(1, el.borderRadius / 4)}px`
                    : undefined,
                  border: borderColor && !lineLike ? `1px solid ${borderColor}` : undefined,
                  borderTop: lineLike ? `1px solid ${el.strokeColor ?? el.fillColor}` : undefined,
                }}
              />
            );
          }
          return null;
        })}
      </span>
    </button>
  );
});
