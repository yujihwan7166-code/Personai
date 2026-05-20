/** 시트 그리드 — 헤더 + 행/열 sticky freeze + 본문 셀들 (SheetCell). */

import React, { useMemo } from 'react';
import { SheetCell } from '@/lib/cloudSheet/SheetCell';
import { ColResizeHandle, RowResizeHandle } from '@/lib/cloudSheet/ResizeHandles';
import { colLabel, cellRef } from '@/lib/cloudSheet/sheetUtils';
import { applyNumberFormat } from '@/lib/cloudSheet/numberFormat';
import {
  DEFAULT_COL_WIDTH, MIN_COL_WIDTH, DEFAULT_ROW_HEIGHT,
  HEADER_H, ROW_HEADER_W,
} from '@/lib/cloudSheet/dimensions';
import type { Cells, SelBounds } from '@/lib/cloudSheet/cellTypes';
import type { CellFormats } from '@/lib/cloudSheet/cellFormat';

interface SheetGridProps {
  cells: Cells;
  displayValues: Cells;
  cellFormats: CellFormats;
  /** 수식 보기 모드 — true 면 수식 셀이 평가값 대신 raw '=...' 표시. */
  showFormulas?: boolean;
  selected: { row: number; col: number };
  selBounds: SelBounds;
  hasRange: boolean;
  mergeAtMap: Map<string, { rows: number; cols: number }>;
  coveredSet: Set<string>;
  rowCount: number;
  colCount: number;
  colWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  onColResize: (colIdx: number, newWidth: number) => void;
  onRowResize: (rowIdx: number, newHeight: number) => void;
  onColAutoFit?: (colIdx: number) => void;
  onRowAutoFit?: (rowIdx: number) => void;
  onHeaderClick?: (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => void;
  onHeaderContextMenu?: (kind: 'row' | 'col', idx: number, e: React.MouseEvent) => void;
  onCellContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onSelectAll?: () => void;
  onAutoFitAllCols?: () => void;
  matchedRefs?: Set<string>;
  currentMatchRef?: string;
  /** N행 고정 (0=고정X) */
  freezeRows?: number;
  /** N열 고정 (0=고정X) */
  freezeCols?: number;
  /** 조건부 서식 — cellFormats 위에 오버레이 */
  condFormatMap?: Map<string, { bgColor?: string; textColor?: string; bold?: boolean }>;
  /** ref → 허용 items (드롭다운 셀) */
  validationItemsMap?: Map<string, string[]>;
  /** 체크박스 위젯으로 렌더할 ref 집합 */
  checkboxRefSet?: Set<string>;
  /** invalid 셀 ref 집합 (빨간 outline) */
  invalidRefSet?: Set<string>;
  /** 셀 값 직접 변경 (드롭다운 선택 시) */
  onCellValueChange?: (ref: string, value: string) => void;
  /** ref → 코멘트 텍스트 — 빨간 삼각 + hover tooltip */
  commentMap?: Map<string, string>;
  /** 필터 활성 시 헤더 alphabet row 아래에 검색 input 행 렌더 */
  filterOn?: boolean;
  filters?: Record<number, string>;
  onFilterChange?: (col: number, q: string) => void;
  /** null 이면 모두 보기, Set 이면 그 안 row 만 표시 */
  visibleRowSet?: Set<number> | null;
  /** fill 미리보기 영역 (드래그 중) */
  fillPreview?: SelBounds | null;
  /** fill handle: 어떤 (row, col) 에 핸들을 그릴지 — 보통 selBounds 의 maxR/maxC */
  fillCorner?: { row: number; col: number };
  onFillStart?: (e: React.PointerEvent) => void;
  editing: { row: number; col: number } | null;
  editingValue: string;
  autocomplete?: string | null;
  /** 수식 안 참조된 셀 ref → 색 (다중 ref 마다 다른 색) */
  formulaRefHighlights?: Map<string, string>;
  onPointerDown: (row: number, col: number, e: React.PointerEvent) => void;
  onPointerEnter: (row: number, col: number) => void;
  onContextMenu?: (row: number, col: number, e: React.MouseEvent) => void;
  onStartEdit: (row: number, col: number) => void;
  onChangeValue: (v: string) => void;
  onCommitEdit: (moveDir?: 'down' | 'right' | 'none') => void;
  onCancelEdit: () => void;
}

export function SheetGrid({
  cells, displayValues, cellFormats, showFormulas, selected, selBounds, hasRange, mergeAtMap, coveredSet,
  rowCount, colCount, colWidths, rowHeights, onColResize, onRowResize, onColAutoFit, onRowAutoFit, onHeaderClick, onHeaderContextMenu,
  onCellContextMenu, onSelectAll, onAutoFitAllCols,
  matchedRefs, currentMatchRef,
  freezeRows = 0, freezeCols = 0,
  condFormatMap,
  validationItemsMap, checkboxRefSet, invalidRefSet, onCellValueChange,
  commentMap,
  filterOn, filters, onFilterChange, visibleRowSet,
  fillPreview, fillCorner, onFillStart,
  editing, editingValue, autocomplete, formulaRefHighlights,
  onPointerDown, onPointerEnter, onStartEdit, onChangeValue, onCommitEdit, onCancelEdit,
}: SheetGridProps) {
  const cols = useMemo(() => Array.from({ length: colCount }, (_, i) => colLabel(i)), [colCount]);
  const rows = useMemo(() => Array.from({ length: rowCount }, (_, i) => i), [rowCount]);

  /** sticky top 누적 — freezeRows 안 각 행의 top px 값 */
  const stickyRowTops = useMemo(() => {
    const out: number[] = [];
    let acc = HEADER_H;
    for (let r = 0; r < freezeRows; r++) {
      out.push(acc);
      acc += rowHeights[r] ?? DEFAULT_ROW_HEIGHT;
    }
    return out;
  }, [freezeRows, rowHeights]);

  /** sticky left 누적 — freezeCols 안 각 열의 left px 값 */
  const stickyColLefts = useMemo(() => {
    const out: number[] = [];
    let acc = ROW_HEADER_W;
    for (let c = 0; c < freezeCols; c++) {
      out.push(acc);
      acc += colWidths[c] ?? DEFAULT_COL_WIDTH;
    }
    return out;
  }, [freezeCols, colWidths]);

  return (
    <div className="inline-block min-w-full">
      <table className="border-collapse text-sm font-normal" style={{ tableLayout: 'fixed' }}>
        <thead className="sticky top-0 z-10">
          <tr>
            <th
              className="w-10 h-7 border border-border bg-muted/40 sticky left-0 z-20 cursor-pointer hover:bg-muted/60 relative"
              onClick={onSelectAll}
              onDoubleClick={onAutoFitAllCols}
              title="클릭: 전체 시트 선택 · 더블클릭: 모든 열 폭 자동"
              aria-label="전체 시트 선택"
            >
              <span className="absolute right-1 bottom-1 text-[8px] text-muted-foreground leading-none" aria-hidden>◢</span>
            </th>
            {cols.map((c, i) => (
              <th
                key={c}
                className="border border-border bg-muted/40 px-2 py-1 text-xs font-normal text-muted-foreground relative group cursor-pointer hover:bg-muted/60"
                style={{ width: colWidths[i] ?? DEFAULT_COL_WIDTH, minWidth: MIN_COL_WIDTH }}
                onClick={(e) => onHeaderClick?.('col', i, e)}
                onContextMenu={(e) => onHeaderContextMenu?.('col', i, e)}
              >
                {c}
                {/* 드래그 핸들 (오른쪽 가장자리) */}
                <ColResizeHandle
                  colIdx={i}
                  currentWidth={colWidths[i] ?? DEFAULT_COL_WIDTH}
                  defaultWidth={DEFAULT_COL_WIDTH}
                  onResize={onColResize}
                  onAutoFit={onColAutoFit}
                />
              </th>
            ))}
          </tr>
        </thead>
        {filterOn && (
          <thead>
            <tr>
              <th className="w-10 h-7 border border-border bg-amber-50 dark:bg-amber-950/30 sticky left-0 z-20" />
              {cols.map((_, ci) => (
                <th
                  key={ci}
                  className="border border-border bg-amber-50 dark:bg-amber-950/30 px-1 py-0.5"
                  style={{ width: colWidths[ci] ?? DEFAULT_COL_WIDTH, minWidth: MIN_COL_WIDTH }}
                >
                  <input
                    type="text"
                    value={filters?.[ci] ?? ''}
                    onChange={(e) => onFilterChange?.(ci, e.target.value)}
                    placeholder="필터…"
                    className="w-full px-1.5 py-0.5 text-xs rounded border border-border bg-background outline-none focus:border-foreground/40"
                    aria-label={`${colLabel(ci)}열 필터`}
                  />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((rowIdx) => visibleRowSet && !visibleRowSet.has(rowIdx) ? null : (
            <tr key={rowIdx} style={{ height: rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT }}>
              <th
                className="w-10 border border-border bg-muted/40 text-xs font-normal text-muted-foreground sticky left-0 z-10 relative group cursor-pointer hover:bg-muted/60"
                onClick={(e) => onHeaderClick?.('row', rowIdx, e)}
                onContextMenu={(e) => onHeaderContextMenu?.('row', rowIdx, e)}
                style={{ height: rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT }}
              >
                {rowIdx + 1}
                <RowResizeHandle
                  rowIdx={rowIdx}
                  currentHeight={rowHeights[rowIdx] ?? DEFAULT_ROW_HEIGHT}
                  defaultHeight={DEFAULT_ROW_HEIGHT}
                  onResize={onRowResize}
                  onAutoFit={onRowAutoFit}
                />
              </th>
              {cols.map((_, colIdx) => {
                const key = `${rowIdx},${colIdx}`;
                // 병합으로 가려진 셀은 렌더 X (rowSpan/colSpan 으로 위쪽 셀이 채움)
                if (coveredSet.has(key)) return null;
                const ref = cellRef(rowIdx, colIdx);
                const raw = cells[ref] ?? '';
                // 표시값: 수식 보기 모드면 raw, 아니면 (수식이면 평가 결과, 아니면 raw 그대로)
                let display = showFormulas
                  ? raw
                  : (raw.startsWith('=') ? (displayValues[ref] ?? '') : raw);
                const isFocus = selected.row === rowIdx && selected.col === colIdx;
                const isInRange = hasRange
                  && rowIdx >= selBounds.minR && rowIdx <= selBounds.maxR
                  && colIdx >= selBounds.minC && colIdx <= selBounds.maxC;
                const isEditing = !!editing && editing.row === rowIdx && editing.col === colIdx;
                const baseFmt = cellFormats[ref];
                const cond = condFormatMap?.get(ref);
                const fmt = cond
                  ? { ...(baseFmt ?? {}), ...cond }
                  : baseFmt;
                if (fmt?.numberFmt && !isEditing && !showFormulas && !display.startsWith('#')) {
                  display = applyNumberFormat(display, fmt.numberFmt);
                }
                const span = mergeAtMap.get(key);
                const isMatch = !!matchedRefs?.has(ref);
                const isCurrentMatch = isMatch && currentMatchRef === ref;
                const isInFillPreview = !!fillPreview
                  && rowIdx >= fillPreview.minR && rowIdx <= fillPreview.maxR
                  && colIdx >= fillPreview.minC && colIdx <= fillPreview.maxC
                  && !(rowIdx >= selBounds.minR && rowIdx <= selBounds.maxR
                       && colIdx >= selBounds.minC && colIdx <= selBounds.maxC);
                const hasFillHandle = !!fillCorner
                  && fillCorner.row === rowIdx && fillCorner.col === colIdx
                  && !fillPreview;
                const isStickyRow = rowIdx < freezeRows;
                const isStickyCol = colIdx < freezeCols;
                const validationItems = validationItemsMap?.get(ref);
                const isCheckbox = !!checkboxRefSet?.has(ref);
                const isInvalid = !!invalidRefSet?.has(ref);
                const commentText = commentMap?.get(ref);
                return (
                  <SheetCell
                    key={ref}
                    cellRefStr={ref}
                    row={rowIdx}
                    col={colIdx}
                    value={display}
                    format={fmt}
                    isFocus={isFocus}
                    isInRange={isInRange}
                    isMatch={isMatch}
                    isCurrentMatch={isCurrentMatch}
                    isInFillPreview={isInFillPreview}
                    hasFillHandle={hasFillHandle}
                    onFillStart={onFillStart}
                    validationItems={validationItems}
                    isCheckbox={isCheckbox}
                    isInvalid={isInvalid}
                    onSelectValidationItem={onCellValueChange}
                    commentText={commentText}
                    autocomplete={isEditing ? autocomplete : undefined}
                    formulaRefColor={formulaRefHighlights?.get(ref)}
                    stickyTop={isStickyRow ? stickyRowTops[rowIdx] : undefined}
                    stickyLeft={isStickyCol ? stickyColLefts[colIdx] : undefined}
                    rowSpan={span?.rows}
                    colSpan={span?.cols}
                    editing={isEditing}
                    editingValue={editingValue}
                    onPointerDown={onPointerDown}
                    onPointerEnter={onPointerEnter}
                    onContextMenu={onCellContextMenu}
                    onStartEdit={onStartEdit}
                    onChangeValue={onChangeValue}
                    onCommitEdit={onCommitEdit}
                    onCancelEdit={onCancelEdit}
                  />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
