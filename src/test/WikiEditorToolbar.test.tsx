import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { WikiEditorToolbar } from '@/components/wiki/WikiEditorToolbar';

function createEditorMock(active: Record<string, boolean> = {}) {
  const run = vi.fn();
  const chain = {
    focus: vi.fn(() => chain),
    setParagraph: vi.fn(() => chain),
    toggleHeading: vi.fn(() => chain),
    toggleBold: vi.fn(() => chain),
    toggleItalic: vi.fn(() => chain),
    toggleUnderline: vi.fn(() => chain),
    toggleStrike: vi.fn(() => chain),
    toggleCode: vi.fn(() => chain),
    toggleBulletList: vi.fn(() => chain),
    toggleOrderedList: vi.fn(() => chain),
    toggleTaskList: vi.fn(() => chain),
    setTextAlign: vi.fn(() => chain),
    toggleBlockquote: vi.fn(() => chain),
    toggleCodeBlock: vi.fn(() => chain),
    setHorizontalRule: vi.fn(() => chain),
    insertTable: vi.fn(() => chain),
    setMark: vi.fn(() => chain),
    unsetMark: vi.fn(() => chain),
    setTextSelection: vi.fn(() => chain),
    unsetLink: vi.fn(() => chain),
    insertContent: vi.fn(() => chain),
    setLink: vi.fn(() => chain),
    run,
  };
  const editor = {
    chain: vi.fn(() => chain),
    isActive: vi.fn((name: string, attrs?: { level?: number }) => {
      if (name === 'heading' && attrs?.level) return Boolean(active[`heading-${attrs.level}`]);
      return Boolean(active[name]);
    }),
    getAttributes: vi.fn(() => ({})),
    state: {
      selection: { from: 1, to: 1, empty: true },
      doc: { textBetween: vi.fn(() => '') },
    },
  } as unknown as Editor;

  return { editor, chain };
}

describe('WikiEditorToolbar', () => {
  it('keeps the default editing toolbar compact with block styles grouped', () => {
    const { editor } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    expect(screen.getByRole('button', { name: '블록 형식' })).toBeInTheDocument();
    expect(screen.queryByTitle('큰 제목 (Ctrl+Shift+1)')).not.toBeInTheDocument();
    expect(screen.queryByTitle('번호 목록')).not.toBeInTheDocument();
    expect(screen.queryByTitle('표 삽입')).not.toBeInTheDocument();
  });

  it('reveals block choices from the grouped block style menu', () => {
    const { editor, chain } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    fireEvent.click(screen.getByRole('button', { name: '블록 형식' }));
    fireEvent.click(screen.getByRole('button', { name: /중간 제목/ }));

    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    expect(chain.run).toHaveBeenCalled();
  });

  it('keeps advanced formatting behind the more button', () => {
    const { editor } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    fireEvent.click(screen.getByRole('button', { name: /더보기/ }));

    expect(screen.getByTitle('표 삽입')).toBeInTheDocument();
    expect(screen.getByTitle('오른쪽 정렬')).toBeInTheDocument();
  });
});
