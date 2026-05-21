import { Extension, type CommandProps } from '@tiptap/core';

const MIN_LINE_HEIGHT = 1;
const MAX_LINE_HEIGHT = 3;
const MIN_SPACE_PT = 0;
const MAX_SPACE_PT = 72;
const LINE_HEIGHT_RULES = new Set(['auto', 'exact', 'atLeast']);

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      setLineHeight: (lineHeight: number | null) => ReturnType;
      setParagraphSpacing: (spacing: { before?: number | null; after?: number | null }) => ReturnType;
    };
  }
}

export const ParagraphSpacing = Extension.create({
  name: 'paragraphSpacing',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => {
              const data = element.getAttribute('data-line-height');
              if (data != null) return normalizeLineHeight(data);
              return normalizeLineHeight((element as HTMLElement).style.lineHeight);
            },
            renderHTML: (attributes) => {
              const lineHeight = normalizeLineHeight(attributes.lineHeight);
              return lineHeight ? {
                'data-line-height': String(lineHeight),
                style: `line-height: ${lineHeight}`,
              } : {};
            },
          },
          lineHeightRule: {
            default: null,
            parseHTML: (element) => normalizeLineHeightRule(element.getAttribute('data-line-height-rule')),
            renderHTML: (attributes) => {
              const rule = normalizeLineHeightRule(attributes.lineHeightRule);
              return rule ? { 'data-line-height-rule': rule } : {};
            },
          },
          lineHeightTwips: {
            default: null,
            parseHTML: (element) => normalizePositiveInt(element.getAttribute('data-line-height-twips')),
            renderHTML: (attributes) => {
              const value = normalizePositiveInt(attributes.lineHeightTwips);
              return value != null
                ? { 'data-line-height-twips': String(value), style: `line-height: ${Math.round(value / 15)}px` }
                : {};
            },
          },
          spaceBefore: {
            default: null,
            parseHTML: (element) => {
              const data = element.getAttribute('data-space-before');
              if (data != null) return normalizeSpacePt(data);
              return cssPxToPt((element as HTMLElement).style.marginTop);
            },
            renderHTML: (attributes) => {
              const pt = normalizeSpacePt(attributes.spaceBefore);
              return pt != null ? {
                'data-space-before': String(pt),
                style: `margin-top: ${ptToPx(pt)}px`,
              } : {};
            },
          },
          spaceAfter: {
            default: null,
            parseHTML: (element) => {
              const data = element.getAttribute('data-space-after');
              if (data != null) return normalizeSpacePt(data);
              return cssPxToPt((element as HTMLElement).style.marginBottom);
            },
            renderHTML: (attributes) => {
              const pt = normalizeSpacePt(attributes.spaceAfter);
              return pt != null ? {
                'data-space-after': String(pt),
                style: `margin-bottom: ${ptToPx(pt)}px`,
              } : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight) =>
        (props) =>
          updateSelectedBlocks(props, (attrs) => ({
            ...attrs,
            lineHeight: normalizeLineHeight(lineHeight),
          })),
      setParagraphSpacing:
        (spacing) =>
        (props) =>
          updateSelectedBlocks(props, (attrs) => ({
            ...attrs,
            ...(Object.prototype.hasOwnProperty.call(spacing, 'before')
              ? { spaceBefore: normalizeSpacePt(spacing.before) }
              : {}),
            ...(Object.prototype.hasOwnProperty.call(spacing, 'after')
              ? { spaceAfter: normalizeSpacePt(spacing.after) }
              : {}),
          })),
    };
  },
});

function updateSelectedBlocks(
  { state, tr, dispatch }: CommandProps,
  updateAttrs: (attrs: Record<string, unknown>) => Record<string, unknown>,
): boolean {
  const { from, to } = state.selection;
  let changed = false;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name !== 'paragraph' && node.type.name !== 'heading') return;
    tr.setNodeMarkup(pos, undefined, updateAttrs(node.attrs));
    changed = true;
  });

  if (changed && dispatch) dispatch(tr.scrollIntoView());
  return changed;
}

function normalizeLineHeight(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && value.endsWith('px')) return null;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return null;
  const rounded = Math.round(numeric * 100) / 100;
  return Math.max(MIN_LINE_HEIGHT, Math.min(MAX_LINE_HEIGHT, rounded));
}

function normalizeLineHeightRule(value: unknown): string | null {
  return typeof value === 'string' && LINE_HEIGHT_RULES.has(value) ? value : null;
}

function normalizePositiveInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  return Math.round(numeric);
}

function normalizeSpacePt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(numeric)) return null;
  return Math.max(MIN_SPACE_PT, Math.min(MAX_SPACE_PT, Math.round(numeric)));
}

function cssPxToPt(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return null;
  return normalizeSpacePt(Number(match[1]) * 0.75);
}

function ptToPx(pt: number): number {
  return Math.round(pt * 1.333);
}
