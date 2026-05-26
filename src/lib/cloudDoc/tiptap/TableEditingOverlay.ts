import { Extension } from '@tiptap/core';
import type { Node as PMNode, ResolvedPos } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import {
  CellSelection,
  TableMap,
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  mergeCells,
  splitCell,
  toggleHeaderRow,
} from '@tiptap/pm/tables';

const MIN_TABLE_WIDTH = 160;
const MAX_TABLE_WIDTH = 2200;
const DEFAULT_COLUMN_WIDTH = 120;
const MIN_COLUMN_WIDTH = 48;
const MAX_COLUMN_WIDTH = 1200;
const MIN_ROW_HEIGHT = 24;
const MAX_ROW_HEIGHT = 720;

interface CurrentTable {
  pos: number;
  dom: HTMLElement;
}

type TableCommand = (state: EditorState, dispatch?: (tr: Transaction) => void) => boolean;
type TableAction =
  | 'rowBefore'
  | 'rowAfter'
  | 'colBefore'
  | 'colAfter'
  | 'merge'
  | 'split'
  | 'toggleHeaderRow'
  | 'deleteRow'
  | 'deleteColumn'
  | 'deleteTable'
  | 'widthAuto'
  | 'widthFull'
  | 'alignLeft'
  | 'alignCenter'
  | 'alignRight';

export const TableEditingOverlay = Extension.create({
  name: 'tableEditingOverlay',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableEditingOverlay'),
        appendTransaction: (_transactions, _oldState, newState) => syncTableColumnWidthAttrs(newState),
        view: (view) => new TableOverlayView(view),
      }),
    ];
  },
});

function syncTableColumnWidthAttrs(state: EditorState): Transaction | null {
  let tr: Transaction | null = null;

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') return;
    const current = Array.isArray(node.attrs.tableColumnWidths)
      ? node.attrs.tableColumnWidths.map((value: unknown) => Number(value))
      : null;
    const widths = columnWidthsFromTableNode(node, current);
    if (!widths) return;

    if (current && arraysEqual(current, widths)) return;

    tr ??= state.tr;
    tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      tableColumnWidths: widths,
      tableLayout: node.attrs.tableLayout ?? 'fixed',
    });
  });

  return tr?.docChanged ? tr : null;
}

function columnWidthsFromTableNode(tableNode: PMNode, existingWidths: number[] | null): number[] | null {
  const rows: PMNode[] = [];
  tableNode.content?.forEach((row) => {
    if (row.type.name === 'tableRow') rows.push(row);
  });
  const tableWidth = safeTableMapWidth(tableNode);
  const expectedColumns = tableWidth > 0 ? tableWidth : countColumnsFromRows(rows);
  if (expectedColumns <= 0) return null;
  if (existingWidths?.some((width) => positiveInt(width) != null)) {
    return Array.from(
      { length: expectedColumns },
      (_, index) => positiveInt(existingWidths[index]) ?? DEFAULT_COLUMN_WIDTH,
    );
  }

  for (const row of rows) {
    const widths: number[] = existingWidths?.slice(0, expectedColumns) ?? [];
    let sawExplicitWidth = false;
    let column = 0;
    row.content?.forEach((cell) => {
      if (cell.type.name !== 'tableCell' && cell.type.name !== 'tableHeader') return;
      const colspan = positiveInt(cell.attrs?.colspan) ?? 1;
      const colwidth = Array.isArray(cell.attrs?.colwidth)
        ? cell.attrs.colwidth.map(positiveInt).filter((value): value is number => value != null)
        : [];
      if (colwidth.length === colspan) {
        sawExplicitWidth = true;
        for (let index = 0; index < colspan; index++) widths[column + index] ??= colwidth[index];
      } else if (colwidth.length === 1 && colspan > 1) {
        sawExplicitWidth = true;
        const split = Math.max(1, Math.round(colwidth[0] / colspan));
        for (let index = 0; index < colspan; index++) widths[column + index] ??= split;
      } else if (colwidth.length > 0) {
        sawExplicitWidth = true;
        widths[column] ??= colwidth.reduce((sum, item) => sum + item, 0);
      }
      column += colspan;
    });
    if (sawExplicitWidth) {
      return Array.from({ length: expectedColumns }, (_, index) => positiveInt(widths[index]) ?? DEFAULT_COLUMN_WIDTH);
    }
  }
  return null;
}

function safeTableMapWidth(tableNode: PMNode): number {
  try {
    return TableMap.get(tableNode).width;
  } catch {
    return 0;
  }
}

function countColumnsFromRows(rows: PMNode[]): number {
  let max = 0;
  for (const row of rows) {
    let columns = 0;
    row.content?.forEach((cell) => {
      if (cell.type.name !== 'tableCell' && cell.type.name !== 'tableHeader') return;
      columns += positiveInt(cell.attrs?.colspan) ?? 1;
    });
    max = Math.max(max, columns);
  }
  return max;
}

function positiveInt(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function arraysEqual(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function tableCommandForAction(action: string): TableCommand | null {
  if (action === 'rowBefore') return addRowBefore;
  if (action === 'rowAfter') return addRowAfter;
  if (action === 'colBefore') return addColumnBefore;
  if (action === 'colAfter') return addColumnAfter;
  if (action === 'merge') return mergeCells;
  if (action === 'split') return splitCell;
  if (action === 'toggleHeaderRow') return toggleHeaderRow;
  if (action === 'deleteRow') return deleteRow;
  if (action === 'deleteColumn') return deleteColumn;
  if (action === 'deleteTable') return deleteTable;
  return null;
}

class TableOverlayView {
  private readonly grip: HTMLDivElement;
  private readonly badge: HTMLDivElement;
  private readonly rowBadge: HTMLDivElement;
  private readonly handleLayer: HTMLDivElement;
  private readonly resizeGuide: HTMLDivElement;
  private readonly quickbar: HTMLDivElement;
  private readonly menu: HTMLDivElement;
  private table: CurrentTable | null = null;
  private lastCellPositions: number[] = [];
  private rangeDrag:
    | {
      anchorCell: number;
      moved: boolean;
    }
    | null = null;
  private dragging:
    | {
      dom: HTMLElement;
      tablePos: number;
      startX: number;
      startWidth: number;
      scale: number;
      maxWidth: number;
    }
    | null = null;
  private rowDragging:
    | {
      rowDom: HTMLTableRowElement;
      rowPos: number;
      startY: number;
      startHeight: number;
    }
    | null = null;
  private columnDragging:
    | {
      tableDom: HTMLElement;
      tablePos: number;
      columnIndex: number;
      startX: number;
      startWidth: number;
      widths: number[];
    }
    | null = null;
  private raf = 0;

  constructor(private readonly view: EditorView) {
    this.grip = document.createElement('div');
    this.grip.className = 'doc-table-width-grip';
    this.grip.setAttribute('role', 'slider');
    this.grip.tabIndex = 0;
    this.grip.setAttribute('aria-label', '표 너비 조절');
    this.grip.title = '표 너비 조절';

    this.badge = document.createElement('div');
    this.badge.className = 'doc-table-width-badge';
    this.grip.appendChild(this.badge);

    this.rowBadge = document.createElement('div');
    this.rowBadge.className = 'doc-table-row-height-badge';
    this.rowBadge.style.display = 'none';

    this.handleLayer = document.createElement('div');
    this.handleLayer.className = 'doc-table-handle-layer';

    this.resizeGuide = document.createElement('div');
    this.resizeGuide.className = 'doc-table-resize-guide';
    this.resizeGuide.style.display = 'none';

    this.quickbar = document.createElement('div');
    this.quickbar.className = 'doc-table-quickbar';
    this.quickbar.setAttribute('role', 'toolbar');
    this.quickbar.setAttribute('aria-label', '표 빠른 편집');
    this.populateQuickbar();

    this.menu = document.createElement('div');
    this.menu.className = 'doc-table-context-menu';
    this.menu.setAttribute('role', 'menu');
    this.menu.style.display = 'none';
    this.populateMenu();

    this.grip.addEventListener('pointerdown', this.onPointerDown);
    this.grip.addEventListener('keydown', this.onWidthGripKeyDown);
    this.grip.addEventListener('dblclick', this.onWidthGripDoubleClick);
    this.handleLayer.addEventListener('mousedown', this.onHandleMouseDown);
    this.handleLayer.addEventListener('keydown', this.onHandleKeyDown);
    this.handleLayer.addEventListener('dblclick', this.onHandleDoubleClick);
    this.quickbar.addEventListener('mousedown', this.onQuickbarMouseDown);
    this.quickbar.addEventListener('input', this.onQuickbarInput);
    this.quickbar.addEventListener('change', this.onQuickbarInput);
    this.view.dom.addEventListener('mousedown', this.onEditorMouseDown);
    this.view.dom.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('mousedown', this.onDocumentMouseDown);
    document.body.append(this.handleLayer, this.resizeGuide, this.grip, this.rowBadge, this.quickbar, this.menu);
    window.addEventListener('scroll', this.schedulePosition, true);
    window.addEventListener('resize', this.schedulePosition);
    this.update(view);
  }

  update(view: EditorView): void {
    this.table = findCurrentTable(view);
    this.positionOverlay();
  }

  destroy(): void {
    this.grip.removeEventListener('pointerdown', this.onPointerDown);
    this.grip.removeEventListener('keydown', this.onWidthGripKeyDown);
    this.grip.removeEventListener('dblclick', this.onWidthGripDoubleClick);
    this.handleLayer.removeEventListener('mousedown', this.onHandleMouseDown);
    this.handleLayer.removeEventListener('keydown', this.onHandleKeyDown);
    this.handleLayer.removeEventListener('dblclick', this.onHandleDoubleClick);
    this.quickbar.removeEventListener('mousedown', this.onQuickbarMouseDown);
    this.quickbar.removeEventListener('input', this.onQuickbarInput);
    this.quickbar.removeEventListener('change', this.onQuickbarInput);
    this.view.dom.removeEventListener('mousedown', this.onEditorMouseDown);
    this.view.dom.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('mousedown', this.onDocumentMouseDown);
    window.removeEventListener('scroll', this.schedulePosition, true);
    window.removeEventListener('resize', this.schedulePosition);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('mousemove', this.onPointerMove);
    document.removeEventListener('mouseup', this.onPointerUp);
    document.removeEventListener('mousemove', this.onRowResizeMove);
    document.removeEventListener('mouseup', this.onRowResizeUp);
    document.removeEventListener('mousemove', this.onColumnResizeMove);
    document.removeEventListener('mouseup', this.onColumnResizeUp);
    document.removeEventListener('mousemove', this.onRangeMouseMove);
    document.removeEventListener('mouseup', this.onRangeMouseUp);
    document.body.classList.remove('doc-table-resizing');
    document.body.classList.remove('doc-table-row-resizing');
    document.body.classList.remove('doc-table-column-resizing');
    document.body.classList.remove('doc-table-selecting');
    this.grip.remove();
    this.rowBadge.remove();
    this.handleLayer.remove();
    this.resizeGuide.remove();
    this.quickbar.remove();
    this.menu.remove();
    if (this.raf) cancelAnimationFrame(this.raf);
  }

  private populateMenu(): void {
    const groups: Array<Array<{ label: string; action: TableAction; danger?: boolean }>> = [
      [
        { label: '위에 행 추가', action: 'rowBefore' },
        { label: '아래에 행 추가', action: 'rowAfter' },
      ],
      [
        { label: '왼쪽에 열 추가', action: 'colBefore' },
        { label: '오른쪽에 열 추가', action: 'colAfter' },
      ],
      [
        { label: '셀 병합', action: 'merge' },
        { label: '셀 분할', action: 'split' },
        { label: '첫 행을 머리 행으로', action: 'toggleHeaderRow' },
      ],
      [
        { label: '표 너비 자동', action: 'widthAuto' },
        { label: '표 너비 100%', action: 'widthFull' },
      ],
      [
        { label: '표 왼쪽 정렬', action: 'alignLeft' },
        { label: '표 가운데 정렬', action: 'alignCenter' },
        { label: '표 오른쪽 정렬', action: 'alignRight' },
      ],
      [
        { label: '선택 행 삭제', action: 'deleteRow', danger: true },
        { label: '선택 열 삭제', action: 'deleteColumn', danger: true },
        { label: '표 삭제', action: 'deleteTable', danger: true },
      ],
    ];

    this.menu.replaceChildren();
    for (const [groupIndex, group] of groups.entries()) {
      if (groupIndex > 0) {
        const sep = document.createElement('div');
        sep.className = 'doc-table-context-separator';
        this.menu.appendChild(sep);
      }
      for (const item of group) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = item.danger ? 'doc-table-context-item doc-table-context-item-danger' : 'doc-table-context-item';
        button.dataset.action = item.action;
        button.textContent = item.label;
        button.addEventListener('mousedown', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
          this.runMenuAction(item.action);
        });
        this.menu.appendChild(button);
      }
    }
  }

  private populateQuickbar(): void {
    const groups: Array<Array<{ label: string; action: string; title: string; danger?: boolean }>> = [
      [
        { label: '+행', action: 'rowAfter', title: '아래에 행 추가' },
        { label: '+열', action: 'colAfter', title: '오른쪽에 열 추가' },
        { label: '병합', action: 'merge', title: '선택한 셀 병합' },
        { label: '분할', action: 'split', title: '병합 셀 분할' },
      ],
      [
        { label: '자동', action: 'widthAuto', title: '표 너비 자동' },
        { label: '100%', action: 'widthFull', title: '표 너비를 페이지에 맞춤' },
      ],
      [
        { label: '좌', action: 'alignLeft', title: '표 왼쪽 정렬' },
        { label: '중', action: 'alignCenter', title: '표 가운데 정렬' },
        { label: '우', action: 'alignRight', title: '표 오른쪽 정렬' },
      ],
      [
        { label: '삭제', action: 'deleteTable', title: '표 삭제', danger: true },
      ],
    ];

    this.quickbar.replaceChildren();
    const label = document.createElement('span');
    label.className = 'doc-table-quickbar-label';
    label.textContent = '표';
    this.quickbar.appendChild(label);
    this.quickbar.appendChild(createColorControl('fill', '셀 배경색', '#ffffff'));
    this.quickbar.appendChild(createColorControl('border', '테두리색', '#d0d0d0'));
    for (const [groupIndex, group] of groups.entries()) {
      if (groupIndex > 0) {
        const sep = document.createElement('span');
        sep.className = 'doc-table-quickbar-separator';
        this.quickbar.appendChild(sep);
      }
      for (const item of group) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = item.danger ? 'doc-table-quickbar-button doc-table-quickbar-danger' : 'doc-table-quickbar-button';
        button.dataset.action = item.action;
        button.textContent = item.label;
        button.title = item.title;
        button.setAttribute('aria-label', item.title);
        this.quickbar.appendChild(button);
      }
    }
  }

  private readonly schedulePosition = () => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.positionOverlay();
    });
  };

  private positionOverlay(): void {
    if (!this.table) {
      this.hideOverlay();
      return;
    }
    const rect = this.table.dom.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      this.hideOverlay();
      return;
    }
    this.positionWidthGrip(rect);
    this.positionQuickbar(rect);
    this.positionSelectionHandles(rect);
    this.refreshCommandStates();
    this.refreshColorControls();
  }

  private positionWidthGrip(rect: DOMRect): void {
    this.grip.style.display = 'block';
    this.grip.style.left = `${rect.right - 5}px`;
    this.grip.style.top = `${rect.top + rect.height / 2 - 18}px`;
    this.grip.style.height = `${Math.max(34, Math.min(80, rect.height - 8))}px`;
    const width = Math.round(rect.width);
    this.grip.setAttribute('aria-valuemin', String(MIN_TABLE_WIDTH));
    this.grip.setAttribute('aria-valuemax', String(Math.round(tableMaxWidth(this.view))));
    this.grip.setAttribute('aria-valuenow', String(width));
    this.badge.textContent = `${width}px`;
  }

  private positionQuickbar(rect: DOMRect): void {
    this.quickbar.style.display = 'flex';
    const quickbarWidth = this.quickbar.offsetWidth || 480;
    const left = clamp(rect.left, 8, Math.max(8, window.innerWidth - quickbarWidth - 8));
    const top = Math.max(8, rect.top - 42);
    this.quickbar.style.left = `${left}px`;
    this.quickbar.style.top = `${top}px`;
  }

  private positionSelectionHandles(tableRect: DOMRect): void {
    const tableNode = this.table ? this.view.state.doc.nodeAt(this.table.pos) : null;
    if (!this.table || !tableNode) return;
    const map = TableMap.get(tableNode);
    this.handleLayer.replaceChildren();
    this.handleLayer.style.display = 'block';

    const tableHandle = createHandle('doc-table-select-handle doc-table-all-handle', '표 전체 선택');
    tableHandle.dataset.kind = 'table';
    tableHandle.style.left = `${tableRect.left - 18}px`;
    tableHandle.style.top = `${tableRect.top - 18}px`;
    this.handleLayer.appendChild(tableHandle);

    const colEdges = columnEdgesFromDom(this.table.dom, map.width, tableRect);
    for (let col = 0; col < map.width; col++) {
      const edge = colEdges[col];
      if (!edge) continue;
      const handle = createHandle('doc-table-select-handle doc-table-col-handle', `${col + 1}열 선택`);
      handle.dataset.kind = 'col';
      handle.dataset.index = String(col);
      handle.style.left = `${edge.left}px`;
      handle.style.top = `${tableRect.top - 16}px`;
      handle.style.width = `${Math.max(16, edge.right - edge.left)}px`;
      this.handleLayer.appendChild(handle);

      const resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.className = 'doc-table-column-resize-handle';
      resizeHandle.dataset.columnIndex = String(col);
      resizeHandle.setAttribute('aria-label', `${col + 1}열 너비 조절`);
      resizeHandle.setAttribute('role', 'slider');
      resizeHandle.setAttribute('aria-valuemin', String(MIN_COLUMN_WIDTH));
      resizeHandle.setAttribute('aria-valuemax', String(MAX_COLUMN_WIDTH));
      resizeHandle.setAttribute('aria-valuenow', String(Math.round(edge.right - edge.left)));
      resizeHandle.title = `${col + 1}열 너비 조절`;
      resizeHandle.style.left = `${edge.right - 3}px`;
      resizeHandle.style.top = `${tableRect.top}px`;
      resizeHandle.style.height = `${tableRect.height}px`;
      this.handleLayer.appendChild(resizeHandle);
    }

    const rows = Array.from(this.table.dom.querySelectorAll<HTMLTableRowElement>('tr'));
    const rowPositions = tableRowPositions(tableNode, this.table.pos);
    rows.forEach((row, rowIndex) => {
      const rowRect = row.getBoundingClientRect();
      const handle = createHandle('doc-table-select-handle doc-table-row-handle', `${rowIndex + 1}행 선택`);
      handle.dataset.kind = 'row';
      handle.dataset.index = String(rowIndex);
      handle.style.left = `${tableRect.left - 16}px`;
      handle.style.top = `${rowRect.top}px`;
      handle.style.height = `${Math.max(16, rowRect.height)}px`;
      this.handleLayer.appendChild(handle);

      const resizeHandle = document.createElement('button');
      resizeHandle.type = 'button';
      resizeHandle.className = 'doc-table-row-resize-handle';
      resizeHandle.dataset.rowPos = String(rowPositions[rowIndex] ?? '');
      resizeHandle.dataset.rowIndex = String(rowIndex);
      resizeHandle.setAttribute('aria-label', `${rowIndex + 1}행 높이 조절`);
      resizeHandle.setAttribute('role', 'slider');
      resizeHandle.setAttribute('aria-valuemin', String(MIN_ROW_HEIGHT));
      resizeHandle.setAttribute('aria-valuemax', String(MAX_ROW_HEIGHT));
      resizeHandle.setAttribute('aria-valuenow', String(Math.round(rowRect.height)));
      resizeHandle.title = `${rowIndex + 1}행 높이 조절`;
      resizeHandle.style.left = `${tableRect.left}px`;
      resizeHandle.style.top = `${rowRect.bottom - 3}px`;
      resizeHandle.style.width = `${tableRect.width}px`;
      this.handleLayer.appendChild(resizeHandle);
    });
  }

  private hideOverlay(): void {
    this.grip.style.display = 'none';
    this.hideResizeGuide();
    this.quickbar.style.display = 'none';
    this.handleLayer.style.display = 'none';
    this.handleLayer.replaceChildren();
    this.hideMenu();
  }

  private readonly onHandleMouseDown = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.classList.contains('doc-table-column-resize-handle')) {
      this.startColumnResize(event, target);
      return;
    }
    if (target.classList.contains('doc-table-row-resize-handle')) {
      this.startRowResize(event, target);
      return;
    }
    if (!target.classList.contains('doc-table-select-handle')) return;
    event.preventDefault();
    event.stopPropagation();
    const kind = target.dataset.kind;
    const index = Number(target.dataset.index);
    if (kind === 'table') this.selectWholeTable();
    else if (kind === 'row' && Number.isInteger(index)) this.selectRow(index);
    else if (kind === 'col' && Number.isInteger(index)) this.selectColumn(index);
  };

  private readonly onHandleDoubleClick = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !this.table) return;
    if (target.classList.contains('doc-table-column-resize-handle')) {
      event.preventDefault();
      event.stopPropagation();
      this.autoFitColumn(target);
      return;
    }
    if (target.classList.contains('doc-table-row-resize-handle')) {
      event.preventDefault();
      event.stopPropagation();
      this.autoFitRow(target);
    }
  };

  private readonly onHandleKeyDown = (event: KeyboardEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.classList.contains('doc-table-column-resize-handle')) {
      this.onColumnResizeKeyDown(event, target);
      return;
    }
    if (target.classList.contains('doc-table-row-resize-handle')) {
      this.onRowResizeKeyDown(event, target);
    }
  };

  private readonly onQuickbarMouseDown = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest<HTMLButtonElement>('button[data-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled || button.getAttribute('aria-disabled') === 'true') return;
    this.runQuickbarAction(button.dataset.action ?? '');
  };

  private readonly onQuickbarInput = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    const action = target.dataset.colorAction;
    if (action === 'fill') {
      setSelectedCellAttrs(this.view, { backgroundColor: target.value }, this.lastCellPositions);
    } else if (action === 'border') {
      setSelectedCellAttrs(this.view, { borderColor: target.value, borderSize: 8 }, this.lastCellPositions);
    } else {
      return;
    }
    target.parentElement?.style.setProperty('color', target.value);
    this.view.focus();
    this.schedulePosition();
  };

  private runQuickbarAction(action: string): void {
    if (!this.table) return;
    const command = tableCommandForAction(action);
    if (command) this.runCommand(command);
    else this.runTableAttributeAction(action);
    this.view.focus();
    this.schedulePosition();
  }

  private runMenuAction(action: TableAction): void {
    const command = tableCommandForAction(action);
    if (command) {
      if (!this.canRunCommand(command)) return;
      this.runCommand(command);
      return;
    }
    if (this.runTableAttributeAction(action)) {
      this.hideMenu();
      this.view.focus();
      this.schedulePosition();
    }
  }

  private runTableAttributeAction(action: string): boolean {
    if (!this.table) return false;
    if (action === 'widthAuto') {
      setTableAttrs(this.view, this.table.pos, {
        tableWidth: null,
        tableWidthType: null,
        tableLayout: 'autofit',
      });
      return true;
    }
    if (action === 'widthFull') {
      setTableAttrs(this.view, this.table.pos, {
        tableWidth: 100,
        tableWidthType: 'percent',
        tableLayout: 'fixed',
      });
      return true;
    }
    if (action === 'alignLeft' || action === 'alignCenter' || action === 'alignRight') {
      setTableAttrs(this.view, this.table.pos, {
        tableAlign: action === 'alignLeft' ? 'left' : action === 'alignCenter' ? 'center' : 'right',
      });
      return true;
    }
    return false;
  }

  private startColumnResize(event: MouseEvent, target: HTMLElement): void {
    if (!this.table) return;
    const columnIndex = Number(target.dataset.columnIndex);
    if (!Number.isInteger(columnIndex)) return;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return;
    const widths = columnWidthsFromTableNode(tableNode, Array.isArray(tableNode.attrs.tableColumnWidths)
      ? tableNode.attrs.tableColumnWidths.map((value: unknown) => Number(value))
      : null);
    if (!widths?.[columnIndex]) return;

    event.preventDefault();
    event.stopPropagation();
    this.columnDragging = {
      tableDom: this.table.dom,
      tablePos: this.table.pos,
      columnIndex,
      startX: event.clientX,
      startWidth: widths[columnIndex],
      widths,
    };
    document.body.classList.add('doc-table-column-resizing');
    this.rowBadge.style.display = 'block';
    this.positionMeasureBadge(event.clientX, event.clientY, Math.round(widths[columnIndex]));
    this.showColumnGuide(target);
    document.addEventListener('mousemove', this.onColumnResizeMove);
    document.addEventListener('mouseup', this.onColumnResizeUp);
  }

  private readonly onColumnResizeMove = (event: MouseEvent) => {
    if (!this.columnDragging) return;
    event.preventDefault();
    const width = Math.round(clamp(
      this.columnDragging.startWidth + event.clientX - this.columnDragging.startX,
      MIN_COLUMN_WIDTH,
      MAX_COLUMN_WIDTH,
    ));
    const nextWidths = this.columnDragging.widths.map((item, index) => (
      index === this.columnDragging?.columnIndex ? width : item
    ));
    resizeTableColumn(this.view, this.columnDragging.tablePos, this.columnDragging.columnIndex, nextWidths);
    applyTableColumnWidthsToDom(this.columnDragging.tableDom, nextWidths);
    this.positionMeasureBadge(event.clientX, event.clientY, width);
    const rect = this.columnDragging.tableDom.getBoundingClientRect();
    this.grip.style.left = `${rect.right - 5}px`;
    this.showColumnGuideAt(rect.left + nextWidths.slice(0, this.columnDragging.columnIndex + 1).reduce((sum, item) => sum + item, 0), rect);
    this.schedulePosition();
  };

  private readonly onColumnResizeUp = () => {
    this.columnDragging = null;
    this.rowBadge.style.display = 'none';
    this.hideResizeGuide();
    document.body.classList.remove('doc-table-column-resizing');
    document.removeEventListener('mousemove', this.onColumnResizeMove);
    document.removeEventListener('mouseup', this.onColumnResizeUp);
    this.view.focus();
    this.schedulePosition();
  };

  private startRowResize(event: MouseEvent, target: HTMLElement): void {
    if (!this.table) return;
    const rowIndex = Number(target.dataset.rowIndex);
    const rowPos = Number(target.dataset.rowPos);
    if (!Number.isInteger(rowIndex) || !Number.isFinite(rowPos) || rowPos <= 0) return;
    const rowDom = this.table.dom.querySelectorAll<HTMLTableRowElement>('tr')[rowIndex];
    if (!rowDom) return;

    event.preventDefault();
    event.stopPropagation();
    const rect = rowDom.getBoundingClientRect();
    this.rowDragging = {
      rowDom,
      rowPos,
      startY: event.clientY,
      startHeight: rowDom.offsetHeight || rect.height,
    };
    document.body.classList.add('doc-table-row-resizing');
    this.rowBadge.style.display = 'block';
    this.positionRowBadge(rect.right, rect.bottom, Math.round(rect.height));
    this.showRowGuide(rect.bottom, this.table.dom.getBoundingClientRect());
    document.addEventListener('mousemove', this.onRowResizeMove);
    document.addEventListener('mouseup', this.onRowResizeUp);
  }

  private readonly onRowResizeMove = (event: MouseEvent) => {
    if (!this.rowDragging) return;
    event.preventDefault();
    const height = Math.round(clamp(
      this.rowDragging.startHeight + event.clientY - this.rowDragging.startY,
      MIN_ROW_HEIGHT,
      MAX_ROW_HEIGHT,
    ));
    setTableRowAttrs(this.view, this.rowDragging.rowPos, {
      rowHeight: height,
      rowHeightRule: 'exact',
    });
    applyTableRowDomHeight(this.rowDragging.rowDom, height, 'exact');
    const rect = this.rowDragging.rowDom.getBoundingClientRect();
    this.positionRowBadge(rect.right, rect.bottom, height);
    if (this.table) this.showRowGuide(rect.bottom, this.table.dom.getBoundingClientRect());
    this.schedulePosition();
  };

  private readonly onRowResizeUp = () => {
    this.rowDragging = null;
    this.rowBadge.style.display = 'none';
    this.hideResizeGuide();
    document.body.classList.remove('doc-table-row-resizing');
    document.removeEventListener('mousemove', this.onRowResizeMove);
    document.removeEventListener('mouseup', this.onRowResizeUp);
    this.view.focus();
    this.schedulePosition();
  };

  private positionRowBadge(x: number, y: number, height: number): void {
    this.positionMeasureBadge(x, y, height);
  }

  private positionMeasureBadge(x: number, y: number, value: number): void {
    this.rowBadge.textContent = `${value}px`;
    this.rowBadge.style.left = `${Math.min(x + 8, window.innerWidth - 58)}px`;
    this.rowBadge.style.top = `${Math.min(y - 12, window.innerHeight - 28)}px`;
  }

  private autoFitColumn(target: HTMLElement): void {
    if (!this.table) return;
    const columnIndex = Number(target.dataset.columnIndex);
    if (!Number.isInteger(columnIndex)) return;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return;
    const widths = columnWidthsFromTableNode(tableNode, Array.isArray(tableNode.attrs.tableColumnWidths)
      ? tableNode.attrs.tableColumnWidths.map((value: unknown) => Number(value))
      : null);
    if (!widths?.[columnIndex]) return;
    const next = widths.slice();
    next[columnIndex] = measureColumnContentWidth(this.table.dom, columnIndex, widths[columnIndex]);
    resizeTableColumn(this.view, this.table.pos, columnIndex, next);
    applyTableColumnWidthsToDom(this.table.dom, next);
    this.rowBadge.style.display = 'block';
    this.positionMeasureBadge(target.getBoundingClientRect().left, target.getBoundingClientRect().top, next[columnIndex]);
    window.setTimeout(() => {
      this.rowBadge.style.display = 'none';
    }, 650);
    this.view.focus();
    this.schedulePosition();
  }

  private onColumnResizeKeyDown(event: KeyboardEvent, target: HTMLElement): void {
    if (!this.table) return;
    const columnIndex = Number(target.dataset.columnIndex);
    if (!Number.isInteger(columnIndex)) return;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return;
    const widths = columnWidthsFromTableNode(tableNode, Array.isArray(tableNode.attrs.tableColumnWidths)
      ? tableNode.attrs.tableColumnWidths.map((value: unknown) => Number(value))
      : null);
    if (!widths?.[columnIndex]) return;

    const step = event.shiftKey ? 50 : 10;
    let nextWidth: number | null = null;
    if (event.key === 'ArrowLeft') nextWidth = widths[columnIndex] - step;
    else if (event.key === 'ArrowRight') nextWidth = widths[columnIndex] + step;
    else if (event.key === 'Home') nextWidth = MIN_COLUMN_WIDTH;
    else if (event.key === 'End') nextWidth = Math.min(MAX_COLUMN_WIDTH, tableMaxWidth(this.view));
    else return;

    event.preventDefault();
    event.stopPropagation();
    const next = widths.slice();
    next[columnIndex] = Math.round(clamp(nextWidth, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH));
    resizeTableColumn(this.view, this.table.pos, columnIndex, next);
    applyTableColumnWidthsToDom(this.table.dom, next);
    this.flashMeasureBadge(target, next[columnIndex]);
    this.showColumnGuide(target);
    target.setAttribute('aria-valuenow', String(next[columnIndex]));
    this.schedulePosition();
  }

  private autoFitRow(target: HTMLElement): void {
    const rowPos = Number(target.dataset.rowPos);
    const rowIndex = Number(target.dataset.rowIndex);
    if (!Number.isFinite(rowPos) || rowPos <= 0 || !Number.isInteger(rowIndex) || !this.table) return;
    const row = this.table.dom.querySelectorAll<HTMLTableRowElement>('tr')[rowIndex];
    setTableRowAttrs(this.view, rowPos, {
      rowHeight: null,
      rowHeightRule: null,
    });
    if (row) applyTableRowDomHeightAuto(row);
    this.view.focus();
    this.schedulePosition();
  }

  private onRowResizeKeyDown(event: KeyboardEvent, target: HTMLElement): void {
    if (!this.table) return;
    const rowPos = Number(target.dataset.rowPos);
    const rowIndex = Number(target.dataset.rowIndex);
    if (!Number.isFinite(rowPos) || rowPos <= 0 || !Number.isInteger(rowIndex)) return;
    const row = this.table.dom.querySelectorAll<HTMLTableRowElement>('tr')[rowIndex];
    if (!row) return;

    const rect = row.getBoundingClientRect();
    const current = row.offsetHeight || rect.height || MIN_ROW_HEIGHT;
    const step = event.shiftKey ? 24 : 6;
    let nextHeight: number | null = null;
    if (event.key === 'ArrowUp') nextHeight = current - step;
    else if (event.key === 'ArrowDown') nextHeight = current + step;
    else if (event.key === 'Home') nextHeight = MIN_ROW_HEIGHT;
    else if (event.key === 'End') nextHeight = Math.min(MAX_ROW_HEIGHT, current + 120);
    else return;

    event.preventDefault();
    event.stopPropagation();
    const height = Math.round(clamp(nextHeight, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT));
    setTableRowAttrs(this.view, rowPos, {
      rowHeight: height,
      rowHeightRule: 'exact',
    });
    applyTableRowDomHeight(row, height, 'exact');
    this.flashMeasureBadge(target, height);
    this.showRowGuide(row.getBoundingClientRect().bottom, this.table.dom.getBoundingClientRect());
    target.setAttribute('aria-valuenow', String(height));
    this.schedulePosition();
  }

  private flashMeasureBadge(target: HTMLElement, value: number): void {
    const rect = target.getBoundingClientRect();
    this.rowBadge.style.display = 'block';
    this.positionMeasureBadge(rect.right, rect.bottom, Math.round(value));
    window.setTimeout(() => {
      if (!this.columnDragging && !this.rowDragging) this.rowBadge.style.display = 'none';
      this.hideResizeGuide();
    }, 650);
  }

  private showColumnGuide(target: HTMLElement): void {
    if (!this.table) return;
    const targetRect = target.getBoundingClientRect();
    this.showColumnGuideAt(targetRect.left + targetRect.width / 2, this.table.dom.getBoundingClientRect());
  }

  private showColumnGuideAt(x: number, tableRect: DOMRect): void {
    this.resizeGuide.style.display = 'block';
    this.resizeGuide.className = 'doc-table-resize-guide doc-table-resize-guide-column';
    this.resizeGuide.style.left = `${x - 1}px`;
    this.resizeGuide.style.top = `${tableRect.top}px`;
    this.resizeGuide.style.width = '2px';
    this.resizeGuide.style.height = `${tableRect.height}px`;
  }

  private showRowGuide(y: number, tableRect: DOMRect): void {
    this.resizeGuide.style.display = 'block';
    this.resizeGuide.className = 'doc-table-resize-guide doc-table-resize-guide-row';
    this.resizeGuide.style.left = `${tableRect.left}px`;
    this.resizeGuide.style.top = `${y - 1}px`;
    this.resizeGuide.style.width = `${tableRect.width}px`;
    this.resizeGuide.style.height = '2px';
  }

  private hideResizeGuide(): void {
    this.resizeGuide.style.display = 'none';
  }

  private readonly onEditorMouseDown = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    if (mouseEvent.button !== 0) return;
    if (mouseEvent.shiftKey || mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.altKey) return;
    const target = mouseEvent.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest('button, input, textarea, select, a, .doc-table-select-handle, .doc-table-row-resize-handle, .doc-table-column-resize-handle, .column-resize-handle')) return;
    const cell = target.closest('td, th');
    if (!(cell instanceof HTMLElement) || !this.view.dom.contains(cell)) return;
    const anchorCell = cellPositionFromDom(this.view, cell);
    if (anchorCell == null) return;
    this.lastCellPositions = [anchorCell];
    this.rangeDrag = { anchorCell, moved: false };
    document.addEventListener('mousemove', this.onRangeMouseMove);
    document.addEventListener('mouseup', this.onRangeMouseUp);
  };

  private readonly onRangeMouseMove = (event: MouseEvent) => {
    if (!this.rangeDrag) return;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!(target instanceof HTMLElement)) return;
    const cell = target.closest('td, th');
    if (!(cell instanceof HTMLElement) || !this.view.dom.contains(cell)) return;
    const headCell = cellPositionFromDom(this.view, cell);
    if (headCell == null || headCell === this.rangeDrag.anchorCell) return;
    event.preventDefault();
    this.rangeDrag.moved = true;
    document.body.classList.add('doc-table-selecting');
    const selection = CellSelection.create(this.view.state.doc, this.rangeDrag.anchorCell, headCell);
    if (!selection.eq(this.view.state.selection)) {
      this.view.dispatch(this.view.state.tr.setSelection(selection));
      this.table = findTableFromDomTarget(this.view, cell) ?? this.table;
      this.schedulePosition();
    }
  };

  private readonly onRangeMouseUp = () => {
    document.removeEventListener('mousemove', this.onRangeMouseMove);
    document.removeEventListener('mouseup', this.onRangeMouseUp);
    document.body.classList.remove('doc-table-selecting');
    this.rangeDrag = null;
    this.view.focus();
    this.schedulePosition();
  };

  private readonly onContextMenu = (event: Event) => {
    const mouseEvent = event as MouseEvent;
    const target = mouseEvent.target;
    if (!(target instanceof HTMLElement)) return;
    const table = target.closest('table');
    if (!table || !this.view.dom.contains(table)) return;
    const found = findTableFromDomTarget(this.view, target);
    if (found) this.table = found;
    if (!this.table) return;
    mouseEvent.preventDefault();
    this.selectContextCellIfNeeded(target);
    this.refreshCommandStates();
    this.showMenu(mouseEvent.clientX, mouseEvent.clientY);
    this.positionOverlay();
  };

  private readonly onDocumentMouseDown = (event: MouseEvent) => {
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (this.menu.contains(target)) return;
    this.hideMenu();
  };

  private showMenu(x: number, y: number): void {
    this.menu.style.display = 'block';
    const width = 180;
    const height = 300;
    this.menu.style.left = `${Math.min(x, window.innerWidth - width - 8)}px`;
    this.menu.style.top = `${Math.min(y, window.innerHeight - height - 8)}px`;
  }

  private hideMenu(): void {
    this.menu.style.display = 'none';
  }

  private runCommand(command: TableCommand): void {
    const didRun = command(this.view.state, this.view.dispatch);
    if (!didRun) {
      this.refreshCommandStates();
      return;
    }
    this.hideMenu();
    this.view.focus();
    this.schedulePosition();
  }

  private canRunCommand(command: TableCommand): boolean {
    return command(this.view.state);
  }

  private refreshCommandStates(): void {
    const buttons = [
      ...Array.from(this.quickbar.querySelectorAll<HTMLButtonElement>('button[data-action]')),
      ...Array.from(this.menu.querySelectorAll<HTMLButtonElement>('button[data-action]')),
    ];
    for (const button of buttons) {
      const action = button.dataset.action;
      const command = action ? tableCommandForAction(action) : null;
      const disabled = command ? !this.canRunCommand(command) : false;
      button.disabled = disabled;
      button.setAttribute('aria-disabled', String(disabled));
    }
  }

  private refreshColorControls(): void {
    const positions = selectedCellPositions(this.view, false);
    if (positions.length > 0) this.lastCellPositions = positions;
    const attrs = getActiveCellAttrs(this.view) ?? getCellAttrsAt(this.view, this.lastCellPositions[0]);
    const fill = this.quickbar.querySelector<HTMLInputElement>('input[data-color-action="fill"]');
    const border = this.quickbar.querySelector<HTMLInputElement>('input[data-color-action="border"]');
    if (fill) {
      fill.value = colorValue(attrs?.backgroundColor) ?? '#ffffff';
      fill.parentElement?.style.setProperty('color', fill.value);
    }
    if (border) {
      border.value = colorValue(attrs?.borderColor) ?? '#d0d0d0';
      border.parentElement?.style.setProperty('color', border.value);
    }
  }

  private selectContextCellIfNeeded(target: HTMLElement): void {
    const cell = target.closest('td, th');
    if (!(cell instanceof HTMLElement) || !this.view.dom.contains(cell)) return;
    const cellPos = cellPositionFromDom(this.view, cell);
    if (cellPos == null) return;
    const { selection } = this.view.state;
    if (selection instanceof CellSelection && cellSelectionContains(selection, cellPos)) return;
    this.applyCellSelection(cellPos, cellPos);
  }

  private selectWholeTable(): void {
    const range = this.selectionRangeForTable();
    if (!range) return;
    this.applyCellSelection(range.first, range.last);
  }

  private selectRow(row: number): void {
    const range = this.selectionRangeForRow(row);
    if (!range) return;
    const selection = CellSelection.rowSelection(
      this.view.state.doc.resolve(range.first),
      this.view.state.doc.resolve(range.last),
    );
    this.view.dispatch(this.view.state.tr.setSelection(selection));
    this.lastCellPositions = selectedCellPositions(this.view);
    this.view.focus();
    this.schedulePosition();
  }

  private selectColumn(col: number): void {
    const range = this.selectionRangeForColumn(col);
    if (!range) return;
    const selection = CellSelection.colSelection(
      this.view.state.doc.resolve(range.first),
      this.view.state.doc.resolve(range.last),
    );
    this.view.dispatch(this.view.state.tr.setSelection(selection));
    this.lastCellPositions = selectedCellPositions(this.view);
    this.view.focus();
    this.schedulePosition();
  }

  private applyCellSelection(first: number, last: number): void {
    const selection = CellSelection.create(this.view.state.doc, first, last);
    this.view.dispatch(this.view.state.tr.setSelection(selection));
    this.lastCellPositions = selectedCellPositions(this.view);
    this.view.focus();
    this.schedulePosition();
  }

  private selectionRangeForTable(): { first: number; last: number } | null {
    if (!this.table) return null;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return null;
    const map = TableMap.get(tableNode);
    return {
      first: this.table.pos + 1 + map.positionAt(0, 0, tableNode),
      last: this.table.pos + 1 + map.positionAt(map.height - 1, map.width - 1, tableNode),
    };
  }

  private selectionRangeForRow(row: number): { first: number; last: number } | null {
    if (!this.table) return null;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return null;
    const map = TableMap.get(tableNode);
    const safeRow = clamp(row, 0, map.height - 1);
    return {
      first: this.table.pos + 1 + map.positionAt(safeRow, 0, tableNode),
      last: this.table.pos + 1 + map.positionAt(safeRow, map.width - 1, tableNode),
    };
  }

  private selectionRangeForColumn(col: number): { first: number; last: number } | null {
    if (!this.table) return null;
    const tableNode = this.view.state.doc.nodeAt(this.table.pos);
    if (!tableNode) return null;
    const map = TableMap.get(tableNode);
    const safeCol = clamp(col, 0, map.width - 1);
    return {
      first: this.table.pos + 1 + map.positionAt(0, safeCol, tableNode),
      last: this.table.pos + 1 + map.positionAt(map.height - 1, safeCol, tableNode),
    };
  }

  private readonly onPointerDown = (event: PointerEvent) => {
    if (!this.table) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = this.table.dom.getBoundingClientRect();
    const scale = rect.width > 0 && this.table.dom.offsetWidth > 0
      ? rect.width / this.table.dom.offsetWidth
      : 1;
    this.dragging = {
      dom: this.table.dom,
      tablePos: this.table.pos,
      startX: event.clientX,
      startWidth: this.table.dom.offsetWidth || rect.width,
      scale,
      maxWidth: tableMaxWidth(this.view),
    };
    this.grip.classList.add('doc-table-width-grip-dragging');
    document.body.classList.add('doc-table-resizing');
    this.badge.textContent = `${Math.round(rect.width)}px`;
    this.showColumnGuideAt(rect.right, rect);
    this.grip.setPointerCapture?.(event.pointerId);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    document.addEventListener('mousemove', this.onPointerMove);
    document.addEventListener('mouseup', this.onPointerUp);
  };

  private readonly onPointerMove = (event: PointerEvent | MouseEvent) => {
    if (!this.dragging) return;
    event.preventDefault();
    const dx = (event.clientX - this.dragging.startX) / Math.max(0.25, this.dragging.scale);
    const width = Math.round(clamp(this.dragging.startWidth + dx, MIN_TABLE_WIDTH, this.dragging.maxWidth));
    setTableAttrs(this.view, this.dragging.tablePos, {
      tableWidth: width,
      tableWidthType: 'px',
      tableLayout: 'fixed',
    });
    applyTableDomWidth(this.dragging.dom, width);
    this.grip.setAttribute('aria-valuenow', String(width));
    this.badge.textContent = `${width}px`;
    this.showColumnGuideAt(this.dragging.dom.getBoundingClientRect().right, this.dragging.dom.getBoundingClientRect());
    this.schedulePosition();
  };

  private readonly onPointerUp = () => {
    this.dragging = null;
    this.grip.classList.remove('doc-table-width-grip-dragging');
    this.hideResizeGuide();
    document.body.classList.remove('doc-table-resizing');
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
    document.removeEventListener('mousemove', this.onPointerMove);
    document.removeEventListener('mouseup', this.onPointerUp);
    this.view.focus();
    this.schedulePosition();
  };

  private readonly onWidthGripKeyDown = (event: KeyboardEvent) => {
    if (!this.table) return;
    const rect = this.table.dom.getBoundingClientRect();
    const maxWidth = tableMaxWidth(this.view);
    const current = this.table.dom.offsetWidth || rect.width || MIN_TABLE_WIDTH;
    const step = event.shiftKey ? 50 : 10;
    let width: number | null = null;

    if (event.key === 'ArrowLeft') width = current - step;
    else if (event.key === 'ArrowRight') width = current + step;
    else if (event.key === 'Home') width = MIN_TABLE_WIDTH;
    else if (event.key === 'End') width = maxWidth;
    else return;

    event.preventDefault();
    event.stopPropagation();
    const nextWidth = Math.round(clamp(width, MIN_TABLE_WIDTH, maxWidth));
    setTableAttrs(this.view, this.table.pos, {
      tableWidth: nextWidth,
      tableWidthType: 'px',
      tableLayout: 'fixed',
    });
    applyTableDomWidth(this.table.dom, nextWidth);
    this.grip.setAttribute('aria-valuenow', String(nextWidth));
    this.badge.textContent = `${nextWidth}px`;
    this.grip.classList.add('doc-table-width-grip-dragging');
    this.showColumnGuideAt(this.table.dom.getBoundingClientRect().right, this.table.dom.getBoundingClientRect());
    window.setTimeout(() => {
      this.grip.classList.remove('doc-table-width-grip-dragging');
      this.hideResizeGuide();
    }, 650);
    this.schedulePosition();
  };

  private readonly onWidthGripDoubleClick = (event: MouseEvent) => {
    if (!this.table) return;
    event.preventDefault();
    event.stopPropagation();
    setTableAttrs(this.view, this.table.pos, {
      tableWidth: 100,
      tableWidthType: 'percent',
      tableLayout: 'fixed',
    });
    this.view.focus();
    this.schedulePosition();
  };
}

function createHandle(className: string, label: string): HTMLButtonElement {
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = className;
  handle.setAttribute('aria-label', label);
  handle.title = label;
  return handle;
}

function createColorControl(action: 'fill' | 'border', label: string, value: string): HTMLLabelElement {
  const control = document.createElement('label');
  control.className = `doc-table-quickbar-color doc-table-quickbar-color-${action}`;
  control.title = label;
  control.setAttribute('aria-label', label);

  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.dataset.colorAction = action;
  input.setAttribute('aria-label', label);
  control.appendChild(input);
  return control;
}

function findCurrentTable(view: EditorView): CurrentTable | null {
  const { state } = view;
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name !== 'table') continue;
    const pos = $from.before(depth);
    const dom = view.nodeDOM(pos);
    const table = dom instanceof HTMLTableElement
      ? dom
      : dom instanceof HTMLElement
        ? dom.querySelector<HTMLElement>('table') ?? dom
        : null;
    return table ? { pos, dom: table } : null;
  }
  return null;
}

function findTableFromDomTarget(view: EditorView, target: HTMLElement): CurrentTable | null {
  try {
    const pos = view.posAtDOM(target, 0);
    const $pos = view.state.doc.resolve(Math.max(0, Math.min(pos, view.state.doc.content.size)));
    for (let depth = $pos.depth; depth > 0; depth--) {
      const node = $pos.node(depth);
      if (node.type.name !== 'table') continue;
      const tablePos = $pos.before(depth);
      const dom = view.nodeDOM(tablePos);
      const table = dom instanceof HTMLTableElement
        ? dom
        : dom instanceof HTMLElement
          ? dom.querySelector<HTMLElement>('table') ?? dom
          : null;
      return table ? { pos: tablePos, dom: table } : null;
    }
  } catch {
    return null;
  }
  return null;
}

function cellPositionFromDom(view: EditorView, cell: HTMLElement): number | null {
  try {
    const row = cell.closest('tr');
    const table = cell.closest('table');
    if (!row || !table) return null;
    const found = findTableByDom(view, table);
    if (!found) return null;
    const tableNode = view.state.doc.nodeAt(found.pos);
    if (!tableNode) return null;
    const rowIndex = Array.from(table.querySelectorAll('tr')).indexOf(row);
    if (rowIndex < 0) return null;
    let columnIndex = 0;
    for (const sibling of Array.from(row.children)) {
      if (sibling === cell) break;
      columnIndex += Math.max(1, Number((sibling as HTMLElement).getAttribute('colspan')) || 1);
    }
    const map = TableMap.get(tableNode);
    return found.pos + 1 + map.positionAt(
      clamp(rowIndex, 0, map.height - 1),
      clamp(columnIndex, 0, map.width - 1),
      tableNode,
    );
  } catch {
    return null;
  }
}

function findTableByDom(view: EditorView, table: HTMLTableElement): CurrentTable | null {
  let found: CurrentTable | null = null;
  view.state.doc.descendants((node, pos) => {
    if (found || node.type.name !== 'table') return false;
    const dom = view.nodeDOM(pos);
    const tableDom = dom instanceof HTMLTableElement
      ? dom
      : dom instanceof HTMLElement
        ? dom.querySelector<HTMLElement>('table')
        : null;
    if (tableDom === table) {
      found = { pos, dom: table };
      return false;
    }
    return true;
  });
  return found;
}

function cellSelectionContains(selection: CellSelection, cellPos: number): boolean {
  let found = false;
  selection.forEachCell((_node, pos) => {
    if (pos === cellPos) found = true;
  });
  return found;
}

function getActiveCellAttrs(view: EditorView): Record<string, unknown> | null {
  const { selection, doc } = view.state;
  const pos = selection instanceof CellSelection
    ? selection.$anchorCell.pos
    : cellPositionFromSelection(selection.$from);
  if (pos == null) return null;
  const node = doc.nodeAt(pos);
  return node?.attrs ?? null;
}

function getCellAttrsAt(view: EditorView, pos: number | undefined): Record<string, unknown> | null {
  if (pos == null) return null;
  const node = view.state.doc.nodeAt(pos);
  if (!node || (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader')) return null;
  return node.attrs;
}

function selectedCellPositions(view: EditorView, includeTextSelection = true): number[] {
  const { state } = view;
  const { selection } = state;
  const positions: number[] = [];
  if (selection instanceof CellSelection) {
    selection.forEachCell((_node, pos) => positions.push(pos));
  } else if (includeTextSelection) {
    const cellPos = cellPositionFromSelection(selection.$from);
    if (cellPos != null) positions.push(cellPos);
  }
  return positions;
}

function setSelectedCellAttrs(view: EditorView, attrs: Record<string, unknown>, fallbackPositions: number[] = []): void {
  const { state } = view;
  const positions = selectedCellPositions(view, false);
  if (fallbackPositions.length > 0) {
    positions.push(...fallbackPositions);
  } else {
    positions.push(...selectedCellPositions(view, true));
  }
  const uniquePositions = Array.from(new Set(positions));
  if (uniquePositions.length === 0) return;

  let tr = state.tr;
  for (const pos of uniquePositions) {
    const node = tr.doc.nodeAt(pos);
    if (!node || (node.type.name !== 'tableCell' && node.type.name !== 'tableHeader')) continue;
    tr = tr.setNodeMarkup(pos, undefined, {
      ...node.attrs,
      ...attrs,
    });
  }
  if (tr.docChanged) view.dispatch(tr);
}

function cellPositionFromSelection($from: ResolvedPos): number | null {
  for (let depth = $from.depth; depth > 0; depth--) {
    const node = $from.node(depth);
    if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
      return $from.before(depth);
    }
  }
  return null;
}

function colorValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) {
    const [, r, g, b] = value;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return null;
}

function setTableAttrs(view: EditorView, pos: number, attrs: Record<string, unknown>): void {
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'table') return;
  const nextAttrs = { ...node.attrs, ...attrs };
  const tr = view.state.tr.setNodeMarkup(pos, undefined, nextAttrs);
  view.dispatch(tr);
  applyTableAttrsToDom(view, pos, nextAttrs);
}

function resizeTableColumn(view: EditorView, tablePos: number, columnIndex: number, widths: number[]): void {
  const tableNode = view.state.doc.nodeAt(tablePos);
  if (!tableNode || tableNode.type.name !== 'table') return;
  let tr = view.state.tr.setNodeMarkup(tablePos, undefined, {
    ...tableNode.attrs,
    tableColumnWidths: widths,
    tableWidth: widths.reduce((sum, width) => sum + width, 0),
    tableWidthType: 'px',
    tableLayout: 'fixed',
  });

  tableNode.content.forEach((row, rowOffset) => {
    if (row.type.name !== 'tableRow') return;
    const rowPos = tablePos + 1 + rowOffset;
    let currentColumn = 0;
    row.content.forEach((cell, cellOffset) => {
      if (cell.type.name !== 'tableCell' && cell.type.name !== 'tableHeader') return;
      const colspan = positiveInt(cell.attrs?.colspan) ?? 1;
      const startsBeforeOrAt = currentColumn <= columnIndex;
      const endsAfter = currentColumn + colspan > columnIndex;
      if (startsBeforeOrAt && endsAfter) {
        const cellPos = rowPos + 1 + cellOffset;
        const colwidth = widths.slice(currentColumn, currentColumn + colspan);
        tr = tr.setNodeMarkup(cellPos, undefined, {
          ...cell.attrs,
          colwidth,
        });
      }
      currentColumn += colspan;
    });
  });

  view.dispatch(tr);
}

function setTableRowAttrs(view: EditorView, pos: number, attrs: Record<string, unknown>): void {
  const node = view.state.doc.nodeAt(pos);
  if (!node || node.type.name !== 'tableRow') return;
  const nextAttrs = { ...node.attrs, ...attrs };
  const tr = view.state.tr.setNodeMarkup(pos, undefined, nextAttrs);
  view.dispatch(tr);
}

function applyTableDomWidth(table: HTMLElement, width: number): void {
  table.style.width = `${width}px`;
  table.style.tableLayout = 'fixed';
  table.setAttribute('data-table-width', String(width));
  table.setAttribute('data-table-width-type', 'px');
  table.setAttribute('data-table-layout', 'fixed');
}

function applyTableColumnWidthsToDom(table: HTMLElement, widths: number[]): void {
  const total = widths.reduce((sum, width) => sum + width, 0);
  table.style.width = `${total}px`;
  table.style.tableLayout = 'fixed';
  table.setAttribute('data-table-width', String(total));
  table.setAttribute('data-table-width-type', 'px');
  table.setAttribute('data-table-layout', 'fixed');
  table.setAttribute('data-table-column-widths', widths.join(','));

  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tr'));
  for (const row of rows) {
    let currentColumn = 0;
    for (const cell of Array.from(row.children)) {
      if (!(cell instanceof HTMLElement)) continue;
      const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
      const cellWidths = widths.slice(currentColumn, currentColumn + colspan);
      const cellWidth = cellWidths.reduce((sum, width) => sum + width, 0);
      if (cellWidth > 0) {
        cell.style.width = `${cellWidth}px`;
        cell.setAttribute('colwidth', cellWidths.join(','));
      }
      currentColumn += colspan;
    }
  }
}

function applyTableRowDomHeight(row: HTMLTableRowElement, height: number, rule: 'exact' | 'atLeast'): void {
  row.style.height = rule === 'exact' ? `${height}px` : '';
  row.style.minHeight = rule === 'atLeast' ? `${height}px` : '';
  row.setAttribute('data-row-height', String(height));
  row.setAttribute('data-row-height-rule', rule);
  row.setAttribute('height', String(height));
}

function applyTableRowDomHeightAuto(row: HTMLTableRowElement): void {
  row.style.height = '';
  row.style.minHeight = '';
  row.removeAttribute('data-row-height');
  row.removeAttribute('data-row-height-rule');
  row.removeAttribute('height');
}

function measureColumnContentWidth(table: HTMLElement, columnIndex: number, fallback: number): number {
  let measured = 0;
  const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tr'));
  for (const row of rows) {
    let currentColumn = 0;
    for (const cell of Array.from(row.children)) {
      if (!(cell instanceof HTMLElement)) continue;
      const colspan = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
      const coversColumn = currentColumn <= columnIndex && currentColumn + colspan > columnIndex;
      if (coversColumn && colspan === 1) {
        measured = Math.max(measured, cell.scrollWidth + 24);
      }
      currentColumn += colspan;
    }
  }
  return Math.round(clamp(measured || fallback, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH));
}

function applyTableAttrsToDom(view: EditorView, pos: number, attrs: Record<string, unknown>): void {
  const dom = view.nodeDOM(pos);
  const table = dom instanceof HTMLTableElement
    ? dom
    : dom instanceof HTMLElement
      ? dom.querySelector<HTMLElement>('table') ?? dom
      : null;
  if (!table) return;

  const width = positiveInt(attrs.tableWidth);
  const widthType = attrs.tableWidthType === 'percent' ? 'percent' : attrs.tableWidthType === 'px' ? 'px' : null;
  const layout = attrs.tableLayout === 'fixed' ? 'fixed' : attrs.tableLayout === 'autofit' ? 'autofit' : null;
  const align = attrs.tableAlign === 'left' || attrs.tableAlign === 'center' || attrs.tableAlign === 'right'
    ? attrs.tableAlign
    : null;

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
}

function tableRowPositions(tableNode: PMNode, tablePos: number): number[] {
  const positions: number[] = [];
  tableNode.content.forEach((row, offset, index) => {
    if (row.type.name === 'tableRow') positions[index] = tablePos + 1 + offset;
  });
  return positions;
}

function columnEdgesFromDom(table: HTMLElement, width: number, tableRect: DOMRect): Array<{ left: number; right: number }> {
  const edges: Array<{ left: number; right: number }> = [];
  const firstRow = table.querySelector<HTMLTableRowElement>('tr');
  if (!firstRow) return fallbackColumnEdges(width, tableRect);
  let col = 0;
  for (const cell of Array.from(firstRow.children)) {
    if (!(cell instanceof HTMLElement)) continue;
    const rect = cell.getBoundingClientRect();
    const span = Math.max(1, Number(cell.getAttribute('colspan')) || 1);
    const segment = rect.width / span;
    for (let i = 0; i < span && col < width; i++) {
      edges[col] = {
        left: rect.left + segment * i,
        right: rect.left + segment * (i + 1),
      };
      col++;
    }
  }
  return edges.length === width ? edges : fallbackColumnEdges(width, tableRect);
}

function fallbackColumnEdges(width: number, tableRect: DOMRect): Array<{ left: number; right: number }> {
  const colWidth = tableRect.width / Math.max(1, width);
  return Array.from({ length: width }, (_, col) => ({
    left: tableRect.left + colWidth * col,
    right: tableRect.left + colWidth * (col + 1),
  }));
}

function tableMaxWidth(view: EditorView): number {
  const contentWidth = view.dom instanceof HTMLElement ? view.dom.clientWidth : 0;
  return clamp(contentWidth || MAX_TABLE_WIDTH, MIN_TABLE_WIDTH, MAX_TABLE_WIDTH);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
