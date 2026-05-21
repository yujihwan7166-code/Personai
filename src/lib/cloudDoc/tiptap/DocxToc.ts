import { Node, mergeAttributes } from '@tiptap/core';

export const DocxToc = Node.create({
  name: 'docxToc',
  group: 'block',
  content: 'block*',
  defining: true,

  addAttributes() {
    return {
      instruction: {
        default: 'TOC \\o "1-3" \\h \\z \\u',
        parseHTML: (element) =>
          element.getAttribute('data-docx-field-instruction') || 'TOC \\o "1-3" \\h \\z \\u',
        renderHTML: (attributes) => ({
          'data-docx-field-instruction': String(attributes.instruction || 'TOC \\o "1-3" \\h \\z \\u'),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-docx-toc]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-docx-toc': 'true',
        class: 'docx-toc',
      }),
      0,
    ];
  },
});
