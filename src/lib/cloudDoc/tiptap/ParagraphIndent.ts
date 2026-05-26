import { Extension, type CommandProps } from '@tiptap/core';

const INDENT_STEP = 1;
const MIN_INDENT = 0;
const MAX_INDENT = 8;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphIndent: {
      increaseIndent: () => ReturnType;
      decreaseIndent: () => ReturnType;
      setParagraphIndent: (attrs: {
        indent?: number | null;
        firstLineIndent?: number | null;
        hangingIndent?: number | null;
        rightIndent?: number | null;
      }) => ReturnType;
    };
  }
}

export const ParagraphIndent = Extension.create({
  name: 'paragraphIndent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const dataIndent = element.getAttribute('data-indent');
              if (dataIndent != null) return normalizeIndent(Number(dataIndent));

              const marginLeft = (element as HTMLElement).style.marginLeft;
              const px = parseCssPx(marginLeft);
              return px == null ? 0 : normalizeIndent(Math.round(px / 48));
            },
            renderHTML: (attributes) => {
              const indent = normalizeIndent(attributes.indent);
              return indent > 0 ? { 'data-indent': String(indent) } : {};
            },
          },
          firstLineIndent: {
            default: null,
            parseHTML: (element) => {
              const attr = parseCssPx(element.getAttribute('data-indent-first-line') ?? '');
              if (attr != null) return attr;

              const textIndent = parseCssPx((element as HTMLElement).style.textIndent);
              return textIndent != null && textIndent > 0 ? textIndent : null;
            },
            renderHTML: (attributes) => {
              const value = normalizePx(attributes.firstLineIndent);
              return value != null
                ? { 'data-indent-first-line': String(value), style: `text-indent: ${value}px` }
                : {};
            },
          },
          hangingIndent: {
            default: null,
            parseHTML: (element) => {
              const attr = parseCssPx(element.getAttribute('data-indent-hanging') ?? '');
              if (attr != null) return attr;

              const textIndent = parseCssPx((element as HTMLElement).style.textIndent);
              return textIndent != null && textIndent < 0 ? Math.abs(textIndent) : null;
            },
            renderHTML: (attributes) => {
              const value = normalizePx(attributes.hangingIndent);
              return value != null
                ? { 'data-indent-hanging': String(value), style: `text-indent: -${value}px` }
                : {};
            },
          },
          rightIndent: {
            default: null,
            parseHTML: (element) => {
              const attr = parseCssPx(element.getAttribute('data-indent-right') ?? '');
              if (attr != null) return attr;

              return parseCssPx((element as HTMLElement).style.marginRight);
            },
            renderHTML: (attributes) => {
              const value = normalizePx(attributes.rightIndent);
              return value != null
                ? { 'data-indent-right': String(value), style: `margin-right: ${value}px` }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      increaseIndent:
        () =>
        (props) =>
          updateSelectedBlockIndent(props, INDENT_STEP),
      decreaseIndent:
        () =>
        (props) =>
          updateSelectedBlockIndent(props, -INDENT_STEP),
      setParagraphIndent:
        (attrs) =>
        (props) =>
          updateSelectedBlockAttrs(props, (currentAttrs) => {
            const nextAttrs: Record<string, unknown> = { ...currentAttrs };
            if (Object.prototype.hasOwnProperty.call(attrs, 'indent')) {
              nextAttrs.indent = normalizeIndent(attrs.indent);
            }
            if (Object.prototype.hasOwnProperty.call(attrs, 'firstLineIndent')) {
              nextAttrs.firstLineIndent = normalizePx(attrs.firstLineIndent);
              if (nextAttrs.firstLineIndent != null) nextAttrs.hangingIndent = null;
            }
            if (Object.prototype.hasOwnProperty.call(attrs, 'hangingIndent')) {
              nextAttrs.hangingIndent = normalizePx(attrs.hangingIndent);
              if (nextAttrs.hangingIndent != null) nextAttrs.firstLineIndent = null;
            }
            if (Object.prototype.hasOwnProperty.call(attrs, 'rightIndent')) {
              nextAttrs.rightIndent = normalizePx(attrs.rightIndent);
            }
            return nextAttrs;
          }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (this.editor.can().sinkListItem('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        return this.editor.commands.increaseIndent();
      },
      'Shift-Tab': () => {
        if (this.editor.can().liftListItem('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        return this.editor.commands.decreaseIndent();
      },
    };
  },
});

function updateSelectedBlockIndent({ state, tr, dispatch }: CommandProps, delta: number): boolean {
  return updateSelectedBlockAttrs({ state, tr, dispatch }, (attrs) => {
    const current = normalizeIndent(attrs.indent);
    const next = normalizeIndent(current + delta);
    return next === current ? attrs : { ...attrs, indent: next };
  });
}

function updateSelectedBlockAttrs(
  { state, tr, dispatch }: CommandProps,
  updateAttrs: (attrs: Record<string, unknown>) => Record<string, unknown>,
): boolean {
  const { from, to } = state.selection;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
    const nextAttrs = updateAttrs(node.attrs);
    if (shallowEqualAttrs(node.attrs, nextAttrs)) return;

    tr.setNodeMarkup(pos, undefined, nextAttrs);
    changed = true;
  });

  if (changed && dispatch) dispatch(tr.scrollIntoView());
  return changed;
}

function shallowEqualAttrs(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

function normalizeIndent(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return MIN_INDENT;
  return Math.max(MIN_INDENT, Math.min(MAX_INDENT, Math.round(numeric)));
}

function parseCssPx(value: string): number | null {
  const match = value.match(/^(-?\d+(?:\.\d+)?)(?:px)?$/);
  if (!match) return null;
  return Number(match[1]);
}

function normalizePx(value: unknown): number | null {
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}
