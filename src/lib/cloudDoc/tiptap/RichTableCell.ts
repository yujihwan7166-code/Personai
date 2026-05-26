import { mergeAttributes } from '@tiptap/core';
import BaseTableCell from '@tiptap/extension-table-cell';
import BaseTableHeader from '@tiptap/extension-table-header';

const CELL_BACKGROUND_ATTR = 'data-cell-background';
const CELL_BORDER_COLOR_ATTR = 'data-cell-border-color';
const CELL_BORDER_SIZE_ATTR = 'data-cell-border-size';
const CELL_VERTICAL_ALIGN_ATTR = 'data-cell-vertical-align';
const CELL_TEXT_DIRECTION_ATTR = 'data-cell-text-direction';
const CELL_PADDING_TOP_ATTR = 'data-cell-padding-top';
const CELL_PADDING_RIGHT_ATTR = 'data-cell-padding-right';
const CELL_PADDING_BOTTOM_ATTR = 'data-cell-padding-bottom';
const CELL_PADDING_LEFT_ATTR = 'data-cell-padding-left';

type CellBorderSide = 'top' | 'right' | 'bottom' | 'left';

const CELL_BORDER_SIDES: CellBorderSide[] = ['top', 'right', 'bottom', 'left'];

function parseCellBackground(element: HTMLElement): string | null {
  return normalizeColor(
    element.getAttribute(CELL_BACKGROUND_ATTR)
      ?? element.style.backgroundColor
      ?? element.getAttribute('bgcolor'),
  );
}

function normalizeColor(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed === 'transparent') return null;

  const hex = trimmed.match(/^#?([0-9a-f]{6})$/i);
  if (hex) return `#${hex[1].toUpperCase()}`;

  const rgb = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/i);
  if (!rgb) return null;
  const channels = rgb.slice(1, 4).map((part) => Math.max(0, Math.min(255, Number(part))));
  if (channels.some((part) => !Number.isFinite(part))) return null;
  return `#${channels.map((part) => part.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function renderCellAttributes(HTMLAttributes: Record<string, unknown>, tagName: 'td' | 'th') {
  const backgroundColor = typeof HTMLAttributes[CELL_BACKGROUND_ATTR] === 'string'
    ? HTMLAttributes[CELL_BACKGROUND_ATTR]
    : null;
  const borderColor = typeof HTMLAttributes[CELL_BORDER_COLOR_ATTR] === 'string'
    ? HTMLAttributes[CELL_BORDER_COLOR_ATTR]
    : null;
  const borderSize = typeof HTMLAttributes[CELL_BORDER_SIZE_ATTR] === 'number'
    ? HTMLAttributes[CELL_BORDER_SIZE_ATTR]
    : Number(HTMLAttributes[CELL_BORDER_SIZE_ATTR]);
  const verticalAlign = parseCellVerticalAlign(HTMLAttributes[CELL_VERTICAL_ALIGN_ATTR]);
  const textDirection = parseCellTextDirection(HTMLAttributes[CELL_TEXT_DIRECTION_ATTR]);
  const paddingTop = parseCellPadding(HTMLAttributes[CELL_PADDING_TOP_ATTR]);
  const paddingRight = parseCellPadding(HTMLAttributes[CELL_PADDING_RIGHT_ATTR]);
  const paddingBottom = parseCellPadding(HTMLAttributes[CELL_PADDING_BOTTOM_ATTR]);
  const paddingLeft = parseCellPadding(HTMLAttributes[CELL_PADDING_LEFT_ATTR]);
  const attrs = mergeAttributes(HTMLAttributes);

  const styles: string[] = [];
  if (backgroundColor) {
    styles.push(`background-color: ${backgroundColor}`);
  }
  if (borderColor && Number.isFinite(borderSize) && borderSize > 0) {
    styles.push(`border: ${docxBorderSizeToPx(borderSize)}px solid ${borderColor}`);
  }
  for (const side of CELL_BORDER_SIDES) {
    const color = normalizeColor(HTMLAttributes[cellBorderSideAttributeKey(side, 'Color')] as string | null | undefined);
    const size = parseDocxBorderSize(HTMLAttributes[cellBorderSideAttributeKey(side, 'Size')]);
    if (color && size != null) {
      styles.push(`border-${side}: ${docxBorderSizeToPx(size)}px solid ${color}`);
    }
  }
  if (verticalAlign) {
    styles.push(`vertical-align: ${verticalAlign === 'center' ? 'middle' : verticalAlign}`);
  }
  if (textDirection) {
    styles.push(...cellTextDirectionStyles(textDirection));
  }
  if (paddingTop != null) styles.push(`padding-top: ${paddingTop}px`);
  if (paddingRight != null) styles.push(`padding-right: ${paddingRight}px`);
  if (paddingBottom != null) styles.push(`padding-bottom: ${paddingBottom}px`);
  if (paddingLeft != null) styles.push(`padding-left: ${paddingLeft}px`);
  if (styles.length > 0) {
    const style = typeof attrs.style === 'string' ? attrs.style.trim().replace(/;$/, '') : '';
    attrs.style = `${style ? `${style}; ` : ''}${styles.join('; ')}`;
  }

  return [tagName, attrs, 0];
}

function parseCellVerticalAlign(value: unknown): 'top' | 'center' | 'bottom' | null {
  if (value === 'top' || value === 'center' || value === 'bottom') return value;
  if (value === 'middle') return 'center';
  return null;
}

function parseCellVerticalAlignFromElement(element: HTMLElement): 'top' | 'center' | 'bottom' | null {
  return parseCellVerticalAlign(element.getAttribute(CELL_VERTICAL_ALIGN_ATTR) ?? element.style.verticalAlign);
}

function parseCellTextDirection(value: unknown): 'lrTb' | 'tbRl' | 'btLr' | null {
  if (value === 'lrTb' || value === 'tbRl' || value === 'btLr') return value;
  if (value === 'vertical-rl') return 'tbRl';
  if (value === 'vertical-lr') return 'btLr';
  if (value === 'horizontal-tb') return 'lrTb';
  return null;
}

function parseCellTextDirectionFromElement(element: HTMLElement): 'lrTb' | 'tbRl' | 'btLr' | null {
  return parseCellTextDirection(
    element.getAttribute(CELL_TEXT_DIRECTION_ATTR)
      ?? element.style.writingMode,
  );
}

function cellTextDirectionStyles(textDirection: 'lrTb' | 'tbRl' | 'btLr'): string[] {
  if (textDirection === 'tbRl') return ['writing-mode: vertical-rl'];
  if (textDirection === 'btLr') return ['writing-mode: vertical-lr', 'transform: rotate(180deg)'];
  return ['writing-mode: horizontal-tb'];
}

function parseCellPadding(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value !== 'string') return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  if (!match) return null;
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) && numeric >= 0 ? Math.round(numeric) : null;
}

function parseCellPaddingAttr(attributeName: string, cssProperty: keyof CSSStyleDeclaration) {
  return (element: HTMLElement): number | null => parseCellPadding(
    element.getAttribute(attributeName) ?? element.style[cssProperty],
  );
}

function parseCellColwidth(element: HTMLElement): number[] | null {
  const colwidth = element.getAttribute('colwidth');
  const explicit = colwidth
    ? colwidth.split(',').map((width) => parseInt(width, 10)).filter((width) => Number.isFinite(width) && width > 0)
    : [];
  if (explicit.length > 0) return explicit;

  const cols = element.closest('table')?.querySelectorAll('colgroup > col');
  const cellIndex = Array.from(element.parentElement?.children || []).indexOf(element);
  if (!cols || cellIndex < 0) return null;
  const width = cols[cellIndex]?.getAttribute('width') ?? (cols[cellIndex] as HTMLElement | undefined)?.style.width;
  const parsed = width ? parseInt(width, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? [parsed] : null;
}

function renderCellPaddingAttr(attributeKey: string, attributeName: string) {
  return (attributes: Record<string, unknown>) => {
    const padding = parseCellPadding(attributes[attributeKey]);
    return padding != null ? { [attributeName]: String(padding) } : {};
  };
}

function parseDocxBorderSize(value: unknown): number | null {
  const size = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(size) && size > 0 ? Math.round(size) : null;
}

function parseBorderSize(element: HTMLElement): number | null {
  const attr = Number(element.getAttribute(CELL_BORDER_SIZE_ATTR));
  if (Number.isFinite(attr) && attr > 0) return attr;

  const cssWidth = element.style.borderTopWidth || element.style.borderWidth;
  const px = Number(cssWidth.replace(/px$/i, ''));
  if (!Number.isFinite(px) || px <= 0) return null;
  return Math.max(1, Math.round(px * 6));
}

function parseBorderSideSize(side: CellBorderSide) {
  return (element: HTMLElement): number | null => {
    const attr = Number(element.getAttribute(cellBorderSideDataAttr(side, 'size')));
    if (Number.isFinite(attr) && attr > 0) return Math.round(attr);

    const cssWidth = borderSideCssValue(element, side, 'width');
    const px = Number(cssWidth.replace(/px$/i, ''));
    if (!Number.isFinite(px) || px <= 0) return null;
    return Math.max(1, Math.round(px * 6));
  };
}

function parseBorderSideColor(side: CellBorderSide) {
  return (element: HTMLElement): string | null => normalizeColor(
    element.getAttribute(cellBorderSideDataAttr(side, 'color'))
      ?? borderSideCssValue(element, side, 'color'),
  );
}

function renderCellBorderSideColorAttr(side: CellBorderSide) {
  return (attributes: Record<string, unknown>) => {
    const color = normalizeColor(attributes[cellBorderSideAttributeKey(side, 'Color')] as string | null | undefined);
    return color ? { [cellBorderSideDataAttr(side, 'color')]: color } : {};
  };
}

function renderCellBorderSideSizeAttr(side: CellBorderSide) {
  return (attributes: Record<string, unknown>) => {
    const size = parseDocxBorderSize(attributes[cellBorderSideAttributeKey(side, 'Size')]);
    return size != null ? { [cellBorderSideDataAttr(side, 'size')]: String(size) } : {};
  };
}

function borderSideCssValue(element: HTMLElement, side: CellBorderSide, property: 'color' | 'width'): string {
  if (side === 'top') return property === 'color' ? element.style.borderTopColor : element.style.borderTopWidth;
  if (side === 'right') return property === 'color' ? element.style.borderRightColor : element.style.borderRightWidth;
  if (side === 'bottom') return property === 'color' ? element.style.borderBottomColor : element.style.borderBottomWidth;
  return property === 'color' ? element.style.borderLeftColor : element.style.borderLeftWidth;
}

function cellBorderSideDataAttr(side: CellBorderSide, part: 'color' | 'size'): string {
  return `data-cell-border-${side}-${part}`;
}

function cellBorderSideAttributeKey(side: CellBorderSide, suffix: 'Color' | 'Size'): string {
  return `border${side[0].toUpperCase()}${side.slice(1)}${suffix}`;
}

function docxBorderSizeToPx(size: number): number {
  return Math.max(1, Math.round(size / 6));
}

function cellBorderSideAttributes() {
  return Object.fromEntries(
    CELL_BORDER_SIDES.flatMap((side) => [
      [
        cellBorderSideAttributeKey(side, 'Color'),
        {
          default: null,
          parseHTML: parseBorderSideColor(side),
          renderHTML: renderCellBorderSideColorAttr(side),
        },
      ],
      [
        cellBorderSideAttributeKey(side, 'Size'),
        {
          default: null,
          parseHTML: parseBorderSideSize(side),
          renderHTML: renderCellBorderSideSizeAttr(side),
        },
      ],
    ]),
  );
}

export const RichTableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: parseCellColwidth,
      },
      backgroundColor: {
        default: null,
        parseHTML: parseCellBackground,
        renderHTML: (attributes) => {
          const backgroundColor = normalizeColor(attributes.backgroundColor as string | null | undefined);
          return backgroundColor ? { [CELL_BACKGROUND_ATTR]: backgroundColor } : {};
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeColor(
          element.getAttribute(CELL_BORDER_COLOR_ATTR)
            ?? element.style.borderTopColor
            ?? element.style.borderColor,
        ),
        renderHTML: (attributes) => {
          const borderColor = normalizeColor(attributes.borderColor as string | null | undefined);
          return borderColor ? { [CELL_BORDER_COLOR_ATTR]: borderColor } : {};
        },
      },
      borderSize: {
        default: null,
        parseHTML: parseBorderSize,
        renderHTML: (attributes) => {
          const borderSize = Number(attributes.borderSize);
          return Number.isFinite(borderSize) && borderSize > 0
            ? { [CELL_BORDER_SIZE_ATTR]: borderSize }
            : {};
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: parseCellVerticalAlignFromElement,
        renderHTML: (attributes) => {
          const verticalAlign = parseCellVerticalAlign(attributes.verticalAlign);
          return verticalAlign ? { [CELL_VERTICAL_ALIGN_ATTR]: verticalAlign } : {};
        },
      },
      textDirection: {
        default: null,
        parseHTML: parseCellTextDirectionFromElement,
        renderHTML: (attributes) => {
          const textDirection = parseCellTextDirection(attributes.textDirection);
          return textDirection ? { [CELL_TEXT_DIRECTION_ATTR]: textDirection } : {};
        },
      },
      paddingTop: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_TOP_ATTR, 'paddingTop'),
        renderHTML: renderCellPaddingAttr('paddingTop', CELL_PADDING_TOP_ATTR),
      },
      paddingRight: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_RIGHT_ATTR, 'paddingRight'),
        renderHTML: renderCellPaddingAttr('paddingRight', CELL_PADDING_RIGHT_ATTR),
      },
      paddingBottom: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_BOTTOM_ATTR, 'paddingBottom'),
        renderHTML: renderCellPaddingAttr('paddingBottom', CELL_PADDING_BOTTOM_ATTR),
      },
      paddingLeft: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_LEFT_ATTR, 'paddingLeft'),
        renderHTML: renderCellPaddingAttr('paddingLeft', CELL_PADDING_LEFT_ATTR),
      },
      ...cellBorderSideAttributes(),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return renderCellAttributes(
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      'td',
    );
  },
});

export const RichTableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: parseCellColwidth,
      },
      backgroundColor: {
        default: null,
        parseHTML: parseCellBackground,
        renderHTML: (attributes) => {
          const backgroundColor = normalizeColor(attributes.backgroundColor as string | null | undefined);
          return backgroundColor ? { [CELL_BACKGROUND_ATTR]: backgroundColor } : {};
        },
      },
      borderColor: {
        default: null,
        parseHTML: (element: HTMLElement) => normalizeColor(
          element.getAttribute(CELL_BORDER_COLOR_ATTR)
            ?? element.style.borderTopColor
            ?? element.style.borderColor,
        ),
        renderHTML: (attributes) => {
          const borderColor = normalizeColor(attributes.borderColor as string | null | undefined);
          return borderColor ? { [CELL_BORDER_COLOR_ATTR]: borderColor } : {};
        },
      },
      borderSize: {
        default: null,
        parseHTML: parseBorderSize,
        renderHTML: (attributes) => {
          const borderSize = Number(attributes.borderSize);
          return Number.isFinite(borderSize) && borderSize > 0
            ? { [CELL_BORDER_SIZE_ATTR]: borderSize }
            : {};
        },
      },
      verticalAlign: {
        default: null,
        parseHTML: parseCellVerticalAlignFromElement,
        renderHTML: (attributes) => {
          const verticalAlign = parseCellVerticalAlign(attributes.verticalAlign);
          return verticalAlign ? { [CELL_VERTICAL_ALIGN_ATTR]: verticalAlign } : {};
        },
      },
      textDirection: {
        default: null,
        parseHTML: parseCellTextDirectionFromElement,
        renderHTML: (attributes) => {
          const textDirection = parseCellTextDirection(attributes.textDirection);
          return textDirection ? { [CELL_TEXT_DIRECTION_ATTR]: textDirection } : {};
        },
      },
      paddingTop: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_TOP_ATTR, 'paddingTop'),
        renderHTML: renderCellPaddingAttr('paddingTop', CELL_PADDING_TOP_ATTR),
      },
      paddingRight: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_RIGHT_ATTR, 'paddingRight'),
        renderHTML: renderCellPaddingAttr('paddingRight', CELL_PADDING_RIGHT_ATTR),
      },
      paddingBottom: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_BOTTOM_ATTR, 'paddingBottom'),
        renderHTML: renderCellPaddingAttr('paddingBottom', CELL_PADDING_BOTTOM_ATTR),
      },
      paddingLeft: {
        default: null,
        parseHTML: parseCellPaddingAttr(CELL_PADDING_LEFT_ATTR, 'paddingLeft'),
        renderHTML: renderCellPaddingAttr('paddingLeft', CELL_PADDING_LEFT_ATTR),
      },
      ...cellBorderSideAttributes(),
    };
  },

  renderHTML({ HTMLAttributes }) {
    return renderCellAttributes(
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      'th',
    );
  },
});
