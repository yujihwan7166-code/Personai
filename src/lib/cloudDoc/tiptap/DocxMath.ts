import { Node, mergeAttributes } from '@tiptap/core';

export const DocxMath = Node.create({
  name: 'docxMath',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      omml: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-docx-omml') ?? '',
        renderHTML: (attributes) => (
          attributes.omml ? { 'data-docx-omml': String(attributes.omml) } : {}
        ),
      },
      text: {
        default: 'Equation',
        parseHTML: (element) => element.textContent || 'Equation',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-docx-math]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-docx-math': 'true',
        class: 'docx-math',
      }),
      node.attrs.text || 'Equation',
    ];
  },
});
