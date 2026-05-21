/** 좌측 썸네일 버튼 (미니 프리뷰) — 현재 슬라이드 강조 + 클릭 시 이동. */

import React from 'react';
import { cn } from '@/lib/utils';
import { isText, isShape, isImage, isLineLike, isChart, isTable, slideAspectRatio, type Slide, type SlideSize } from './types';
import { tableCellSpan, tableColumnCount } from './tableOps';
import { getTheme } from './themes';
import { slideBackgroundStyle } from './slideBackground';

interface ThumbButtonProps {
  idx: number;
  slide: Slide;
  slideSize?: SlideSize;
  active: boolean;
  onClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

export const ThumbButton = React.memo(function ThumbButton({
  idx, slide, slideSize, active, onClick, onContextMenu,
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
          'flex-1 bg-white border rounded-sm relative overflow-hidden',
          active ? 'border-foreground/70 ring-2 ring-foreground/30' : 'border-border group-hover:border-foreground/40',
        )}
        style={{ ...slideBackgroundStyle(slide, getTheme(undefined)), aspectRatio: slideAspectRatio(slideSize) }}
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
          if (isChart(el)) {
            return (
              <span
                key={el.id}
                className="absolute bg-white border border-muted-foreground/20"
                style={baseStyle}
              >
                <span className="absolute left-1 bottom-1 h-1/3 w-1 bg-blue-500/70" />
                <span className="absolute left-3 bottom-1 h-1/2 w-1 bg-orange-500/70" />
                <span className="absolute left-5 bottom-1 h-2/3 w-1 bg-emerald-500/70" />
              </span>
            );
          }
          if (isTable(el)) {
            const cols = tableColumnCount(el);
            return (
              <span
                key={el.id}
                className="absolute grid bg-white border border-muted-foreground/30"
                style={{
                  ...baseStyle,
                  gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${Math.max(1, el.rows.length)}, minmax(0, 1fr))`,
                }}
              >
                {el.rows.flatMap((row, r) => row.map((cell, c) => (
                  <span
                    key={`${r}-${c}`}
                    className="border border-muted-foreground/20 overflow-hidden text-[4px] leading-none"
                    style={{
                      gridColumn: tableCellSpan(cell.colspan) > 1 ? `span ${tableCellSpan(cell.colspan)}` : undefined,
                      gridRow: tableCellSpan(cell.rowspan) > 1 ? `span ${tableCellSpan(cell.rowspan)}` : undefined,
                      backgroundColor: cell.bgColor ?? (el.headerRow && r === 0 ? 'rgba(241,245,249,0.95)' : undefined),
                    }}
                  />
                )))}
              </span>
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
        {/* 노트 있음 표시 — 우상단 작은 📝 (presenter notes 있는 슬라이드 식별) */}
        {slide.notes?.trim() && (
          <span
            className="absolute top-0.5 right-0.5 text-[8px] leading-none bg-background/90 rounded-sm px-0.5 shadow-sm"
            title="발표자 노트 있음"
            aria-label="발표자 노트 있음"
          >
            📝
          </span>
        )}
        {slide.hidden && (
          <span
            className="absolute inset-0 bg-background/55 flex items-center justify-center text-[9px] font-semibold text-muted-foreground"
            title="Hidden during presentation"
            aria-label="Hidden during presentation"
          >
            Hidden
          </span>
        )}
      </span>
    </button>
  );
});
