import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { ResolvedPos } from '@tiptap/pm/model';
import { CellSelection, TableMap } from '@tiptap/pm/tables';

export function updateCurrentTableAttributes(editor: Editor, attrs: Record<string, unknown>): boolean {
  const { state, view } = editor;
  const table = findTableAtSelection(state.selection.$from);
  if (!table) return false;

  const nextAttrs = { ...table.node.attrs, ...attrs };
  const tr = state.tr.setNodeMarkup(table.pos, undefined, nextAttrs);
  view.dispatch(tr);
  applyTableAttributesToDom(editor, table.pos, nextAttrs);
  return true;
}

export function getCurrentTableRowAttributes(editor: Editor): Record<string, unknown> | null {
  const table = findTableAtSelection(editor.state.selection.$from);
  if (!table) return null;

  const rowIndexes = selectedRowIndexes(editor, table);
  const firstRow = rowIndexes.length > 0 ? rowNodeAt(table.node, rowIndexes[0]) : null;
  return firstRow?.attrs ?? null;
}

export function updateSelectedTableRowAttributes(editor: Editor, attrs: Record<string, unknown>): boolean {
  const { state, view } = editor;
  const table = findTableAtSelection(state.selection.$from);
  if (!table) return false;

  const rowIndexes = selectedRowIndexes(editor, table);
  if (rowIndexes.length === 0) return false;

  const rowPositions = tableRowPositions(table.node, table.pos);
  let tr = state.tr;
  let changed = false;

  for (const rowIndex of rowIndexes) {
    const row = rowNodeAt(table.node, rowIndex);
    const pos = rowPositions[rowIndex];
    if (!row || pos == null) continue;
    tr = tr.setNodeMarkup(pos, undefined, { ...row.attrs, ...attrs });
    changed = true;
  }

  if (!changed) return false;
  view.dispatch(tr);
  return true;
}

function selectedRowIndexes(
  editor: Editor,
  table: { node: PMNode; pos: number },
): number[] {
  const { selection } = editor.state;
  const indexes = new Set<number>();

  if (selection instanceof CellSelection) {
    const map = TableMap.get(table.node);
    const tableStart = table.pos + 1;
    selection.forEachCell((_node, pos) => {
      const row = rowIndexForCellPosition(map, pos - tableStart);
      if (row != null) indexes.add(row);
    });
  }

  if (indexes.size === 0) {
    const rowIndex = currentRowIndex(editor, table);
    if (rowIndex != null) indexes.add(rowIndex);
  }

  return [...indexes].sort((a, b) => a - b);
}

function currentRowIndex(
  editor: Editor,
  table: { node: PMNode; pos: number },
): number | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name !== 'tableRow') continue;
    const rowPos = $from.before(depth);
    return tableRowPositions(table.node, table.pos).findIndex((pos) => pos === rowPos);
  }
  return null;
}

function rowIndexForCellPosition(map: TableMap, relativeCellPos: number): number | null {
  const index = map.map.findIndex((pos) => pos === relativeCellPos);
  return index >= 0 ? Math.floor(index / map.width) : null;
}

function rowNodeAt(tableNode: PMNode, rowIndex: number): PMNode | null {
  const row = tableNode.child(rowIndex);
  return row?.type.name === 'tableRow' ? row : null;
}

function tableRowPositions(tableNode: PMNode, tablePos: number): number[] {
  const positions: number[] = [];
  tableNode.content.forEach((row, offset, index) => {
    if (row.type.name === 'tableRow') positions[index] = tablePos + 1 + offset;
  });
  return positions;
}

function findTableAtSelection($from: ResolvedPos) {
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name !== 'table') continue;
    return { node, pos: $from.before(depth) };
  }
  return null;
}

function applyTableAttributesToDom(editor: Editor, pos: number, attrs: Record<string, unknown>): void {
  const dom = editor.view.nodeDOM(pos);
  const table = dom instanceof HTMLTableElement
    ? dom
    : dom instanceof HTMLElement
      ? dom.querySelector<HTMLTableElement>('table')
      : null;
  if (!table) return;

  const width = numericAttr(attrs.tableWidth);
  const widthType = attrs.tableWidthType === 'percent' ? 'percent' : attrs.tableWidthType === 'px' ? 'px' : null;
  const layout = attrs.tableLayout === 'fixed' ? 'fixed' : attrs.tableLayout === 'autofit' ? 'autofit' : null;
  const align = attrs.tableAlign === 'left' || attrs.tableAlign === 'center' || attrs.tableAlign === 'right'
    ? attrs.tableAlign
    : null;
  const spacing = numericAttr(attrs.tableCellSpacing);

  if (width && widthType) {
    table.style.width = `${width}${widthType === 'percent' ? '%' : 'px'}`;
    table.setAttribute('data-table-width', String(width));
    table.setAttribute('data-table-width-type', widthType);
  } else if ('tableWidth' in attrs || 'tableWidthType' in attrs) {
    table.style.width = '';
    table.removeAttribute('data-table-width');
    table.removeAttribute('data-table-width-type');
  }

  if (layout) {
    table.style.tableLayout = layout === 'fixed' ? 'fixed' : 'auto';
    table.setAttribute('data-table-layout', layout);
  } else if ('tableLayout' in attrs) {
    table.style.tableLayout = '';
    table.removeAttribute('data-table-layout');
  }

  table.style.marginLeft = '';
  table.style.marginRight = '';
  if (align === 'center') {
    table.style.marginLeft = 'auto';
    table.style.marginRight = 'auto';
    table.setAttribute('data-table-align', 'center');
  } else if (align === 'right') {
    table.style.marginLeft = 'auto';
    table.style.marginRight = '0';
    table.setAttribute('data-table-align', 'right');
  } else if (align === 'left') {
    table.style.marginLeft = '0';
    table.style.marginRight = 'auto';
    table.setAttribute('data-table-align', 'left');
  } else if ('tableAlign' in attrs) {
    table.removeAttribute('data-table-align');
  }

  if (spacing != null && spacing > 0) {
    table.style.borderCollapse = 'separate';
    table.style.borderSpacing = `${spacing}px`;
    table.setAttribute('data-table-cell-spacing', String(spacing));
  } else if ('tableCellSpacing' in attrs) {
    table.style.borderCollapse = '';
    table.style.borderSpacing = '';
    table.removeAttribute('data-table-cell-spacing');
  }
}

function numericAttr(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}
