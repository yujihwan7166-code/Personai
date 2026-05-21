import { BulletList, OrderedList } from '@tiptap/extension-list';
import { mergeAttributes } from '@tiptap/core';

const LIST_STYLE_TYPES = new Set(['disc', 'circle', 'square']);

function readNumericDataAttr(element: HTMLElement, attr: string): number | null {
  const raw = element.getAttribute(attr);
  const value = raw == null ? NaN : Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function readListStyleType(element: HTMLElement): string | null {
  const style = element.style.listStyleType;
  if (LIST_STYLE_TYPES.has(style)) return style;

  const inlineStyle = element.getAttribute('style') ?? '';
  const match = inlineStyle.match(/list-style-type\s*:\s*([^;]+)/i);
  const value = match?.[1]?.trim().toLowerCase();
  if (value && LIST_STYLE_TYPES.has(value)) return value;

  const type = element.getAttribute('type');
  if (type === 'circle') return 'circle';
  if (type === 'square') return 'square';
  return null;
}

function listStyleFromAttrs(attrs: Record<string, unknown>): string | undefined {
  const parts: string[] = [];
  const listStyleType = typeof attrs.listStyleType === 'string' ? attrs.listStyleType : null;
  if (listStyleType && LIST_STYLE_TYPES.has(listStyleType)) {
    parts.push(`list-style-type: ${listStyleType}`);
  }

  const leftTwips = typeof attrs.listIndentLeft === 'number' ? attrs.listIndentLeft : null;
  if (leftTwips && leftTwips > 0) {
    parts.push(`padding-left: ${Math.round(leftTwips / 15)}px`);
  }

  return parts.length > 0 ? parts.join('; ') : undefined;
}

function listIndentAttrs(attrs: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof attrs.listIndentLeft === 'number' && attrs.listIndentLeft > 0) {
    out['data-list-indent-left'] = String(Math.round(attrs.listIndentLeft));
  }
  if (typeof attrs.listIndentHanging === 'number' && attrs.listIndentHanging > 0) {
    out['data-list-indent-hanging'] = String(Math.round(attrs.listIndentHanging));
  }
  return out;
}

const listIndentAttributes = {
  listIndentLeft: {
    default: null,
    parseHTML: (element: HTMLElement) => readNumericDataAttr(element, 'data-list-indent-left'),
  },
  listIndentHanging: {
    default: null,
    parseHTML: (element: HTMLElement) => readNumericDataAttr(element, 'data-list-indent-hanging'),
  },
};

export const RichBulletList = BulletList.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      keepAttributes: true,
    };
  },

  addAttributes() {
    return {
      ...listIndentAttributes,
      listStyleType: {
        default: null,
        parseHTML: (element: HTMLElement) => readListStyleType(element),
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = listStyleFromAttrs(node.attrs);
    const listStyleType = typeof node.attrs.listStyleType === 'string' ? node.attrs.listStyleType : null;
    return ['ul', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
      ...(style ? { style } : {}),
      ...(listStyleType && LIST_STYLE_TYPES.has(listStyleType) ? { 'data-list-style-type': listStyleType } : {}),
      ...listIndentAttrs(node.attrs),
    }), 0];
  },
});

export const RichOrderedList = OrderedList.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      keepAttributes: true,
    };
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      ...listIndentAttributes,
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const { start, ...attributesWithoutStart } = HTMLAttributes;
    const attrs = start === 1 ? attributesWithoutStart : HTMLAttributes;
    const style = listStyleFromAttrs(node.attrs);
    return ['ol', mergeAttributes(this.options.HTMLAttributes, attrs, {
      ...(node.attrs.type ? { type: node.attrs.type } : {}),
      ...(style ? { style } : {}),
      ...listIndentAttrs(node.attrs),
    }), 0];
  },
});
