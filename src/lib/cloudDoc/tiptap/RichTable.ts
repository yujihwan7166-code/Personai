import { mergeAttributes } from '@tiptap/core';
import { Table as BaseTable } from '@tiptap/extension-table';

const TABLE_WIDTH_ATTR = 'data-table-width';
const TABLE_WIDTH_TYPE_ATTR = 'data-table-width-type';
const TABLE_ALIGN_ATTR = 'data-table-align';
const TABLE_COLUMN_WIDTHS_ATTR = 'data-table-column-widths';
const TABLE_LAYOUT_ATTR = 'data-table-layout';
const TABLE_CELL_SPACING_ATTR = 'data-table-cell-spacing';
const TABLE_CAPTION_ATTR = 'data-table-caption';
const TABLE_DESCRIPTION_ATTR = 'data-table-description';

function parseTableWidth(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px|%)?$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseTableWidthType(value: unknown): 'px' | 'percent' | null {
  if (value === 'px' || value === 'percent') return value;
  return null;
}

function parseTableAlign(value: unknown): 'left' | 'center' | 'right' | null {
  if (value === 'left' || value === 'center' || value === 'right') return value;
  return null;
}

function parseTableLayout(value: unknown): 'fixed' | 'autofit' | null {
  if (value === 'fixed' || value === 'autofit') return value;
  return null;
}

function parseTableColumnWidths(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const widths = value.map(parseTableWidth).filter((width): width is number => width != null);
    return widths.length ? widths : null;
  }
  if (typeof value !== 'string') return null;
  const widths = value.split(',').map(parseTableWidth).filter((width): width is number => width != null);
  return widths.length ? widths : null;
}

function parseTableText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export const RichTable = BaseTable.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      tableWidth: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableWidth(
          element.getAttribute(TABLE_WIDTH_ATTR) ?? element.style.width,
        ),
        renderHTML: (attributes) => {
          const tableWidth = parseTableWidth(attributes.tableWidth);
          return tableWidth ? { [TABLE_WIDTH_ATTR]: String(tableWidth) } : {};
        },
      },
      tableWidthType: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableWidthType(
          element.getAttribute(TABLE_WIDTH_TYPE_ATTR)
            ?? (element.style.width.endsWith('%') ? 'percent' : element.style.width ? 'px' : null),
        ),
        renderHTML: (attributes) => {
          const tableWidthType = parseTableWidthType(attributes.tableWidthType);
          return tableWidthType ? { [TABLE_WIDTH_TYPE_ATTR]: tableWidthType } : {};
        },
      },
      tableAlign: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableAlign(element.getAttribute(TABLE_ALIGN_ATTR)),
        renderHTML: (attributes) => {
          const tableAlign = parseTableAlign(attributes.tableAlign);
          return tableAlign ? { [TABLE_ALIGN_ATTR]: tableAlign } : {};
        },
      },
      tableColumnWidths: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableColumnWidthsFromElement(element),
        renderHTML: (attributes) => {
          const tableColumnWidths = parseTableColumnWidths(attributes.tableColumnWidths);
          return tableColumnWidths ? { [TABLE_COLUMN_WIDTHS_ATTR]: tableColumnWidths.join(',') } : {};
        },
      },
      tableLayout: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableLayout(
          element.getAttribute(TABLE_LAYOUT_ATTR)
            ?? (element.style.tableLayout === 'fixed' ? 'fixed' : null),
        ),
        renderHTML: (attributes) => {
          const tableLayout = parseTableLayout(attributes.tableLayout);
          return tableLayout ? { [TABLE_LAYOUT_ATTR]: tableLayout } : {};
        },
      },
      tableCellSpacing: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableWidth(
          element.getAttribute(TABLE_CELL_SPACING_ATTR) ?? element.style.borderSpacing,
        ),
        renderHTML: (attributes) => {
          const tableCellSpacing = parseTableWidth(attributes.tableCellSpacing);
          return tableCellSpacing ? { [TABLE_CELL_SPACING_ATTR]: String(tableCellSpacing) } : {};
        },
      },
      tableCaption: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableText(element.getAttribute(TABLE_CAPTION_ATTR)),
        renderHTML: (attributes) => {
          const caption = parseTableText(attributes.tableCaption);
          return caption ? { [TABLE_CAPTION_ATTR]: caption } : {};
        },
      },
      tableDescription: {
        default: null,
        parseHTML: (element: HTMLElement) => parseTableText(element.getAttribute(TABLE_DESCRIPTION_ATTR)),
        renderHTML: (attributes) => {
          const description = parseTableText(attributes.tableDescription);
          return description ? { [TABLE_DESCRIPTION_ATTR]: description } : {};
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    const tableWidth = parseTableWidth(attrs[TABLE_WIDTH_ATTR]);
    const tableWidthType = parseTableWidthType(attrs[TABLE_WIDTH_TYPE_ATTR]);
    const tableAlign = parseTableAlign(attrs[TABLE_ALIGN_ATTR]);
    const tableLayout = parseTableLayout(attrs[TABLE_LAYOUT_ATTR]);
    const tableCellSpacing = parseTableWidth(attrs[TABLE_CELL_SPACING_ATTR]);
    const styles: string[] = [];
    if (tableWidth) styles.push(`width: ${tableWidth}${tableWidthType === 'percent' ? '%' : 'px'}`);
    if (tableAlign === 'center') styles.push('margin-left: auto', 'margin-right: auto');
    else if (tableAlign === 'right') styles.push('margin-left: auto', 'margin-right: 0');
    else if (tableAlign === 'left') styles.push('margin-left: 0', 'margin-right: auto');
    if (tableLayout) styles.push(`table-layout: ${tableLayout === 'fixed' ? 'fixed' : 'auto'}`);
    if (tableCellSpacing) styles.push('border-collapse: separate', `border-spacing: ${tableCellSpacing}px`);
    if (styles.length > 0) {
      const style = typeof attrs.style === 'string' ? attrs.style.trim().replace(/;$/, '') : '';
      attrs.style = `${style ? `${style}; ` : ''}${styles.join('; ')}`;
    }
    return ['table', attrs, ['tbody', 0]];
  },
});

function parseTableColumnWidthsFromElement(element: HTMLElement): number[] | null {
  const dataWidths = parseTableColumnWidths(element.getAttribute(TABLE_COLUMN_WIDTHS_ATTR));
  if (dataWidths) return dataWidths;

  const colWidths = Array.from(element.querySelectorAll('colgroup > col'))
    .map((col) => parseTableWidth(col.getAttribute('width') ?? (col as HTMLElement).style.width))
    .filter((width): width is number => width != null);
  if (colWidths.length > 0) return colWidths;

  const firstRow = element.querySelector('tr');
  if (!firstRow) return null;
  const cellWidths: number[] = [];
  for (const cell of Array.from(firstRow.querySelectorAll<HTMLElement>('td, th'))) {
    const colwidth = parseTableColumnWidths(cell.getAttribute('colwidth'));
    if (colwidth?.length) cellWidths.push(...colwidth);
  }
  return cellWidths.length > 0 ? cellWidths : null;
}
