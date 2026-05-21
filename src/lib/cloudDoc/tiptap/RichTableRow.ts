import { mergeAttributes } from '@tiptap/core';
import BaseTableRow from '@tiptap/extension-table-row';

const ROW_HEIGHT_ATTR = 'data-row-height';
const ROW_HEIGHT_RULE_ATTR = 'data-row-height-rule';
const ROW_HEADER_ATTR = 'data-row-header';
const ROW_CANT_SPLIT_ATTR = 'data-row-cant-split';

function parseRowHeight(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function parseRowHeightRule(value: unknown): 'auto' | 'atLeast' | 'exact' | null {
  if (value === 'auto' || value === 'atLeast' || value === 'exact') return value;
  return null;
}

export const RichTableRow = BaseTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: (element: HTMLElement) => parseRowHeight(
          element.getAttribute(ROW_HEIGHT_ATTR)
            ?? element.getAttribute('height')
            ?? element.style.height
            ?? element.style.minHeight,
        ),
        renderHTML: (attributes) => {
          const rowHeight = parseRowHeight(attributes.rowHeight);
          return rowHeight ? { [ROW_HEIGHT_ATTR]: String(rowHeight), height: String(rowHeight) } : {};
        },
      },
      rowHeightRule: {
        default: null,
        parseHTML: (element: HTMLElement) => parseRowHeightRule(element.getAttribute(ROW_HEIGHT_RULE_ATTR)),
        renderHTML: (attributes) => {
          const rowHeightRule = parseRowHeightRule(attributes.rowHeightRule);
          return rowHeightRule ? { [ROW_HEIGHT_RULE_ATTR]: rowHeightRule } : {};
        },
      },
      rowHeader: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute(ROW_HEADER_ATTR) === 'true',
        renderHTML: (attributes) => attributes.rowHeader ? { [ROW_HEADER_ATTR]: 'true' } : {},
      },
      rowCantSplit: {
        default: false,
        parseHTML: (element: HTMLElement) => element.getAttribute(ROW_CANT_SPLIT_ATTR) === 'true',
        renderHTML: (attributes) => attributes.rowCantSplit ? { [ROW_CANT_SPLIT_ATTR]: 'true' } : {},
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    const rowHeight = parseRowHeight(attrs[ROW_HEIGHT_ATTR] ?? attrs.height);
    const rowHeightRule = parseRowHeightRule(attrs[ROW_HEIGHT_RULE_ATTR]);
    if (rowHeight) {
      const style = typeof attrs.style === 'string' ? attrs.style.trim().replace(/;$/, '') : '';
      const heightProperty = rowHeightRule === 'exact' ? 'height' : 'min-height';
      attrs.style = `${style ? `${style}; ` : ''}${heightProperty}: ${rowHeight}px`;
    }
    return ['tr', attrs, 0];
  },
});
