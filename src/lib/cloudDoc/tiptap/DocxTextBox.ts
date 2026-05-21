import { mergeAttributes, Node } from '@tiptap/core';

export const DocxTextBox = Node.create({
  name: 'docxTextBox',
  group: 'block',
  content: 'inline*',
  defining: true,

  parseHTML() {
    return [{ tag: 'div[data-docx-textbox]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-docx-textbox': 'true',
        class: 'docx-textbox',
      }),
      0,
    ];
  },
});
