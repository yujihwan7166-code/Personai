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
import type { DocxHeaderFooterAlign, DocxHeaderFooterImage, DocxPageNumberPlacement } from './docx';

export const CARD_HEIGHT_PX = 1056;
export const CARD_WIDTH_PX = 816;
export const PAGE_GAP_PX = 32;
export const PAGE_CONTENT_HEIGHT_PX = 864;

export interface PageSize {
  width: number;
  height: number;
  orientation?: 'portrait' | 'landscape';
}

export interface DocPageProps {
  zoom: number;
  exportMode?: boolean;
  pageSize?: PageSize;
  pageMargin: PageMargin;
  onMarginChange: (m: PageMargin) => void;
  headerText: string;
  footerText: string;
  headerAlign?: DocxHeaderFooterAlign;
  footerAlign?: DocxHeaderFooterAlign;
  headerImages?: DocxHeaderFooterImage[];
  footerImages?: DocxHeaderFooterImage[];
  onHeaderChange: (v: string) => void;
  onFooterChange: (v: string) => void;
  showPageNumber: boolean;
  pageNumberPlacement?: DocxPageNumberPlacement;
  children: React.ReactNode;
}

export function DocPage({
  zoom, exportMode = false, pageSize, pageMargin, onMarginChange,
  headerText, footerText, headerAlign = 'center', footerAlign = 'center',
  headerImages = [], footerImages = [],
  onHeaderChange, onFooterChange, showPageNumber, pageNumberPlacement = 'footer',
  children,
}: DocPageProps) {
  const [contentEl, setContentEl] = useState<HTMLDivElement | null>(null);
  const pageWidth = pageSize?.width ?? CARD_WIDTH_PX;
  const pageHeight = pageSize?.height ?? CARD_HEIGHT_PX;
  const topMargin = pageMargin.top ?? 96;
  const bottomMargin = pageMargin.bottom ?? 96;
  const contentHeight = Math.max(240, pageHeight - topMargin - bottomMargin);
  const { totalPages } = usePageBreaks(contentEl, contentHeight);
  const containerHeight = totalPages * pageHeight + (totalPages - 1) * PAGE_GAP_PX;
  const bodyWidth = pageWidth - pageMargin.left - pageMargin.right;

  return (
    <div
      className={exportMode ? 'doc-export-mode mx-auto my-0 relative' : 'mx-auto my-8 relative'}
      style={{
        width: `${pageWidth}px`,
        minHeight: `${containerHeight}px`,
        transform: exportMode || zoom === 100 ? undefined : `scale(${zoom / 100})`,
        transformOrigin: 'top center',
      }}
    >
      {/* 카드 N개 — background + ruler + 카드별 헤더/푸터 + 페이지 번호 */}
      {Array.from({ length: totalPages }).map((_, i) => {
        const cardTop = i * (pageHeight + PAGE_GAP_PX);
        const isFirst = i === 0;
        const isLast = i === totalPages - 1;
        return (
          <div key={`page-${i}`}>
            {/* 카드 흰 배경 + shadow. 다크모드는 zinc-100 (살짝 어두운 종이 톤). hover 시 그림자 강조 */}
            <div
              className="absolute left-0 bg-white shadow-md rounded-sm dark:bg-zinc-100 transition-shadow hover:shadow-lg"
              style={{ top: `${cardTop}px`, width: `${pageWidth}px`, height: `${pageHeight}px` }}
              aria-hidden="true"
            />
            {/* 첫 카드만 cm ruler */}
            {isFirst && !exportMode && (
              <div className="absolute left-0 z-20" style={{ top: '0px', width: `${pageWidth}px` }}>
                <PageRuler widthPx={pageWidth} margin={pageMargin} onMarginChange={onMarginChange} />
              </div>
            )}
            {/* 헤더 — 첫 카드는 편집, 나머지는 미러 */}
            {isFirst && !exportMode ? (
              <input
                type="text"
                value={headerText}
                onChange={(e) => onHeaderChange(e.target.value)}
                placeholder="머리글 (선택)"
                className="absolute z-20 text-xs text-slate-500 bg-transparent outline-none placeholder-slate-300 focus:placeholder-slate-400"
                style={{
                  top: `${cardTop + 32}px`,
                  left: `${pageMargin.left}px`,
                  width: `${bodyWidth}px`,
                  textAlign: cssTextAlign(headerAlign),
                }}
                aria-label="머리글"
              />
            ) : headerText ? (
              <div
                className="absolute z-20 text-[11px] text-slate-500 truncate whitespace-pre-line pointer-events-none"
                style={{
                  top: `${cardTop + (isFirst ? 32 : 16)}px`,
                  left: `${pageMargin.left}px`,
                  width: `${bodyWidth}px`,
                  textAlign: cssTextAlign(headerAlign),
                }}
              >
                {headerText}
              </div>
            ) : null}
            {headerImages.length > 0 && (
              <div
                className="absolute z-20 flex gap-1 pointer-events-none"
                style={{
                  top: `${cardTop + (isFirst ? 48 : 32)}px`,
                  left: `${pageMargin.left}px`,
                  width: `${bodyWidth}px`,
                  justifyContent: justifyForAlign(headerImages[0]?.align ?? headerAlign),
                }}
              >
                {headerImages.map((image, index) => (
                  <img
                    key={`header-image-${index}`}
                    src={image.src}
                    alt=""
                    style={{ width: `${image.width}px`, height: `${image.height}px`, objectFit: 'contain' }}
                  />
                ))}
              </div>
            )}
            {showPageNumber && pageNumberPlacement === 'header' && (
              <span
                className="absolute z-20 right-0 text-[10px] text-slate-500"
                style={{ top: `${cardTop + (isFirst ? 32 : 16)}px`, right: `${pageMargin.right}px` }}
              >
                {i + 1} / {totalPages}
              </span>
            )}
            {/* 푸터 — 마지막 카드는 편집, 나머지는 미러. 페이지 번호 모든 카드 */}
            <div
              className="absolute z-20 flex items-center text-xs text-slate-500"
              style={{ top: `${cardTop + pageHeight - 32}px`, left: `${pageMargin.left}px`, width: `${bodyWidth}px` }}
            >
              {footerImages.length > 0 && (
                <div className="flex gap-1 mr-2" style={{ justifyContent: justifyForAlign(footerImages[0]?.align ?? footerAlign) }}>
                  {footerImages.map((image, index) => (
                    <img
                      key={`footer-image-${index}`}
                      src={image.src}
                      alt=""
                      style={{ width: `${image.width}px`, height: `${image.height}px`, objectFit: 'contain' }}
                    />
                  ))}
                </div>
              )}
              {isLast && !exportMode ? (
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => onFooterChange(e.target.value)}
                  placeholder="바닥글 (선택)"
                  className="flex-1 bg-transparent outline-none placeholder-slate-300 focus:placeholder-slate-400"
                  style={{ textAlign: cssTextAlign(footerAlign) }}
                  aria-label="바닥글"
                />
              ) : (
                <span className="flex-1 text-[11px] truncate whitespace-pre-line" style={{ textAlign: cssTextAlign(footerAlign) }}>{footerText}</span>
              )}
              {showPageNumber && pageNumberPlacement !== 'header' && (
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
          top: `${topMargin}px`,
          paddingLeft: pageMargin.left,
          paddingRight: pageMargin.right,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function cssTextAlign(align: DocxHeaderFooterAlign): React.CSSProperties['textAlign'] {
  return align === 'justify' ? 'justify' : align;
}

function justifyForAlign(align: DocxHeaderFooterAlign): React.CSSProperties['justifyContent'] {
  if (align === 'right') return 'flex-end';
  if (align === 'center' || align === 'justify') return 'center';
  return 'flex-start';
}
