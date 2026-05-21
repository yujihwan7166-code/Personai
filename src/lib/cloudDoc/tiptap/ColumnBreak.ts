import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnBreak: {
      insertColumnBreak: () => ReturnType;
    };
  }
}

export const ColumnBreak = Node.create({
  name: 'columnBreak',
  group: 'block',
  atom: true,
  selectable: true,

  parseHTML() {
    return [
      { tag: 'div[data-column-break]' },
      { tag: 'hr[data-column-break]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const className = ['doc-column-break', HTMLAttributes.class]
      .filter(Boolean)
      .join(' ');

    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-column-break': 'true',
        class: className,
      }),
    ];
  },

  addCommands() {
    return {
      insertColumnBreak:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },
});
