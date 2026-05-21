import { Mark, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comment: {
      addComment: (text: string) => ReturnType;
      removeComment: (id: string) => ReturnType;
    };
  }
}

export const CommentMark = Mark.create({
  name: 'comment',
  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-id'),
        renderHTML: (attributes) => (attributes.id ? { 'data-comment-id': attributes.id } : {}),
      },
      text: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-comment-text') ?? '',
        renderHTML: (attributes) => ({
          'data-comment-text': String(attributes.text ?? ''),
          title: String(attributes.text ?? ''),
        }),
      },
      author: {
        default: 'Me',
        parseHTML: (element) => element.getAttribute('data-comment-author') ?? 'Me',
        renderHTML: (attributes) => ({ 'data-comment-author': String(attributes.author ?? 'Me') }),
      },
      createdAt: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment-created-at'),
        renderHTML: (attributes) =>
          attributes.createdAt ? { 'data-comment-created-at': String(attributes.createdAt) } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: 'doc-comment-mark',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      addComment:
        (text: string) =>
        ({ commands, state }) => {
          const { from, to } = state.selection;
          if (from === to) return false;
          const id = `cm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
          return commands.setMark(this.name, {
            id,
            text,
            author: 'Me',
            createdAt: new Date().toISOString(),
          });
        },
      removeComment:
        (id: string) =>
        ({ state, tr, dispatch }) => {
          const markType = state.schema.marks[this.name];
          if (!markType) return false;

          let changed = false;
          state.doc.descendants((node, pos) => {
            if (!node.isText) return;
            const mark = node.marks.find((item) => item.type === markType && item.attrs.id === id);
            if (!mark) return;
            tr.removeMark(pos, pos + node.nodeSize, mark);
            changed = true;
          });

          if (changed && dispatch) dispatch(tr.scrollIntoView());
          return changed;
        },
    };
  },
});
