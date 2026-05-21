import { Node, mergeAttributes } from '@tiptap/core';

type SectionBreakType = 'nextPage' | 'continuous' | 'evenPage' | 'oddPage' | 'nextColumn';
type PageMargin = { top: number; left: number; right: number; bottom: number };
type PageSize = { width: number; height: number; orientation?: 'portrait' | 'landscape' };
type SectionColumns = { count: number; space?: number; separate?: boolean; equalWidth?: boolean };

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    sectionBreak: {
      insertSectionBreak: (breakType?: SectionBreakType) => ReturnType;
    };
  }
}

export const SectionBreak = Node.create({
  name: 'sectionBreak',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      breakType: {
        default: 'nextPage',
        parseHTML: (element) => normalizeSectionBreakType(element.getAttribute('data-section-break-type')),
        renderHTML: (attributes) => ({
          'data-section-break-type': normalizeSectionBreakType(attributes.breakType),
        }),
      },
      pageMargin: {
        default: null,
        parseHTML: (element) => parseEncodedJsonAttribute<PageMargin>(element, 'data-section-page-margin'),
        renderHTML: (attributes) => encodedJsonAttribute('data-section-page-margin', attributes.pageMargin),
      },
      pageSize: {
        default: null,
        parseHTML: (element) => parseEncodedJsonAttribute<PageSize>(element, 'data-section-page-size'),
        renderHTML: (attributes) => encodedJsonAttribute('data-section-page-size', attributes.pageSize),
      },
      sectionColumns: {
        default: null,
        parseHTML: (element) => parseEncodedJsonAttribute<SectionColumns>(element, 'data-section-columns'),
        renderHTML: (attributes) => encodedJsonAttribute('data-section-columns', attributes.sectionColumns),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-section-break]' },
      { tag: 'hr[data-section-break]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const className = ['doc-section-break', HTMLAttributes.class]
      .filter(Boolean)
      .join(' ');

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-section-break': 'true',
        class: className,
      }),
    ];
  },

  addCommands() {
    return {
      insertSectionBreak:
        (breakType = 'nextPage') =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { breakType: normalizeSectionBreakType(breakType) },
          }),
    };
  },
});

function normalizeSectionBreakType(type: unknown): SectionBreakType {
  if (
    type === 'continuous'
    || type === 'evenPage'
    || type === 'oddPage'
    || type === 'nextColumn'
  ) {
    return type;
  }
  return 'nextPage';
}

function parseEncodedJsonAttribute<T>(element: HTMLElement, name: string): T | null {
  const value = element.getAttribute(name);
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as T;
  } catch {
    return null;
  }
}

function encodedJsonAttribute(name: string, value: unknown): Record<string, string> {
  if (value == null) return {};
  return { [name]: encodeURIComponent(JSON.stringify(value)) };
}
