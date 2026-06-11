import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('renders the editing palette without hiding common tools behind a more button', () => {
    const { editor } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    expect(screen.getByRole('toolbar', { name: '문서 편집 도구' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '블록 형식' })).toBeInTheDocument();
    expect(screen.getByTitle('표 삽입')).toBeInTheDocument();
    expect(screen.getByTitle('왼쪽 정렬')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '밑줄 (Ctrl+U)' })).not.toHaveClass('hidden');
    expect(screen.queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument();
  });

  it('reveals block choices from the grouped block style menu', () => {
    const { editor, chain } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    fireEvent.click(screen.getByRole('button', { name: '블록 형식' }));
    fireEvent.click(screen.getByRole('menuitem', { name: /중간 제목/ }));

    expect(chain.toggleHeading).toHaveBeenCalledWith({ level: 2 });
    expect(chain.run).toHaveBeenCalled();
  });

  it('inserts a table from the visible table picker', () => {
    const { editor, chain } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    fireEvent.click(screen.getByTitle('표 삽입'));
    fireEvent.click(screen.getByLabelText('3열 4행 표 삽입'));

    expect(chain.insertTable).toHaveBeenCalledWith({ rows: 4, cols: 3, withHeaderRow: true });
    expect(chain.run).toHaveBeenCalled();
  });

  it('closes formatting menus with Escape and restores trigger focus', async () => {
    const { editor } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    const trigger = screen.getByRole('button', { name: '글씨 크기' });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu', { name: '글씨 크기' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('menu', { name: '글씨 크기' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('treats input popovers as dialogs and closes them with Escape', async () => {
    const { editor } = createEditorMock();
    render(<WikiEditorToolbar editor={editor} />);

    const trigger = screen.getByRole('button', { name: '표 삽입' });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: '표 삽입' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: '표 삽입' })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
