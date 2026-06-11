import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuxiliaryMemoTool } from '@/components/AuxiliaryToolPanels';
import { addMemo, getMemo } from '@/lib/memoStore';

describe('AuxiliaryMemoTool', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('switches from the recent memo list into a focused editor without the list intro', () => {
    const memo = addMemo({
      body: '# 안녕하세요\n본문 첫 줄\n본문 둘째 줄',
    });

    render(<AuxiliaryMemoTool />);

    expect(screen.getByText('최근 메모')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /안녕하세요/ }));

    expect(screen.queryByText('최근 메모')).not.toBeInTheDocument();
    expect(screen.queryByText('사이드바에서 메모를 확인하고 바로 고칩니다.')).not.toBeInTheDocument();

    const editor = screen.getByPlaceholderText('메모를 적어보세요...');
    expect(editor).toHaveValue(memo.body);

    const editorSection = editor.closest('section') as HTMLElement;
    const editorHeader = editorSection.querySelector('header');
    expect(editorSection).toBeInTheDocument();
    expect(within(editorSection).getByRole('button', { name: /목록/ })).toBeInTheDocument();
    expect(within(editorSection).getByText('안녕하세요')).toBeInTheDocument();
    expect(within(editorSection).getByRole('button', { name: '열기' })).toBeInTheDocument();
    expect(within(editorSection).getByRole('button', { name: '저장' })).toBeInTheDocument();
    expect(editorHeader).toHaveClass('border-b');

    fireEvent.change(editor, { target: { value: '# 바뀐 제목\n새 본문' } });
    fireEvent.click(within(editorSection).getByRole('button', { name: '저장' }));

    expect(getMemo(memo.id)?.body).toBe('# 바뀐 제목\n새 본문');
  });
});
