import React, { useEffect, useRef } from 'react';
import type { SlideTableEl } from './types';
import { tableCellSpan, tableColumnCount, type TableCellAddress } from './tableOps';

interface TableRenderProps {
  el: SlideTableEl;
  editingCell?: TableCellAddress | null;
  onCellDoubleClick?: (row: number, col: number) => void;
  onCellHyperlinkClick?: (href: string, event: React.MouseEvent) => void;
  onCellInput?: (row: number, col: number, text: string) => void;
  onCellFinishEdit?: () => void;
}

export function TableRender({
  el,
  editingCell,
  onCellDoubleClick,
  onCellHyperlinkClick,
  onCellInput,
  onCellFinishEdit,
}: TableRenderProps): React.ReactElement {
  const columnCount = tableColumnCount(el);
  const colWidths = normalizeParts(el.colWidthsPct, columnCount);

  return (
    <table className="w-full h-full table-fixed border-collapse bg-white/90 text-[11px] leading-tight">
      <colgroup>
        {colWidths.map((w, idx) => <col key={idx} style={{ width: `${w}%` }} />)}
      </colgroup>
      <tbody>
        {el.rows.map((row, rowIdx) => (
          <tr key={rowIdx} style={{ height: el.rowHeightsPct?.[rowIdx] ? `${el.rowHeightsPct[rowIdx]}%` : undefined }}>
            {row.map((cell, colIdx) => {
              const isHeader = el.headerRow && rowIdx === 0;
              const editing = editingCell?.row === rowIdx && editingCell.col === colIdx;
              return (
                <EditableTableCell
                  key={colIdx}
                  borderColor={el.borderColor}
                  cell={cell}
                  colIdx={colIdx}
                  editing={editing}
                  isHeader={!!isHeader}
                  rowIdx={rowIdx}
                  onCellDoubleClick={onCellDoubleClick}
                  onCellFinishEdit={onCellFinishEdit}
                  onCellHyperlinkClick={onCellHyperlinkClick}
                  onCellInput={onCellInput}
                />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface EditableTableCellProps {
  borderColor?: string;
  cell: SlideTableEl['rows'][number][number];
  colIdx: number;
  editing: boolean;
  isHeader: boolean;
  rowIdx: number;
  onCellDoubleClick?: (row: number, col: number) => void;
  onCellHyperlinkClick?: (href: string, event: React.MouseEvent) => void;
  onCellInput?: (row: number, col: number, text: string) => void;
  onCellFinishEdit?: () => void;
}

function EditableTableCell({
  borderColor,
  cell,
  colIdx,
  editing,
  isHeader,
  rowIdx,
  onCellDoubleClick,
  onCellFinishEdit,
  onCellHyperlinkClick,
  onCellInput,
}: EditableTableCellProps): React.ReactElement {
  const ref = useRef<HTMLTableCellElement>(null);
  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(ref.current);
    range.collapse(false);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, [editing]);
  const linkColor = '#0563C1';
  const hasLink = !!cell.hyperlink;

  return (
    <td
      ref={ref}
      colSpan={tableCellSpan(cell.colspan)}
      rowSpan={tableCellSpan(cell.rowspan)}
      contentEditable={editing}
      suppressContentEditableWarning
      className="overflow-hidden whitespace-pre-wrap break-words align-top px-1.5 py-1 outline-none"
      style={{
        border: `1px solid ${borderColor ?? 'rgba(148, 163, 184, 0.75)'}`,
        backgroundColor: cell.bgColor ?? (isHeader ? 'rgba(241, 245, 249, 0.95)' : undefined),
        boxShadow: editing ? 'inset 0 0 0 2px hsl(var(--ring))' : undefined,
        color: cell.textColor ?? (hasLink ? linkColor : 'rgba(15, 23, 42, 0.92)'),
        cursor: hasLink ? 'pointer' : undefined,
        fontSize: cell.fontSizeRem ? `${cell.fontSizeRem}rem` : undefined,
        fontFamily: cell.fontFamily,
        fontWeight: cell.bold || isHeader ? 600 : 400,
        fontStyle: cell.italic ? 'italic' : undefined,
        textDecoration: cell.underline || hasLink ? 'underline' : undefined,
        textAlign: cell.align ?? 'left',
      }}
      title={cell.hyperlink}
      onClick={(e) => {
        if (editing || !cell.hyperlink) return;
        onCellHyperlinkClick?.(cell.hyperlink, e);
      }}
      onBlur={() => editing && onCellFinishEdit?.()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onCellDoubleClick?.(rowIdx, colIdx);
      }}
      onInput={(e) => onCellInput?.(rowIdx, colIdx, e.currentTarget.innerText)}
      onKeyDown={(e) => {
        if (!editing) return;
        if (e.key === 'Escape') {
          e.preventDefault();
          onCellFinishEdit?.();
        }
      }}
      onPointerDown={(e) => {
        if (editing || onCellDoubleClick) e.stopPropagation();
      }}
    >
      {cell.text}
    </td>
  );
}

function normalizeParts(parts: number[] | undefined, count: number): number[] {
  if (!parts || parts.length !== count || parts.some((p) => !Number.isFinite(p) || p <= 0)) {
    return Array.from({ length: count }, () => 100 / count);
  }
  const total = parts.reduce((sum, p) => sum + p, 0);
  return parts.map((p) => (p / total) * 100);
}
