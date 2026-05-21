import { Extension } from '@tiptap/core';

const PAGE_BREAK_BEFORE_ATTR = 'data-page-break-before';
const KEEP_NEXT_ATTR = 'data-keep-next';
const KEEP_LINES_ATTR = 'data-keep-lines';
const WIDOW_CONTROL_ATTR = 'data-widow-control';
const CONTEXTUAL_SPACING_ATTR = 'data-contextual-spacing';
const SUPPRESS_LINE_NUMBERS_ATTR = 'data-suppress-line-numbers';
const BIDIRECTIONAL_ATTR = 'data-paragraph-bidi';
const WORD_WRAP_ATTR = 'data-word-wrap';
const OVERFLOW_PUNCTUATION_ATTR = 'data-overflow-punctuation';
const AUTO_SPACE_EAST_ASIAN_TEXT_ATTR = 'data-auto-space-east-asian-text';

function isTrueAttr(value: unknown): boolean {
  return value === true || value === 'true';
}

export const ParagraphPagination = Extension.create({
  name: 'paragraphPagination',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          pageBreakBefore: {
            default: false,
            parseHTML: (element) => element.getAttribute(PAGE_BREAK_BEFORE_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.pageBreakBefore)
              ? { [PAGE_BREAK_BEFORE_ATTR]: 'true' }
              : {},
          },
          keepNext: {
            default: false,
            parseHTML: (element) => element.getAttribute(KEEP_NEXT_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.keepNext)
              ? { [KEEP_NEXT_ATTR]: 'true' }
              : {},
          },
          keepLines: {
            default: false,
            parseHTML: (element) => element.getAttribute(KEEP_LINES_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.keepLines)
              ? { [KEEP_LINES_ATTR]: 'true' }
              : {},
          },
          widowControl: {
            default: false,
            parseHTML: (element) => element.getAttribute(WIDOW_CONTROL_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.widowControl)
              ? { [WIDOW_CONTROL_ATTR]: 'true' }
              : {},
          },
          contextualSpacing: {
            default: false,
            parseHTML: (element) => element.getAttribute(CONTEXTUAL_SPACING_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.contextualSpacing)
              ? { [CONTEXTUAL_SPACING_ATTR]: 'true' }
              : {},
          },
          suppressLineNumbers: {
            default: false,
            parseHTML: (element) => element.getAttribute(SUPPRESS_LINE_NUMBERS_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.suppressLineNumbers)
              ? { [SUPPRESS_LINE_NUMBERS_ATTR]: 'true' }
              : {},
          },
          bidirectional: {
            default: false,
            parseHTML: (element) => (
              element.getAttribute(BIDIRECTIONAL_ATTR) === 'true'
              || element.getAttribute('dir') === 'rtl'
            ),
            renderHTML: (attributes) => isTrueAttr(attributes.bidirectional)
              ? { [BIDIRECTIONAL_ATTR]: 'true', dir: 'rtl' }
              : {},
          },
          wordWrap: {
            default: false,
            parseHTML: (element) => element.getAttribute(WORD_WRAP_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.wordWrap)
              ? { [WORD_WRAP_ATTR]: 'true' }
              : {},
          },
          overflowPunctuation: {
            default: false,
            parseHTML: (element) => element.getAttribute(OVERFLOW_PUNCTUATION_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.overflowPunctuation)
              ? { [OVERFLOW_PUNCTUATION_ATTR]: 'true' }
              : {},
          },
          autoSpaceEastAsianText: {
            default: false,
            parseHTML: (element) => element.getAttribute(AUTO_SPACE_EAST_ASIAN_TEXT_ATTR) === 'true',
            renderHTML: (attributes) => isTrueAttr(attributes.autoSpaceEastAsianText)
              ? { [AUTO_SPACE_EAST_ASIAN_TEXT_ATTR]: 'true' }
              : {},
          },
        },
      },
    ];
  },
});
