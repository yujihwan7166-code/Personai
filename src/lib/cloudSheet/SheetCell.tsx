/** 시트 셀 — 표시·편집 (수식 hint / 자동완성 ghost / 체크박스 / 이미지 / AI / 링크 / sparkline). */

import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGE_SENTINEL, AI_SENTINEL, AI_LOADING_PREFIX, AI_ERROR_PREFIX, LINK_SENTINEL } from '@/lib/cloudSheet/formula';
import { SPARKLINE_SENTINEL, buildSparklineSvg, type SparklinePayload } from '@/lib/cloudSheet/sparkline';
import { FONT_FAMILY_CSS } from '@/lib/cloudSheet/fontFamily';
import { borderStyleFor } from '@/lib/cloudSheet/borderStyle';
import { detectLink } from '@/lib/cloudSheet/sheetUtils';
import type { CellFormat } from '@/lib/cloudSheet/cellFormat';
import { FuncHintPopover, getFuncSuggestionNames, applyFuncSuggestion } from '@/lib/cloudSheet/FuncHintPopover';
import { ValidationDropdown } from '@/lib/cloudSheet/ValidationDropdown';

interface SheetCellProps {
  cellRefStr: string;
  row: number;
  col: number;
  value: string;
  format?: CellFormat;
  isFocus: boolean;
  isInRange: boolean;
  isMatch?: boolean;
  isCurrentMatch?: boolean;
  isInFillPreview?: boolean;
  hasFillHandle?: boolean;
  onFillStart?: (e: React.PointerEvent) => void;
  validationItems?: string[];
  /** true 면 셀에 체크박스 위젯 렌더 — 값 'TRUE'/'FALSE' 토글. */
  isCheckbox?: boolean;
  isInvalid?: boolean;
  onSelectValidationItem?: (ref: string, value: string) => void;
  commentText?: string;
  autocomplete?: string | null;
  formulaRefColor?: string;
  stickyTop?: number;
  stickyLeft?: number;
  rowSpan?: number;
  colSpan?: number;
  editing: boolean;
  editingValue: string;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

export const SheetCell = React.memo(function SheetCell({
  cellRefStr, row, col, value, format, isFocus, isInRange,
  isMatch, isCurrentMatch, isInFillPreview, hasFillHandle, onFillStart,
  validationItems, isCheckbox, isInvalid, onSelectValidationItem,
  commentText, autocomplete, formulaRefColor,
  stickyTop, stickyLeft,
  rowSpan, colSpan, editing, editingValue,
  onPointerDown, onPointerEnter, onContextMenu, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetCellProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      // 다음 tick 에 포커스 + 끝으로 커서
      setTimeout(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        }
      }, 0);
    }
  }, [editing]);

  // range 안 배경 + 검색 매치 배경은 기존 bgColor 위에 살짝 덧입힘 (linear-gradient)
  let bg: string | undefined = format?.bgColor;
  if (isInRange && !isFocus) {
    bg = bg
      ? `linear-gradient(rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.15)), ${bg}`
      : 'rgba(59, 130, 246, 0.15)';
  }
  if (isMatch && !isFocus) {
    // 노란 형광펜 톤
    const matchLayer = isCurrentMatch
      ? 'rgba(250, 204, 21, 0.55)'   // 현재: 진한 노랑
      : 'rgba(250, 204, 21, 0.28)';  // 그 외: 옅은 노랑
    bg = bg
      ? `linear-gradient(${matchLayer}, ${matchLayer}), ${bg}`
      : matchLayer;
  }
  if (isInFillPreview) {
    // fill 미리보기: 파란 점선 강조
    const layer = 'rgba(59, 130, 246, 0.18)';
    bg = bg ? `linear-gradient(${layer}, ${layer}), ${bg}` : layer;
  }
  const isSticky = stickyTop !== undefined || stickyLeft !== undefined;
  // sticky 면 배경이 투명이면 뒤가 비치므로 흰색을 깐다
  const effectiveBg = isSticky && !bg ? 'hsl(var(--background))' : bg;
  // 텍스트 장식 — underline / strikethrough 둘 다 가능 (공백 join)
  const decorations: string[] = [];
  if (format?.underline) decorations.push('underline');
  if (format?.strikethrough) decorations.push('line-through');
  const verticalAlignCss: React.CSSProperties['verticalAlign'] | undefined =
    format?.vAlign === 'top' ? 'top'
    : format?.vAlign === 'bottom' ? 'bottom'
    : format?.vAlign === 'middle' ? 'middle'
    : undefined;
  const wrapCss: Pick<React.CSSProperties, 'whiteSpace' | 'overflow' | 'textOverflow'> | undefined =
    format?.wrap === 'wrap' ? { whiteSpace: 'normal', overflow: 'hidden' }
    : format?.wrap === 'clip' ? { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }
    : undefined; // 'overflow' (기본) — 셀 밖으로 흘러나가는 동작은 기존 그대로

  const tdStyle: React.CSSProperties = {
    padding: editing ? 0 : undefined,
    background: effectiveBg,
    color: format?.textColor,
    fontWeight: format?.bold ? 600 : undefined,
    fontStyle: format?.italic ? 'italic' : undefined,
    textDecoration: decorations.length > 0 ? decorations.join(' ') : undefined,
    fontFamily: format?.fontFamily ? FONT_FAMILY_CSS[format.fontFamily] : undefined,
    fontSize: format?.fontSize ? `${format.fontSize}px` : undefined,
    textAlign: format?.align,
    verticalAlign: verticalAlignCss,
    ...wrapCss,
    position: isSticky ? 'sticky' : undefined,
    top: stickyTop,
    left: stickyLeft,
    // 둘 다 sticky 면 가장 위 z-index (코너 셀)
    zIndex: stickyTop !== undefined && stickyLeft !== undefined ? 5
      : isSticky ? 4 : undefined,
    ...borderStyleFor(format?.border),
  };
  // 수식 참조 셀: 그 색으로 inset box-shadow (다른 outline 시스템과 충돌 없이 함께 보임)
  if (formulaRefColor) {
    tdStyle.boxShadow = `inset 0 0 0 2px ${formulaRefColor}`;
  }
  return (
    <td
      data-cell-ref={cellRefStr}
      onPointerDown={(e) => onPointerDown(row, col, e)}
      onPointerEnter={() => onPointerEnter(row, col)}
      onContextMenu={onContextMenu ? (e) => onContextMenu(row, col, e) : undefined}
      onDoubleClick={() => onStartEdit(row, col)}
      rowSpan={rowSpan}
      colSpan={colSpan}
      title={commentText}
      className={cn(
        'border border-border px-2 align-middle relative cursor-cell select-none',
        'min-w-[88px] max-w-[200px] truncate',
        isFocus && !editing && 'outline outline-2 -outline-offset-2 outline-foreground/70',
        isCurrentMatch && !isFocus && 'outline outline-2 -outline-offset-2 outline-amber-500',
        isInvalid && 'outline outline-2 -outline-offset-2 outline-red-500',
      )}
      style={tdStyle}
    >
      {editing ? (
        <div className="relative w-full h-full bg-background border-2 border-foreground/70">
          <FuncHintPopover value={editingValue} onReplaceValue={onChangeValue} />

          {/* ghost: 자동완성 미리보기 — input 아래 정렬, 같은 폰트·padding */}
          {autocomplete && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase()) && editingValue.length > 0 && editingValue !== autocomplete && (
            <span
              className="absolute inset-0 px-2 flex items-center text-sm pointer-events-none select-none whitespace-pre"
              aria-hidden
            >
              <span className="invisible">{editingValue}</span>
              <span className="text-muted-foreground/50">{autocomplete.slice(editingValue.length)}</span>
            </span>
          )}
          <textarea
            ref={inputRef}
            value={editingValue}
            onChange={(e) => onChangeValue(e.target.value)}
            onKeyDown={(e) => {
              // Tab 1순위: 함수 자동완성 (=SU → SUM( ) — commit X, 인자 입력 계속
              if (e.key === 'Tab') {
                e.preventDefault();
                const funcs = getFuncSuggestionNames(editingValue);
                if (funcs.length > 0) {
                  onChangeValue(applyFuncSuggestion(editingValue, funcs[0]));
                  return;
                }
                // 2순위: 셀 값 자동완성이 있으면 그것으로 채우고 commit right
                if (autocomplete && autocomplete !== editingValue
                    && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase())) {
                  onChangeValue(autocomplete);
                  setTimeout(() => onCommitEdit('right'), 0);
                } else {
                  onCommitEdit('right');
                }
              } else if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
                // Enter = commit. Shift+Enter / Alt+Enter = 줄바꿈 (textarea 기본)
                e.preventDefault();
                if (autocomplete && autocomplete !== editingValue
                    && autocomplete.toLowerCase().startsWith(editingValue.toLowerCase())) {
                  onChangeValue(autocomplete);
                  setTimeout(() => onCommitEdit('down'), 0);
                } else {
                  onCommitEdit('down');
                }
              } else if (e.key === 'Escape') {
                e.preventDefault();
                onCancelEdit();
              }
              // Shift+Enter / Alt+Enter 는 preventDefault X → textarea 가 \n 삽입
            }}
            onBlur={() => onCommitEdit('none')}
            rows={Math.max(1, editingValue.split('\n').length)}
            className="w-full h-full px-2 py-0 outline-none bg-transparent text-sm relative z-10 resize-none leading-snug font-[inherit]"
          />
        </div>
      ) : isCheckbox ? (
        // 체크박스 셀 (Sheets 매칭) — 값 'TRUE'/'FALSE' 토글.
        // 빈 셀 = unchecked. 클릭으로 onSelectValidationItem 호출 → 셀 값 변경.
        <div className="w-full h-full flex items-center justify-center">
          <input
            type="checkbox"
            checked={value === 'TRUE'}
            onChange={(e) => onSelectValidationItem?.(cellRefStr, e.target.checked ? 'TRUE' : 'FALSE')}
            onClick={(e) => e.stopPropagation()}
            className="cursor-pointer accent-primary"
            aria-label={`체크박스 (${value === 'TRUE' ? '체크됨' : '안 체크됨'})`}
          />
        </div>
      ) : value.startsWith(IMAGE_SENTINEL) ? (() => {
        const url = value.slice(IMAGE_SENTINEL.length);
        return (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden relative group/img"
            title={url}
          >
            <img
              src={url}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-full object-contain block pointer-events-none"
              onError={(e) => {
                // 로드 실패 시 placeholder 텍스트로 대체
                const el = e.currentTarget;
                el.style.display = 'none';
                const next = el.nextElementSibling as HTMLElement | null;
                if (next) next.style.display = 'block';
              }}
            />
            <span
              className="hidden text-xs text-destructive truncate"
              title={url}
            >
              #IMG_FAIL
            </span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); window.open(url, '_blank', 'noopener,noreferrer'); }}
              onPointerDown={(e) => e.stopPropagation()}
              className="absolute right-0.5 top-0.5 p-0.5 rounded bg-background/70 hover:bg-background opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
              aria-label="이미지 새 탭에서 열기"
              title={`새 탭에서 열기: ${url}`}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        );
      })() : value.startsWith(AI_SENTINEL) ? (() => {
        // AI 셀 — sentinel 페이로드: LOADING:<key> | ERROR:<msg>
        const body = value.slice(AI_SENTINEL.length);
        if (body.startsWith(AI_LOADING_PREFIX)) {
          return (
            <div className="w-full h-full flex items-center justify-start gap-1.5 px-2 text-muted-foreground/80 text-xs">
              <span className="inline-block w-2 h-2 rounded-full bg-current opacity-60 animate-pulse" aria-hidden />
              <span>AI 생성 중…</span>
            </div>
          );
        }
        if (body.startsWith(AI_ERROR_PREFIX)) {
          const msg = body.slice(AI_ERROR_PREFIX.length);
          return (
            <span className="text-xs text-destructive truncate" title={msg}>
              #AI_ERR
            </span>
          );
        }
        return <span className="text-xs">{value}</span>;
      })() : value.startsWith(LINK_SENTINEL) ? (() => {
        // HYPERLINK 셀 (PR #6) — 클릭 가능한 링크. 새 탭 + noreferrer.
        // 보안: formula 단계에서 javascript:/vbscript:/data:text/html 이미 차단.
        let url = '';
        let label = '';
        try {
          const parsed = JSON.parse(value.slice(LINK_SENTINEL.length));
          if (parsed && typeof parsed === 'object') {
            url = typeof parsed.url === 'string' ? parsed.url : '';
            label = typeof parsed.label === 'string' ? parsed.label : url;
          }
        } catch { /* fallthrough */ }
        if (!url) return <span className="text-xs text-destructive">#LINK</span>;
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-1 truncate inline-block max-w-full hover:opacity-80"
            title={url}
          >
            {label}
          </a>
        );
      })() : value.startsWith(SPARKLINE_SENTINEL) ? (() => {
        // SPARKLINE — sentinel 페이로드(JSON)를 SVG 로 렌더.
        // 평가는 formula.ts 에서, 시각화만 여기서.
        const raw = value.slice(SPARKLINE_SENTINEL.length);
        let payload: SparklinePayload;
        try {
          const parsed = JSON.parse(raw) as { values?: unknown; options?: unknown };
          const values = Array.isArray(parsed.values) ? parsed.values.map(Number).filter(Number.isFinite) : [];
          const options = parsed.options && typeof parsed.options === 'object'
            ? (parsed.options as SparklinePayload['options'])
            : {};
          payload = { values, options };
        } catch {
          return <span className="text-xs text-destructive">#SPARK_FAIL</span>;
        }
        const svg = buildSparklineSvg(payload);
        // 셀 hover 시 raw 값 미리보기 (최대 12개)
        const preview = payload.values.slice(0, 12).join(', ') + (payload.values.length > 12 ? ', …' : '');
        return (
          <div
            className="w-full h-full flex items-center justify-center overflow-hidden text-foreground"
            title={`${payload.values.length}개 값: ${preview}`}
            // SVG 페이로드는 sparkline.ts 의 safeColor 가이드(스크립트 스킴 차단)를 거침.
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        );
      })() : (() => {
        const link = detectLink(value);
        return (
          <>
            <span className={cn(
              'block whitespace-pre-line overflow-hidden break-words',
              link && 'text-blue-600 dark:text-blue-400 underline underline-offset-2 decoration-1',
            )}>
              {value}
            </span>
            {link && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); window.open(link, '_blank', 'noopener,noreferrer'); }}
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted opacity-60 hover:opacity-100"
                aria-label="링크 열기"
                title={`새 탭에서 열기: ${link}`}
              >
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </>
        );
      })()}
      {hasFillHandle && (
        <span
          onPointerDown={onFillStart}
          className="absolute -right-1 -bottom-1 w-2.5 h-2.5 bg-foreground/80 hover:bg-foreground rounded-[1px] cursor-crosshair z-10"
          aria-label="자동 채우기 핸들"
          title="드래그해서 채우기"
        />
      )}
      {commentText && (
        <span
          className="absolute top-0 right-0 pointer-events-none"
          aria-hidden
          style={{
            width: 0, height: 0,
            borderLeft: '6px solid transparent',
            borderTop: '6px solid rgb(239 68 68)', // red-500
          }}
        />
      )}
      {isFocus && validationItems && validationItems.length > 0 && !editing && (
        <ValidationDropdown
          items={validationItems}
          currentValue={value}
          onSelect={(v) => onSelectValidationItem?.(cellRefStr, v)}
        />
      )}
    </td>
  );
});
