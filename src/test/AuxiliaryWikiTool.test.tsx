import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AuxiliaryWikiTool } from '@/components/AuxiliaryToolPanels';
import type { WikiPage } from '@/types/wiki';

const wikiStoreMock = vi.hoisted(() => ({
  loadAllPages: vi.fn(),
  upsertPage: vi.fn(),
}));

vi.mock('@/lib/wikiStore', () => wikiStoreMock);

function wikiPage(overrides: Partial<WikiPage> = {}): WikiPage {
  return {
    id: 'wiki-page-1',
    title: '회의 2026-06-10',
    aliases: [],
    type: 'meeting',
    status: 'active',
    tags: ['meeting'],
    body: '## 메타\n\n- 참석자:\n\n## 안건\n\n1.',
    refersTo: [],
    cites: [],
    inherits: [],
    similarTo: [],
    parentMocs: [],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe('AuxiliaryWikiTool', () => {
  beforeEach(() => {
    wikiStoreMock.loadAllPages.mockReset();
    wikiStoreMock.upsertPage.mockReset();
    wikiStoreMock.upsertPage.mockResolvedValue(undefined);
  });

  it('switches from the wiki list into a focused editor without the list intro', async () => {
    const page = wikiPage();
    wikiStoreMock.loadAllPages.mockResolvedValue([page]);

    render(<AuxiliaryWikiTool />);

    expect(await screen.findByText('위키 문서')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /회의 2026-06-10/ }));

    await waitFor(() => expect(screen.queryByText('위키 문서')).not.toBeInTheDocument());
    expect(screen.queryByText('문서를 읽고 필요한 부분을 바로 정리합니다.')).not.toBeInTheDocument();

    const editor = screen.getByPlaceholderText('위키 문서를 정리해보세요...');
    expect(editor).toHaveValue(page.body);

    const editorSection = editor.closest('section') as HTMLElement;
    const editorHeader = editorSection.querySelector('header');
    expect(editorSection).toBeInTheDocument();
    expect(editorHeader).toHaveClass('border-b');
    expect(within(editorSection).getByRole('button', { name: /목록/ })).toBeInTheDocument();
    expect(within(editorSection).getByText('회의 2026-06-10')).toBeInTheDocument();
    expect(within(editorSection).getByRole('button', { name: /열기/ })).toBeInTheDocument();
    expect(within(editorSection).getByRole('button', { name: /저장/ })).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: '## 바뀐 안건\n\n- 정리 완료' } });
    fireEvent.click(within(editorSection).getByRole('button', { name: /저장/ }));

    await waitFor(() => expect(wikiStoreMock.upsertPage).toHaveBeenCalledTimes(1));
    expect(wikiStoreMock.upsertPage).toHaveBeenCalledWith(expect.objectContaining({
      id: page.id,
      body: '## 바뀐 안건\n\n- 정리 완료',
    }));
    expect(screen.getByPlaceholderText('위키 문서를 정리해보세요...')).toBeInTheDocument();
    expect(screen.queryByText('위키 문서')).not.toBeInTheDocument();
  });
});
