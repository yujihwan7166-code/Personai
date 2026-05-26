import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import type { JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { CellSelection, TableMap } from '@tiptap/pm/tables';
import StarterKit from '@tiptap/starter-kit';
import { RichTable } from '@/lib/cloudDoc/tiptap/RichTable';
import { RichTableRow } from '@/lib/cloudDoc/tiptap/RichTableRow';
import { RichTableCell, RichTableHeader } from '@/lib/cloudDoc/tiptap/RichTableCell';
import { ParagraphIndent } from '@/lib/cloudDoc/tiptap/ParagraphIndent';
import { ParagraphSpacing } from '@/lib/cloudDoc/tiptap/ParagraphSpacing';
import { ParagraphTabs } from '@/lib/cloudDoc/tiptap/ParagraphTabs';
import { TableEditingOverlay } from '@/lib/cloudDoc/tiptap/TableEditingOverlay';
import {
  getCurrentTableRowAttributes,
  updateCurrentTableAttributes,
  updateSelectedTableRowAttributes,
} from '@/lib/cloudDoc/tableEditing';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function createEditor(content: string): Editor {
  editor = new Editor({
    element: document.createElement('div'),
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
      }),
      RichTable.configure({ resizable: true, HTMLAttributes: { class: 'doc-table' } }),
      RichTableRow,
      RichTableHeader,
      RichTableCell,
      TableEditingOverlay,
      ParagraphIndent,
      ParagraphSpacing,
      ParagraphTabs,
    ],
    content,
  });
  return editor;
}

function createTableDoc(rows = 2, cols = 2): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: Array.from({ length: rows }, (_, row) => ({
          type: 'tableRow',
          content: Array.from({ length: cols }, (_, col) => ({
            type: 'tableCell',
            attrs: { colspan: 1, rowspan: 1, colwidth: null },
            content: [{ type: 'paragraph', content: [{ type: 'text', text: `${row + 1},${col + 1}` }] }],
          })),
        })),
      },
    ],
  };
}

function findTableNode(ed: Editor): { node: PMNode; pos: number } {
  let found: { node: PMNode; pos: number } | null = null;
  ed.state.doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      found = { node, pos };
      return false;
    }
    return true;
  });
  if (!found) throw new Error('table not found');
  return found;
}

function selectCellRange(ed: Editor, fromRow: number, fromCol: number, toRow = fromRow, toCol = fromCol): void {
  const { node, pos } = findTableNode(ed);
  const map = TableMap.get(node);
  const tableStart = pos + 1;
  const from = tableStart + map.map[fromRow * map.width + fromCol];
  const to = tableStart + map.map[toRow * map.width + toCol];
  ed.view.dispatch(ed.state.tr.setSelection(CellSelection.create(ed.state.doc, from, to)));
}

function firstTableJson(ed: Editor): JSONContent {
  const table = ed.getJSON().content?.find((node) => node.type === 'table');
  if (!table) throw new Error('table json not found');
  return table;
}

describe('cloud doc TipTap attribute parsing', () => {
  it('normalizes imported table metadata into table, row, and cell attrs', () => {
    const ed = createEditor(`
      <table data-table-width="240" data-table-width-type="px" data-table-align="center" data-table-layout="fixed" data-table-cell-spacing="8">
        <colgroup><col width="80"><col width="160"></colgroup>
        <tr data-row-height="40" data-row-height-rule="exact" data-row-header="true">
          <th data-cell-background="#FFEEAA" data-cell-border-color="#C00000" data-cell-border-size="16" data-cell-padding-left="24">A</th>
          <th data-cell-vertical-align="center" data-cell-text-direction="tbRl">B</th>
        </tr>
      </table>
    `);

    const table = ed.getJSON().content?.find((node) => node.type === 'table');
    expect(table?.attrs).toMatchObject({
      tableWidth: 240,
      tableWidthType: 'px',
      tableAlign: 'center',
      tableColumnWidths: [80, 160],
      tableLayout: 'fixed',
      tableCellSpacing: 8,
    });

    const row = table?.content?.[0];
    expect(row?.attrs).toMatchObject({
      rowHeight: 40,
      rowHeightRule: 'exact',
      rowHeader: true,
    });

    const firstCell = row?.content?.[0];
    expect(firstCell?.attrs).toMatchObject({
      colwidth: [80],
      backgroundColor: '#FFEEAA',
      borderColor: '#C00000',
      borderSize: 16,
      paddingLeft: 24,
    });

    const secondCell = row?.content?.[1];
    expect(secondCell?.attrs).toMatchObject({
      colwidth: [160],
      verticalAlign: 'center',
      textDirection: 'tbRl',
    });
  });

  it('normalizes imported paragraph spacing, indentation, and tab stops into attrs', () => {
    const ed = createEditor(`
      <p data-line-height="1.5" data-space-before="12" data-space-after="8" data-indent="2" data-indent-first-line="32" data-indent-right="24" data-paragraph-tabs="%5B%7B%22type%22%3A%22left%22%2C%22positionTwips%22%3A1440%7D%5D">Paragraph</p>
    `);

    const paragraph = ed.getJSON().content?.[0];
    expect(paragraph?.attrs).toMatchObject({
      lineHeight: 1.5,
      spaceBefore: 12,
      spaceAfter: 8,
      indent: 2,
      firstLineIndent: 32,
      rightIndent: 24,
      tabStops: [{ type: 'left', positionTwips: 1440 }],
    });
  });

  it('applies custom paragraph spacing and line height command values', () => {
    const ed = createEditor('<p>Paragraph</p>');

    ed.commands.setTextSelection({ from: 1, to: 5 });
    ed.commands.setLineHeight(1.25);
    ed.commands.setParagraphSpacing({ before: 0, after: 18 });

    const paragraph = ed.getJSON().content?.[0];
    expect(paragraph?.attrs).toMatchObject({
      lineHeight: 1.25,
      spaceBefore: 0,
      spaceAfter: 18,
    });
  });

  it('syncs resized cell colwidths back to tableColumnWidths attrs', () => {
    const ed = createEditor('<p>Seed</p>');

    ed.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: null, tableColumnWidths: null },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: [120] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: [220] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const table = ed.getJSON().content?.find((node) => node.type === 'table');
    expect(table?.attrs).toMatchObject({
      tableColumnWidths: [120, 220],
      tableLayout: 'fixed',
    });
  });

  it('fills missing tableColumnWidths when a single resized column has colwidth', () => {
    const ed = createEditor('<p>Seed</p>');

    ed.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: null, tableColumnWidths: null },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: [258] },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const table = ed.getJSON().content?.find((node) => node.type === 'table');
    expect(table?.attrs).toMatchObject({
      tableColumnWidths: [258, 120, 120],
      tableLayout: 'fixed',
    });
  });

  it('repairs stale short tableColumnWidths attrs to match the table column count', () => {
    const ed = createEditor('<p>Seed</p>');

    ed.commands.setContent({
      type: 'doc',
      content: [
        {
          type: 'table',
          attrs: { tableLayout: null, tableColumnWidths: [90] },
          content: [
            {
              type: 'tableRow',
              content: [
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }],
                },
                {
                  type: 'tableCell',
                  attrs: { colspan: 1, rowspan: 1, colwidth: null },
                  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }],
                },
              ],
            },
          ],
        },
      ],
    });

    const table = ed.getJSON().content?.find((node) => node.type === 'table');
    expect(table?.attrs).toMatchObject({
      tableColumnWidths: [90, 120, 120],
      tableLayout: 'fixed',
    });
  });

  it('keeps core table commands usable: merge, split, add, and delete', () => {
    const ed = createEditor('<p>Seed</p>');
    ed.commands.setContent(createTableDoc(2, 2));

    selectCellRange(ed, 0, 0, 0, 1);
    expect(ed.commands.mergeCells()).toBe(true);
    let table = firstTableJson(ed);
    expect(table.content?.[0]?.content).toHaveLength(1);
    expect(table.content?.[0]?.content?.[0]?.attrs).toMatchObject({ colspan: 2 });

    expect(ed.commands.splitCell()).toBe(true);
    table = firstTableJson(ed);
    expect(table.content?.[0]?.content).toHaveLength(2);
    expect(table.content?.[0]?.content?.[0]?.attrs).toMatchObject({ colspan: 1 });

    selectCellRange(ed, 0, 0);
    expect(ed.commands.addRowAfter()).toBe(true);
    expect(firstTableJson(ed).content).toHaveLength(3);

    expect(ed.commands.addColumnAfter()).toBe(true);
    table = firstTableJson(ed);
    expect(table.content?.[0]?.content).toHaveLength(3);

    selectCellRange(ed, 0, 0);
    expect(ed.commands.deleteColumn()).toBe(true);
    table = firstTableJson(ed);
    expect(table.content?.[0]?.content).toHaveLength(2);

    expect(ed.commands.deleteRow()).toBe(true);
    expect(firstTableJson(ed).content).toHaveLength(2);
  });

  it('updates selected table rows and current table attrs through shared table editing helpers', () => {
    const ed = createEditor('<p>Seed</p>');
    ed.commands.setContent(createTableDoc(3, 2));

    selectCellRange(ed, 0, 0, 1, 1);
    expect(updateSelectedTableRowAttributes(ed, { rowHeight: 48, rowHeightRule: 'exact' })).toBe(true);
    expect(updateCurrentTableAttributes(ed, { tableWidth: 100, tableWidthType: 'percent', tableLayout: 'fixed' })).toBe(true);

    const table = firstTableJson(ed);
    expect(table.attrs).toMatchObject({
      tableWidth: 100,
      tableWidthType: 'percent',
      tableLayout: 'fixed',
    });
    expect(table.content?.[0]?.attrs).toMatchObject({ rowHeight: 48, rowHeightRule: 'exact' });
    expect(table.content?.[1]?.attrs).toMatchObject({ rowHeight: 48, rowHeightRule: 'exact' });
    expect(table.content?.[2]?.attrs?.rowHeight).toBeNull();
    expect(getCurrentTableRowAttributes(ed)).toMatchObject({ rowHeight: 48, rowHeightRule: 'exact' });
  });
});
