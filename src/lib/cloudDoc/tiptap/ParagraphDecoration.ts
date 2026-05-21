import { Extension } from '@tiptap/core';

type ParagraphBorderSide = 'top' | 'right' | 'bottom' | 'left';

const PARAGRAPH_BACKGROUND_ATTR = 'data-paragraph-background';
const PARAGRAPH_BORDER_COLOR_ATTR = 'data-paragraph-border-color';
const PARAGRAPH_BORDER_SIZE_ATTR = 'data-paragraph-border-size';
const PARAGRAPH_BORDER_SPACE_ATTR = 'data-paragraph-border-space';
const PARAGRAPH_BORDER_SIDES: ParagraphBorderSide[] = ['top', 'right', 'bottom', 'left'];

export const ParagraphDecoration = Extension.create({
  name: 'paragraphDecoration',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          paragraphBackgroundColor: {
            default: null,
            parseHTML: (element) => normalizeColor(
              element.getAttribute(PARAGRAPH_BACKGROUND_ATTR)
                ?? (element as HTMLElement).style.backgroundColor,
            ),
            renderHTML: (attributes) => {
              const color = normalizeColor(attributes.paragraphBackgroundColor as string | null | undefined);
              return color
                ? { [PARAGRAPH_BACKGROUND_ATTR]: color, style: `background-color: ${color}` }
                : {};
            },
          },
          paragraphBorderColor: {
            default: null,
            parseHTML: (element) => normalizeColor(
              element.getAttribute(PARAGRAPH_BORDER_COLOR_ATTR)
                ?? (element as HTMLElement).style.borderTopColor
                ?? (element as HTMLElement).style.borderColor,
            ),
            renderHTML: (attributes) => {
              const color = normalizeColor(attributes.paragraphBorderColor as string | null | undefined);
              const size = normalizePositiveInt(attributes.paragraphBorderSize);
              const space = normalizePositiveInt(attributes.paragraphBorderSpace);
              const styles = [
                ...(size != null ? [`border: ${docxBorderSizeToPx(size)}px solid ${color}`] : []),
                ...(space != null ? [`padding: ${space}px`] : []),
              ];
              return color ? {
                [PARAGRAPH_BORDER_COLOR_ATTR]: color,
                ...(styles.length ? { style: styles.join('; ') } : {}),
              } : {};
            },
          },
          paragraphBorderSize: {
            default: null,
            parseHTML: parseParagraphBorderSize,
            renderHTML: (attributes) => {
              const size = normalizePositiveInt(attributes.paragraphBorderSize);
              return size != null ? { [PARAGRAPH_BORDER_SIZE_ATTR]: String(size) } : {};
            },
          },
          paragraphBorderSpace: {
            default: null,
            parseHTML: (element) => normalizePositiveInt(element.getAttribute(PARAGRAPH_BORDER_SPACE_ATTR)),
            renderHTML: (attributes) => {
              const space = normalizePositiveInt(attributes.paragraphBorderSpace);
              return space != null ? { [PARAGRAPH_BORDER_SPACE_ATTR]: String(space) } : {};
            },
          },
          ...paragraphBorderSideAttributes(),
        },
      },
    ];
  },
});

function paragraphBorderSideAttributes() {
  return Object.fromEntries(
    PARAGRAPH_BORDER_SIDES.flatMap((side) => [
      [
        paragraphBorderSideKey(side, 'Color'),
        {
          default: null,
          parseHTML: (element: HTMLElement) => normalizeColor(
            element.getAttribute(paragraphBorderSideDataAttr(side, 'color'))
              ?? borderSideCssValue(element, side, 'color'),
          ),
          renderHTML: (attributes: Record<string, unknown>) => {
            const color = normalizeColor(attributes[paragraphBorderSideKey(side, 'Color')] as string | null | undefined);
            const size = normalizePositiveInt(attributes[paragraphBorderSideKey(side, 'Size')]);
            const space = normalizePositiveInt(attributes[paragraphBorderSideKey(side, 'Space')]);
            const styles = [
              ...(size != null ? [`border-${side}: ${docxBorderSizeToPx(size)}px solid ${color}`] : []),
              ...(space != null ? [`padding-${side}: ${space}px`] : []),
            ];
            return color ? {
              [paragraphBorderSideDataAttr(side, 'color')]: color,
              ...(styles.length ? { style: styles.join('; ') } : {}),
            } : {};
          },
        },
      ],
      [
        paragraphBorderSideKey(side, 'Size'),
        {
          default: null,
          parseHTML: (element: HTMLElement) => parseParagraphSideBorderSize(element, side),
          renderHTML: (attributes: Record<string, unknown>) => {
            const size = normalizePositiveInt(attributes[paragraphBorderSideKey(side, 'Size')]);
            return size != null ? { [paragraphBorderSideDataAttr(side, 'size')]: String(size) } : {};
          },
        },
      ],
      [
        paragraphBorderSideKey(side, 'Space'),
        {
          default: null,
          parseHTML: (element: HTMLElement) => normalizePositiveInt(element.getAttribute(paragraphBorderSideDataAttr(side, 'space'))),
          renderHTML: (attributes: Record<string, unknown>) => {
            const space = normalizePositiveInt(attributes[paragraphBorderSideKey(side, 'Space')]);
            return space != null ? { [paragraphBorderSideDataAttr(side, 'space')]: String(space) } : {};
          },
        },
      ],
    ]),
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

function parseParagraphBorderSize(element: HTMLElement): number | null {
  const attr = normalizePositiveInt(element.getAttribute(PARAGRAPH_BORDER_SIZE_ATTR));
  if (attr != null) return attr;

  const px = cssPxToNumber(element.style.borderTopWidth || element.style.borderWidth);
  return px != null ? Math.max(1, Math.round(px * 6)) : null;
}

function parseParagraphSideBorderSize(element: HTMLElement, side: ParagraphBorderSide): number | null {
  const attr = normalizePositiveInt(element.getAttribute(paragraphBorderSideDataAttr(side, 'size')));
  if (attr != null) return attr;

  const px = cssPxToNumber(borderSideCssValue(element, side, 'width'));
  return px != null ? Math.max(1, Math.round(px * 6)) : null;
}

function normalizePositiveInt(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? Math.round(numeric) : null;
}

function cssPxToNumber(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)px$/);
  if (!match) return null;
  const numeric = Number(match[1]);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function docxBorderSizeToPx(size: number): number {
  return Math.max(1, Math.round(size / 6));
}

function borderSideCssValue(element: HTMLElement, side: ParagraphBorderSide, property: 'color' | 'width'): string {
  if (side === 'top') return property === 'color' ? element.style.borderTopColor : element.style.borderTopWidth;
  if (side === 'right') return property === 'color' ? element.style.borderRightColor : element.style.borderRightWidth;
  if (side === 'bottom') return property === 'color' ? element.style.borderBottomColor : element.style.borderBottomWidth;
  return property === 'color' ? element.style.borderLeftColor : element.style.borderLeftWidth;
}

function paragraphBorderSideDataAttr(side: ParagraphBorderSide, part: 'color' | 'size' | 'space'): string {
  return `data-paragraph-border-${side}-${part}`;
}

function paragraphBorderSideKey(side: ParagraphBorderSide, suffix: 'Color' | 'Size' | 'Space'): string {
  return `paragraphBorder${side[0].toUpperCase()}${side.slice(1)}${suffix}`;
}
