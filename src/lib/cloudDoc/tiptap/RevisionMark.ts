import { Mark, mergeAttributes } from '@tiptap/core';

export const RevisionMark = Mark.create({
  name: 'revision',
  inclusive: false,

  addAttributes() {
    return {
      type: {
        default: 'insert',
        parseHTML: (element) => element.getAttribute('data-revision-type') === 'delete' ? 'delete' : 'insert',
        renderHTML: (attributes) => ({ 'data-revision-type': attributes.type === 'delete' ? 'delete' : 'insert' }),
      },
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-revision-id'),
        renderHTML: (attributes) => (attributes.id ? { 'data-revision-id': String(attributes.id) } : {}),
      },
      author: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-revision-author'),
        renderHTML: (attributes) =>
          attributes.author ? { 'data-revision-author': String(attributes.author) } : {},
      },
      date: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-revision-date'),
        renderHTML: (attributes) =>
          attributes.date ? { 'data-revision-date': String(attributes.date) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-revision-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const type = HTMLAttributes['data-revision-type'] === 'delete' ? 'delete' : 'insert';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: type === 'delete' ? 'doc-revision-delete' : 'doc-revision-insert',
      }),
      0,
    ];
  },
});
