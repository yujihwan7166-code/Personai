/**
 * 문서 에디터 페이지 카드 + 자동 분할 overlay.
 *
 *  - A4 흰 카드 (mx-auto, zoom transform, ruler)
 *  - 본문 길이에 따라 N개 카드로 시각 분리 (PAGE_GAP 32px 갭)
 *  - 매 카드마다 헤더/푸터/페이지 번호 미러
 *  - 본문은 한 ProseMirror doc — 시각 overlay 만, 실제 분할 X
 *
 * v2 한계: 본문이 페이지 경계에 살짝 걸치면 카드 갭·다른 카드의 헤더 영역
 *   위로 흐를 수 있음 (ProseMirror 본문 분할 plugin 은 v3).
 */

import React, { useState } from 'react';
import { PageRuler, type PageMargin } from './PageRuler';
import { usePageBreaks } from './usePageBreaks';

export const CARD_HEIGHT_PX = 1056;
export const PAGE_GAP_PX = 32;
export const PAGE_CONTENT_HEIGHT_PX = 864;

export interface DocPageProps {
  zoom: number;
  pageMargin: PageMargin;
  onMarginChange: (m: PageMargin) => void;
  headerText: string;
  footerText: string;
  onHeaderChange: (v: string) => void;
  onFooterChange: (v: string) => void;
  showPageNumber: boolean;
  children: React.ReactNode;
}

export function DocPage({
  zoom, pageMargin, onMarginChange,
  headerText, footerText, onHeaderChange, onFooterChange, showPageNumber,
  children,
}: DocPageProps) {
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const { totalPages } = usePageBreaks(contentEl, PAGE_CONTENT_HEIGHT_PX);
  const containerHeight = totalPages * CARD_HEIGHT_PX + (totalPages - 1) * PAGE_GAP_PX;
  const bodyWidth = 816 - pageMargin.left - pageMargin.right;

  return (
    <div
      className="mx-auto my-8 relative"
      style={{
        width: '816px',
        minHeight: `${containerHeight}px`,
        transform: zoom === 100 ? undefined : `scale(${zoom / 100})`,
        transformOrigin: 'top center',
      }}
    >
      {/* 카드 N개 — background + ruler + 카드별 헤더/푸터 + 페이지 번호 */}
      {Array.from({ length: totalPages }).map((_, i) => {
        const cardTop = i * (CARD_HEIGHT_PX + PAGE_GAP_PX);
        const isFirst = i === 0;
        const isLast = i === totalPages - 1;
        return (
          <div key={`page-${i}`}>
            {/* 카드 흰 배경 + shadow. 다크모드는 zinc-100 (살짝 어두운 종이 톤). hover 시 그림자 강조 */}
            <div
              className="absolute left-0 w-[816px] bg-white shadow-md rounded-sm dark:bg-zinc-100 transition-shadow hover:shadow-lg"
              style={{ top: `${cardTop}px`, height: `${CARD_HEIGHT_PX}px` }}
              aria-hidden="true"
            />
            {/* 첫 카드만 cm ruler */}
            {isFirst && (
              <div className="absolute left-0 w-[816px] z-20" style={{ top: '0px' }}>
                <PageRuler widthPx={816} margin={pageMargin} onMarginChange={onMarginChange} />
              </div>
            )}
            {/* 헤더 — 첫 카드는 편집, 나머지는 미러 */}
            {isFirst ? (
              <input
                type="text"
                value={headerText}
                onChange={(e) => onHeaderChange(e.target.value)}
                placeholder="머리글 (선택)"
                className="absolute z-20 text-xs text-slate-500 bg-transparent outline-none text-center placeholder-slate-300 focus:placeholder-slate-400"
                style={{ top: `${cardTop + 32}px`, left: `${pageMargin.left}px`, width: `${bodyWidth}px` }}
                aria-label="머리글"
              />
            ) : headerText ? (
              <div
                className="absolute z-20 text-[11px] text-slate-500 text-center truncate pointer-events-none"
                style={{ top: `${cardTop + 16}px`, left: `${pageMargin.left}px`, width: `${bodyWidth}px` }}
              >
                {headerText}
              </div>
            ) : null}
            {/* 푸터 — 마지막 카드는 편집, 나머지는 미러. 페이지 번호 모든 카드 */}
            <div
              className="absolute z-20 flex items-center text-xs text-slate-500"
              style={{ top: `${cardTop + CARD_HEIGHT_PX - 32}px`, left: `${pageMargin.left}px`, width: `${bodyWidth}px` }}
            >
              {isLast ? (
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => onFooterChange(e.target.value)}
                  placeholder="바닥글 (선택)"
                  className="flex-1 bg-transparent outline-none text-center placeholder-slate-300 focus:placeholder-slate-400"
                  aria-label="바닥글"
                />
              ) : (
                <span className="flex-1 text-center text-[11px] truncate">{footerText}</span>
              )}
              {showPageNumber && (
                <span className="absolute right-0 top-1 text-[10px]">{i + 1} / {totalPages}</span>
              )}
            </div>
          </div>
        );
      })}

      {/* 본문 wrap — absolute. 첫 카드의 top padding (96) 부터. 한 흐름. */}
      <div
        ref={setContentEl}
        className="absolute left-0 right-0 z-10"
        style={{
          top: '96px',
          paddingLeft: pageMargin.left,
          paddingRight: pageMargin.right,
        }}
      >
        {children}
      </div>
    </div>
  );
}
