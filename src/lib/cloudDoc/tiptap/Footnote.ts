/**
 * TipTap 각주 inline 노드.
 *
 *  - 본문에 위첨자 [N] 형태로 표시 (번호는 CSS counter 로 자동 매김)
 *  - attrs: id (고유 식별자), text (각주 본문)
 *  - 클릭 시 window.prompt 로 텍스트 편집 (v1 단순화 — v2 에 popover)
 *  - 본문 끝 FootnoteList 컴포넌트가 doc 을 순회해 모음 렌더
 *
 * CSS counter (index.css):
 *   .doc-content { counter-reset: footnote-ref; }
 *   .doc-content sup[data-footnote] { counter-increment: footnote-ref; }
 *   .doc-content sup[data-footnote]::before { content: "[" counter(footnote-ref) "]"; }
 */

import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      addFootnote: (text: string) => ReturnType;
    };
  }
}

export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-footnote-id'),
        renderHTML: (attrs) => (attrs.id ? { 'data-footnote-id': attrs.id } : {}),
      },
      text: {
        default: '',
        parseHTML: (el) =>
          (el as HTMLElement).getAttribute('data-footnote-text')
          ?? (el as HTMLElement).getAttribute('title')
          ?? '',
        renderHTML: (attrs) => ({
          'data-footnote-text': attrs.text ?? '',
          title: attrs.text ?? '',
        }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'sup[data-footnote]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        'data-footnote': '',
        class: 'doc-footnote-ref',
      }),
    ];
  },

  addCommands() {
    return {
      addFootnote: (text: string) => ({ chain }) => {
        const id = `fn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
        return chain()
          .insertContent({ type: this.name, attrs: { id, text } })
          .run();
      },
    };
  },
});
